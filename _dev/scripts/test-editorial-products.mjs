import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const models = JSON.parse(await readFile('src/data/models.json', 'utf8'));
let checked = 0;
for (const model of models) {
  for (const [lang, prefix] of [['hu', 'modellek'], ['en', 'en/models']]) {
    const route = `/${prefix}/${model.slugs[lang]}/`;
    const html = await readFile(`dist${route}index.html`, 'utf8');
    const match = html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(match, route + ' has structured data');
    const graph = JSON.parse(match[1])['@graph'];
    const incompleteProduct = graph.find(node => node['@type'] === 'Product');
    assert.equal(incompleteProduct, undefined, route + ' omits incomplete Product schema that triggers Search Console Product snippets errors without offers/reviews');
    const itemPage = graph.find(node => node['@type'] === 'ItemPage' && node.url.endsWith(route));
    assert.ok(itemPage, route + ' preserves factual ItemPage schema');
    assert.equal(itemPage.name, model.names[lang]);
    assert.ok(Array.isArray(itemPage.image) && itemPage.image.length > 0);
    for (const field of ['offers', 'price', 'priceSpecification', 'priceCurrency', 'aggregateRating', 'review']) {
      assert.equal(Object.hasOwn(itemPage, field), false, route + ' has no fabricated commercial enhancement: ' + field);
    }
    assert.match(html, /data-model-inquiry/);
    assert.match(html, /https:\/\/wa\.me\//);
    checked++;
  }
}
console.log(`PASS: ${checked} HU/EN model pages emit valid ItemPage schema, images and enquiry links without incomplete Product nodes, prices, Offer, stock promises or invented ratings.`);
