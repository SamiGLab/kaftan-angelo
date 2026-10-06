import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'lightningcss';

const stylesheet = new URL('../../dist/assets/css/pages.css', import.meta.url);
const source = await readFile(stylesheet);
const result = transform({ filename: 'pages.css', code: source, minify: true });
await writeFile(stylesheet, result.code);
console.log(`Styles optimized: ${source.length} → ${result.code.length} bytes.`);
