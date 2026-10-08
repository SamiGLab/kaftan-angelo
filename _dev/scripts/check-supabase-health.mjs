import { pathToFileURL } from 'node:url';

// Public project configuration, already used by the partner portal.
const DEFAULT_URL = 'https://bezlzeojivucnqkfjpwo.supabase.co';
const DEFAULT_KEY = 'sb_publishable_M-lTei71UX1lmxv62xiNdQ_5t94kZZD';

export async function checkHealth({ fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), url = DEFAULT_URL, key = DEFAULT_KEY } = {}) {
  const origin = new URL(url);
  if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.supabase.co') || origin.username || origin.password || origin.port || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Invalid Supabase project URL.');
  }
  if (!key.startsWith('sb_publishable_')) throw new Error('Only a publishable key is permitted for this monitor.');
  const endpoint = new URL('/rest/v1/partners?select=id&limit=1', origin);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'GET', headers: { apikey: key, Accept: 'application/json' },
        redirect: 'error', signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        const error = new Error(`Supabase database health check failed (HTTP ${response.status}).`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      const body = await response.text();
      if (body.length > 4096) throw new Error('Unexpected database health response.');
      let rows;
      try { rows = JSON.parse(body); } catch { throw new Error('Invalid database health response.'); }
      if (!Array.isArray(rows)) throw new Error('Unexpected database health response.');
      if (rows.length !== 0) throw new Error('Anonymous partner rows are visible. Review database access policies.');
      return { ok: true, anonymousRowsVisible: false };
    } catch (error) {
      const retryable = error.retryable || error.name === 'TimeoutError' || error.name === 'AbortError' || error instanceof TypeError;
      if (!retryable || attempt === 2) {
        // Never expose raw network errors, response bodies, IDs or credentials.
        if (error.retryable !== undefined || (!retryable && error instanceof Error)) throw new Error(error.message);
        throw new Error('Supabase database could not be reached.');
      }
      await sleep(2000 * (attempt + 1));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await checkHealth({ url: process.env.SUPABASE_URL || DEFAULT_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY });
    console.log('Supabase database reachable; anonymous partner rows remain hidden.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
