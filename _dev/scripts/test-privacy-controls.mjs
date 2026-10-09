import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { launch } from 'puppeteer';

const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox','--disable-setuid-sandbox']:[]});
try {
  for(const path of ['/uzlet/','/en/visit/']) {
    const page=await browser.newPage();
    await page.setViewport({width:390,height:844});
    const requests=[];page.on('request',r=>requests.push(r.url()));
    await page.goto(base+path,{waitUntil:'networkidle2'});
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    assert.equal(requests.filter(u=>/googletagmanager|google-analytics|google\.com\/maps/.test(u)).length,0,'No optional external requests before interaction');
    assert.equal(await page.$$eval('[data-map-slot] iframe',x=>x.length),0);
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k!=='kaftan_consent_v1')),[],'Only the explicit consent preference may persist');
    assert.equal(await page.evaluate(()=>sessionStorage.length),0,'No storage on public store pages');
    if(await page.$eval('[data-consent-banner]',el=>!el.hidden)) await page.click('[data-consent-reject]');
    await page.click('[data-map-load]');
    await page.waitForSelector('[data-map-slot] iframe');
    assert.equal(await page.$$eval('#privacy-settings,[data-privacy-open]',x=>x.length),0,'No separate settings dialog');
    assert.equal(await page.$eval('[data-map-load]',x=>x.getAttribute('aria-expanded')),'true');
    await page.click('[data-map-load]');
    assert.equal(await page.$$eval('[data-map-slot] iframe',x=>x.length),0,'Same button closes map');
    assert.equal(await page.$eval('[data-map-load]',x=>x.getAttribute('aria-expanded')),'false');
    await page.click('[data-map-load]');
    await page.waitForSelector('[data-map-slot] iframe');
    await page.reload({waitUntil:'networkidle2'});
    assert.equal(await page.$$eval('[data-map-slot] iframe',x=>x.length),0,'Reload defaults to no map');
    const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(size.scroll<=size.width+1,'No mobile overflow');
    await page.close();
    const source=readFileSync('dist'+path+'index.html','utf8');
    assert.ok(!source.includes('googletagmanager.com'),'No noscript tracking fallback');
    assert.ok(!/<iframe[^>]+src="https:\/\/www.google.com\/maps/.test(source),'No static map iframe');
  }
  console.log('PASS HU/EN no tracking, no initial map, no public-page storage, explicit load, reject, reopen, reload and mobile controls');
} finally {await browser.close();}
