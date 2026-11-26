import assert from 'node:assert/strict';
import {launch} from 'puppeteer';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox','--disable-setuid-sandbox']:[]});
try {
  for(const lang of ['hu','en']) {
    const context=await browser.createBrowserContext();
    const page=await context.newPage();
    await page.setRequestInterception(true);
    page.on('request',r=>new URL(r.url()).origin===new URL(base).origin?r.continue():r.abort());
    const routes=lang==='hu'?['/','/kollekciok/','/uzlet/']:['/en/','/en/collections/','/en/visit/'];
    for(const width of [320,390,768,1365]) {
      await page.setViewport({width,height:844});
      for(const route of routes) {
        await page.goto(base+route,{waitUntil:'networkidle2'});
        await page.evaluate(()=>document.fonts.ready);
        const state=await page.evaluate(()=>({
          overflow:document.documentElement.scrollWidth>innerWidth+1,
          brand:document.querySelector('.brand').textContent,
          text:document.body.innerText,
          font:getComputedStyle(document.body).fontFamily,
          title:document.title
        }));
        assert.equal(state.overflow,false,`${route} ${width}: no horizontal page overflow`);
        assert.match(state.brand,/Kaftan\s*Angelo/);
        assert.doesNotMatch(state.text+' '+state.title,/motta/i,'Only the store brand appears in public copy');
        assert.match(state.font,/Outfit/,'Shared local typography');
      }
      await page.goto(base+routes[0],{waitUntil:'networkidle2'});
      if(width<1101) {
        if(await page.$eval('[data-consent-banner]',n=>!n.hidden))await page.click('[data-consent-reject]');
        await page.click('.menu-toggle');
        assert.equal(await page.$eval('[data-menu]',n=>getComputedStyle(n).display!=='none'),true,'Mobile navigation opens');
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('.menu-toggle',n=>n.getAttribute('aria-expanded')),'false');
      }
      assert.equal(await page.$eval('.header-search-bar',n=>n.getBoundingClientRect().height>=44),true,'Search remains an accessible full-width control');
      await page.click('[data-showcase-tab="women"]');
      assert.equal(await page.$eval('[data-showcase-panel="women"]',n=>n.hidden),false,'Category tab reveals its products');
    }
    await context.close();
  }
  console.log('PASS HU/EN shared layout at 320/390/768/1365px: overflow, store branding, local typography, mobile menu, search and category tabs.');
} finally {await browser.close();}
