import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'lightningcss';

const stylesheet = new URL('../../dist/assets/css/pages.css', import.meta.url);
const source = await readFile(stylesheet);
const result = transform({ filename: 'pages.css', code: source, minify: true });
await writeFile(stylesheet, result.code);
console.log(`Styles optimized: ${source.length} → ${result.code.length} bytes.`);

// Exclude only selectors with a mandatory, explicitly route-exclusive class.
// Retain global, shared header/footer/consent/dialog and dynamic state rules.
const exclusive = new Set([
  'home-hero', 'home-hero-inner', 'home-visit-direct',
  'featured-model-grid', 'featured-model-card', 'featured-model-photo',
  'featured-model-info', 'featured-model-cat', 'featured-model-link',
  'guide-list', 'guide-card', 'guide-search-section', 'guide-meta', 'guide-toc',
  'article-content', 'partner-layout', 'partner-review-marquee',
  'partner-review-track', 'partner-review-group', 'partner-teaser', 'portal-code',
  'model-detail', 'model-photo', 'model-info', 'model-gallery', 'model-related',
  'model-related-list', 'model-related-card', 'model-related-photo',
  'model-related-name', 'model-colour-panel',
]);
const routes = ['kollekciok', 'noi-borkabatok', 'ferfi-borkabatok', 'irhakabatok', 'szormekabatok',
  'en/collections', 'en/womens-leather-jackets', 'en/mens-leather-jackets', 'en/shearling-jackets', 'en/fur-coats'];
// Retain styles if later content brings an excluded component into a catalogue.
for (const route of routes) {
  const html = await readFile(new URL('../../dist/' + route + '/index.html', import.meta.url), 'utf8');
  for (const match of html.matchAll(/\bclass="([^"]*)"/g)) {
    for (const name of match[1].split(/\s+/)) exclusive.delete(name);
  }
}
let removed = 0;
const catalogue = transform({
  filename: 'pages.css',
  code: source,
  minify: true,
  visitor: {
    Rule: {
      style(rule) {
        const selectors = rule.value.selectors;
        if (selectors.length && selectors.every(selector => selector.some(component =>
          component.type === 'class' && exclusive.has(component.name)))) {
          removed++;
          return [];
        }
      },
    },
  },
});
if (!removed || catalogue.code.length >= result.code.length) throw new Error('Catalogue CSS specialization did not remove route-exclusive rules');
await writeFile(new URL('../../dist/assets/css/collection.css', import.meta.url), catalogue.code);
console.log('Catalogue CSS: ' + result.code.length + ' → ' + catalogue.code.length + ' bytes; ' + removed + ' exclusive rules removed.');
// Rewrite only generated catalogue documents. Development uses full CSS;
// production and all build-based acceptance tests use the same smaller file.
for (const route of routes) {
  const file = new URL('../../dist/' + route + '/index.html', import.meta.url);
  const html = await readFile(file, 'utf8');
  const specialized = html.replaceAll('href="/assets/css/pages.css"', 'href="/assets/css/collection.css"');
  if (specialized === html) throw new Error('Missing stylesheet link on ' + route);
  await writeFile(file, specialized);
}
