import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTurnstileVerifier } from './turnstile.mjs';

const secret = 'synthetic-server-only-secret';
const token = 'synthetic-response.abcdef';
const verified = { success: true, hostname: 'kaftanangelo.com', action: 'partner_application' };
const makeFetch = payload => async (url, init) => {
  assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(init.method, 'POST');
  assert.equal(init.redirect, 'error');
  assert.equal(init.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.ok(init.signal instanceof AbortSignal);
  const outgoing = new URLSearchParams(init.body);
  assert.deepEqual([...outgoing.keys()].sort(), ['response', 'secret']);
  assert.equal(outgoing.get('secret'), secret);
  assert.equal(outgoing.get('response'), token);
  return new Response(JSON.stringify(payload), { status: 200 });
};

test('server-only secret is submitted to fixed siteverify endpoint and only exact proof is accepted', async () => {
  const verify = createTurnstileVerifier({ secret, fetchImpl: makeFetch(verified) });
  assert.deepEqual(await verify(token), verified);
});

test('failure and unexpected hostname/action/field types are rejected without leaking provider details', async () => {
  for (const payload of [
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { ...verified, hostname: 'attacker.example' },
    { ...verified, action: 'contact' },
    { ...verified, success: 'true' },
    { ...verified, action: null },
    null,
  ]) {
    const verify = createTurnstileVerifier({ secret, fetchImpl: makeFetch(payload) });
    const result = await verify(token);
    assert.deepEqual(result, { success: false });
    assert.equal(JSON.stringify(result).includes(secret), false);
    assert.equal(JSON.stringify(result).includes(token), false);
  }
});

test('malformed challenge and missing secret fail without contacting Cloudflare', async () => {
  let calls = 0;
  const noNetwork = async () => { calls++; throw Error('should not be called'); };
  const missing = createTurnstileVerifier({ fetchImpl: noNetwork });
  await assert.rejects(missing(token), { message: 'challenge_unavailable' });
  const verifier = createTurnstileVerifier({ secret, fetchImpl: noNetwork });
  for (const malformed of ['', 'token with spaces', 'x'.repeat(2049), 1234, null]) {
    assert.deepEqual(await verifier(malformed), { success: false });
  }
  assert.equal(calls, 0);
});

test('outage, HTTP errors, malformed JSON and oversized results fail closed', async () => {
  const variants = [
    async () => { throw Error('provider private detail'); },
    async () => new Response('{}', { status: 502 }),
    async () => new Response('{ malformed', { status: 200 }),
    async () => new Response('x'.repeat(4097), { status: 200 }),
  ];
  for (const fetchImpl of variants) {
    const verifier = createTurnstileVerifier({ secret, fetchImpl });
    await assert.rejects(verifier(token), { message: 'challenge_unavailable' });
  }
});

test('valid proof cannot be accepted without hostname and action', async () => {
  const verify = createTurnstileVerifier({
    secret,
    fetchImpl: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
  });
  assert.deepEqual(await verify(token), { success: false });
});
