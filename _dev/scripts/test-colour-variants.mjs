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
   assert.equal(await page.$eval(`[data-colour-panel="${colour}"]`,p=>p.hidden),false);
   assert.equal(await page.$$eval('[data-colour-panel]',panels=>panels.filter(p=>!p.hidden).length),1);
   const images=await page.$$eval(`[data-colour-panel="${colour}"] img`,imgs=>imgs.map(i=>i.getAttribute('src')));
   assert.ok(images.length>=4);
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
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
 }
 await mkdir('_dev/previews',{recursive:true});await page.screenshot({path:'_dev/previews/reversible-mobile.png',fullPage:true});
 console.log('PASS: HU/EN five colours, four photos each, image responses, selected-colour WhatsApp message and mobile width.');
}finally{await browser.close();}
