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
    // No prices, stock feeds or verified reviews are published in this showroom.
    // Emitting a Product without offers/reviews causes an invalid Google rich-result item.
    assert.ok(!graph.some(node => node['@type'] === 'Product'), route + ' must not imply product-rich-result eligibility');
    const item = graph.find(node => node['@type'] === 'ItemPage' && node.url.endsWith(route));
    assert.ok(item, route + ' preserves descriptive ItemPage markup');
    assert.equal(item.name, model.names[lang]);
    const photos = model.gallery?.length ? model.gallery : [{ image: model.image, pictures: model.pictures }];
    assert.equal(item.image.length, photos.length);
    for (const [index, image] of item.image.entries()) {
      assert.equal(image['@type'], 'ImageObject', route + ' retains a structured original photo');
      assert.equal(image.contentUrl, 'https://kaftanangelo.com' + photos[index].image);
      assert.ok(image.name?.trim(), route + ' retains localized image descriptions');
    }
    for (const field of ['offers', 'price', 'priceSpecification', 'priceCurrency', 'aggregateRating', 'review']) {
      assert.equal(Object.hasOwn(item, field), false, route + ' has no invented commercial information: ' + field);
    }
    assert.match(html, /data-model-inquiry/);
    assert.match(html, /https:\/\/wa\.me\//);
    checked++;
  }
}
console.log(`PASS: ${checked} HU/EN model pages preserve descriptive ItemPage/images/enquiry links without ineligible Product snippets or invented offers.`);
