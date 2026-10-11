const origin = 'https://kaftanangelo.com';
const project = 'https://bezlzeojivucnqkfjpwo.supabase.co';

export async function handleContract(request, {url, key, fetchImpl = fetch}) {
  const headers = {'Cache-Control':'no-store','Content-Type':'application/json','Referrer-Policy':'no-referrer','Vary':'Origin'};
  const requestOrigin = request.headers.get('Origin');
  if (requestOrigin && requestOrigin !== origin) return new Response('{}',{status:403,headers});
  if (requestOrigin === origin) Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'});
  const reply = (status, body) => new Response(JSON.stringify(body),{status,headers});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'POST') return reply(405,{success:false});
  if (url !== project || !key) return reply(503,{success:false});
  // Neither PINs nor session tokens are accepted in the URL or written to logs.
  if (new URL(request.url).search) return reply(400,{success:false});
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply(415,{success:false});
  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400,{success:false});
    let text = ''; let length = 0; const decoder = new TextDecoder();
    for (;;) {
      const {done,value} = await reader.read(); if (done) break;
      length += value.length;
      if (length > 1024) { await reader.cancel(); return reply(413,{success:false}); }
      text += decoder.decode(value,{stream:true});
    }
    body = JSON.parse(text+decoder.decode());
  } catch { return reply(400,{success:false}); }
  if (!body || typeof body !== 'object' || !/^[0-9a-f]{64}$/.test(body.token || '') || !['download','logout'].includes(body.action || 'download')) return reply(400,{success:false});
  const upstreamHeaders = {apikey:key,'Content-Type':'application/json'};
  if (!key.startsWith('sb_secret_')) upstreamHeaders.Authorization = 'Bearer '+key;
  try {
    const logout = body.action === 'logout';
    const response = await fetchImpl(project+'/rest/v1/rpc/'+(logout?'revoke_partner_session':'get_partner_contract'),{
      method:'POST',headers:upstreamHeaders,body:JSON.stringify({p_token:body.token}),signal:AbortSignal.timeout(8000),redirect:'error',
    });
    if (!response.ok) return reply(503,{success:false});
    if (logout) return reply(200,{success:true});
    const result = await response.json();
    if (!result?.success) return reply(result?.limited?429:result?.missing?404:401,{success:false});
    if (typeof result.path !== 'string' || !/^[^/\\]+_sozlesme\.(pdf|png|jpe?g)$/.test(result.path)) return reply(503,{success:false});
    const signed = await fetchImpl(project+'/storage/v1/object/sign/partner-contracts/'+encodeURIComponent(result.path),{
      method:'POST',headers:upstreamHeaders,body:JSON.stringify({expiresIn:300}),signal:AbortSignal.timeout(8000),redirect:'error',
    });
    if (!signed.ok) return reply(404,{success:false});
    const data = await signed.json();
    const link = new URL('/storage/v1'+data.signedURL,project);
    if (link.origin !== project || !link.pathname.startsWith('/storage/v1/object/sign/partner-contracts/') || !link.searchParams.get('token')) return reply(503,{success:false});
    return reply(200,{success:true,url:link.href,expires_in:300});
  } catch { return reply(503,{success:false}); }
}
