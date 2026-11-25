import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const robots = readFileSync('dist/robots.txt', 'utf8');
const globalGroup = robots.split(/User-agent:\s*GPTBot/i)[0];
assert.match(globalGroup, /User-agent:\s*\*/);
assert.match(globalGroup, /Disallow:\s*\/cdn-cgi\//, 'Google should not crawl Cloudflare-generated internal paths');

for (const route of ['/', '/en/', '/modellek/siyah-kapitone-budapest/', '/en/models/siyah-kapitone-budapest/']) {
  const html = readFileSync('dist' + route + 'index.html', 'utf8');
  const match = html.match(/<!--email_off-->([\s\S]*?)<!--\/email_off-->/);
  assert.ok(match, route + ' must keep Cloudflare email exclusion comments in built HTML');
  assert.match(match[1], /href="mailto:alfinafashionkft@gmail\.com"/);
  assert.match(match[1], /alfinafashionkft@gmail\.com/);
  assert.doesNotMatch(html, /href="\/cdn-cgi\/l\/email-protection/, route + ' must not publish an internal mail link');
}

console.log('PASS: footer mailto link is exempted from Cloudflare email obfuscation and /cdn-cgi/ is excluded from crawlers.');
