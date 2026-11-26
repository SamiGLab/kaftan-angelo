import { readFile, writeFile, readdir } from 'node:fs/promises';
import { transform } from 'lightningcss';
import { pruneScopedStyles } from './prune-scoped-styles.mjs';
import { versionStaticAssets } from './version-static-assets.mjs';

const stylesheet = new URL('../../dist/assets/css/pages.css', import.meta.url);
const source = await readFile(stylesheet);
const result = transform({ filename: 'pages.css', code: source, minify: true });
await writeFile(stylesheet, result.code);
console.log(`Styles optimized: ${source.length} → ${result.code.length} bytes.`);

// These catalogue pages have a large card list. Include the identical CSS in
// their initial response so the first visible photo need not wait for another
// render-blocking request; all other pages retain the shared cached stylesheet.
const css = result.code.toString();
if (/<\/style/i.test(css)) throw new Error('Unsafe inline stylesheet');
for (const route of ['kollekciok', 'en/collections', 'noi-borkabatok', 'en/womens-leather-jackets']) {
  const file = new URL(`../../dist/${route}/index.html`, import.meta.url);
  const html = await readFile(file, 'utf8');
  const preload = '<link rel="preload" as="style" href="/assets/css/pages.css">';
  const link = '<link rel="stylesheet" href="/assets/css/pages.css">';
  if (!html.includes(preload) || !html.includes(link)) throw new Error(`Missing catalogue stylesheet: ${route}`);
  await writeFile(file, html.replace(preload, '').replace(link, () => `<style id="catalogue-inline-css">${css}</style>`));
}

let savedBytes = 0;
async function optimizeRoutes(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) await optimizeRoutes(file);
    else if (entry.name.endsWith('.html')) {
      const html = await readFile(file, 'utf8');
      const optimized = pruneScopedStyles(html);
      savedBytes += Buffer.byteLength(html) - Buffer.byteLength(optimized);
      if (optimized !== html) await writeFile(file, optimized);
    }
  }
}
await optimizeRoutes(new URL('../../dist/', import.meta.url));
console.log(`Unused component styles removed: ${savedBytes} bytes across static routes.`);
const assetVersion = await versionStaticAssets(new URL('../../dist/', import.meta.url));
console.log(`Static stylesheet and script version: ${assetVersion}`);
