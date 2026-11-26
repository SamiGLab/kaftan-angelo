import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'lightningcss';

const stylesheet = new URL('../../dist/assets/css/pages.css', import.meta.url);
const source = await readFile(stylesheet);
const result = transform({ filename: 'pages.css', code: source, minify: true });
await writeFile(stylesheet, result.code);
console.log(`Styles optimized: ${source.length} → ${result.code.length} bytes.`);

// These catalogue hubs have a large card list. Include the identical CSS in
// their initial response so the first visible photo need not wait for another
// render-blocking request; all other pages retain the shared cached stylesheet.
const css = result.code.toString();
if (/<\/style/i.test(css)) throw new Error('Unsafe inline stylesheet');
for (const route of ['kollekciok', 'en/collections']) {
  const file = new URL(`../../dist/${route}/index.html`, import.meta.url);
  const html = await readFile(file, 'utf8');
  const preload = '<link rel="preload" as="style" href="/assets/css/pages.css">';
  const link = '<link rel="stylesheet" href="/assets/css/pages.css">';
  if (!html.includes(preload) || !html.includes(link)) throw new Error(`Missing catalogue stylesheet: ${route}`);
  await writeFile(file, html.replace(preload, '').replace(link, () => `<style id="catalogue-inline-css">${css}</style>`));
}
