import assert from 'node:assert/strict';
import { launch } from 'puppeteer';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
try {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  for (const width of [390, 1440]) {
    await page.setViewport({width, height: 900});
    for (const route of ['/missing-page-for-404-check/', '/en/missing-page-for-404-check/']) {
      const response = await page.goto(base + route, {waitUntil: 'networkidle0'});
      assert.equal(response.status(), 404, 'Missing URLs keep HTTP 404 status');
      assert.match(await page.$eval('h1', element => element.textContent), /Page not found/);
      assert.match(await page.$eval('h1 [lang="hu"]', element => element.textContent), /Az oldal nem található/);
      assert.match(await page.$eval('meta[name="robots"]', element => element.content), /noindex/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
      const links = await page.$$eval('nav a', elements => elements.map(element => element.getAttribute('href')));
      assert.deepEqual(links, ['/en/collections/', '/en/visit/', '/en/', '/kollekciok/', '/uzlet/', '/']);
      for (const link of links) assert.equal((await fetch(base + link)).status, 200, link);
    }
    if (width === 390 && process.env.NOT_FOUND_SCREENSHOT) await page.screenshot({path: process.env.NOT_FOUND_SCREENSHOT, fullPage: true});
  }
  console.log('PASS: real HTTP 404 at HU/EN missing URLs, bilingual recovery links, mobile/desktop layouts and no-JavaScript operation.');
} finally {
  await browser.close();
}
