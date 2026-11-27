import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {launch} from 'puppeteer';
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox','--disable-setuid-sandbox']:[]});
try {
for(const lang of ['hu','en']) {
const page=await browser.newPage();await page.setViewport({width:390,height:844});
const cards=Array.from({length:80},(_,i)=>`<article class="product-card" data-category="${i<48?'leather':'fur'}"><button data-product-image="/photo-${i}.webp">Photo</button><h3>Model ${i}</h3><a href="https://wa.me/36203593216">Ask</a></article>`).join('');
await page.setContent(`<html lang="${lang}"><style>[hidden]{display:none!important}</style><div><div data-product-filters><button class="filter-btn active" data-filter="all">All</button><button class="filter-btn" data-filter="fur">Fur</button><button class="filter-btn" data-filter="empty">Empty category</button></div><div class="product-grid">${cards}</div></div><dialog data-product-dialog><button data-preview-close>Close</button><h2 data-preview-title></h2><img data-preview-image><span data-preview-count></span><a data-preview-inquiry>Ask</a><button data-preview-prev>Previous</button><button data-preview-next>Next</button></dialog></html>`);
await page.addScriptTag({content:await readFile('public/assets/js/pages.js','utf8')});
const visible=()=>page.$$eval('.product-card',cs=>cs.filter(c=>!c.hidden).length);
assert.equal(await visible(),12);
await page.click('.collection-controls button');assert.equal(await visible(),24);
await page.click('[data-filter="fur"]');assert.equal(await visible(),12);
assert.equal(await page.$eval('.collection-controls [role="status"]',e=>e.textContent),lang==='hu'?'12 / 32 modell':'12 of 32 models');
await page.click('.product-card:not([hidden]) button');assert.equal(await page.$eval('[data-preview-title]',e=>e.textContent),'Model 48');
await page.click('[data-preview-close]');await page.click('.collection-controls button');await page.click('.collection-controls button');assert.equal(await visible(),32);assert.equal(await page.$eval('.collection-controls button',e=>e.hidden),true);
await page.click('[data-filter="all"]');assert.equal(await visible(),12);
await page.click('[data-filter="empty"]');assert.equal(await visible(),0);
assert.equal(await page.$eval('.collection-empty',node=>node.hidden),false);
await page.click('[data-collection-reset]');assert.equal(await visible(),12);
assert.equal(await page.evaluate(()=>document.activeElement.dataset.filter),'all');
await page.close();
}
console.log('PASS: 80-model HU/EN mobile gallery, batches, filter reset, dialog and final batch.');
// Exercise the built site as well as the deliberately large synthetic gallery.
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
for(const lang of ['hu','en']) {
 for(const width of [320,390,1365]) {
  const context=await browser.createBrowserContext();
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width,height:800});
  await page.goto(base+(lang==='hu'?'/kollekciok/':'/en/collections/'),{waitUntil:'networkidle2'});
  if(await page.$eval('[data-consent-banner]',node=>!node.hidden))await page.click('[data-consent-reject]');
  const header=await page.evaluate(()=>{
   const hero=document.querySelector('.page-hero');
   return {
    heading:hero.querySelector('h1').textContent.trim(),
    heroHeight:hero.getBoundingClientRect().height,
    heroImage:getComputedStyle(hero).backgroundImage,
    announcement:!!document.querySelector('.announcement'),
    mobilePreload:!!document.querySelector('link[rel="preload"][as="image"][media="(max-width: 620px)"]'),
    headerVisible:document.querySelector('.site-header').getBoundingClientRect().height>0
   };
  });
  assert.ok(header.heading.length>20 && header.headerVisible,'Keep the real heading and navigation');
  assert.equal(header.announcement,false,'No rotating announcement strip at any viewport');
  if(width<=620) {
   assert.equal(header.heroImage,'none','No decorative mobile collection hero image');
   assert.equal(header.mobilePreload,false,'Do not preload unused mobile hero');
   assert.ok(header.heroHeight<=240,'Compact mobile collection title');
  } else {
   assert.notEqual(header.heroImage,'none','Retain desktop hero');
  }
  if(process.env.COLLECTION_SCREENSHOTS) {
   await mkdir(process.env.COLLECTION_SCREENSHOTS,{recursive:true});
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:process.env.COLLECTION_SCREENSHOTS+'/'+lang+'-'+width+'-top.png'});
   await page.$eval('.collection-discovery',el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   await page.screenshot({path:process.env.COLLECTION_SCREENSHOTS+'/'+lang+'-'+width+'-collection.png'});
  }
  const categories=await page.$$eval('.product-card',cards=>cards.map(card=>(card.dataset.category||'').split(/\s+/)));
  const filters=await page.$$eval('[data-product-filters] [data-filter]',buttons=>buttons.map(button=>button.dataset.filter));
  assert.ok(categories.length>0,'Real collection contains photographed models');
  for(const filter of filters) {
   await page.locator(`[data-product-filters] [data-filter="${filter}"]`).click();
   const count=filter==='all'?categories.length:categories.filter(values=>values.includes(filter)).length;
   assert.equal(await page.$$eval('.product-card',cards=>cards.filter(card=>!card.hidden).length),Math.min(12,count));
   assert.equal(await page.$eval(`[data-filter="${filter}"]`,button=>button.getAttribute('aria-pressed')),'true');
   assert.equal(await page.$eval('.collection-empty',node=>node.hidden),count>0);
   if(count===0) {
    const explanation=await page.$eval('.collection-empty p',node=>node.textContent);
    assert.match(explanation,lang==='hu'?/nincs modellfotó/:/no model photos/);
    assert.equal(await page.$eval('.collection-empty a',link=>link.getAttribute('href')),lang==='hu'?'/uzlet/':'/en/visit/');
    assert.equal(await page.$eval('.collection-controls > button',button=>button.hidden),true);
    const targets=await page.$$eval('.collection-empty button,.collection-empty a',nodes=>nodes.map(node=>{
     const rect=node.getBoundingClientRect();return {height:rect.height,left:rect.left,right:rect.right};
    }));
    for(const target of targets)assert.ok(target.height>=44&&target.left>=-1&&target.right<=width+1,'Empty-state controls fit and are tappable');
    await page.focus('[data-collection-reset]');
    if(width===1365)await page.keyboard.press('Enter');else await page.click('[data-collection-reset]');
    assert.equal(await page.$eval('.collection-empty',node=>node.hidden),true);
    assert.equal(await page.$eval('[data-filter="all"]',button=>button.getAttribute('aria-pressed')),'true');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.filter),'all','Reset restores focus to visible filter');
   }
  }
  await page.locator('[data-filter="all"]').click();
  for(let batch=0;batch<Math.ceil(categories.length/12);batch++){
   if(await page.$eval('.collection-controls > button',button=>button.hidden))break;
   const before=await page.$$eval('.product-card',cards=>cards.filter(card=>!card.hidden).length);
   await page.locator('.collection-controls > button').click();
   assert.equal(new URL(page.url()).pathname,lang==='hu'?'/kollekciok/':'/en/collections/','Load more must stay on collection');
   assert.equal(await page.$$eval('.product-card',cards=>cards.filter(card=>!card.hidden).length),Math.min(before+12,categories.length),'Each batch must reveal more models');
  }
  assert.equal(await page.$$eval('.product-card',cards=>cards.filter(card=>!card.hidden).length),categories.length);
  const modelSelector=lang==='hu'?'.product-card a[href^="/modellek/"]':'.product-card a[href^="/en/models/"]';
  const destination=await page.$eval(modelSelector,link=>link.getAttribute('href'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator(modelSelector).click()]);
  assert.equal(new URL(page.url()).pathname,destination,'Real model card opens its model page');
  assert.ok(await page.$('h1'));
  assert.deepEqual(errors,[]);
  await context.close();
 }
}
console.log('PASS: real HU/EN collection filters, empty guidance, reset/focus, batches and model navigation at 320/390 px and desktop.');

for(const lang of ['hu','en']) {
 const context=await browser.createBrowserContext();
 const page=await context.newPage();
 await page.setViewport({width:390,height:844});
 const hub=base+(lang==='hu'?'/kollekciok/':'/en/collections/');
 await page.goto(hub,{waitUntil:'networkidle2'});
 if(await page.$eval('[data-consent-banner]',node=>!node.hidden))await page.click('[data-consent-reject]');
 const visible=()=>page.$$eval('.product-card',cards=>cards.filter(card=>!card.hidden).length);
 await page.locator('#style-finder summary').click();
 await page.select('[data-style-finder] [name="look"]','blazer');
 await page.select('[data-style-finder] [name="tone"]','white');
 await page.locator('[data-style-finder] button').click();
 assert.equal(await visible(),1);
 const match = '.product-card:not([hidden])';
 assert.match(await page.$eval(match+' h3',node=>node.textContent),lang==='hu'?/Fehér női bőrblézer/:/White women’s leather blazer/);
 await page.locator(match+' [data-model-save]').click();
 await page.locator('[data-mobile-fitting-link]').click();
 await page.waitForFunction(()=>document.querySelector('[data-fitting-toggle]').getAttribute('aria-pressed')==='true');
 assert.equal(await visible(),1);
 assert.equal(await page.$eval(match+' [data-model-save]',node=>node.getAttribute('aria-pressed')),'true');
 await page.$eval(match+' [data-model-save]',button=>button.scrollIntoView({block:'center'}));
 await page.locator(match+' [data-model-save]').click();
 await page.goto(hub,{waitUntil:'networkidle2'});
 await page.click('[data-global-search-open]');
 await page.waitForSelector('[data-global-search-dialog][open] [data-global-search-input]');
 await page.type('[data-global-search-input]',lang==='hu'?'ketoldalas':'reversible');
 await page.waitForFunction(()=>document.querySelectorAll('[data-global-search-results] .gs-item').length>0);
 assert.ok(await page.$eval('[data-global-search-results]',el=>/Kétoldalas|Reversible/.test(el.textContent)),'Accent-insensitive model search');
 await page.click('[data-global-search-close]');
 await page.select('[data-model-colour]','green');
 assert.ok(await visible()>0);
 assert.ok(await page.$eval('.product-card:not([hidden]) h3',el=>/Kétoldalas|Reversible/.test(el.textContent)),'Verified variant colours are searchable');
 await page.select('[data-model-colour]','');
 await page.select('[data-model-style]','reversible');assert.equal(await visible(),1);
 await page.select('[data-model-style]','');
 await page.locator('.product-card:not([hidden]) [data-model-save]').click();
 assert.equal(await page.$eval('.product-card:not([hidden]) [data-model-save]',el=>el.getAttribute('aria-pressed')),'true');
 await page.reload({waitUntil:'networkidle2'});
 assert.equal(await page.$eval('.product-card:not([hidden]) [data-model-save]',el=>el.getAttribute('aria-pressed')),'true');
 await page.locator('[data-fitting-toggle]').click();
 assert.equal(await visible(),1);
 if(process.env.COLLECTION_SCREENSHOTS) {
  await page.$eval('.fitting-panel',el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await page.screenshot({path:process.env.COLLECTION_SCREENSHOTS+'/'+lang+'-390-fitting-list.png'});
 }
 const href=await page.$eval('[data-fitting-inquiry]',el=>el.href);
 const savedModelPath=lang==='hu'?'/modellek/noi-ketoldalas-vizallo-borkabat-budapest/':'/en/models/reversible-womens-leather-jacket-budapest/';
 assert.ok(new URL(href).searchParams.get('text').includes('https://kaftanangelo.com'+savedModelPath));
 await page.locator('.product-card:not([hidden]) [data-model-save]').click();
 assert.equal(await visible(),0);
 assert.equal(await page.$eval('[data-fitting-inquiry]',el=>el.hidden),true);
 await page.locator('[data-fitting-toggle]').click();
 assert.equal(await visible(),12);
 await context.close();
}
console.log('PASS: HU/EN collection search, verified colour/style facets, persistent fitting list and inquiry.');

// Delay the real deferred script to simulate a slow mobile connection. The
// complete catalogue toolbar must already be painted, without moving cards
// when the script arrives. Also check that no-JS visitors retain all models.
for(const lang of ['hu','en']) {
 const hub=base+(lang==='hu'?'/kollekciok/':'/en/collections/');
 const context=await browser.createBrowserContext();
 const page=await context.newPage();
 await page.setViewport({width:390,height:844});
 await page.setRequestInterception(true);
 let heldRequest;
 let signalHeld;
 const scriptHeld=new Promise(resolve=>{signalHeld=resolve;});
 page.on('request',request=>{
  if(new URL(request.url()).pathname==='/assets/js/pages.js'){
   heldRequest=request;
   signalHeld();
  }else request.continue();
 });
 const navigation=page.goto(hub,{waitUntil:'domcontentloaded'});
 try{
  await scriptHeld;
  await page.waitForSelector('[data-static-collection] .product-card');
  await page.evaluate(()=>document.fonts.ready);
  const geometry=()=>page.$eval('[data-static-collection]',grid=>{
   const card=grid.querySelector('.product-card');
   const box=card.getBoundingClientRect();
   const toolbar=grid.previousElementSibling;
   return {top:box.top,width:box.width,height:box.height,toolbarHeight:toolbar.getBoundingClientRect().height,disabled:toolbar.querySelector('[data-model-colour]').disabled};
  });
  const before=await geometry();
  assert.ok(before.disabled && before.toolbarHeight>0,'Static discovery visible before JavaScript binds');
  assert.equal(await page.$$eval('[data-static-collection] .product-card',cards=>cards.filter(card=>getComputedStyle(card).display!=='none').length),12);
  await heldRequest.continue();
  heldRequest=null;
  await navigation;
  await page.waitForFunction(()=>!document.querySelector('[data-model-colour]').disabled);
  await page.evaluate(()=>document.fonts.ready);
  const after=await geometry();
  for(const key of ['top','width','height','toolbarHeight'])assert.ok(Math.abs(before[key]-after[key])<=1,lang+' discovery hydration must not change '+key+': '+before[key]+' -> '+after[key]);
 }finally{
  if(heldRequest)await heldRequest.continue();
  await navigation.catch(()=>{});
  await context.close();
 }
 const noJs=await browser.createBrowserContext();
 const plain=await noJs.newPage();
 await plain.setJavaScriptEnabled(false);
 await plain.goto(hub,{waitUntil:'load'});
 const state=await plain.$$eval('[data-static-collection] .product-card',cards=>({all:cards.length,visible:cards.filter(card=>getComputedStyle(card).display!=='none').length}));
 assert.ok(state.all>12 && state.visible===state.all,'All model links remain visible without JavaScript');
 assert.equal(await plain.$eval('[data-static-discovery]',el=>getComputedStyle(el).display),'none');
 await noJs.close();
}
console.log('PASS: HU/EN delayed script keeps the first card and toolbar stationary; no-JS catalogue retains all models.');

}finally{await browser.close();}
