// Server-only foundation. No public endpoint or database write is enabled here.
export const MAX_BODY_BYTES = 16_384;
const fields = new Set(['name', 'company', 'email', 'phone', 'type', 'message', 'language', 'privacyAcknowledged', 'website', 'challengeToken']);
const categories = new Set(['hotel_concierge', 'guide', 'apartment', 'travel_agency', 'other']);
const controls = /[\u0000-\u001f\u007f-\u009f]/u;

export class IntakeError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'IntakeError';
    this.code = code;
    this.status = status;
  }
}
const invalid = () => { throw new IntakeError('invalid_application'); };

function text(value, maximum, { optional = false, multiline = false } = {}) {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || value.length > maximum * 2) invalid();
  const normalized = value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  if ((!optional && !normalized) || [...normalized].length > maximum) invalid();
  if (controls.test(multiline ? normalized.replace(/[\n\t]/g, '') : normalized)) invalid();
  return normalized;
}

export function validateApplication(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid();
  if (Object.keys(input).some(key => !fields.has(key))) invalid();
  // Honeypot failure is generic and must never become a successful receipt.
  if (input.website !== undefined && input.website !== '') invalid();
  if (input.privacyAcknowledged !== true || !['hu', 'en'].includes(input.language) || !categories.has(input.type)) invalid();
  const email = text(input.email, 254);
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email)) invalid();
  const [local, domain] = email.split('@');
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || domain.split('.').some(label => label.length > 63)) invalid();
  const phone = text(input.phone, 40, { optional: true });
  if (phone && !/^[+0-9(). /-]+$/.test(phone)) invalid();
  const challengeToken = text(input.challengeToken, 2048);
  if (!/^[A-Za-z0-9._-]+$/.test(challengeToken)) invalid();
  return {
    lead: {
      name: text(input.name, 120), company: text(input.company, 160),
      email: `${local}@${domain.toLowerCase()}`, phone,
      type: input.type, message: text(input.message, 3000, { multiline: true }),
      language: input.language,
    },
    // Ephemeral verification input; never include it in the stored lead.
    challengeToken,
  };
}

export async function readApplication(request, { bodyTimeoutMs = 5000 } = {}) {
  if (request.method !== 'POST') throw new IntakeError('method_not_allowed', 405);
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) throw new IntakeError('unsupported_media_type', 415);
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) throw new IntakeError('body_too_large', 413);
  const reader = request.body?.getReader();
  if (!reader) invalid();
  const chunks = [];
  let total = 0;
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new IntakeError('request_timeout', 408));
      void reader.cancel().catch(() => {});
    }, bodyTimeoutMs);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw new IntakeError('body_too_large', 413);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof IntakeError) throw error;
    throw new IntakeError('invalid_application');
  } finally { clearTimeout(timer); reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let input;
  try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { invalid(); }
  return validateApplication(input);
}
