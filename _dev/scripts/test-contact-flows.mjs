import assert from 'node:assert/strict';
import {launch} from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await launch({headless:true, args:process.env.CI ? ['--no-sandbox','--disable-setuid-sandbox'] : []});
try {
  for (const lang of ['hu','en']) {
    const page = await browser.newPage();
    const modelPath = `${lang === 'hu' ? '/modellek/' : '/en/models/'}noi-sarga-borkabat-budapest/`;
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.setViewport({width:390,height:844});
    await page.goto(base + modelPath, {waitUntil:'networkidle2'});
    assert.equal(await page.$eval('.model-photo img', image => image.complete && image.naturalWidth > 0), true);
    assert.equal(requests.some(url => url.endsWith('/noi-sarga-borkabat-budapest.webp')), false, 'Do not download the full-size WebP in addition to the responsive photo');
    if (await page.$eval('[data-consent-banner]', element => !element.hidden)) await page.click('[data-consent-reject]');
    await page.evaluate(() => { window.open = (url) => { window.testWhatsAppUrl = url; }; });
    for (const viewport of [{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:390,height:360}]) {
      await page.setViewport(viewport);
      await page.click('#whatsapp-trigger-btn');
      await page.waitForFunction(() => document.activeElement.id === 'whatsapp-chat-input');
      await new Promise(resolve => setTimeout(resolve,300));
      const geometry = await page.evaluate(() => {
        const bounds = element => { const r = element.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}; };
        return {card:bounds(document.querySelector('#whatsapp-chat-card')),close:bounds(document.querySelector('#whatsapp-close-btn')),send:bounds(document.querySelector('#whatsapp-send-btn'))};
      });
      for (const [name,bounds] of Object.entries(geometry)) {
        assert.ok(bounds.top >= 0 && bounds.bottom <= viewport.height && bounds.left >= 0 && bounds.right <= viewport.width, `${lang} ${viewport.width}×${viewport.height}: ${name} remains visible`);
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#whatsapp-chat-card', element => element.hidden), true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'whatsapp-trigger-btn');
    }
    await page.setViewport({width:390,height:844});
    await page.click('#whatsapp-trigger-btn');
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, 'height', {configurable:true,value:440});
      window.visualViewport.dispatchEvent(new Event('resize'));
    });
    assert.equal(await page.$eval('#whatsapp-chat-card', card => {
      const bounds=card.getBoundingClientRect(); return bounds.top >= 0 && bounds.bottom <= 440;
    }),true,'Chat follows the visible viewport when a keyboard covers the lower screen');
    await page.click('#whatsapp-close-btn');
    await page.evaluate(() => { delete window.visualViewport.height; });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'whatsapp-trigger-btn');
    await page.click('#whatsapp-trigger-btn');
    await page.click('#whatsapp-send-btn');
    const destination = new URL(await page.evaluate(() => window.testWhatsAppUrl));
    assert.equal(destination.hostname, 'wa.me');
    assert.equal(destination.pathname, '/36203593216');
    assert.ok(destination.searchParams.get('text').includes('https://kaftanangelo.com'+modelPath));
    assert.equal(await page.evaluate(() => window.dataLayer.some(entry => entry.event === 'kaftan_interest' && entry.interest_source === 'quick_chat')),false,'Rejected tracking must not log WhatsApp chat');
    await page.click('#whatsapp-close-btn');
    await page.setRequestInterception(true);
    page.on('request', request => /googletagmanager|google-analytics|clarity\.ms/.test(request.url())
      ? request.respond({status:200,contentType:'application/javascript',body:''})
      : request.continue());
    await page.click('[data-consent-open]');
    await page.click('[data-consent-accept]');
    await page.click('#whatsapp-trigger-btn');
    await page.evaluate(() => {document.querySelector('#whatsapp-chat-input').value='Private customer enquiry audit_12345';});
    await page.click('#whatsapp-send-btn');
    const quickChatEvents=await page.evaluate(() => window.dataLayer.filter(entry => entry.event === 'kaftan_interest' && entry.interest_action === 'whatsapp_click' && entry.interest_source === 'quick_chat'));
    assert.equal(quickChatEvents.length,1,'Consented WhatsApp popup click records exactly one event');
    assert.equal(JSON.stringify(quickChatEvents).includes('Private customer enquiry audit_12345'),false,'Never send customer chat text to analytics');
    assert.equal(quickChatEvents[0].page_path,modelPath,'Attribution event uses current product page');
    assert.equal(quickChatEvents[0].page_language,lang);
    await page.close();
  }

  for (const lang of ['hu','en']) {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    let outcome = 'failure';
    let submissions = 0;
    page.on('request', async request => {
      if (request.method() === 'POST') {
        assert.match(new URL(request.url()).hostname, /^[a-z0-9-]+\.sibforms\.com$/);
        submissions++;
        if (outcome === 'offline') return request.abort('internetdisconnected');
        await new Promise(resolve => setTimeout(resolve,150));
        return request.respond({status:outcome === 'success' ? 200 : 503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:outcome === 'success'})});
      }
      if (!request.url().startsWith(base) && !request.url().startsWith('data:')) return request.abort();
      return request.continue();
    });
    await page.setViewport({width:390,height:844});
    await page.goto(base + (lang === 'hu' ? '/' : '/en/'), {waitUntil:'networkidle2'});
    if (await page.$eval('[data-consent-banner]', element => !element.hidden)) await page.click('[data-consent-reject]');
    assert.equal(await page.$eval('.newsletter-form', form => form.checkValidity()), false);
    await page.type('#newsletter-email','audit@example.invalid');
    assert.equal(await page.$eval('.newsletter-form', form => form.checkValidity()), false, 'Consent is required');
    await page.click('.newsletter-consent input');
    const submit = () => page.$eval('.newsletter-form', form => { form.requestSubmit(); form.requestSubmit(); });
    for (const mode of ['failure','offline','success']) {
      outcome = mode;
      await submit();
      await page.waitForFunction(() => !document.querySelector('.newsletter-form').hasAttribute('aria-busy'));
      assert.equal(await page.$eval('.newsletter-form button[type="submit"]', button => button.disabled), false, 'Retry remains available');
      const text = await page.$eval('.newsletter-status', status => status.textContent);
      assert.match(text, mode === 'success' ? /erősítse|confirm/ : /nem sikerült|could not/);
    }
    assert.equal(submissions,3,'Repeated submission while busy must not send a duplicate request');
    assert.equal(await page.$eval('#newsletter-email', input => input.value), '');
    assert.equal(await page.$eval('.newsletter-consent input', input => input.checked), false);
    await page.close();
  }
  console.log('PASS: HU/EN short-screen chat, product download, WhatsApp destination, newsletter consent and retry/error flows. No real messages or subscriptions sent.');
} finally { await browser.close(); }

