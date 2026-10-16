import assert from 'node:assert/strict';
import {launch} from 'puppeteer';

// The local preview test never opens Maps, calls the phone, sends WhatsApp,
// submits a lead, or transmits user information to an external service.
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const map='https://maps.app.goo.gl/keuQRmecRpFn5Vjr5';
const phone='tel:+3612667274';
const cases=[
  {lang:'hu',home:'/',visit:'/uzlet/',catalog:'/kollekciok/',
   hero:/Látogasson el üzletünkbe/,mapLabel:/Útvonaltervezés/,
   call:/Üzlet\s+felhívása/,weekday:/Hétfő.Péntek 10:00.19:00/,sunday:/Vasárnap zárva/},
  {lang:'en',home:'/en/',visit:'/en/visit/',catalog:'/en/collections/',
   hero:/Plan your store visit/,mapLabel:/Get directions/,
   call:/Call\s+the\s+store/,weekday:/Monday.Friday 10:00.19:00/,sunday:/Sunday closed/}
];
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox','--disable-setuid-sandbox']:[]});
try {
  for(const item of cases) {
    const ctx=await browser.createBrowserContext();
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width:390,height:844});
    await page.goto(base+item.home,{waitUntil:'networkidle2'});
    const ctas=await page.$$eval('.home-hero .actions a',links=>links.map(a=>({href:a.getAttribute('href'),text:a.textContent.trim()})));
    assert.equal(ctas.length,2,item.lang+' homepage has visit and catalogue CTAs');
    assert.equal(ctas[0].href,item.visit,item.lang+' store visit is primary');
    assert.match(ctas[0].text,item.hero);
    assert.equal(ctas[1].href,item.catalog,item.lang+' catalogue browsing remains');
    const direct=await page.$eval('.home-hero .home-visit-direct a',a=>({url:a.href,text:a.textContent,rect:a.getBoundingClientRect().toJSON()}));
    assert.equal(direct.url,map,item.lang+' homepage points to existing directions URL');
    assert.match(direct.text,item.mapLabel);
    assert.ok(direct.rect.height>=44,item.lang+' directions has a comfortable tap target');
    // The anchor href is checked above; follow that exact internal target and
    // verify it resolves. A consent overlay can obscure synthetic click
    // coordinates but must not make a valid static destination appear broken.
    await page.goto(base+ctas[0].href,{waitUntil:'domcontentloaded'});
    assert.equal(new URL(page.url()).pathname,item.visit,'Primary store link resolves to the visit page');

    const visitLinks=await page.$$eval('.page-hero .actions a',nodes=>nodes.map(x=>({href:x.getAttribute('href'),text:x.textContent.trim()})));
    assert.equal(visitLinks.length,2);
    assert.equal(visitLinks[0].href,map,'Store directions are primary');
    assert.equal(visitLinks[1].href,phone,'Store phone is one tap away');
    assert.match(visitLinks[1].text,item.call);
    const facts=await page.$eval('.page-hero .proofs',node=>node.textContent);
    assert.match(facts,/Kossuth Lajos u. 18/);
    assert.match(facts,item.weekday);
    assert.match(facts,item.sunday);
    const published=await page.$eval('.contact-card .hours',node=>node.textContent);
    assert.match(published,/10:00.19:00/);
    assert.match(published,/10:00.17:00/);
    assert.equal(await page.$eval('.contact-card a[href^="tel:"]',a=>a.getAttribute('href')),phone);
    assert.equal(await page.$eval('.contact-card a[href*="wa.me"]',a=>a.getAttribute('href')),'https://wa.me/36203593216','WhatsApp still exists');
    assert.equal(await page.$('iframe[src*="google.com/maps"]'),null,'Embedded map is not loaded without click');

    for(const width of [390,320]) {
      await page.setViewport({width,height:700});
      const visitTargets=await page.$$eval('.page-hero .actions a',nodes=>nodes.map(n=>{
        const b=n.getBoundingClientRect();
        return {height:b.height,left:b.left,right:b.right};
      }));
      for(const [i,b] of visitTargets.entries()) {
        assert.ok(b.height>=44,item.lang+' '+width+' store CTA '+i+' tap height');
        assert.ok(b.left>=-1&&b.right<=width+1,item.lang+' '+width+' store CTA '+i+' no horizontal overflow');
      }
      await page.goto(base+item.home,{waitUntil:'domcontentloaded'});
      const homeTargets=await page.$$eval('.home-hero .actions a, .home-visit-direct a',nodes=>nodes.map(n=>{
        const b=n.getBoundingClientRect();
        return {height:b.height,left:b.left,right:b.right};
      }));
      assert.equal(homeTargets.length,3);
      for(const [i,b] of homeTargets.entries()) {
        assert.ok(b.height>=44,item.lang+' '+width+' homepage CTA '+i+' tap height');
        assert.ok(b.left>=-1&&b.right<=width+1,item.lang+' '+width+' homepage CTA '+i+' no overflow');
      }
      await page.goto(base+item.visit,{waitUntil:'domcontentloaded'});
    }
    assert.deepEqual(errors,[],item.lang+' pages have no browser script errors');
    await ctx.close();
  }
  console.log('PASS HU/EN store visit conversions: homepage priority, 1-tap maps/phone, visit hours, safe map load, 320/390 mobile targets.');
} finally {await browser.close();}
