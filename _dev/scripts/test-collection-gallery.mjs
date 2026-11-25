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
// Ensure the announcement is omitted at build time on all ten collection routes,
// while the regular store/home pages keep their existing announcement.
for(const route of ['kollekciok','noi-borkabatok','ferfi-borkabatok','irhakabatok','szormekabatok','en/collections','en/womens-leather-jackets','en/mens-leather-jackets','en/shearling-jackets','en/fur-coats']) {
 const html=await readFile('dist/'+route+'/index.html','utf8');
 assert.ok(!html.includes('class="announcement"'),route+' must not render the announcement');
 assert.ok(html.includes('class="site-header"'),route+' must preserve navigation');
}
for(const route of ['','en/','uzlet/','en/visit/']) {
 const html=await readFile('dist/'+route+'index.html','utf8');
 assert.ok(html.includes('class="announcement"'),route+' keeps its regular announcement');
}
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
    heroPreload:!!document.querySelector('link[rel="preload"][as="image"][media]'),
    headerVisible:document.querySelector('.site-header').getBoundingClientRect().height>0
   };
  });
  assert.ok(header.heading.length>20 && header.headerVisible,'Keep the real heading and navigation');
  assert.equal(header.heroImage,'none','No decorative collection hero image at any viewport');
  assert.equal(header.announcement,false,'No promotional announcement rendered on collections');
  assert.equal(header.heroPreload,false,'Do not preload unused collection hero images');
  assert.ok(header.heroHeight<=240,'Compact collection title');
  if(process.env.COLLECTION_SCREENSHOTS) {
   await mkdir(process.env.COLLECTION_SCREENSHOTS,{recursive:true});
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:process.env.COLLECTION_SCREENSHOTS+'/'+lang+'-'+width+'-top.png'});
   await page.$eval('.collection-discovery',el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   await page.screenshot({path:process.env.COLLECTION_SCREENSHOTS+'/'+lang+'-'+width+'-collection.png'});
  }
  const editorial=await page.evaluate(()=>{
   const strip=document.querySelector('.collection-filter-strip');
   const search=document.querySelector('.collection-search');
   const card=document.querySelector('[data-static-collection] .product-card');
   const photo=card.querySelector('.collection-photo');
   const rect=node=>node.getBoundingClientRect().toJSON();
   return {strip:rect(strip),search:rect(search),photo:rect(photo),detail:rect(photo.querySelector('.collection-detail')),save:rect(photo.querySelector('[data-model-save]')),contact:rect(card.querySelector('a[href*="wa.me"]')),heading:rect(card.querySelector('h3')),overflow:document.documentElement.scrollWidth>innerWidth,filterCount:strip.querySelectorAll('[data-filter]').length,accessibleDetail:photo.querySelector('.collection-detail').getAttribute('aria-label')};
  });
  assert.equal(editorial.overflow,false,'Editorial catalogue must not overflow the viewport');
  assert.ok(editorial.filterCount>=6,'Existing categories are inside the compact filter strip');
  assert.ok(editorial.search.bottom<=editorial.strip.top+1,'Search precedes the filter strip');
  assert.ok(editorial.strip.height<=68,'One filter row, including horizontal scroll');
  for(const key of ['detail','save']) {
   const rect=editorial[key];
   assert.ok(rect.width>=44&&rect.height>=44,key+' overlay has a comfortable touch target');
   assert.ok(rect.left>=editorial.photo.left&&rect.right<=editorial.photo.right&&rect.top>=editorial.photo.top&&rect.bottom<=editorial.photo.bottom,key+' sits inside product photo');
  }
  assert.ok(editorial.contact.height>=44&&editorial.contact.width>=44,'Direct contact remains accessible');
  assert.ok(editorial.accessibleDetail?.length>10,'Icon link has a model-specific accessible name');
  if(width===390)assert.ok(editorial.photo.top<430,'First product photo appears early on mobile');
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
  const destinationUrl = new URL(destination, base);
  const actualUrl = new URL(page.url());
  assert.equal(actualUrl.pathname + actualUrl.search, destinationUrl.pathname + destinationUrl.search, 'Real model card opens its model page and selected colour');
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
 await page.type('[data-model-search]',lang==='hu'?'ketoldalas':'reversible');
 assert.equal(await visible(),5,'Accent-insensitive model search finds all five reversible colour cards');
 await page.$eval('[data-model-search]',el=>{el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.select('select[data-model-colour]','green');
 assert.ok(await visible()>0);
 assert.equal(await page.$eval('[data-active-filters]',el=>el.hidden),false,'Active filter chips appear when a facet is selected');
 assert.ok(await page.$$eval('[data-active-filters] .filter-chip',chips=>chips.length>=1),'At least one removable filter chip is rendered');
 assert.ok(await page.$eval('.product-card:not([hidden]) h3',el=>/kétoldalas|reversible/i.test(el.textContent)),'Verified variant colours are searchable');
 assert.deepEqual(await page.$$eval('.product-card:not([hidden])[data-model-colour]',cards=>cards.map(c=>c.dataset.modelColour)),['green'],'Colour filter matches only the selected reversible colour card');
 await page.locator('[data-clear-all-filters]').click();
 assert.equal(await page.$eval('[data-active-filters]',el=>el.hidden),true,'Clear all hides active filter chips');
 assert.equal(await page.$eval('select[data-model-colour]',el=>el.value),'','Clear all resets colour select');
 await page.select('[data-model-style]','reversible');assert.equal(await visible(),5);
 await page.locator('[data-remove-filter="style"]').click();
 assert.equal(await page.$eval('[data-active-filters]',el=>el.hidden),true,'Removing the only chip hides the active filter bar');
 assert.equal(await page.evaluate(()=>!document.querySelector('[data-fitting-tray]') || document.querySelector('[data-fitting-tray]').hidden),true,'Floating fitting tray stays hidden when list is empty');
 await page.locator('.product-card:not([hidden]) [data-model-save]').click();
 assert.equal(await page.$eval('.product-card:not([hidden]) [data-model-save]',el=>el.getAttribute('aria-pressed')),'true');
 assert.equal(await page.$eval('[data-fitting-tray]',el=>el.hidden),false,'Floating fitting tray appears when a model is saved');
 assert.ok(await page.$eval('[data-fitting-tray-inquiry]',el=>el.href.includes('wa.me/36203593216')),'Floating fitting tray provides direct WhatsApp inquiry');
 await page.reload({waitUntil:'networkidle2'});
 assert.equal(await page.$eval('.product-card:not([hidden]) [data-model-save]',el=>el.getAttribute('aria-pressed')),'true');
 assert.equal(await page.$eval('[data-fitting-tray]',el=>el.hidden),false,'Floating fitting tray persists after reload');
 // Verify upgraded Quick View lightbox (lazy gallery thumbs, model detail link, bidirectional fitting-list toggle)
 await page.locator('.product-card:not([hidden]) .product-image-button').click();
 assert.equal(await page.$eval('[data-product-dialog]',el=>el.open),true,'Quick View dialog opens');
 assert.equal(await page.$eval('[data-preview-detail]',el=>el.hidden),false,'Quick View shows direct model detail link');
 await page.waitForSelector('[data-preview-thumbs]:not([hidden]) .preview-thumb');
 assert.ok(await page.$$eval('[data-preview-thumbs] .preview-thumb',els=>els.length>=2),'Quick View loads gallery thumbnails lazily for multi-photo models');
 assert.equal(await page.$eval('[data-preview-save]',el=>el.getAttribute('aria-pressed')),'true','Quick View reflects saved fitting-list state');
 await page.locator('[data-preview-save]').click();
 assert.equal(await page.$eval('[data-preview-save]',el=>el.getAttribute('aria-pressed')),'false','Quick View toggles fitting-list save off');
 assert.equal(await page.$eval('[data-fitting-tray]',el=>el.hidden),true,'Unsaving from Quick View hides empty floating tray');
 await page.locator('[data-preview-save]').click();
 assert.equal(await page.$eval('[data-preview-save]',el=>el.getAttribute('aria-pressed')),'true','Quick View toggles fitting-list save back on');
 await page.locator('[data-preview-close]').click();
 await page.locator('[data-fitting-toggle]').click();
 assert.equal(await visible(),1);
 if(process.env.COLLECTION_SCREENSHOTS) {
  await page.$eval('.fitting-panel',el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await page.screenshot({path:process.env.COLLECTION_SCREENSHOTS+'/'+lang+'-390-fitting-list.png'});
 }
 const href=await page.$eval('[data-fitting-inquiry]',el=>el.href);
 assert.ok(new URL(href).searchParams.get('text').includes('/noi-ketoldalas-vizallo-borkabat-budapest/?colour=red'));
 await page.locator('.product-card:not([hidden]) [data-model-save]').click();
 assert.equal(await visible(),0);
 assert.equal(await page.$eval('[data-fitting-inquiry]',el=>el.hidden),true);
 assert.equal(await page.$eval('[data-fitting-tray]',el=>el.hidden),true,'Floating fitting tray hides again when last item is removed');
 await page.locator('[data-fitting-toggle]').click();
 assert.equal(await visible(),12);
 await context.close();
}
console.log('PASS: HU/EN collection search, active filter chips, floating fitting tray, Quick View gallery/save, and persistent fitting list.');

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
   return {top:box.top,width:box.width,height:box.height,toolbarHeight:toolbar.getBoundingClientRect().height,disabled:toolbar.querySelector('[data-model-search]').disabled};
  });
  const before=await geometry();
  assert.ok(before.disabled && before.toolbarHeight>0,'Static discovery visible before JavaScript binds');
  assert.equal(await page.$$eval('[data-static-collection] .product-card',cards=>cards.filter(card=>getComputedStyle(card).display!=='none').length),12);
  await heldRequest.continue();
  heldRequest=null;
  await navigation;
  await page.waitForFunction(()=>!document.querySelector('[data-model-search]').disabled);
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
