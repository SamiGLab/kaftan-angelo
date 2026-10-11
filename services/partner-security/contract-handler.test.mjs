import test from 'node:test';
import assert from 'node:assert/strict';
import {handleContract} from './supabase/functions/partner-contract/handler.mjs';
const url='https://bezlzeojivucnqkfjpwo.supabase.co';
const token='a'.repeat(64); const key='sb_secret_SERVER_ONLY_TEST';
const req=(body={token},headers={},method='POST')=>new Request(url+'/functions/v1/partner-contract',{method,headers:{Origin:'https://kaftanangelo.com','Content-Type':'application/json',...headers},...(method==='POST'?{body:JSON.stringify(body)}:{})});
test('only server-owned contract is signed for five minutes; credentials stay upstream',async()=>{
 const calls=[];
 const response=await handleContract(req({token,path:'OTHER_sozlesme.pdf'}),{url,key,fetchImpl:async(u,opts)=>{
  calls.push([u,opts]);
  return Response.json(calls.length===1?{success:true,path:'OWN_sozlesme.pdf'}:{signedURL:'/object/sign/partner-contracts/OWN_sozlesme.pdf?token=signed-test'});
 }});
 assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
 const result=await response.json(); assert.equal(result.expires_in,300);assert.equal(result.url.includes('OWN_sozlesme.pdf'),true);
 assert.equal(JSON.stringify(result).includes(key),false);
 assert.deepEqual(JSON.parse(calls[0][1].body),{p_token:token});
 assert.equal(calls[1][0].endsWith('/OWN_sozlesme.pdf'),true);assert.deepEqual(JSON.parse(calls[1][1].body),{expiresIn:300});
});
test('bad origin, malformed token, excessive body and wrong methods never query upstream',async()=>{
 const config={url,key,fetchImpl:()=>{throw Error('must not query');}};
 assert.equal((await handleContract(req({token},{Origin:'https://evil.example'}),config)).status,403);
 assert.equal((await handleContract(req({token:'wrong'}),config)).status,400);
 assert.equal((await handleContract(req({token,padding:'x'.repeat(2000)}),config)).status,413);
 assert.equal((await handleContract(req(undefined,{},'GET'),config)).status,405);
});
test('expired sessions and download limits never sign a file; errors sanitized',async()=>{
 for(const [result,status] of [[{success:false},401],[{success:false,limited:true},429],[{success:false,missing:true},404]]){
  let calls=0;
  const response=await handleContract(req(),{url,key,fetchImpl:async()=>{calls++;return Response.json(result);}});
  assert.equal(response.status,status);assert.equal(calls,1);assert.deepEqual(await response.json(),{success:false});
 }
 const response=await handleContract(req(),{url,key,fetchImpl:()=>{throw Error('SECRET'+key);}});
 assert.equal((await response.text()).includes(key),false);
});
test('logout only revokes provided capability and returns no private metadata',async()=>{
 let endpoint;
 const response=await handleContract(req({token,action:'logout'}),{url,key,fetchImpl:async(u)=>{endpoint=u;return new Response(null,{status:204});}});
 assert.equal(endpoint.endsWith('/revoke_partner_session'),true);assert.deepEqual(await response.json(),{success:true});
});
test('unsafe server paths and unexpected signed URL paths are rejected',async()=>{
 assert.equal((await handleContract(req(),{url,key,fetchImpl:async()=>Response.json({success:true,path:'../OTHER_sozlesme.pdf'})})).status,503);
 let calls=0;
 assert.equal((await handleContract(req(),{url,key,fetchImpl:async()=>Response.json(++calls===1?{success:true,path:'OWN_sozlesme.pdf'}:{signedURL:'/object/public/other/file?token=test'})})).status,503);
});
