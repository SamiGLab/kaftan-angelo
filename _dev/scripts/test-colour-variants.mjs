import assert from 'node:assert/strict';
import {launch} from 'puppeteer';
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
try {
 const page=await browser.newPage();await page.setViewport({width:390,height:844});
 for(const lang of ['hu','en']){
  const modelPath = lang === 'hu' ? '/modellek/noi-ketoldalas-vizallo-borkabat-budapest/' : '/en/models/reversible-womens-leather-jacket-budapest/';
  await page.goto(base+modelPath+'?colour=invalid',{waitUntil:'networkidle2'});
  assert.equal(await page.$$eval('[data-colour-panel]',panels=>panels.filter(p=>!p.hidden).length),1);
  for(const colour of ['red','cream','orange','green','black']){
   await page.click(`[data-colour="${colour}"]`);
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
   await page.goto(base+modelPath+'?colour='+colour,{waitUntil:'networkidle2'});
   const selected=await page.$eval(`[data-colour-panel="${colour}"]`,p=>p.dataset.colourName);
   const message=await page.$eval('[data-model-inquiry]',a=>new URL(a.href).searchParams.get('text'));
   assert.ok(message.includes(selected));assert.ok(message.includes('https://kaftanangelo.com'+images[0]));
   await page.type('[data-enquiry-size]', 'M');
   const sizedMessage=await page.$eval('[data-model-inquiry]',a=>new URL(a.href).searchParams.get('text'));
   assert.ok(sizedMessage.includes(`${lang==='hu'?'Méret':'Size'}: M`));
   assert.ok(sizedMessage.includes(selected));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
 }
 await mkdir('_dev/previews',{recursive:true});await page.screenshot({path:'_dev/previews/reversible-mobile.png',fullPage:true});
 console.log('PASS: HU/EN five colours, four photos each, image responses, selected-colour WhatsApp message and mobile width.');
}finally{await browser.close();}
