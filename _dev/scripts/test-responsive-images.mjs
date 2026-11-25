import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { launch } from 'puppeteer';
import { responsiveImages } from '../../src/components/responsive-images.ts';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
const guides = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname).filter(p => /^\/(utmutatok|en\/guides)\//.test(p));
assert.ok(guides.length > 0);
for (const route of guides) {
  const html = await readFile(`dist${route}index.html`, 'utf8');
  const mobile = html.match(/--hero-mobile:\s*url\('([^']+)'\)/)?.[1];
  const preload = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map(m => m[0]).find(t => t.includes('as="image"') && t.includes('max-width: 620px'));
  assert.ok(mobile?.endsWith('-480.avif'), route + ' mobile hero');
  assert.equal(preload?.match(/href="([^"]+)"/)?.[1], mobile, route + ' preloads the image actually used');
  assert.ok((await stat('public' + mobile)).size > 0);
  const desktop = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map(m => m[0]).find(t => t.includes('as="image"') && t.includes('min-width: 621px'));
  assert.ok(desktop?.includes('-800.avif'), route + ' desktop source is preserved');
}

// The compact collection's first image is the observed Lighthouse LCP element.
// Assert priorities in generated HTML, before JavaScript is able to alter anything.
for (const route of ['/kollekciok/', '/en/collections/']) {
  const html = await readFile('dist' + route + 'index.html', 'utf8');
  const cards = [...html.matchAll(/<article class="product-card"[^>]*>[\s\S]*?<\/article>/g)];
  const images = cards.map(card => card[0].match(/<img\b[^>]*>/)?.[0] ?? '');
  assert.ok(images.length > 2, route + ' has more than one product row');
  const preloads = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map(m => m[0]).filter(tag => tag.includes('as="image"'));
  assert.equal(preloads.length, 1, route + ' preloads only the first catalogue image');
  const source = cards[0][0].match(/<source\b[^>]*type="image\/avif"[^>]*>/)?.[0];
  assert.ok(source, route + ' contains AVIF source');
  for (const [preloadAttr, pictureAttr] of [['imagesrcset', 'srcset'], ['imagesizes', 'sizes']]) {
    const readAttr = (tag, name) => tag.match(new RegExp('\\b' + name + '="([^"]+)"'))?.[1];
    const expected = readAttr(source, pictureAttr);
    assert.ok(expected, route + ' has responsive ' + pictureAttr);
    assert.equal(readAttr(preloads[0], preloadAttr), expected, route + ' preload matches picture ' + pictureAttr);
  }
  assert.match(preloads[0], /\bfetchpriority="high"/, route + ' preloads the LCP candidate with high priority');
  assert.match(images[0], /\bloading="eager"/, route + ' loads LCP image eagerly');
  assert.match(images[0], /\bfetchpriority="high"/, route + ' prioritizes LCP image');
  assert.match(images[1], /\bloading="eager"/, route + ' loads second visible image eagerly');
  assert.ok(images.slice(1).every(img => !/\bfetchpriority="high"/.test(img)), route + ' reserves high priority for the first image');
  assert.ok(images.slice(2).every(img => /\bloading="lazy"/.test(img)), route + ' retains lazy loading below the first row');
}

// Exercise the existing two-card CSS layout as well as full catalogues.
const catalogue = await readFile('dist/kollekciok/index.html', 'utf8');
let seen = 0;
const twoCards = responsiveImages(catalogue.replace(/<article class="product-card"[\s\S]*?<\/article>/g, card => seen++ < 2 ? card : ''));
const browser = await launch({ headless: true, args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });
try {
  for (const route of ['/kollekciok/', '/en/collections/', '/noi-borkabatok/', '/two-card-fixture/']) {
    for (const [width, dpr] of [[320, 1], [390, 2], [768, 2], [980, 1], [1100, 2], [1365, 2]]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width, height: 844, deviceScaleFactor: dpr });
      await page.setCacheEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (request.url() === base + '/two-card-fixture/') request.respond({ status: 200, contentType: 'text/html', body: twoCards });
        else if (new URL(request.url()).origin !== new URL(base).origin) request.abort();
        else request.continue();
      });
      await page.goto(base + route, { waitUntil: 'networkidle2' });
      await page.waitForFunction(() => [...document.querySelectorAll('.product-card img')].slice(0, 2).every(img => img.complete && img.naturalWidth > 0));
      const images = await page.$$eval('.product-card img', nodes => nodes.slice(0, 2).map(img => {
        const b = img.getBoundingClientRect();
        const source = img.closest('picture').querySelector('source');
        return { width: b.width, height: b.height, src: img.currentSrc, sizes: source.sizes,
          sourceWidth: Number(img.getAttribute('width')), sourceHeight: Number(img.getAttribute('height')) };
      }));
      for (const img of images) {
        assert.ok(!img.sizes.includes('92vw'), route + ' uses grid-based allocation');
        const selected = Number(img.src.match(/-(\d+)\.avif$/)?.[1]);
        assert.ok(selected, route + ' uses an AVIF candidate');
        const needed = Math.max(img.width, img.height * img.sourceWidth / img.sourceHeight) * dpr;
        assert.ok(selected + 2 >= Math.min(needed, 1200), `${route} ${width}@${dpr}: ${selected}px must cover ${needed}px crop`);
        assert.ok(img.width > 0 && img.width < width, route + ' card fits');
      }
      if (width === 320 && dpr === 1) assert.equal(Number(images[0].src.match(/-(\d+)\.avif$/)?.[1]), 480, route + ' small screens select the small existing asset');
      await context.close();
    }
  }
  // Mobile guides should not fetch the unused desktop hero alongside the 480px one.
  for (const route of ['/utmutatok/', '/en/guides/', '/en/guides/budapest-leather-shopping-guide/']) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    const heroRequests = [];
    page.on('request', r => { if (/\/kaftan-angelo-leather-jackets-budapest-(480|800|1200)\.avif/.test(r.url())) heroRequests.push(new URL(r.url()).pathname); });
    await page.goto(base + route, { waitUntil: 'networkidle2' });
    assert.ok(heroRequests.some(url => url.endsWith('-480.avif')));
    assert.ok(!heroRequests.some(url => /-(800|1200)\.avif$/.test(url)), route + ' does not fetch an unused larger hero on mobile');
    await context.close();
  }
  console.log(`PASS: ${guides.length} guide preloads, desktop sources, live mobile requests, grid and two-card image allocation at six viewport/DPR combinations.`);
} finally { await browser.close(); }
