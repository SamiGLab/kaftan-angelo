import assert from 'node:assert/strict';
import {launch} from 'puppeteer';

// Only test data; the live HU/EN forms remain email/WhatsApp until an
// administrator explicitly enables all required attributes after server E2E.
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const endpoint='https://bezlzeojivucnqkfjpwo.supabase.co/functions/v1/partner-intake';
const receipt='b0123456-2222-4222-8222-000000000002';
const browser=await launch({headless:true,args:process.env.CI?['--no-sandbox','--disable-setuid-sandbox']:[]});

try {
  for(const lang of ['hu','en']){
    const context=await browser.createBrowserContext();
    const page=await context.newPage();
    const route=lang==='hu'?'/partnerprogram/':'/en/partners/';
    await page.setViewport({width:390,height:844});
    await page.goto(base+route,{waitUntil:'networkidle2'});
    const text=await page.$eval('[data-partner-form] button[type="submit"]',node=>node.textContent);
    assert.match(text,lang==='hu'?/E-mail előkészítése/:/Prepare email/);
    assert.equal(await page.$('[data-partner-email-fallback]'),null,'Unconfigured browser form keeps the original mailto UX');
    assert.equal(await page.$('[data-partner-form] [name="privacyAcknowledged"]'),null);
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k!=='kaftan_consent_v1')),[]);
    assert.equal(await page.evaluate(()=>sessionStorage.length),0);

    await page.evaluate(({endpoint,lang})=>{
      const form=document.querySelector('[data-partner-form]');
      form.dataset.partnerIntakeEnabled='true';
      form.dataset.partnerIntakeEndpoint=endpoint;
      form.dataset.partnerIntakeSitekey='synthetic-sitekey-01234';
      form.dataset.partnerIntakePrivacyUrl=lang==='hu'?'/uzemelteto/':'/en/site-information/';
      window.__mockMode='success';
      window.__mockToken='';
      window.__records=[];
      window.turnstile={
        getResponse:()=>window.__mockToken,
        reset:()=>{window.__mockToken='';}
      };
      window.fetch=async (url,options)=>{
        window.__records.push({
          url,body:JSON.parse(options.body),
          key:options.headers['X-Idempotency-Key'],
          method:options.method,referrerPolicy:options.referrerPolicy,
          credentials:options.credentials,
        });
        await new Promise(resolve=>{setTimeout(resolve,75);});
        if(window.__mockMode==='offline') throw Error('synthetic offline');
        if(window.__mockMode==='limited') return {ok:false,status:429};
        if(window.__mockMode==='rejected') return {ok:false,status:503};
        return {ok:true,status:202,json:async()=>({accepted:true,receipt:'b0123456-2222-4222-8222-000000000002'})};
      };
    },{endpoint,lang});
    await page.addScriptTag({url:base+'/assets/js/partner-intake-client.js'});
    assert.match(await page.$eval('[data-partner-form] button[type="submit"]',node=>node.textContent),lang==='hu'?/Jelentkezés/:/Send application/);
    assert.ok(await page.$('[data-partner-email-fallback]'));
    assert.equal(await page.$eval('[data-partner-form]',form=>form.dataset.intakeInitialized),'true');

    await page.$eval('[data-partner-form]',form=>{
      const update=(name,value)=>{form.elements.namedItem(name).value=value;};
      update('name','Synthetic Applicant');
      update('company','Synthetic Hotel');
      update('email','synthetic@example.com');
      update('phone','+36 20 000 0000');
      update('message','Synthetic application for test only');
      form.querySelector('select[name="type"]').selectedIndex=2;
      form.elements.namedItem('privacyAcknowledged').checked=true;
    });
    await page.$eval('[data-partner-form]',form=>form.requestSubmit());
    assert.equal(await page.evaluate(()=>window.__records.length),0,'Missing bot proof cannot submit');
    assert.match(await page.$eval('.partner-intake-status',node=>node.textContent),lang==='hu'?/biztonsági/:/security verification/);

    await page.evaluate(()=>{window.__mockToken='synthetic-verified-token';window.__mockMode='offline';});
    await page.$eval('[data-partner-form]',form=>{form.requestSubmit();form.requestSubmit();});
    await page.waitForFunction(()=>document.querySelector('[data-partner-form]').getAttribute('aria-busy')!=='true');
    assert.equal(await page.evaluate(()=>window.__records.length),1,'Duplicate clicks while sending cannot double-submit');
    assert.match(await page.$eval('.partner-intake-status',node=>node.textContent),lang==='hu'?/Nem sikerült/:/could not send/);
    assert.equal(await page.$eval('[data-partner-form] [name="email"]',node=>node.value),'synthetic@example.com','Failure leaves applicant input intact');

    await page.evaluate(()=>window.__mockMode='limited');
    await page.$eval('[data-partner-form]',form=>form.requestSubmit());
    await page.waitForFunction(()=>document.querySelector('[data-partner-form]').getAttribute('aria-busy')!=='true');
    assert.match(await page.$eval('.partner-intake-status',node=>node.textContent),lang==='hu'?/Túl sok/:/Too many/);

    await page.evaluate(()=>window.__mockMode='success');
    await page.$eval('[data-partner-form]',form=>form.requestSubmit());
    await page.waitForFunction(()=>document.querySelector('[data-partner-form]').getAttribute('aria-busy')!=='true');
    assert.match(await page.$eval('.partner-intake-status',node=>node.textContent),new RegExp(receipt));
    assert.equal(await page.$eval('[data-partner-form] [name="email"]',node=>node.value),'','Only verified 202 and UUID receipt resets the form');
    const records=await page.evaluate(()=>window.__records);
    assert.equal(records.length,3,'Offline, limited and successful attempts only');
    assert.equal(new Set(records.map(x=>x.key)).size,1,'Identical draft retries reuse same idempotency UUID');
    for(const record of records){
      assert.equal(record.url,endpoint);
      assert.equal(record.method,'POST');
      assert.equal(record.referrerPolicy,'no-referrer');
      assert.equal(record.credentials,'omit');
      assert.equal(record.body.language,lang);
      assert.equal(record.body.type,'apartment');
      assert.equal(record.body.privacyAcknowledged,true);
      assert.equal(record.body.challengeToken,'synthetic-verified-token');
      assert.equal(record.body.email,'synthetic@example.com');
    }
    assert.equal(await page.evaluate(()=>/synthetic@example.com/.test(JSON.stringify(window.dataLayer||[]))),false,'Never send applicant PII to analytics');
    assert.equal(await page.evaluate(()=>sessionStorage.length),0,'No sensitive applicant storage');
    assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k!=='kaftan_consent_v1').length),0);
    await context.close();
  }
  const page=await browser.newPage();
  await page.goto(base+'/en/partners/',{waitUntil:'networkidle2'});
  await page.evaluate(()=>{
    const form=document.querySelector('[data-partner-form]');
    form.dataset.partnerIntakeEnabled='true';
    form.dataset.partnerIntakeEndpoint='https://malicious.example/collect';
    form.dataset.partnerIntakeSitekey='synthetic-sitekey-01234';
    form.dataset.partnerIntakePrivacyUrl='/en/site-information/';
  });
  await page.addScriptTag({url:base+'/assets/js/partner-intake-client.js'});
  assert.equal(await page.$('[data-partner-email-fallback]'),null,'Unknown endpoints must not activate HTTPS submission');
  await page.close();
  const missingPrivacy=await browser.newPage();
  await missingPrivacy.goto(base+'/en/partners/',{waitUntil:'networkidle2'});
  await missingPrivacy.evaluate(endpoint=>{
    const form=document.querySelector('[data-partner-form]');
    form.dataset.partnerIntakeEnabled='true';
    form.dataset.partnerIntakeEndpoint=endpoint;
    form.dataset.partnerIntakeSitekey='synthetic-sitekey-01234';
  },endpoint);
  await missingPrivacy.addScriptTag({url:base+'/assets/js/partner-intake-client.js'});
  assert.equal(await missingPrivacy.$('[data-partner-email-fallback]'),null,'A missing approved privacy URL must fail closed');
  await missingPrivacy.close();
  console.log('PASS: HU/EN partner intake disabled-by-default, synthetic HTTPS submission, challenge, privacy, retries, idempotency, 429/offline, no analytics PII, no browser storage');
} finally {await browser.close();}
