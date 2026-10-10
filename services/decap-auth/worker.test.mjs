import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { createWorker } from './worker.mjs';

const base = 'https://kaftan-decap-auth.samigrowlab.workers.dev';
const env = { GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-only-secret-not-a-real-credential' };
const start = `${base}/auth?provider=github&site_id=kaftanangelo.com&scope=repo`;
async function begin(worker) {
  const response = await worker.fetch(new Request(start), env);
  return { response, cookie: response.headers.get('Set-Cookie').split(';')[0],
    state: new URL(response.headers.get('Location')).searchParams.get('state') };
}
function callback(session, extra = {}) {
  return new Request(`${base}/callback?${new URLSearchParams({ state: session.state, code: 'test-code', ...extra })}`, { headers: { Cookie: session.cookie } });
}
function mockGitHub(push = true) {
  const calls = [];
  return { calls, fetch: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/access_token')) return Response.json({ access_token: 'test-access-token', refresh_token: 'never-send-this', scope: 'public_repo' });
    if (url.endsWith('/user')) return Response.json({ login: 'test-editor' });
    if (url.endsWith('/repos/SamiGLab/kaftan-angelo')) return Response.json({ permissions: { push } });
    throw new Error('Unexpected destination');
  } };
}
test('only the production domain and GitHub provider can start sign-in', async () => {
  const worker = createWorker();
  for (const query of ['provider=gitlab&site_id=kaftanangelo.com', 'provider=github&site_id=evil.example', 'provider=github']) {
    assert.equal((await worker.fetch(new Request(`${base}/auth?${query}`), env)).status, 400);
  }
  assert.equal((await worker.fetch(new Request(start.replace(base, 'https://evil.example')), env)).status, 400);
  assert.equal((await worker.fetch(new Request(start, { method: 'POST' }), env)).status, 405);
  assert.equal((await worker.fetch(new Request(start), {})).status, 503);
});
test('authorization uses fixed callback, minimal scope, PKCE and a protected cookie', async () => {
  const { response } = await begin(createWorker());
  const location = new URL(response.headers.get('Location'));
  assert.equal(response.status, 302);
  assert.equal(location.origin, 'https://github.com');
  assert.equal(location.searchParams.get('scope'), 'public_repo');
  assert.equal(location.searchParams.get('redirect_uri'), `${base}/callback`);
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.match(location.searchParams.get('code_challenge'), /^[\w-]{43}$/);
  assert.match(response.headers.get('Set-Cookie'), /Secure; HttpOnly; SameSite=Lax/);
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=600/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.ok(!location.href.includes(env.GITHUB_CLIENT_SECRET));
});
test('missing, tampered and mismatched state never exchanges the code', async () => {
  const github = mockGitHub();
  const worker = createWorker({ fetch: github.fetch });
  const session = await begin(worker);
  const requests = [new Request(`${base}/callback?state=x&code=test`),
    callback(session, { state: 'wrong' }), callback({ ...session, cookie: `${session.cookie}x` })];
  for (const request of requests) assert.equal((await worker.fetch(request, env)).status, 400);
  assert.equal(github.calls.length, 0);
});
test('an expired state and a cancelled authorization never exchanges the code', async () => {
  let now = 1000;
  const github = mockGitHub();
  const worker = createWorker({ fetch: github.fetch, now: () => now });
  const session = await begin(worker);
  now += 600;
  assert.equal((await worker.fetch(callback(session), env)).status, 400);
  now = 1000;
  assert.equal((await worker.fetch(callback(session, { error: 'access_denied' }), env)).status, 400);
  assert.equal(github.calls.length, 0);
});
test('only an account with repository write permission receives the token', async () => {
  const github = mockGitHub(false);
  const worker = createWorker({ fetch: github.fetch });
  const response = await worker.fetch(callback(await begin(worker)), env);
  assert.equal(response.status, 403);
  assert.ok(!(await response.text()).includes('test-access-token'));
});
test('successful callback uses PKCE, drops secrets and refresh token, and clears the cookie', async () => {
  const github = mockGitHub();
  const worker = createWorker({ fetch: github.fetch });
  const session = await begin(worker);
  const response = await worker.fetch(callback(session), env);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /authorization:github:success:/);
  assert.ok(html.includes('test-access-token'));
  assert.ok(!html.includes(env.GITHUB_CLIENT_SECRET));
  assert.ok(!html.includes('never-send-this'));
  assert.ok(!html.includes('test-code'));
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  const sessionData = JSON.parse(Buffer.from(session.cookie.split('=')[1].split('.')[0], 'base64url'));
  for (const call of github.calls) assert.equal(call.options.redirect, 'manual');
  assert.equal(github.calls[0].options.headers['User-Agent'], 'Kaftan-Angelo-Decap');
  const exchange = new URLSearchParams(github.calls[0].options.body);
  assert.equal(exchange.get('code_verifier'), sessionData.verifier);
  assert.equal(exchange.get('redirect_uri'), `${base}/callback`);
});
test('popup handshake ignores other origins and windows before releasing token', async () => {
  const worker = createWorker({ fetch: mockGitHub().fetch });
  const html = await (await worker.fetch(callback(await begin(worker)), env)).text();
  const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
  const messages = [];
  const opener = { postMessage: (message, origin) => messages.push({ message, origin }) };
  let listener;
  runInNewContext(script, { history: { replaceState() {} }, window: { opener,
    addEventListener: (_type, fn) => { listener = fn; }, removeEventListener() {} } });
  assert.equal(messages.length, 1);
  listener({ source: opener, origin: 'https://evil.example', data: 'authorizing:github' });
  listener({ source: {}, origin: 'https://kaftanangelo.com', data: 'authorizing:github' });
  assert.equal(messages.length, 1);
  listener({ source: opener, origin: 'https://kaftanangelo.com', data: 'authorizing:github' });
  assert.equal(messages.length, 2);
  assert.equal(messages[1].origin, 'https://kaftanangelo.com');
  assert.match(messages[1].message, /^authorization:github:success:/);
});
test('upstream error content and credentials are never reflected', async () => {
  const worker = createWorker({ fetch: async () => { throw new Error('secret-upstream-detail'); } });
  const response = await worker.fetch(callback(await begin(worker)), env);
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes('secret-upstream-detail'));
});

test('unexpected token redirects fail closed without following or exposing the response', async () => {
  const worker = createWorker({ fetch: async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    return new Response('private-upstream-response', { status: 302, headers: { Location: 'https://evil.example' } });
  } });
  const response = await worker.fetch(callback(await begin(worker)), env);
  const html = await response.text();
  assert.equal(response.status, 502);
  assert.match(html, /token_exchange_http_302/);
  assert.ok(!html.includes('private-upstream-response'));
  assert.ok(!html.includes('evil.example'));
});
