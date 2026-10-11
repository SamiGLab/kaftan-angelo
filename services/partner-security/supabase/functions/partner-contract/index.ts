import { handleContract } from './handler.mjs';

function serverKey() {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const preferred = keys.kaftan_desk_2026 || keys.default || Object.values(keys)[0];
    if (typeof preferred === 'string' && preferred.startsWith('sb_secret_')) return preferred;
  } catch {}
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

Deno.serve(request => handleContract(request, {
  url: Deno.env.get('SUPABASE_URL'), key: serverKey(), fetchImpl: fetch,
}));
