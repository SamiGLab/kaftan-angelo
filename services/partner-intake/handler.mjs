import { readApplication, IntakeError } from './validation.mjs';

// A non-deployed orchestration boundary. The production adapter must supply
// real gateway attestations, atomic rate limits, challenge verification and
// an idempotent database transaction with a durable notification outbox.
const allowedOrigin = 'https://kaftanangelo.com';
const expectedAction = 'partner_application';
const expectedHost = 'kaftanangelo.com';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maskedClientKey = /^[0-9a-f]{64}$/;

export async function handlePartnerIntake(request, {
  authenticateIngress,
  consumeRateLimit,
  verifyChallenge,
  persistApplication,
} = {}) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  };
  const reply = (status, value, extra = {}) =>
    new Response(JSON.stringify(value), { status, headers: { ...headers, ...extra } });

  // CORS is defense in depth, not authentication. The gateway attestation and
  // server-side challenge below must independently protect the public endpoint.
  if (origin !== allowedOrigin) return reply(403, { accepted: false, code: 'forbidden' });
  headers['Access-Control-Allow-Origin'] = allowedOrigin;
  headers['Access-Control-Allow-Headers'] = 'content-type, x-idempotency-key';
  headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { accepted: false, code: 'method_not_allowed' }, { Allow: 'POST, OPTIONS' });
  if (new URL(request.url).search) return reply(400, { accepted: false, code: 'invalid_request' });

  const idempotencyKey = request.headers.get('X-Idempotency-Key');
  if (!uuid.test(idempotencyKey || '')) return reply(400, { accepted: false, code: 'invalid_request' });
  if (![authenticateIngress, consumeRateLimit, verifyChallenge, persistApplication].every(fn => typeof fn === 'function')) {
    return reply(503, { accepted: false, code: 'temporarily_unavailable' });
  }

  try {
    // A raw X-Forwarded-For, True-Client-IP or similar caller-supplied header
    // must NEVER count as evidence of trusted ingress.
    const ingress = await authenticateIngress(request);
    if (ingress?.trusted !== true || !maskedClientKey.test(ingress.clientKey || '')) {
      return reply(503, { accepted: false, code: 'temporarily_unavailable' });
    }

    const limit = await consumeRateLimit(ingress.clientKey);
    if (limit?.allowed !== true) {
      return limit?.limited === true
        ? reply(429, { accepted: false, code: 'rate_limited' }, { 'Retry-After': '120' })
        : reply(503, { accepted: false, code: 'temporarily_unavailable' });
    }

    const { lead, challengeToken } = await readApplication(request);
    const proof = await verifyChallenge(challengeToken);
    if (proof?.success !== true || proof.hostname !== expectedHost || proof.action !== expectedAction) {
      return reply(403, { accepted: false, code: 'verification_failed' });
    }

    // persistApplication must atomically store the private lead, the matching
    // idempotency key and a pending operator-notification outbox entry.
    // Never acknowledge a successful submission before that transaction commits.
    const saved = await persistApplication(lead, { idempotencyKey, clientKey: ingress.clientKey });
    if (saved?.committed !== true || !['created', 'duplicate'].includes(saved.outcome) || !uuid.test(saved.receipt || '')) {
      return reply(503, { accepted: false, code: 'temporarily_unavailable' });
    }
    return reply(202, { accepted: true, receipt: saved.receipt });
  } catch (error) {
    if (error instanceof IntakeError) {
      return reply(error.status, { accepted: false, code: error.code });
    }
    // Avoid printing or returning applicant PII, challenges, gateway evidence,
    // database errors or delivery credentials.
    return reply(503, { accepted: false, code: 'temporarily_unavailable' });
  }
}
