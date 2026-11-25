import assert from 'node:assert/strict';
import {launch} from 'puppeteer';
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
try {
 const page=await browser.newPage();await page.setViewport({width:390,height:844});
 for(const lang of ['hu','en']){
  await page.goto(base+(lang==='hu'?'/modellek/':'/en/models/')+'noi-ketoldalas-vizallo-borkabat-budapest/?colour=invalid',{waitUntil:'networkidle2'});
  assert.equal(await page.$$eval('[data-colour-panel]',panels=>panels.filter(p=>!p.hidden).length),1);
  for(const colour of ['red','cream','orange','green','black']){
   await page.click(`[data-colour="${colour}"]`);
   assert.equal(new URL(page.url()).searchParams.get('colour'), colour);
   assert.equal(await page.$eval('.language-choice a.language-option', a => new URL(a.href).searchParams.get('colour')), colour);
   assert.equal(await page.$eval(`[data-colour-panel="${colour}"]`,p=>p.hidden),false);
   assert.equal(await page.$$eval('[data-colour-panel]',panels=>panels.filter(p=>!p.hidden).length),1);
   const images=await page.$$eval(`[data-colour-panel="${colour}"] img`,imgs=>imgs.map(i=>i.getAttribute('src')));
   assert.equal(images.length,4);
   assert.match(await page.$eval(`[data-colour-panel="${colour}"] picture source`, el=>el.sizes), /max-width: 1100px\) 46vw, 600px/);
   for(const image of images) {
    const response=await fetch(base+image);
    assert.equal(response.status,200);
    assert.ok((await response.arrayBuffer()).byteLength>0);
   }
   // Verify direct links to a selected colour as well as button selection.
   await page.goto(base+(lang==='hu'?'/modellek/':'/en/models/')+'noi-ketoldalas-vizallo-borkabat-budapest/?colour='+colour,{waitUntil:'networkidle2'});
   const selected=await page.$eval(`[data-colour-panel="${colour}"]`,p=>p.dataset.colourName);
   const message=await page.$eval('[data-model-inquiry]',a=>new URL(a.href).searchParams.get('text'));
   assert.ok(message.includes(selected));assert.ok(message.includes('https://kaftanangelo.com'+images[0]));
   assert.ok(message.includes('?colour='+colour));
   assert.equal(await page.$eval('link[rel="canonical"]', a => new URL(a.href).search), '');
   await page.type('[data-enquiry-size]', 'M');
   const sizedMessage=await page.$eval('[data-model-inquiry]',a=>new URL(a.href).searchParams.get('text'));
   assert.ok(sizedMessage.includes(`${lang==='hu'?'Méret':'Size'}: M`));
   assert.ok(sizedMessage.includes(selected));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
 }
 // Each colour has a genuine photo, link and matching enquiry in both listings and languages.
 for (const lang of ['hu','en']) {
  const prefix=lang==='hu'?'/modellek/':'/en/models/';
  for(const route of (lang==='hu'?['/noi-borkabatok/','/kollekciok/']:['/en/womens-leather-jackets/','/en/collections/'])) {
   await page.goto(base+route,{waitUntil:'domcontentloaded'});
   const cards=await page.$$eval('[data-model-colour]', nodes=>nodes.map(node=>({
    colour:node.dataset.modelColour,
    image:node.querySelector('img').getAttribute('src'),
    link:node.querySelector('.product-detail-link').getAttribute('href'),
    message:new URL(node.querySelector('a[href*="wa.me"]').href).searchParams.get('text')
   })));
   assert.deepEqual(cards.map(card=>card.colour),['red','cream','orange','green','black']);
   assert.equal(new Set(cards.map(card=>card.image)).size,5);
   for(const card of cards) {
    assert.equal(card.link,prefix+'noi-ketoldalas-vizallo-borkabat-budapest/?colour='+card.colour);
    assert.ok(card.message.includes('https://kaftanangelo.com'+card.link));
    assert.ok(card.message.includes('https://kaftanangelo.com'+card.image));
   }
  }
 }
 await page.goto(base+'/en/models/noi-ketoldalas-vizallo-borkabat-budapest/?color=green',{waitUntil:'networkidle2'});
 assert.equal(await page.$eval('[data-colour-panel="green"]',p=>p.hidden),false);
 await mkdir('_dev/previews',{recursive:true});await page.screenshot({path:'_dev/previews/reversible-mobile.png',fullPage:true});
 console.log('PASS: HU/EN five colours, four photos each, image responses, selected-colour WhatsApp message and mobile width.');
}finally{await browser.close();}
