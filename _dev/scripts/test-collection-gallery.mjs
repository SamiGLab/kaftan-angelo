import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {launch} from 'puppeteer';
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox','--disable-setuid-sandbox']:[]});
try {
for(const lang of ['hu','en']) {
const page=await browser.newPage();await page.setViewport({width:390,height:844});
const cards=Array.from({length:80},(_,i)=>`<article class="product-card" data-category="${i<48?'leather':'fur'}"><button data-product-image="/photo-${i}.webp">Photo</button><h3>Model ${i}</h3><a href="https://wa.me/36203593216">Ask</a></article>`).join('');
await page.setContent(`<html lang="${lang}"><style>[hidden]{display:none!important}</style><div><div data-product-filters><button class="filter-btn active" data-filter="all">All</button><button class="filter-btn" data-filter="fur">Fur</button></div><div class="product-grid">${cards}</div></div><dialog data-product-dialog><button data-preview-close>Close</button><h2 data-preview-title></h2><img data-preview-image><span data-preview-count></span><a data-preview-inquiry>Ask</a><button data-preview-prev>Previous</button><button data-preview-next>Next</button></dialog></html>`);
await page.addScriptTag({content:await readFile('public/assets/js/pages.js','utf8')});
const visible=()=>page.$$eval('.product-card',cs=>cs.filter(c=>!c.hidden).length);
assert.equal(await visible(),12);
await page.click('.collection-controls button');assert.equal(await visible(),24);
await page.click('[data-filter="fur"]');assert.equal(await visible(),12);
assert.equal(await page.$eval('.collection-controls [role="status"]',e=>e.textContent),lang==='hu'?'12 / 32 modell':'12 of 32 models');
await page.click('.product-card:not([hidden]) button');assert.equal(await page.$eval('[data-preview-title]',e=>e.textContent),'Model 48');
await page.click('[data-preview-close]');await page.click('.collection-controls button');await page.click('.collection-controls button');assert.equal(await visible(),32);assert.equal(await page.$eval('.collection-controls button',e=>e.hidden),true);
await page.click('[data-filter="all"]');assert.equal(await visible(),12);
await page.close();
}
console.log('PASS: 80-model HU/EN mobile gallery, batches, filter reset, dialog and final batch.');
}finally{await browser.close();}
