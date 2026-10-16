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
 // Ad click IDs and on-site colour variants must not defeat explicit consent.
 // Unknown or sensitive query parameters still fail closed.
 for (const scenario of [
  {name:'Google Ads gclid',url:'/en/visit/?gclid=EAIaIQobChMI123_test',permitted:true},
  {name:'Ads source and campaign',url:'/en/visit/?gad_source=1&gad_campaignid=1234567890&gclid=Click123',permitted:true},
  {name:'Google b/wbraid',url:'/en/visit/?gbraid=0AAAA_test-123&wbraid=Cj8_Test-123',permitted:true},
  {name:'Colour selection',url:'/en/visit/?colour=black',permitted:true},
  {name:'Campaign plus ad click',url:'/en/visit/?utm_source=google&utm_medium=cpc&utm_campaign=leather-jackets&gclid=Click123',permitted:true},
  {name:'Unknown parameter',url:'/en/visit/?email=visitor%40example.com',permitted:false},
  {name:'Unsafe click ID',url:'/en/visit/?gclid=visitor%40example.com',permitted:false}
 ]) {
  const caseContext=await browser.createBrowserContext();const casePage=await caseContext.newPage();
  const trackerRequests=[];
  casePage.on('request',r=>trackerRequests.push(r.url()));
  await casePage.setRequestInterception(true);
  casePage.on('request',r=>/googletagmanager|google-analytics|clarity\.ms/.test(r.url())?r.respond({status:200,contentType:'application/javascript',body:''}):r.continue());
  await casePage.goto(base+scenario.url,{waitUntil:'networkidle2'});
  assert.equal(await casePage.evaluate(()=>window.kaftanAnalytics.permitted),scenario.permitted,scenario.name+' URL classification');
  assert.equal(trackerRequests.filter(u=>/googletagmanager|google-analytics|clarity\.ms/.test(u)).length,0,scenario.name+' before consent');
  await casePage.click('[data-consent-accept]');
  assert.equal(await casePage.$$eval('script[src*="googletagmanager"]',els=>els.length),scenario.permitted?1:0,scenario.name+' after consent');
  assert.equal(await casePage.evaluate(()=>window.dataLayer.some(entry=>entry?.[0]==='consent'&&entry[1]==='update'&&entry[2].ad_storage==='denied')),true,scenario.name+' does not grant ad storage');
  await caseContext.close();
 }
 for (const source of ['instagram','facebook','tiktok']) {
  const socialContext=await browser.createBrowserContext();const socialPage=await socialContext.newPage();
  const socialRequests=[];socialPage.on('request',r=>socialRequests.push(r.url()));
  await socialPage.setRequestInterception(true);socialPage.on('request',r=>/googletagmanager|google-analytics|clarity\.ms/.test(r.url())?r.respond({status:200,contentType:'application/javascript',body:''}):r.continue());
  await socialPage.goto(base+'/en/visit/?utm_source='+source+'&utm_medium=social&utm_campaign=profile&utm_content=bio&fbclid=test_click_123&ttclid=test_click_456&igshid=test_click_789',{waitUntil:'networkidle2'});
  assert.equal(socialRequests.some(u=>/googletagmanager|google-analytics|clarity\.ms/.test(u)),false);
  assert.equal(await socialPage.evaluate(()=>window.kaftanAnalytics.permitted),true);
  assert.deepEqual(await socialPage.evaluate(()=>window.kaftanAnalytics.campaign),{campaign_source:source,campaign_medium:'social',campaign_name:'profile',campaign_content:'bio'});
  assert.equal(await socialPage.evaluate(()=>/fbclid|ttclid|igshid/.test(location.search)),false);
  await socialPage.click('[data-consent-accept]');
  await socialPage.waitForSelector('script[src*="googletagmanager"]');
  assert.ok(await socialPage.evaluate(()=>window.dataLayer.some(e=>e.event==='kaftan_analytics_ready')));
  await socialContext.close();
 }
 console.log('PASS consent defaults, reject persistence, independent categories, interest event, withdrawal, mobile and partner exclusion');
}finally{await browser.close();}
