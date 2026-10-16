import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readApplication, validateApplication, MAX_BODY_BYTES, IntakeError } from './validation.mjs';

const application = () => ({ name: ' Teszt Ele\u0301k ', company: 'Test Hotel', email: 'Test+partner@EXAMPLE.COM', phone: '+36 20 000 0000', type: 'hotel_concierge', message: 'Synthetic inquiry\r\nSecond line', language: 'hu', privacyAcknowledged: true, website: '', challengeToken: 'synthetic-token' });
const request = (body, headers = {}) => new Request('https://example.test/', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });

for (const language of ['hu', 'en']) {
  test(`${language}: validated lead is normalized and contains no challenge/privilege metadata`, async () => {
    const result = await readApplication(request(JSON.stringify({ ...application(), language })));
    assert.equal(result.lead.name, 'Teszt Elék');
    assert.equal(result.lead.email, 'Test+partner@example.com');
    assert.equal(result.lead.message, 'Synthetic inquiry\nSecond line');
    assert.equal(result.lead.language, language);
    assert.equal(result.challengeToken, 'synthetic-token');
    assert.equal(Object.hasOwn(result.lead, 'challengeToken'), false);
    assert.equal(Object.hasOwn(result.lead, 'privacyAcknowledged'), false);
  });
}

test('server-owned values cannot be supplied by callers', () => {
  for (const field of ['status', 'id', 'created_at', 'retention_days', 'operator', 'role', '__proto__']) {
    const input = JSON.parse(JSON.stringify(application()));
    Object.defineProperty(input, field, { value: 'attacker', enumerable: true });
    assert.throws(() => validateApplication(input), IntakeError);
  }
});

test('invalid schema, privacy acknowledgement, category, language and honeypot fail closed', () => {
  for (const input of [null, [], 'text', { ...application(), privacyAcknowledged: 'true' }, { ...application(), website: 'spam' }, { ...application(), type: 'admin' }, { ...application(), language: 'tr' }, { ...application(), name: {} }, { ...application(), message: '' }, { ...application(), challengeToken: '' }]) {
    assert.throws(() => validateApplication(input), { message: 'invalid_application' });
  }
});

test('field limits are enforced server-side, including multibyte text', () => {
  for (const [field, limit] of [['name', 120], ['company', 160], ['phone', 40], ['message', 3000], ['challengeToken', 2048]]) {
    assert.throws(() => validateApplication({ ...application(), [field]: 'x'.repeat(limit + 1) }), IntakeError);
  }
  assert.equal(validateApplication({ ...application(), message: 'ő'.repeat(3000) }).lead.message.length, 3000);
  assert.throws(() => validateApplication({ ...application(), message: 'ő'.repeat(3001) }), IntakeError);
});

test('header injection, invalid email/phone and control characters are rejected without PII errors', () => {
  for (const email of ['a@example.com\r\nBcc:x@example.com', 'a..b@example.com', '.a@example.com', 'a@-example.com', 'a@example', `${'x'.repeat(65)}@example.com`]) {
    assert.throws(() => validateApplication({ ...application(), email }), { message: 'invalid_application' });
  }
  for (const [field, value] of [['name', 'Test\u0000secret'], ['company', 'Hotel\nBcc'], ['phone', 'javascript:alert(1)'], ['message', 'Text\u001bsecret']]) {
    assert.throws(() => validateApplication({ ...application(), [field]: value }), { message: 'invalid_application' });
  }
  assert.equal(validateApplication({ ...application(), phone: undefined }).lead.phone, '');
});

test('method, media type, invalid JSON and malformed UTF-8 are rejected', async () => {
  await assert.rejects(readApplication(new Request('https://example.test/')), { status: 405 });
  await assert.rejects(readApplication(request('{}', { 'Content-Type': 'text/plain' })), { status: 415 });
  await assert.rejects(readApplication(request('{')), { code: 'invalid_application' });
  await assert.rejects(readApplication(request(Uint8Array.from([0xff]))), { code: 'invalid_application' });
});

test('actual body byte cap cannot be bypassed with missing or forged content length', async () => {
  for (const headers of [{}, { 'Content-Length': '1' }, { 'Content-Length': String(MAX_BODY_BYTES + 1) }]) {
    await assert.rejects(readApplication(request('x'.repeat(MAX_BODY_BYTES + 1), headers)), { status: 413 });
  }
});

test('chunked over-limit input is cancelled; broken streams return sanitized errors', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(9000)); }, cancel() { cancelled = true; } });
  const streamed = new Request('https://example.test/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half' });
  await assert.rejects(readApplication(streamed), { status: 413 });
  assert.equal(cancelled, true);
  const broken = new ReadableStream({ start(controller) { controller.error(new Error('private upstream detail')); } });
  await assert.rejects(readApplication(new Request('https://example.test/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: broken, duplex: 'half' })), { message: 'invalid_application' });
});

test('stalled request bodies time out and cancel their stream', async () => {
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const stalled = new Request('https://example.test/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, duplex: 'half' });
  await assert.rejects(readApplication(stalled, { bodyTimeoutMs: 10 }), { code: 'request_timeout', status: 408 });
  assert.equal(cancelled, true);
});
