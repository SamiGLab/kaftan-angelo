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
    const product = graph.find(node => node['@type'] === 'Product');
    assert.ok(product, route + ' preserves basic product information');
    assert.equal(product.name, model.names[lang]);
    assert.ok(product.image.length > 0);
    assert.ok(product.material);
    for (const field of ['offers', 'price', 'priceSpecification', 'priceCurrency', 'aggregateRating', 'review']) {
      assert.equal(Object.hasOwn(product, field), false, route + ' has no fabricated commercial enhancement: ' + field);
    }
    assert.ok(graph.some(node => node['@type'] === 'ItemPage' && node.url.endsWith(route)));
    assert.match(html, /data-model-inquiry/);
    assert.match(html, /https:\/\/wa\.me\//);
    checked++;
  }
}
console.log(`PASS: ${checked} HU/EN model pages preserve Product/ItemPage, images and enquiry links without prices, Offer, stock promises or invented ratings.`);
