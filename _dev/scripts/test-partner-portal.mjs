import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import pa11y from 'pa11y';
const root = path.resolve('dist');
const server = http.createServer(async (req,res) => {
  try {
    let file = path.join(root, decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) throw Error('path');
    if ((await fs.stat(file)).isDirectory()) file = path.join(file,'index.html');
    const types = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.avif':'image/avif','.woff2':'font/woff2'};
    res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.statusCode=404;res.end(); }
});
await new Promise(resolve=>server.listen(4182,'127.0.0.1',resolve));
const browser = await puppeteer.launch({headless:true,args:process.env.CI ? ['--no-sandbox','--disable-setuid-sandbox'] : []});
try {
  for (const route of ['/en/partner-portal/','/partner-portal/']) {
    const page = await browser.newPage();
    const errors=[];
    const sitemap = await fs.readFile(path.join(root,'sitemap.xml'),'utf8');
    assert.equal(sitemap.includes(`<loc>https://kaftanangelo.com${route}</loc>`),false,'Portal login is excluded from the sitemap');
    page.on('pageerror',error=>errors.push(error.message));
    await page.setRequestInterception(true);
    let mode='success';
    let contractCalls=0;
    page.on('request',request=> {
      if (request.url().includes('/functions/v1/partner-contract')) {
        if (request.method()==='OPTIONS') return request.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'}});
        const body=JSON.parse(request.postData() || '{}');
        if (body.action==='download') contractCalls++;
        const result=body.action==='logout'?{success:true}:{success:true,url:'https://bezlzeojivucnqkfjpwo.supabase.co/storage/v1/object/sign/partner-contracts/TEST-ONLY_sozlesme.pdf?token=SIGNED-TEST',expires_in:300};
        return request.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
      }
      if (request.url().endsWith('/material-preview.png')) return request.respond({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=','base64')});
      if (!request.url().includes('/rpc/get_partner_portal')) return request.continue();
      if (request.method()==='OPTIONS') return request.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'}});
      if (mode==='rate-limited') return request.respond({status:429,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-expose-headers':'Retry-After','Retry-After':'120'},body:'{"success":false}'});
      const data = mode === 'invalid' ? {success:false} : {success:true,code:'TEST-ONLY',name:'Synthetic partner',type:'Hotel',contact_person:'Test representative',phone:'+36 000',iban:null,contract_url:null,guests:3,paid:100,cleared:200,holding:300,sales:6000,txs:[{date:'2026.09.01',item:'<img src=x onerror=alert(1)>',amount:1000,comm:100,status:'Kifizetve'},{date:'2026.09.02',item:'Leather jacket',amount:2000,comm:200,status:'Kifizethető'},{date:'2026.10.06',item:'Fur coat',amount:3000,comm:300,status:'Függőben (14 napos garancia)'}]};
      if (mode === 'cancelled') data.txs.push({date:'2026.10.07',item:'Returned jacket',amount:0,comm:0,status:'Függőben'});
      if (mode === 'mismatched-account') data.code = 'OTHER-PARTNER';
      data.p_pin = 'SERVER-ONLY-TEST-PIN';
      if (data.txs?.length) data.txs[0].pin_hash='NESTED-SECRET-TEST';
      if (data.success) data.iban='HU42123456789012345678901234';
      if (data.success) data.session_token='a'.repeat(64);
      if (mode==='contract') data.has_contract=true;
      if (mode === 'materials') data.materials = [
        {partner_code:'TEST-ONLY',kind:'print',language:'hu',pdf_url:'https://bezlzeojivucnqkfjpwo.supabase.co/storage/v1/object/public/partner-materials/print-hu.pdf'},
        {partner_code:'TEST-ONLY',kind:'mobile',language:'en',png_url:'https://bezlzeojivucnqkfjpwo.supabase.co/storage/v1/object/public/partner-materials/material-preview.png'},
        {partner_code:'OTHER-PARTNER',kind:'print',language:'en',pdf_url:'https://bezlzeojivucnqkfjpwo.supabase.co/storage/v1/object/public/partner-materials/other.pdf'},
        {partner_code:'TEST-ONLY',kind:'mobile',language:'hu',png_url:'javascript:alert(1)'}
      ];
      if (['manifest','wrong-owner','missing-owner','untrusted-host'].includes(mode)) data.materials = {code: mode === 'wrong-owner' ? 'OTHER-PARTNER' : 'TEST-ONLY', draft:true, storage_code:'partner-hashed-code', files:['card','poster','mobile'].flatMap(format => ['hu','en'].flatMap(language => (format === 'mobile' ? ['png'] : ['pdf','png']).map(type => ({format,language,type,filename:format+'-'+language+'.'+type,url:type === 'png' ? 'https://bezlzeojivucnqkfjpwo.supabase.co/storage/v1/object/public/partner-materials/material-preview.png' : 'https://bezlzeojivucnqkfjpwo.supabase.co/storage/v1/object/public/partner-materials/'+format+'-'+language+'.pdf'}))))};
      if (mode === 'missing-owner') delete data.materials.code;
      if (mode === 'untrusted-host') {
        data.materials.files.forEach(file=>{file.url='https://untrusted.example/document.pdf';});
        data.contract_url='https://untrusted.example/contract.pdf';
      }
      if (mode === 'paused') data.materials = {code:'TEST-ONLY',status:'paused',files:[]};
      return request.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
    });
    await page.setViewport({width:390,height:844});
    await page.goto('http://127.0.0.1:4182'+route);
    assert.equal(await page.$eval('meta[name="robots"]',node=>node.content),'noindex,follow','Portal login must not be search indexed');
    await page.type('#partner-code-input','TEST-ONLY');
    await page.type('#partner-pin-input','0000');
    await page.focus('#gate-submit-btn'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.getElementById('portal-dashboard').hidden);
    assert.equal(await page.$$eval('#transactions-tbody tr',rows=>rows.length),3);
    assert.equal(await page.$$eval('#transactions-tbody img',rows=>rows.length),0);
    assert.equal(await page.$eval('#stat-guests',node=>node.textContent),'3');
    assert.equal(await page.$eval('#stat-paid',node=>node.textContent),'100 HUF');
    assert.equal(await page.$$eval('.portal-material-card',cards=>cards.length),6);
    assert.equal(await page.$$eval('.portal-material-pending',cards=>cards.length),6);
    assert.equal(await page.$$eval('.portal-material-actions a',links=>links.length),0);
    assert.equal(await page.$eval('#request-payout-btn',node=>node.href.includes('HU42')),false);
    assert.equal(await page.evaluate(()=>localStorage.getItem('kaftan_portal_session')),null);
    const savedView = await page.evaluate(()=>JSON.parse(sessionStorage.getItem('kaftan_portal_view_v1')));
    assert.equal(savedView.data.code,'TEST-ONLY');
    assert.equal(Object.hasOwn(savedView.data,'session_token'),false,'Contract bearer token must never persist across reloads');
    // Migrate away sensitive storage left by previous deployed versions.
    await page.evaluate(() => {
      const legacy=JSON.parse(sessionStorage.getItem('kaftan_portal_view_v1'));
      legacy.data.session_token='a'.repeat(64);
      sessionStorage.setItem('kaftan_portal_view_v1',JSON.stringify(legacy));
    });
    assert.equal(JSON.stringify(savedView).includes('0000'),false);
    assert.equal('p_pin' in savedView.data,false);
    assert.equal(JSON.stringify(savedView).includes('SERVER-ONLY-TEST-PIN'),false);
    assert.equal(JSON.stringify(savedView).includes('NESTED-SECRET-TEST'),false);
    assert.equal(JSON.stringify(savedView).includes('HU42123456789012345678901234'),false);
    await page.reload();
    await page.waitForFunction(()=>!document.getElementById('portal-dashboard').hidden);
    assert.equal(await page.$eval('#partner-display-code',node=>node.textContent),'TEST-ONLY');
    assert.equal(await page.evaluate(()=>Object.hasOwn(JSON.parse(sessionStorage.getItem('kaftan_portal_view_v1')).data,'session_token')),false,'Legacy cached bearer capability is purged on reload');
    await page.evaluate(()=>{
      const saved=JSON.parse(sessionStorage.getItem('kaftan_portal_view_v1'));
      saved.expires=Date.now()+1200;
      sessionStorage.setItem('kaftan_portal_view_v1',JSON.stringify(saved));
    });
    await page.reload();
    await page.waitForFunction(()=>!document.getElementById('portal-dashboard').hidden);
    await page.waitForFunction(()=>document.getElementById('portal-dashboard').hidden);
    assert.equal(await page.$eval('#partner-display-code',node=>node.textContent),'','Expiry clears sensitive DOM data');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('kaftan_portal_view_v1')),null);
    await page.type('#partner-code-input','TEST-ONLY');
    await page.type('#partner-pin-input','0000');
    await page.focus('#gate-submit-btn'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.getElementById('portal-dashboard').hidden);

    for (const filter of ['holding','cleared','paid']) {
      await page.select('#portal-status-filter',filter);
      assert.equal(await page.$$eval('#transactions-tbody tr',rows=>rows.length),1);
      assert.equal(await page.$eval('#transactions-tbody .badge-status',node=>node.className),'badge-status '+filter);
    }
    await page.select('#portal-status-filter','all');
    await page.type('#portal-search','nonexistent');
    assert.equal(await page.$$eval('#transactions-tbody tr',rows=>rows.length),0);
    await page.$eval('#portal-search',node=>{node.value='';node.dispatchEvent(new Event('input'));});

    for (const width of [360,390,768,1440]) {
      await page.setViewport({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Overflow at '+width+' '+route);
    }
    const separateContext = await browser.createBrowserContext();
    const separatePage = await separateContext.newPage();
    await separatePage.goto('http://127.0.0.1:4182'+route);
    assert.equal(await separatePage.$eval('#portal-dashboard',node=>node.hidden),true,'Another browser session does not inherit partner data');
    await separateContext.close();
    await page.evaluate(()=>{
      const saved=JSON.parse(sessionStorage.getItem('kaftan_portal_view_v1'));
      saved.expires=Date.now()-1;
      sessionStorage.setItem('kaftan_portal_view_v1',JSON.stringify(saved));
    });
    await page.reload();
    assert.equal(await page.$eval('#portal-dashboard',node=>node.hidden),true,'Expired saved view is rejected');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('kaftan_portal_view_v1')),null);
    await page.type('#partner-code-input','TEST-ONLY');
    await page.type('#partner-pin-input','0000');
    await page.focus('#gate-submit-btn'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.getElementById('portal-dashboard').hidden);
    await page.focus('#portal-logout-btn');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#portal-dashboard',node=>node.hidden),true);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('kaftan_portal_view_v1')),null);
    await page.reload();
    assert.equal(await page.$eval('#portal-dashboard',node=>node.hidden),true);
    assert.equal(await page.$$eval('#portal-materials-grid a',links=>links.length),0);
    mode='materials';
    await page.type('#partner-code-input','TEST-ONLY');
    await page.type('#partner-pin-input','0000');
    await page.focus('#gate-submit-btn'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.getElementById('portal-dashboard').hidden);
    assert.equal(await page.$$eval('.portal-material-actions a',links=>links.length),2);
    assert.equal(await page.$$eval('.portal-material-pending',cards=>cards.length),4);
    assert.equal(await page.$$eval('#portal-materials-grid img',images=>images.length),0);
    assert.equal(await page.$$eval('#portal-materials-grid a',links=>links.some(link=>link.href.includes('other.pdf') || link.href.startsWith('javascript:'))),false);
    await page.focus('#portal-logout-btn');
    await page.keyboard.press('Enter');
    for (const state of ['manifest','wrong-owner','missing-owner','untrusted-host','paused']) {
      mode=state;
      await page.type('#partner-code-input','TEST-ONLY');
      await page.type('#partner-pin-input','0000');
      await page.focus('#gate-submit-btn'); await page.keyboard.press('Enter');
      await page.waitForFunction(()=>!document.getElementById('portal-dashboard').hidden);
      assert.equal(await page.$$eval('.portal-material-card',cards=>cards.length),state === 'paused' ? 0 : 6);
      assert.equal(await page.$$eval('.portal-material-actions a',links=>links.length),state === 'manifest' ? 10 : 0);
      assert.equal(await page.$$eval('.portal-material-draft',notes=>notes.length),['wrong-owner','missing-owner'].includes(state) ? 0 : 1);
      if (state === 'untrusted-host') assert.equal(await page.$eval('#contract-download-link',link=>link.hasAttribute('href')),false);
      assert.equal(await page.$$eval('#portal-materials-grid img',images=>images.length),0);
      if (state === 'manifest') {
        assert.equal(await page.$$eval('.portal-material-preview',buttons=>buttons.length),6);
        await page.focus('.portal-material-preview'); await page.keyboard.press('Enter');
        assert.equal(await page.$eval('.portal-preview-dialog',dialog=>dialog.open),true);
        await page.waitForFunction(()=>document.querySelector('.portal-preview-dialog img')?.naturalWidth>0);
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('.portal-preview-dialog',dialog=>dialog.open),false);
        await page.waitForFunction(()=>document.querySelectorAll('.portal-preview-dialog img').length===0);
      }
      await page.focus('#portal-logout-btn'); await page.keyboard.press('Enter');
    }
    mode='cancelled';
    await page.type('#partner-code-input','TEST-ONLY');
    await page.type('#partner-pin-input','0000');
    await page.focus('#gate-submit-btn'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.getElementById('portal-dashboard').hidden);
    assert.equal(await page.$$eval('#transactions-tbody .cancelled',rows=>rows.length),1);
    await page.select('#portal-status-filter','holding');
    assert.equal(await page.$$eval('#transactions-tbody tr',rows=>rows.length),1);
    await page.select('#portal-status-filter','cancelled');
    assert.equal(await page.$$eval('#transactions-tbody tr',rows=>rows.length),1);
    await page.focus('#portal-logout-btn'); await page.keyboard.press('Enter');
    mode='contract';
    await page.type('#partner-code-input','TEST-ONLY');
    await page.type('#partner-pin-input','0000');
    await page.focus('#gate-submit-btn'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.getElementById('portal-dashboard').hidden);
    assert.equal(contractCalls,0,'Contract is not signed until the user requests it');
    await page.evaluate(()=>{window.open=()=>null;});
    await page.$eval('#contract-download-link',link=>link.click());
    await page.waitForFunction(()=>document.getElementById('contract-download-link').href.includes('SIGNED-TEST'));
    assert.equal(contractCalls,1);
    await page.setViewport({width:360,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Private contract controls fit on mobile');
    await page.reload();
    assert.equal(await page.$eval('#contract-download-link',link=>link.href.includes('SIGNED-TEST')),false,'Signed link is not cached across reload');
    assert.equal(await page.$eval('#contract-ready-box',box=>box.style.display),'none','Cached view cannot access a contract using a persisted token');
    assert.equal(await page.$eval('#contract-pending-box strong',node=>/Sign in again|jelentkezzen be újra/.test(node.textContent)),true,'Explain that a new login is required');
    assert.equal(await page.evaluate(()=>Object.hasOwn(JSON.parse(sessionStorage.getItem('kaftan_portal_view_v1')).data,'session_token')),false);
    await page.focus('#portal-logout-btn');await page.keyboard.press('Enter');
    mode='rate-limited';
    await page.type('#partner-code-input','TEST-ONLY');await page.type('#partner-pin-input','0000');
    await page.focus('#gate-submit-btn');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.getElementById('portal-error-msg').hidden);
    assert.equal(await page.$eval('#portal-dashboard',node=>node.hidden),true);
    assert.equal(await page.$eval('#portal-error-msg',node=>node.textContent.includes('2')),true,'Rate limit wait is shown');
    await page.$eval('#portal-login-form',form=>form.reset());
    mode='mismatched-account';
    await page.type('#partner-code-input','TEST-ONLY');
    await page.type('#partner-pin-input','0000');
    await page.focus('#gate-submit-btn'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.getElementById('portal-error-msg').hidden);
    assert.equal(await page.$eval('#portal-dashboard',node=>node.hidden),true,'Never show a different partner returned by the server');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('kaftan_portal_view_v1')),null);
    await page.$eval('#portal-login-form',form=>form.reset());
    mode='invalid';
    await page.type('#partner-code-input','TEST-ONLY');
    await page.type('#partner-pin-input','wrong');
    await page.focus('#gate-submit-btn'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.getElementById('portal-error-msg').hidden);
    assert.equal(await page.$eval('#portal-dashboard',node=>node.hidden),true);
    const accessibility = await pa11y(page.url(), {browser,page,ignoreUrl:true,standard:'WCAG2AA',viewport:{width:390,height:844}});
    assert.deepEqual(accessibility.issues, [], 'Portal login accessibility');
    assert.deepEqual(errors,[]);
    console.log('PASS',route,'login, invalid PIN, safe rendering, three statuses, filters, logout, 360/390/768/1440 layouts');
    await page.close();
  }
} finally { await browser.close(); server.close(); }
