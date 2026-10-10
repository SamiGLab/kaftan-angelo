// This service handles GitHub sign-in only; the website remains on GitHub Pages.
const SITE = 'https://kaftanangelo.com';
const SERVICE = 'https://kaftan-decap-auth.samigrowlab.workers.dev';
const REPOSITORY = 'SamiGLab/kaftan-angelo';
const COOKIE = '__Host-decap-oauth';
const TTL = 600;
const encoder = new TextEncoder();
const headers = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow',
};

function encode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}
function random() {
  return encode(crypto.getRandomValues(new Uint8Array(32)));
}
async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function seal(session, secret) {
  const payload = encode(encoder.encode(JSON.stringify(session)));
  const signature = encode(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload)));
  return `${payload}.${signature}`;
}
async function unseal(value, secret, now) {
  try {
    if (!value || value.length > 1024) return null;
    const parts = value.split('.');
    if (parts.length !== 2 || !await crypto.subtle.verify('HMAC', await key(secret), decode(parts[1]), encoder.encode(parts[0]))) return null;
    const session = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (!Number.isInteger(session.created) || session.created > now || now - session.created >= TTL) return null;
    if (!/^[A-Za-z0-9_-]{43}$/.test(session.state) || !/^[A-Za-z0-9_-]{43}$/.test(session.verifier)) return null;
    return session;
  } catch {
    return null;
  }
}
function cookie(value, age = TTL) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;
}
function text(message, status = 200) {
  return new Response(message, { status, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
}
function scriptValue(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}
function finish(result, success, status = 200) {
  const nonce = random();
  const message = `authorization:github:${success ? 'success' : 'error'}:${JSON.stringify(result)}`;
  // Decap's handshake is checked against both the opener window and its exact origin.
  const script = `const origin=${scriptValue(SITE)};const openerWindow=window.opener;
    history.replaceState(null,'','/callback');
    if(openerWindow){const receive=(event)=>{
      if(event.source!==openerWindow||event.origin!==origin||event.data!=='authorizing:github')return;
      window.removeEventListener('message',receive);
      openerWindow.postMessage(${scriptValue(message)},origin);
    };window.addEventListener('message',receive);openerWindow.postMessage('authorizing:github',origin);}`;
  const body = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kaftan Angelo — GitHub sign-in</title><body><p>${success ? 'Sign-in complete. You can return to the content panel.' : 'Sign-in could not be completed. Return to the panel and try again.'}</p><script nonce="${nonce}">${script}</script></body></html>`;
  return new Response(body, { status, headers: {
    ...headers, 'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
    'Set-Cookie': cookie('', 0),
  } });
}

export function createWorker({ fetch: fetcher = globalThis.fetch, now = () => Math.floor(Date.now() / 1000) } = {}) {
  return { async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return text('Method not allowed', 405);
    if (url.origin !== SERVICE) return text('Unknown service address', 400);
    if (url.pathname === '/' || url.pathname === '/health') return text('Kaftan Angelo content sign-in service');
    if (!['/auth', '/callback'].includes(url.pathname)) return text('Not found', 404);
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET.length < 20) {
      return text('GitHub sign-in setup is not complete yet.', 503);
    }
    try {
      // Domain separation lets the existing server-only client secret sign the short-lived cookie.
      const signingSecret = `kaftan-decap-state-v1:${env.GITHUB_CLIENT_SECRET}`;
      if (url.pathname === '/auth') {
        if (url.searchParams.get('provider') !== 'github' || url.searchParams.get('site_id') !== 'kaftanangelo.com') return text('Unknown content panel', 400);
        const session = { state: random(), verifier: random(), created: now() };
        const target = new URL('https://github.com/login/oauth/authorize');
        target.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID,
          redirect_uri: `${SERVICE}/callback`, scope: 'public_repo', state: session.state,
          code_challenge: encode(await crypto.subtle.digest('SHA-256', encoder.encode(session.verifier))),
          code_challenge_method: 'S256', allow_signup: 'false' }).toString();
        return new Response(null, { status: 302, headers: { ...headers,
          Location: target.href, 'Set-Cookie': cookie(await seal(session, signingSecret)) } });
      }
      const sessionCookie = (request.headers.get('Cookie') || '').split(';')
        .map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
      const session = await unseal(sessionCookie, signingSecret, now());
      if (!session || url.searchParams.get('state') !== session.state) return finish({ message: 'Sign-in session expired or invalid. Please try again.' }, false, 400);
      if (url.searchParams.has('error')) return finish({ message: 'GitHub authorization was cancelled.' }, false, 400);
      const code = url.searchParams.get('code');
      if (!code || code.length > 256) return finish({ message: 'Missing GitHub authorization code.' }, false, 400);
      const tokenResponse = await fetcher('https://github.com/login/oauth/access_token', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET,
          code, code_verifier: session.verifier, redirect_uri: `${SERVICE}/callback` }).toString(),
      });
      if (!tokenResponse.ok) throw new Error('Token exchange failed');
      const token = await tokenResponse.json();
      if (typeof token.access_token !== 'string' || token.access_token.length > 1024 || token.error) throw new Error('Invalid token');
      const apiHeaders = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.access_token}`,
        'User-Agent': 'Kaftan-Angelo-Decap', 'X-GitHub-Api-Version': '2022-11-28' };
      const userResponse = await fetcher('https://api.github.com/user', { headers: apiHeaders, redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!userResponse.ok || !(await userResponse.json()).login) throw new Error('Invalid GitHub identity');
      const repoResponse = await fetcher(`https://api.github.com/repos/${REPOSITORY}`, { headers: apiHeaders, redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!repoResponse.ok || (await repoResponse.json()).permissions?.push !== true) return finish({ message: 'This GitHub account cannot edit the Kaftan Angelo repository.' }, false, 403);
      // Do not expose client_secret or refresh_token to the CMS. Expired sessions sign in again.
      return finish({ token: token.access_token, provider: 'github' }, true);
    } catch {
      // Deliberately omit upstream responses, codes and credentials from errors and logs.
      return finish({ message: 'GitHub sign-in is temporarily unavailable. Please try again.' }, false, 502);
    }
  } };
}

export default createWorker();
