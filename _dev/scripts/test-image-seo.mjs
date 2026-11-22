import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pageImageUrls } from '../../src/data/image-seo.js';

const BASE = 'https://kaftanangelo.com';
const models = JSON.parse(readFileSync('src/data/models.json', 'utf8'));
const pages = JSON.parse(readFileSync('src/data/pages.json', 'utf8'));
const xml = readFileSync('dist/sitemap.xml', 'utf8');

const sitemap = new Map();
for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
  const block = match[1];
  const url = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
  assert.ok(url && !sitemap.has(url), 'Every sitemap landing page must appear once');
  const images = [...block.matchAll(/<image:image><image:loc>([^<]+)<\/image:loc><\/image:image>/g)].map(item => item[1].replaceAll('&amp;', '&'));
  assert.equal(images.length, new Set(images).size, url + ' must not repeat original photos');
  assert.ok(images.length <= 1000, url + ' must respect image sitemap limit');
  for (const image of images) {
    assert.ok(image.startsWith(BASE + '/'), url + ' must only use first-party image URLs');
    const local = path.join('dist', new URL(image).pathname.slice(1));
    assert.ok(existsSync(local), url + ' references missing image ' + image);
  }
  sitemap.set(url, images);
}

const verifyPage = route => {
  const images = sitemap.get(BASE + route);
  assert.ok(images, route + ' is missing from sitemap');
  return images;
};

// Product pages must expose all genuine front/back/interior and colour photos.
let checkedModels = 0;
for (const model of models) {
  const photos = model.gallery?.length ? model.gallery : [{ image: model.image, pictures: model.pictures }];
  for (const [lang, prefix] of [['hu', '/modellek/'], ['en', '/en/models/']]) {
    const route = prefix + model.slug + '/';
    const imageUrls = verifyPage(route);
    const expected = photos.map(photo => BASE + photo.image);
    for (const image of expected) assert.ok(imageUrls.includes(image), route + ' missing original photo ' + image);
    assert.equal(imageUrls.length, expected.length, route + ' has unexpected duplicate or extra gallery image');

    const html = readFileSync('dist' + route + 'index.html', 'utf8');
    const jsonLd = html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(jsonLd, route + ' missing JSON-LD');
    const graph = JSON.parse(jsonLd)['@graph'];
    const product = graph.find(node => node['@type'] === 'Product');
    const itemPage = graph.find(node => node['@type'] === 'ItemPage');
    assert.ok(product && itemPage, route + ' missing schema');
    assert.equal(product.image.length, photos.length, route + ' photo schema length');
    for (const [index, photo] of product.image.entries()) {
      assert.equal(photo['@type'], 'ImageObject');
      assert.ok(photo.contentUrl.startsWith(BASE + '/'));
      const originalAlt = photos[index].pictures[lang].match(/<img\b[^>]*\balt="([^"]+)"/i)?.[1]?.replace(/&amp;/g, '&');
      assert.ok(originalAlt, route + ' missing original HU/EN alt for photo ' + index);
      assert.equal(photo.name, originalAlt, route + ' image schema must use the real descriptive image alt');
      assert.ok(imageUrls.includes(photo.contentUrl), route + ' schema image absent from image sitemap');
    }
    assert.equal(itemPage.primaryImageOfPage.contentUrl, BASE + model.image);
    assert.ok(itemPage.primaryImageOfPage.name?.trim(), route + ' missing primary photo name');
    const ogImageAlt = html.match(/<meta property="og:image:alt" content="([^"]+)"/)?.[1];
    const twitterImageAlt = html.match(/<meta name="twitter:image:alt" content="([^"]+)"/)?.[1];
    assert.ok(ogImageAlt && twitterImageAlt, route + ' missing image social descriptions');
    assert.equal(twitterImageAlt, ogImageAlt, route + ' mismatched social photo descriptions');
    checkedModels++;
  }
}

// Collection/homepage images must be included, not just hidden product-image buttons.
const landingPages = [
  '/', '/en/', '/kollekciok/', '/en/collections/',
  '/noi-borkabatok/', '/en/womens-leather-jackets/',
  '/ferfi-borkabatok/', '/en/mens-leather-jackets/',
  '/szormekabatok/', '/en/fur-coats/',
  '/borkabat-budapest/', '/en/leather-jackets-budapest/',
];
for (const route of landingPages) {
  const listed = verifyPage(route);
  const expected = pageImageUrls(pages[route]);
  assert.deepEqual(listed, expected, route + ' must list all original visible product images');
  assert.ok(listed.length > 1, route + ' should expose more than just the hero');
}

// Guides previously had no image sitemap entries. Preserve the existing article hero.
for (const [route, guideFile] of [
  ['/utmutatok/borkabat-apolas/', 'src/content/guides/hu/borkabat-apolas.md'],
  ['/en/guides/leather-jacket-care/', 'src/content/guides/en/leather-jacket-care.md'],
  ['/utmutatok/budapesti-borkabat-vasarlasi-kalauz/', 'src/content/guides/hu/budapesti-borkabat-vasarlasi-kalauz.md'],
  ['/en/guides/budapest-leather-shopping-guide/', 'src/content/guides/en/budapest-leather-shopping-guide.md'],
]) {
  const source = readFileSync(guideFile, 'utf8');
  const hero = source.match(/^heroImage: "([^"]+)"$/m)?.[1];
  assert.ok(hero, guideFile + ' has no hero image');
  assert.ok(verifyPage(route).includes(BASE + hero), route + ' missing guide hero in image sitemap');
}

// Reject external domains, non-image URLs and duplicate variants from the image sitemap.
assert.deepEqual(
  pageImageUrls({
    ogImage: '/jacket.webp',
    mainHtml: '<img src="/jacket.webp" alt="Jacket"><img src="https://elsewhere.example/foreign.webp" alt="Foreign"><img src="/news.html" alt="Not an image">',
  }),
  [BASE + '/jacket.webp'],
);

console.log('PASS: image SEO validated for ' + checkedModels + ' HU/EN product pages, ' + landingPages.length + ' collection/home pages and four guide covers.');
