import assert from 'node:assert/strict';
import {launch} from 'puppeteer';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox','--disable-setuid-sandbox']:[]});
try{
 for(const path of ['/uzlet/','/en/visit/']){
  const context=await browser.createBrowserContext();const page=await context.newPage();await page.setViewport({width:390,height:844});
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.setRequestInterception(true);page.on('request',r=>/googletagmanager|google-analytics|clarity\.ms/.test(r.url())?r.respond({status:200,contentType:'application/javascript',body:''}):r.continue());
  await page.goto(base+path,{waitUntil:'networkidle2'});
  assert.equal(requests.filter(u=>/googletagmanager|google-analytics|clarity\.ms/.test(u)).length,0);
  assert.equal(await page.$eval('[data-consent-analytics]',el=>el.checked),false);
  assert.equal(await page.$eval('[data-consent-recordings]',el=>el.checked),false);
  await page.click('[data-consent-reject]');await page.reload({waitUntil:'networkidle2'});
  assert.equal(requests.filter(u=>/googletagmanager|google-analytics|clarity\.ms/.test(u)).length,0,'Reject survives reload without trackers');
  await page.click('[data-consent-open]');await page.click('[data-consent-customize]');await page.click('[data-consent-analytics]');await page.click('[data-consent-save]');
  await page.waitForFunction(()=>window.kaftanAnalytics.choice.analytics);
  assert.equal(await page.evaluate(()=>window.kaftanAnalytics.choice.recordings),false);
  const events=await page.evaluate(()=>window.dataLayer.filter(e=>e.event).map(e=>e.event));assert.ok(events.includes('kaftan_analytics_ready'));assert.ok(!events.includes('kaftan_recordings_ready'));
  await page.evaluate(()=>document.querySelector('main a[href^="tel:"]').addEventListener('click',e=>e.preventDefault()));await page.click('main a[href^="tel:"]');
  assert.ok(await page.evaluate(()=>window.dataLayer.some(e=>e.event==='kaftan_interest'&&e.interest_action==='phone_click')));
  await page.click('[data-consent-open]');await page.click('[data-consent-reject]');await page.waitForFunction(()=>window.kaftanAnalytics&&!window.kaftanAnalytics.choice.analytics);
  assert.equal(await page.evaluate(()=>window.dataLayer.some(e=>e.event==='kaftan_analytics_ready')),false,'Withdrawal reload does not initialize GA');
  await page.click('[data-consent-open]');await page.click('[data-consent-customize]');await page.click('[data-consent-recordings]');await page.click('[data-consent-save]');
  assert.equal(await page.evaluate(()=>window.kaftanAnalytics.choice.analytics),false);
  assert.ok(await page.evaluate(()=>window.dataLayer.some(e=>e.event==='kaftan_recordings_ready')));
  assert.ok(!(await page.evaluate(()=>window.dataLayer.some(e=>e.event==='kaftan_analytics_ready'))));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await context.close();
 }
 const context=await browser.createBrowserContext();const page=await context.newPage();await page.goto(base+'/en/partner-portal/',{waitUntil:'networkidle2'});
 assert.equal(await page.$('[data-consent-banner]'),null);assert.equal(await page.evaluate(()=>typeof window.kaftanAnalytics),'undefined');await context.close();
 const privateContext=await browser.createBrowserContext();const privatePage=await privateContext.newPage();
 await privatePage.goto(base+'/en/visit/?utm_source=private%40example.com',{waitUntil:'networkidle2'});
 assert.equal(await privatePage.evaluate(()=>window.kaftanAnalytics.permitted),false,'Sensitive campaign values cannot enable tracking');
 await privatePage.click('[data-consent-accept]');
 assert.equal(await privatePage.$$eval('script[src*="googletagmanager"]',els=>els.length),0);
 await privateContext.close();
 console.log('PASS consent defaults, reject persistence, independent categories, interest event, withdrawal, mobile and partner exclusion');
}finally{await browser.close();}
