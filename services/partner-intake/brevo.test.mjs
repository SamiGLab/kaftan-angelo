import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrevoNotifier} from './brevo.mjs';

const secret='synthetic-server-only-key-long-enough';
const sender='verified@example.test';
const id='a0123456-1111-4111-8111-000000000001';
const item=()=>({
  inquiry_id:id, recipient_name:'Teszt Partner',company:'Synthetic Hotel',
  recipient_email:'synthetic@example.com',phone:'+36 20 000 0000',
  category:'hotel_concierge',message:'Please contact me\nThanks',language:'hu',
});

test('uses fixed verified sender and operator, plain text only, and request-level UUID key',async()=>{
  let calls=0;
  const fetchImpl=async(url,options)=>{
    calls++;
    assert.equal(url,'https://api.brevo.com/v3/smtp/email');
    assert.equal(options.method,'POST');
    assert.equal(options.redirect,'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers['api-key'],secret);
    assert.equal(options.headers.idempotencyKey,id);
    const body=JSON.parse(options.body);
    assert.deepEqual(body.sender,{name:'Kaftan Angelo',email:sender});
    assert.deepEqual(body.to,[{email:'alfinafashionkft@gmail.com'}]);
    assert.equal(body.subject,'Kaftan Angelo | New partner inquiry');
    assert.ok(body.textContent.includes('synthetic@example.com'));
    assert.ok(body.textContent.includes('Please contact me'));
    assert.equal(Object.hasOwn(body,'htmlContent'),false);
    assert.equal(Object.hasOwn(body,'replyTo'),false);
    assert.equal(JSON.stringify(body).includes(secret),false);
    return new Response(JSON.stringify({messageId:'<synthetic-relay-id>'}),{status:201});
  };
  const fn=createBrevoNotifier({apiKey:secret,verifiedSenderEmail:sender,fetchImpl});
  assert.deepEqual(await fn(item()),{accepted:true});
  assert.deepEqual(await fn(item()),{accepted:true});
  assert.equal(calls,2);
});

test('missing sender or credential does not attempt mail delivery',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;throw Error('unexpected');};
  for(const config of [{},{apiKey:secret},{verifiedSenderEmail:sender},{apiKey:secret,verifiedSenderEmail:'bad'}]){
    const fn=createBrevoNotifier({...config,fetchImpl});
    await assert.rejects(fn(item()),{message:'notification_not_configured'});
  }
  assert.equal(calls,0);
});

test('rejects corrupted identifiers or header injection without network',async()=>{
  let calls=0;const fn=createBrevoNotifier({apiKey:secret,verifiedSenderEmail:sender,fetchImpl:async()=>{calls++;throw Error('unexpected');}});
  for(const field of [
    {inquiry_id:'email@example.com'},
    {recipient_name:'A\nBcc:other@example.com'},
    {recipient_email:'a@b.com\nBcc:x@y.com'},
    {phone:'\r\nBcc:a@b.com'},
    {message:'\u0000private'},
    {language:'tr'},
  ]){
    await assert.rejects(fn({...item(),...field}),{message:'invalid_notification'});
  }
  assert.equal(calls,0);
});

test('provider failure, 429 and incomplete acknowledgment never claim accepted email',async()=>{
  const failures=[
    async()=>{throw Error('private upstream message');},
    async()=>new Response(JSON.stringify({code:'duplicate_parameter',message:'private detail'}),{status:400}),
    async()=>new Response(JSON.stringify({error:'limited'}),{status:429}),
    async()=>new Response('{bad', {status:200}),
    async()=>new Response('{}',{status:201}),
    async()=>new Response('x'.repeat(4097),{status:200}),
  ];
  for(const fetchImpl of failures){
    const fn=createBrevoNotifier({apiKey:secret,verifiedSenderEmail:sender,fetchImpl});
    await assert.rejects(fn(item()),{message:'delivery_unconfirmed'});
  }
});
