import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const models = JSON.parse(await readFile('src/data/models.json', 'utf8'));
let checked = 0;
for (const model of models) {
  for (const [lang, prefix] of [['hu', 'modellek'], ['en', 'en/models']]) {
    const route = `/${prefix}/${model.slug}/`;
    const html = await readFile(`dist${route}index.html`, 'utf8');
    const match = html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(match, route + ' has structured data');
    const graph = JSON.parse(match[1])['@graph'];
    const product = graph.find(node => node['@type'] === (model.variants.length ? 'ProductGroup' : 'Product'));
    assert.ok(product, route + ' preserves basic product information');
    assert.equal(product.name, model.names[lang]);
    assert.ok(product.image.length > 0);
    assert.equal(product.material, model.material[lang] ?? undefined, route + ' uses model-specific material only');
    assert.equal(product.description, model.description[lang]);
    assert.ok(model.seoTitle[lang].length <= 68, route + ' editorial title length');
    assert.ok(model.description[lang].length <= 160, route + ' editorial description length');
    assert.ok(model.intro[lang].trim() && model.advice[lang].trim(), route + ' model-specific copy');
    const variants = product.hasVariant ?? [];
    assert.equal(variants.length, model.variants.length, route + ' structured variant count');
    if (variants.length) {
      assert.equal(product.productGroupID, model.slug);
      assert.equal(product.url, 'https://kaftanangelo.com' + route);
      assert.deepEqual(product.variesBy, ['https://schema.org/color']);
      assert.equal(new Set(variants.map(variant => variant.productID)).size, variants.length);
      for (const [i, variant] of variants.entries()) {
        const source = model.variants[i];
        assert.equal(variant['@type'], 'Product');
        assert.equal(variant.color, source.names[lang]);
        assert.equal(variant.url, 'https://kaftanangelo.com' + route + '?colour=' + source.key);
        assert.deepEqual(variant.image, source.gallery.map(photo => 'https://kaftanangelo.com' + photo.image));
        assert.equal(variant.material, model.material[lang] ?? undefined);
      }
    }
    for (const field of ['offers', 'price', 'priceSpecification', 'priceCurrency', 'aggregateRating', 'review']) {
      for (const entity of [product, ...variants]) assert.equal(Object.hasOwn(entity, field), false, route + ' has no fabricated commercial enhancement: ' + field);
    }
    assert.ok(graph.some(node => node['@type'] === 'ItemPage' && node.url.endsWith(route)));
    assert.match(html, /data-model-inquiry/);
    assert.match(html, /https:\/\/wa\.me\//);
    checked++;
  }
}
console.log(`PASS: ${checked} HU/EN model pages preserve Product/ItemPage, images and enquiry links without prices, Offer, stock promises or invented ratings.`);
