// Server-only, inert until the partner-intake Edge Function is configured.
const endpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const expectedHost = 'kaftanangelo.com';
const expectedAction = 'partner_application';
const tokenPattern = /^[A-Za-z0-9._-]{1,2048}$/;

export function createTurnstileVerifier({ secret, fetchImpl = fetch, timeoutMs = 4500 } = {}) {
  return async challengeToken => {
    // A missing server-side secret must never permit a successful application.
    if (typeof secret !== 'string' || secret.length < 8) throw Error('challenge_unavailable');
    if (typeof challengeToken !== 'string' || !tokenPattern.test(challengeToken)) return { success: false };
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: challengeToken }),
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw Error('challenge_unavailable');
    }
    if (!response?.ok) throw Error('challenge_unavailable');
    let result;
    try {
      const responseText = await response.text();
      if (responseText.length > 4096) throw Error();
      result = JSON.parse(responseText);
    } catch {
      throw Error('challenge_unavailable');
    }
    // Do not echo siteverify diagnostics, token or secret to clients or logs.
    if (result?.success !== true ||
      result.hostname !== expectedHost ||
      result.action !== expectedAction) return { success: false };
    return { success: true, hostname: expectedHost, action: expectedAction };
  };
}
