# Partner intake: server validation foundation

Status: **not deployed; no application receipt endpoint**. The live HU/EN form keeps its existing email/WhatsApp behavior. This module is the first isolated step for issue #48, not a working lead service.

`readApplication(Request)` accepts POST JSON up to 16 KiB with a five-second body deadline, enforcing the actual streamed byte count even without a truthful Content-Length. It rejects invalid UTF-8/JSON, unknown fields, unexpected types, control characters, excessive lengths, unsupported categories/languages, missing privacy acknowledgement, honeypot content and a missing challenge token. Errors contain fixed codes, never submitted values. The token is returned separately from the lead for transient server-side verification. **A token's presence is not bot verification.** Normalized text is still untrusted: use parameterized writes and text-only rendering, never HTML interpolation.

Future form mapping uses machine categories `hotel_concierge`, `guide`, `apartment`, `travel_agency`, `other` and languages `hu`, `en`. Name/company/message are required; phone is optional. Email accepts common ASCII mailbox syntax with a dotted domain (international domains need their ASCII form); actual deliverability remains unverified. No status, owner, timestamps, retention, notification destination or authorization fields are accepted from callers. Privacy acknowledgement is acknowledgement of the notice, not permission for unrelated marketing.

Run `node --test services/partner-intake/validation.test.mjs`.

## Gates before integration or production enablement

- Implement a dedicated Edge Function and private table with RLS and revoked anon/authenticated grants. Keep service credentials exclusively in server secrets. Do not reuse the portal PIN RPC.
- Restrict origins; do not use Origin/CORS as authentication. Verify bot challenges server-side with expected hostname/action and timeouts. Add atomic rate limits using a proven gateway-controlled IP source, fail closed when it is unavailable, and never trust raw forwarding headers. Add durable duplicate/idempotency handling. Validation alone provides none of those controls.
- Establish an authorized operator/mailbox and authenticated access to received leads; verify notification failure/retry behavior without exposing lead contents in logs. Return a receipt only after durable acceptance.
- Add HU/EN privacy copy, accessible pending/error/retry states and field mapping; keep WhatsApp fallback and exclude all PII from analytics. Complete browser, server, RLS and synthetic operator-receipt E2E tests in an isolated environment.
- Document a retention schedule and deletion/backup process before collection. An engineering proposal is **90 days from submission for unsigned prospect inquiries**, with a review before expiry and deletion when no longer needed. Signed partners belong to a separately defined contractual/accounting process. Do not silently extend the inquiry lifetime or reuse leads for newsletters. The 90-day value is an operational proposal, **not a GDPR-mandated period or legal approval**, and no automatic deletion is deployed in this package.

Retention must follow necessity for the purpose, not a universal default: [European Commission storage limitation principle](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en). The business must confirm its actual follow-up cycle, lawful basis, responsible operator and legal exceptions before enabling production collection/deletion.


## Request boundary (inert until a trusted adapter is deployed)

`handler.mjs` provides a **server-only, non-deployed** HTTP boundary for Issue #48. It requires an exact HU/EN site origin, an opaque UUID idempotency key, a gateway **attestation** with a 64-character HMAC client key, an atomic rate limit, a server-verified bot challenge with exact hostname/action, and an atomic private database commit with a notification outbox. All collaborators are required. If any are missing, time out, or refuse authorization, it fails closed without acknowledging the lead. Error responses never echo applicant fields or challenge details. CORS alone is not authentication.

The **designated operator mailbox is alfinafashionkft@gmail.com**, approved on 16 October 2026. This does not configure email transport, prove notification delivery, or authorize sending applicant PII to a third-party system. An actual adapter must use a server-only email provider secret and retryable outbox processing. Use `node --test services/partner-intake/handler.test.mjs` for the synthetic request-boundary regressions.

**Do not make this handler publicly reachable yet.** The project has no verified trusted-ingress attestation adapter, atomically enforced DB rate limits/idempotency, privacy-approved retention, permitted operator authentication, or end-to-end encrypted notification receipt. These must be tested together before migrating/deploying a production public Edge Function, and the legacy mailto/WhatsApp fallback must remain in place until then.

## Disposable PostgreSQL staging migration (not applied to production)

`supabase/migrations/20261016_private_intake.sql` creates a **private** `kaftan_intake` schema with three RLS-protected, non-public tables: partner inquiries, an HMAC-keyed rate limiter, and a notification outbox **without duplicated applicant PII**. Only the server's `service_role` can execute narrow `SECURITY DEFINER` functions. Neither anonymous nor authenticated users can browse/write inquiry rows or execute the functions. No policies deliberately means deny-by-default. The migration does **not** touch existing portal partners or commissions.

`take_rate_slot` atomically limits a verified, server-hashed client key to five requests per 15-minute window; it must only be given a key from an independent trusted-ingress adapter. `accept_inquiry` atomically writes a private inquiry and a pending outbox marker; same UUID + same payload returns the existing receipt, while the same UUID with different PII raises an error. Its `privacy_notice_version` argument must be a **server-assigned legally approved notice version**, not a value copied from the browser. Sending notifications, retrying outbox entries and authenticating staff are **not implemented** by this migration.

Both GitHub Actions workflows run a separate `intake-db` job against a disposable PostgreSQL 17 service, with CI-only fake roles/credentials. The tests stage sample requests in an explicit transaction and roll them back. Pages deploy requires this job as well as the normal static-site quality gate. To reproduce locally: create an empty PostgreSQL 17 database, execute `supabase/tests/roles.sql`, then `supabase/migrations/20261016_private_intake.sql`, and finally `supabase/tests/regression.sql`, using `psql -X -v ON_ERROR_STOP=1`. **Do not run the test roles script or any migration blindly against production**, and do not treat this isolated PostgreSQL rehearsal as real Supabase Storage, ingress trust, or business privacy approval.


## Optional server-only Cloudflare Turnstile verification (not deployed)

`turnstile.mjs` exports a verifier which takes a server-only secret, posts the challenge to the fixed Cloudflare `siteverify` URL with a 4.5-second timeout, refuses redirects, and accepts only an exact `hostname=kaftanangelo.com` and `action=partner_application` on a successful response. Provider outages and missing secrets fail closed. Only a minimal proof object is returned; submitted token, secret and provider errors are not reflected.

The public site key/widget has **not** been configured; no service endpoint is exposed. The future adapter must still supply verified ingress, database limiting/idempotency, legal/operational notification flow and synthetic E2E. Test with `node --test services/partner-intake/turnstile.test.mjs`.
