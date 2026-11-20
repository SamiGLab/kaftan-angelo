import assert from 'node:assert/strict';
import { devices, webkit } from 'playwright';

// Linux WebKit is the closest CI rendering check for Safari, not a substitute
// for a physical iPhone running iOS Safari.
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const profiles = ['iPhone SE', 'iPhone 13', 'iPhone 15 Pro Max'];
const routes = ['/', '/en/', '/kollekciok/', '/en/collections/', '/modellek/siyah-kapitone-budapest/'];
const browser = await webkit.launch({ headless: true });

try {
  for (const deviceName of profiles) {
    const context = await browser.newContext({ ...devices[deviceName] });
    // The static pages must work without fetching third-party trackers, maps or embeds.
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === new URL(base).origin) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const route of routes) {
      await page.goto(base + route, { waitUntil: 'load' });
      const state = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const rectangle = selector => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, width: box.width, height: box.height };
        };
        return {
          viewport,
          contentWidth: document.documentElement.scrollWidth,
          title: document.title,
          logo: rectangle('.site-header .brand'),
          menu: rectangle('.menu-toggle'),
          primary: rectangle('main .btn-primary'),
          mainImage: rectangle('.model-photo img, .model-colour-panel:not([hidden]) img'),
        };
      });
      const label = `${deviceName} ${route}`;
      assert.ok(state.title, `${label}: has a page title`);
      assert.ok(state.contentWidth <= state.viewport + 2,
        `${label}: horizontal overflow ${state.contentWidth}px > ${state.viewport}px`);
      for (const [name, box] of [['logo', state.logo], ['menu', state.menu], ['primary CTA', state.primary], ['model image', state.mainImage]]) {
        if (!box) continue;
        assert.ok(box.width > 0 && box.left >= -2 && box.right <= state.viewport + 2,
          `${label}: ${name} goes outside viewport (${JSON.stringify(box)})`);
      }
      assert.ok(state.menu?.height >= 44, `${label}: mobile menu is a usable tap target`);

      // Every route must expose a working collapsed mobile menu in WebKit.
      // Consent is remembered as visitors navigate within one browser context.
      const reject = page.locator('[data-consent-reject]');
      if (await reject.isVisible()) await reject.click();
      const menu = page.locator('.menu-toggle');
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true', `${label}: menu opens`);
      assert.ok(await page.locator('#primary-navigation').isVisible(), `${label}: navigation visible`);
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'false', `${label}: menu closes`);

      if (route.startsWith('/modellek/')) {
        const image = page.locator('.model-photo img, .model-colour-panel:not([hidden]) img').first();
        await image.evaluate(node => node.decode());
        assert.ok(await image.evaluate(node => node.naturalWidth > 0 && node.naturalHeight > 0),
          `${label}: model photo loads and decodes`);
      }
    }
    assert.deepEqual(errors, [], `${deviceName}: no JavaScript errors`);
    await context.close();
  }
  console.log(`PASS: WebKit mobile layout, menu, CTA and model photo checks on ${profiles.join(', ')} (${routes.length} routes each).`);
} finally {
  await browser.close();
}
