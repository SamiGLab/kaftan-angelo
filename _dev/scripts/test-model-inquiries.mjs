import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {launch} from 'puppeteer';
const models=JSON.parse(await readFile('src/data/models.json','utf8'));
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox','--disable-setuid-sandbox']:[]});
try {
  const page=await browser.newPage();
  for(const lang of ['hu','en']) {
    for(const model of models) {
      const path=`${lang==='hu'?'/modellek/':'/en/models/'}${model.slugs[lang]}/`;
      await page.goto(base+path,{waitUntil:'domcontentloaded'});
      assert.equal(await page.$eval('h1',el=>el.textContent),model.names[lang]);
      assert.equal(await page.$eval('meta[property="og:image"]',el=>el.content),'https://kaftanangelo.com'+model.image);
      const href=await page.$eval('[data-model-inquiry]',el=>el.href);
      const text=new URL(href).searchParams.get('text');
      assert.ok(text.includes(model.names[lang]));
      assert.ok(text.includes('https://kaftanangelo.com'+path));
      assert.equal(new URL(href).pathname,'/36203593216');
      assert.ok(await page.$eval('.model-info',el=>{
        const inquiry=el.querySelector('[data-model-inquiry]');
        const description=el.querySelector('.actions + p');
        return Boolean(inquiry && description && (inquiry.compareDocumentPosition(description)&Node.DOCUMENT_POSITION_FOLLOWING));
      }),'Model inquiry appears before long product description');
      assert.ok(await page.$eval('.model-photo img',el=>el.getAttribute('src')===new URL(document.querySelector('meta[property="og:image"]').content).pathname));
      assert.match(await page.$eval('.model-photo picture source', el => el.sizes), /max-width: 1100px\) 46vw, 600px/, 'Main model image uses detail-column sizes');
      assert.ok((await page.$eval('[data-model-material]',el=>el.textContent)).includes(model.category[lang].name));
      assert.ok((await page.$eval('[data-model-availability]',el=>el.textContent)).length>30);
      if (model.slug === 'siyah-kapitone-budapest') {
        await page.type('[data-enquiry-size]', 'L');
        await page.type('[data-enquiry-colour]', lang === 'hu' ? 'fekete' : 'black');
        const personalised = await page.$eval('[data-model-inquiry]', el => new URL(el.href).searchParams.get('text'));
        assert.ok(personalised.includes(`${lang === 'hu' ? 'Méret' : 'Size'}: L`));
        assert.ok(personalised.includes(`${lang === 'hu' ? 'Szín: fekete' : 'Colour: black'}`));
        assert.ok(personalised.includes('https://kaftanangelo.com'+path));
      }
    }
    await page.goto(base+(lang==='hu'?'/kollekciok/':'/en/collections/'),{waitUntil:'networkidle2'});
    const links=await page.$$eval('.product-card',cards=>cards.map(card=>({detail:card.querySelector('.product-detail-link').href,message:new URL(card.querySelector('a[href*="wa.me"]').href).searchParams.get('text')})));
    assert.equal(links.length,models.filter(model=>!model.catalogHidden).reduce((total,model)=>total+Math.max(1,model.variants.length),0));
    links.forEach(link=>assert.ok(link.message.includes(link.detail.replace(base,'https://kaftanangelo.com'))));
  }
  console.log(`PASS: all ${models.length*2} HU/EN model pages use the correct image and product-specific WhatsApp link; all active collection cards match.`);
} finally { await browser.close(); }
