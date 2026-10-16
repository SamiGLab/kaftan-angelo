import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handlePartnerIntake } from './handler.mjs';

const origin = 'https://kaftanangelo.com';
const id = 'a0123456-1111-4111-8111-000000000001';
const receipt = 'b0123456-2222-4222-8222-000000000002';
const applicant = () => ({
  name: 'Test Partner', company: 'Synthetic Hotel', email: 'test@example.com',
  phone: '+36 20 000 0000', type: 'hotel_concierge',
  message: 'Synthetic question', language: 'en',
  privacyAcknowledged: true, website: '', challengeToken: 'test-challenge',
});
const request = (body = applicant(), {
  method = 'POST', requestOrigin = origin, requestId = id,
  url = 'https://bezlzeojivucnqkfjpwo.supabase.co/functions/v1/partner-intake',
} = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (requestOrigin !== null) headers.Origin = requestOrigin;
  if (requestId !== null) headers['X-Idempotency-Key'] = requestId;
  return new Request(url, { method, headers, ...(['POST'].includes(method) ? { body: JSON.stringify(body) } : {}) });
};
const good = () => ({
  authenticateIngress: async () => ({ trusted: true, clientKey: 'a'.repeat(64) }),
  consumeRateLimit: async () => ({ allowed: true }),
  verifyChallenge: async token => ({ success: token === 'test-challenge', hostname: 'kaftanangelo.com', action: 'partner_application' }),
  persistApplication: async () => ({ committed: true, outcome: 'created', receipt }),
});
const body = response => response.json();

test('valid English application receives a minimal 202 only after durable commit', async () => {
  let stored;
  const response = await handlePartnerIntake(request(), {
    ...good(),
    persistApplication: async (lead, context) => {
      stored = { lead, context };
      return { committed: true, outcome: 'created', receipt };
    },
  });
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Vary'), 'Origin');
  assert.deepEqual(await body(response), { accepted: true, receipt });
  assert.equal(stored.lead.email, 'test@example.com');
  assert.equal(stored.lead.language, 'en');
  assert.deepEqual(Object.keys(stored.context).sort(), ['clientKey', 'idempotencyKey']);
  assert.equal(JSON.stringify(stored).includes('test-challenge'), false);
  assert.equal(JSON.stringify(stored).includes('privacyAcknowledged'), false);
});

test('Hungarian application preserves validated language and supports durable idempotent retry', async () => {
  const entries = new Map();
  let writes = 0;
  const deps = {
    ...good(),
    persistApplication: async (lead, { idempotencyKey }) => {
      if (!entries.has(idempotencyKey)) {
        writes++;
        entries.set(idempotencyKey, { payload: lead, receipt });
        return { committed: true, outcome: 'created', receipt };
      }
      return { committed: true, outcome: 'duplicate', receipt: entries.get(idempotencyKey).receipt };
    },
  };
  const item = { ...applicant(), language: 'hu' };
  assert.equal((await handlePartnerIntake(request(item), deps)).status, 202);
  assert.deepEqual(await body(await handlePartnerIntake(request(item), deps)), { accepted: true, receipt });
  assert.equal(writes, 1);
  assert.equal(entries.get(id).payload.language, 'hu');
});

test('Origin rules and preflight are strict, without third-party CORS access', async () => {
  const blocked = await handlePartnerIntake(request(applicant(), { requestOrigin: 'https://other.example' }), good());
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.has('Access-Control-Allow-Origin'), false);
  assert.equal((await handlePartnerIntake(request(applicant(), { requestOrigin: null }), good())).status, 403);
  const preflight = await handlePartnerIntake(request(null, { method: 'OPTIONS' }), {});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  const get = await handlePartnerIntake(request(null, { method: 'GET' }), good());
  assert.equal(get.status, 405);
});

test('URL query and missing or malformed idempotency keys are rejected', async () => {
  for (const requestId of [null, 'test', 'x'.repeat(100), 'user@example.com']) {
    const response = await handlePartnerIntake(request(applicant(), { requestId }), good());
    assert.equal(response.status, 400);
  }
  const response = await handlePartnerIntake(request(applicant(), { url: 'https://example.test/?email=private%40example.com' }), good());
  assert.equal(response.status, 400);
  assert.equal(JSON.stringify(await body(response)).includes('private'), false);
});

test('missing or untrusted ingress and missing collaborators fail closed', async () => {
  assert.equal((await handlePartnerIntake(request(), {})).status, 503);
  const missing = { ...good(), authenticateIngress: async () => null };
  assert.equal((await handlePartnerIntake(request(), missing)).status, 503);
  const forged = { ...good(), authenticateIngress: async () => ({ trusted: true, clientKey: '1.2.3.4' }) };
  assert.equal((await handlePartnerIntake(request(), forged)).status, 503);
  const trouble = { ...good(), authenticateIngress: async () => { throw Error('private gateway secret'); } };
  const response = await handlePartnerIntake(request(), trouble);
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await body(response)).includes('secret'), false);
});

test('rate limit, missing trusted window and missing challenge refuse submission without persistence', async () => {
  let writes = 0;
  const deps = { ...good(), persistApplication: async () => { writes++; return { committed: true, outcome: 'created', receipt }; } };
  assert.equal((await handlePartnerIntake(request(), { ...deps, consumeRateLimit: async () => ({ allowed: false, limited: true }) })).status, 429);
  assert.equal((await handlePartnerIntake(request(), { ...deps, consumeRateLimit: async () => null })).status, 503);
  assert.equal((await handlePartnerIntake(request(), { ...deps, verifyChallenge: async () => ({ success: false }) })).status, 403);
  assert.equal(writes, 0);
});

test('challenge must have exact hostname, action, and positive server verification', async () => {
  const proofs = [
    { success: true, hostname: 'evil.example', action: 'partner_application' },
    { success: true, hostname: 'kaftanangelo.com', action: 'other' },
    { success: 'true', hostname: 'kaftanangelo.com', action: 'partner_application' },
    null,
  ];
  for (const proof of proofs) {
    const response = await handlePartnerIntake(request(), { ...good(), verifyChallenge: async () => proof });
    assert.equal(response.status, 403);
  }
});

test('invalid applications are rejected with no reflected personal data', async () => {
  const applicantWithPII = { ...applicant(), name: 'Private Person', email: 'private@example.com', privacyAcknowledged: false };
  const response = await handlePartnerIntake(request(applicantWithPII), good());
  assert.equal(response.status, 400);
  const serialized = JSON.stringify(await body(response));
  assert.equal(serialized.includes('Private Person'), false);
  assert.equal(serialized.includes('private@example.com'), false);
});

test('database failures and uncommitted or malformed receipts never claim success', async () => {
  for (const persistApplication of [
    async () => { throw new Error('private sql conflict'); },
    async () => ({ committed: false, outcome: 'created', receipt }),
    async () => ({ committed: true, outcome: 'created', receipt: 'example@example.com' }),
    async () => ({ committed: true, outcome: 'unknown', receipt }),
  ]) {
    const response = await handlePartnerIntake(request(), { ...good(), persistApplication });
    assert.equal(response.status, 503);
    assert.deepEqual(await body(response), { accepted: false, code: 'temporarily_unavailable' });
  }
});
