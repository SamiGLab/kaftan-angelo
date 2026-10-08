import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHealth } from './check-supabase-health.mjs';

test('uses only a small read and no bearer administrator credential', async () => {
  const result = await checkHealth({ fetchImpl: async (url, options) => {
    assert.equal(url.pathname, '/rest/v1/partners');
    assert.equal(url.search, '?select=id&limit=1');
    assert.equal(options.method, 'GET');
    assert.ok(options.headers.apikey.startsWith('sb_publishable_'));
    assert.equal(options.headers.Authorization, undefined);
    return new Response('[]', { status: 200 });
  } });
  assert.equal(result.ok, true);
});

test('does not expose returned partner data', async () => {
  await assert.rejects(checkHealth({ fetchImpl: async () => new Response('[{"id":"private-test-id"}]') }), /Anonymous partner rows are visible/);
});

test('retries transient failure but not invalid credentials', async () => {
  let attempts = 0;
  await checkHealth({ sleep: async () => {}, fetchImpl: async () => ++attempts === 1 ? new Response('', { status: 503 }) : new Response('[]') });
  assert.equal(attempts, 2);
  attempts = 0;
  await assert.rejects(checkHealth({ fetchImpl: async () => { attempts++; return new Response('sensitive-body', { status: 401 }); } }), /HTTP 401/);
  assert.equal(attempts, 1);
});

test('rejects administrator key and unrelated hosts before making requests', async () => {
  const fetchImpl = async () => { assert.fail('Must not request'); };
  await assert.rejects(checkHealth({ fetchImpl, key: 'sb_secret_example' }), /publishable/);
  await assert.rejects(checkHealth({ fetchImpl, url: 'https://example.com' }), /Invalid Supabase/);
});

test('rejects invalid response and sanitizes network failure', async () => {
  await assert.rejects(checkHealth({ fetchImpl: async () => new Response('<html>maintenance</html>') }), /Invalid database health/);
  await assert.rejects(checkHealth({ sleep: async () => {}, fetchImpl: async () => { throw new TypeError('credential-in-error'); } }), /^Error: Supabase database could not be reached\.$/);
});
