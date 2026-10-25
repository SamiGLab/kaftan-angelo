import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { launch } from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const screenshots = process.env.LANDMARK_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
const cases = [
  ['/en/leather-jackets-budapest/', 'en', 6], ['/borkabat-budapest/', 'hu', 6],
  ['/en/visit/', 'en', 7], ['/uzlet/', 'hu', 7],
];
const browser = await launch({ headless: true, args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });
try {
  for (const [route, lang, count] of cases) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Inspect local output only: never open Maps or transmit an external request.
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (new URL(request.url()).origin === new URL(base).origin || request.url().startsWith('data:')) request.continue();
      else request.abort();
    });
    await page.goto(base + route, { waitUntil: 'networkidle2' });
    assert.equal(await page.$eval('html', node => node.lang), lang);
    assert.equal((await page.$$('.store-landmarks')).length, 1);
    assert.equal((await page.$$('.landmark-card')).length, count);
    const links = await page.$$eval('.landmark-card a', nodes => nodes.map(node => ({ href: node.href, label: node.textContent.trim() })));
    const origins = new Set();
    for (const link of links) {
      const url = new URL(link.href);
      assert.equal(url.origin, 'https://www.google.com');
      assert.equal(url.pathname, '/maps/dir/');
      assert.equal(url.searchParams.get('api'), '1');
      assert.equal(url.searchParams.get('travelmode'), 'walking');
      assert.match(url.searchParams.get('destination'), /Kossuth Lajos utca 18, 1053 Budapest/);
      assert.ok(url.searchParams.get('origin').includes('Budapest') || url.searchParams.get('origin') === '47.4918096,19.0537954');
      assert.ok(link.label.length > 15);
      origins.add(url.searchParams.get('origin'));
    }
    assert.equal(origins.size, count);
    const distances = await page.$$eval('.landmark-distance', nodes => nodes.map(node => node.textContent));
    assert.equal(distances.length, count);
    assert.ok(distances.every(text => /^(Approx\.|Kb\.)/.test(text)));
    assert.match(distances[0], /170 m.*3/);
    assert.match(distances[2], /500 m.*7/);
    assert.match(distances[5], /800 m.*11/);
    if (count === 7) assert.match(distances[6], /1 km.*14/);
    const graph = await page.$eval('script[type="application/ld+json"]', node => JSON.parse(node.textContent)['@graph']);
    if (count === 6) {
      const faq = graph.find(node => node['@type'] === 'FAQPage');
      const visible = await page.$$eval('.faq-item', nodes => nodes.map(node => ({ question: node.querySelector('summary').textContent, answer: node.querySelector('div').textContent })));
      assert.equal(faq.mainEntity.length, visible.length);
      const normalize = value => value.replace(/\s+/g, ' ').trim();
      for (const question of faq.mainEntity) {
        const item = visible.find(item => normalize(item.question) === normalize(question.name));
        assert.ok(item, 'Every schema question is visible');
        assert.equal(normalize(item.answer), normalize(question.acceptedAnswer.text));
      }
    } else {
      assert.equal((await page.$$('.landmark-arrival li')).length, 3);
      assert.equal(await page.$('iframe[src*="google.com/maps"]'), null);
    }
    for (const width of [320, 390, 1365]) {
      await page.setViewport({ width, height: 844 });
      const geometry = await page.$$eval('.landmark-card a', nodes => nodes.map(node => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, height: box.height };
      }));
      for (const box of geometry) {
        assert.ok(box.height >= 44, `${route} ${width}: tap target`);
        assert.ok(box.left >= 0 && box.right <= width, `${route} ${width}: card fits viewport`);
      }
      await page.focus('.landmark-card a');
      assert.ok(await page.$eval('.landmark-card a', node => document.activeElement === node));
      if (screenshots && route === '/en/visit/' && width !== 320) {
        await page.$eval('[data-consent-banner]', node => { node.hidden = true; });
        // Keep fixed navigation and focus scrolling out of a section-only image.
        await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
        const screenshotStyle = await page.addStyleTag({ content: 'header, .skip-link { visibility: hidden !important; }' });
        await (await page.$('.store-landmarks')).screenshot({ path: path.join(screenshots, `landmarks-${width}.png`) });
        await screenshotStyle.evaluate(node => node.remove());
        await screenshotStyle.dispose();
      }
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: four landmark pages, distinct walking origins, store destination, visible FAQ/schema parity, map privacy, mobile targets and keyboard focus.');
} finally { await browser.close(); }
