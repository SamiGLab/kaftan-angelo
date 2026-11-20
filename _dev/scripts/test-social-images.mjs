import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.argv[2] ?? 'dist';
const images = new Map();
let checked = 0;

async function audit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await audit(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const html = readFileSync(file, 'utf8');
    const meta = name => html.match(new RegExp(`<meta property="${name}" content="([^"]+)"`))?.[1];
    const image = meta('og:image');
    if (!image) continue;
    const url = new URL(image);
    assert.equal(url.origin, 'https://kaftanangelo.com', `${file}: social image must be on the website`);
    const asset = path.join(root, decodeURIComponent(url.pathname));
    assert.ok(existsSync(asset), `${file}: missing ${url.pathname}`);
    if (!images.has(asset)) images.set(asset, await sharp(asset).metadata());
    const info = images.get(asset);
    assert.equal(Number(meta('og:image:width')), info.width, `${file}: wrong image width`);
    assert.equal(Number(meta('og:image:height')), info.height, `${file}: wrong image height`);
    assert.equal(meta('og:image:type'), `image/${info.format}`, `${file}: wrong image MIME type`);
    assert.ok(meta('og:image:alt')?.trim(), `${file}: missing social image description`);
    checked++;
  }
}

await audit(root);
assert.ok(checked > 0, 'No social images found to audit');
console.log(`PASS: ${checked} pages use actual image dimensions and formats (${images.size} distinct social images).`);
