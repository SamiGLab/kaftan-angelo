import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const pages = JSON.parse(readFileSync(new URL('../../src/data/pages.json', import.meta.url), 'utf8'));
const siteSource = readFileSync(new URL('../../src/data/site.ts', import.meta.url), 'utf8');

const expectedTitles = {
  '/': /Bőrkabátok.*Budapesten/,
  '/borkabat-budapest/': /Bőrkabát Budapest/,
  '/noi-borkabatok/': /Női bőrkabátok.*bőrdzsekik/,
  '/ferfi-borkabatok/': /Férfi bőrkabátok/,
  '/irhakabatok/': /Irhakabátok/,
  '/szormekabatok/': /Női szőrmekabátok/,
  '/uzlet/': /Bőrkabát bolt Budapest/,
  '/en/': /Leather Jackets.*Budapest/,
  '/en/leather-jackets-budapest/': /Leather Jacket Shop in Budapest/,
  '/en/womens-leather-jackets/': /Women's Leather Jackets in Budapest/,
  '/en/mens-leather-jackets/': /Men's Leather Jackets in Budapest/,
  '/en/fur-coats/': /Fur Coats.*Budapest/,
  '/en/shearling-jackets/': /Shearling Coats.*Budapest/,
  '/en/visit/': /Leather & Fur Shop in Budapest/,
};

for (const [path, titlePattern] of Object.entries(expectedTitles)) {
  const page = pages[path];
  assert.ok(page, `Missing priority landing page: ${path}`);
  assert.match(page.title, titlePattern, `Misaligned search intent: ${path}`);
  assert.ok(page.title.length <= 80, `Title is unnecessarily long: ${path}`);
  assert.ok(page.description.length >= 75 && page.description.length <= 180, `Description length outside editorial review range: ${path}`);
  assert.match(page.mainHtml, /<h1(?:\s[^>]*)?>[^<]+<\/h1>/, `Missing visible H1: ${path}`);
  assert.equal(page.canonical, 'https://kaftanangelo.com' + path, `Canonical changed unexpectedly: ${path}`);
  assert.equal(pages[page.counterpart]?.counterpart, path, `Missing reciprocal language page: ${path}`);
}

const titles = Object.values(pages).map(page => page.title);
assert.equal(new Set(titles).size, titles.length, 'Page titles must stay unique');
for (const [path, page] of Object.entries(pages)) {
  assert.doesNotMatch(page.title + ' ' + page.description, /5\.0★/, `Unverified star claim in search snippet: ${path}`);
}
assert.doesNotMatch(siteSource, /aggregateRating\s*:/, 'Store must not mark up self-serving aggregate ratings');
assert.doesNotMatch(siteSource, /priceRange\s*:/, 'Do not infer a store price range');

const pairedGuides = [
  ['/borkabat-budapest/', '/utmutatok/budapesti-borkabat-vasarlasi-kalauz/', '../../src/content/guides/hu/budapesti-borkabat-vasarlasi-kalauz.md'],
  ['/en/leather-jackets-budapest/', '/en/guides/budapest-leather-shopping-guide/', '../../src/content/guides/en/budapest-leather-shopping-guide.md'],
];
for (const [path, href, guidePath] of pairedGuides) {
  assert.ok(pages[path].mainHtml.includes(`href="${href}"`), `Missing contextual guide link: ${path}`);
  assert.ok(existsSync(new URL(guidePath, import.meta.url)), `Missing guide behind link: ${href}`);
}

const modelSlugs = ['noi-ketoldalas-vizallo-borkabat-budapest', 'siyah-kapitone-budapest'];
const models = JSON.parse(readFileSync(new URL('../../src/data/models.json', import.meta.url), 'utf8'));
for (const slug of modelSlugs) {
  const model = models.find(item => item.slug === slug);
  assert.ok(model?.image?.startsWith('/'), `Missing catalogued original photograph for ${slug}`);
  const image = model.image.slice(1);
  assert.ok(existsSync(new URL('../../public/' + image, import.meta.url)), `Missing original product photograph: ${image}`);
  for (const [landing, prefix, lang] of [['/borkabat-budapest/', '/modellek/', 'hu'], ['/en/leather-jackets-budapest/', '/en/models/', 'en']]) {
    assert.ok(pages[landing].mainHtml.includes(`href="${prefix}${model.slugs[lang]}/"`), `Missing model route from ${landing}`);
    assert.ok(pages[landing].mainHtml.includes('src="/' + image + '"'), `Missing photographed example on ${landing}`);
  }
}
assert.match(pages['/uzlet/'].title, /Bőrkabát bolt Budapest/);
assert.ok(pages['/ferfi-borkabatok/'].mainHtml.includes('<h1>Férfi bőrkabátok és bőrdzsekik Budapesten</h1>'));
assert.ok(pages['/ferfi-borkabatok/'].mainHtml.includes('/utmutatok/ferfi-motoros-vagy-klasszikus-bordzseki/'));
assert.match(pages['/egyedi-rendeles/'].mainHtml, /Bőrkabát javítás: kérjen előzetes tájékoztatást/);
const careHu = readFileSync(new URL('../../src/content/guides/hu/borkabat-apolas.md', import.meta.url), 'utf8');
const careEn = readFileSync(new URL('../../src/content/guides/en/leather-jacket-care.md', import.meta.url), 'utf8');
assert.match(careHu, /Bőrkabát tisztítása és ápolása/);
assert.match(careHu, /nem általános vegytisztítói szolgáltatáslista/);
assert.match(careEn, /How to Clean and Care for a Leather Jacket/);
console.log(`SEO metadata and language pairs passed for ${Object.keys(expectedTitles).length} priority pages; local-intent routes, photographed models and care guides verified.`);

