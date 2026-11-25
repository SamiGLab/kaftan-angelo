import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const models = JSON.parse(readFileSync('src/data/models.json', 'utf8'));
const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
const base = 'https://kaftanangelo.com';
const roots = { hu: '/modellek/', en: '/en/models/' };
const route = (model, lang) => roots[lang] + model.slugs[lang] + '/';
const htmlAt = path => readFileSync('dist' + path + 'index.html', 'utf8');
const turkish = /(?:^|[-/])(?:siyah|kirmizi|yesil|kapitone|kurklu|panco|bej|beyaz|gumus|kahve|taba|suet|kemerli|desenli)(?:[-/.]|$)|_on|_arka|ic_gorunum/;
const locations = [...sitemap.matchAll(/<(?:image:)?loc>([^<]+)<\/(?:image:)?loc>/g)].map(match => match[1]);
for (const url of locations) assert.ok(!turkish.test(new URL(url).pathname), 'Turkish sitemap URL: ' + url);
let redirects = 0;
for (const lang of ['hu', 'en']) {
  assert.equal(new Set(models.map(m => m.slugs[lang])).size, models.length, 'Unique localized slugs');
  const collection = htmlAt(lang === 'hu' ? '/kollekciok/' : '/en/collections/');
  for (const match of collection.matchAll(/<article class="product-card"[\s\S]*?<\/article>/g)) {
    const card = match[0];
    const path = card.match(/href="(\/(?:en\/models|modellek)\/[^"?]+)"/)?.[1];
    const inquiry = card.match(/href="(https:\/\/wa\.me\/[^"<>]+)"/)?.[1];
    assert.ok(path && inquiry, 'Model card has a detail link and enquiry');
    assert.ok(new URL(inquiry.replaceAll('&amp;', '&')).searchParams.get('text').includes(base + path), 'WhatsApp uses the same canonical model URL');
  }
  for (const model of models) {
    const path = route(model, lang), html = htmlAt(path);
    assert.ok(sitemap.includes('<loc>' + base + path + '</loc>'), 'Canonical page in sitemap: ' + path);
    assert.ok(html.includes('rel="canonical" href="' + base + path + '"'));
    for (const otherLang of ['hu', 'en']) assert.ok(html.includes('hreflang="' + otherLang + '" href="' + base + route(model, otherLang) + '"'));
    if (!model.catalogHidden) assert.ok(collection.includes('href="' + path + '"'), 'Collection links to canonical model');
    const old = roots[lang] + model.slug + '/';
    if (old !== path) {
      const legacy = htmlAt(old);
      assert.ok(!sitemap.includes('<loc>' + base + old + '</loc>'));
      assert.ok(legacy.includes('noindex, follow'));
      assert.ok(legacy.includes('rel="canonical" href="' + base + path + '"'));
      assert.ok(legacy.includes('http-equiv="refresh" content="0;url=' + base + path + '"'));
      assert.ok(legacy.includes('location.search + location.hash'));
      assert.ok(!collection.includes('href="' + old + '"'));
      redirects++;
    }
  }
}
for (const url of locations) if (/\.(?:webp|avif|png|jpe?g)$/.test(url)) assert.ok(existsSync('dist' + new URL(url).pathname), 'Sitemap image exists: ' + url);
console.log(`PASS: ${models.length * 2} localized pages, ${redirects} legacy redirects, canonical/hreflang/collection links and all sitemap URLs/images.`);
