# Partner security

`2026-10-11-hardening.sql` was applied to production on 2026-10-11. It removes direct anonymous and authenticated table privileges, prevents unknown partner codes from creating login-attempt records, and enforces case-insensitive unique partner codes. Existing hashed PIN checks and the five-failure / fifteen-minute lock remain in place.

`regression.sql` creates two temporary partners inside a transaction and rolls everything back. It checks account isolation, cross-account PIN rejection, lock expiry, PIN storage and role permissions. Run it through an authenticated database management connection. Credentials and real PINs must never be committed here.

The anonymous SECURITY DEFINER advisor warning reflects the current PIN-based RPC architecture. The function has a fixed search path and checks the PIN before returning partner-owned records. RLS with no public table policies is intentional; do not add public policies merely to remove advisor notices.

Browser regression tests cover cache expiry, logout cleanup, partner ownership, allowed Storage origins and unsafe content. The cached dashboard is a read-only preview; its temporary document capability only permits access to its owner's assigned contract. Promotion files are publicly shareable; confidential contracts belong in the private bucket. Desktop uploads store a contract filename. No real partner had an assigned contract at the start of this audit.

## Follow-up changes, applied on 2026-10-11

Apply migrations in this order after the original hardening: `2026-10-11-ip-limit.sql`, `2026-10-11-contract-sessions.sql`, `2026-10-11-admin-audit.sql`. Do not rerun the original hardening on its own afterwards, because it replaces the public login wrapper.

The login wrapper accepts thirty POST requests per fifteen minutes per gateway-provided IP address, including unknown account codes. It uses `cf-connecting-ip`, not caller-supplied `X-Forwarded-For`. Production tests confirmed that spoofed forwarding headers do not bypass the quota. IPv6 addresses share a /64 quota. Only keyed hashes are stored. Subsequent logins remove counters older than twenty-four hours in bounded batches. Missing trusted headers fail closed for internet requests. The existing five-failure account lock remains.

Successful PIN login returns a random thirty-minute document capability; the database stores only its SHA-256 hash. The `partner-contract` Edge Function resolves the file from the session owner and signs it for five minutes on demand. JWT verification is disabled because the handler validates this custom capability. The backing RPCs are service-role-only. Logout, PIN changes, deletion and expiry revoke capabilities. Downloads are limited to ten per five minutes per session. Deploy from this directory with `supabase functions deploy partner-contract --project-ref bezlzeojivucnqkfjpwo --no-verify-jwt --use-api`; runtime keys stay in platform secrets. Signed document URLs are not cached in sessionStorage.

Partner creation, selected profile changes, PIN changes, transaction/payment changes and deletion create restricted history entries. Records omit PINs, hashes, tokens and full contact/bank values. An administrator RPC reads one hundred entries per page. User/PC labels are explicitly client assertions, not independently authenticated human identities. Older clients without those headers are recorded as a shared administrator.

Run `regression.sql`, `ip-limit-regression.sql`, `contract-regression.sql` and `audit-regression.sql` through management access. Each rolls back synthetic data. Run `node --test services/partner-security/contract-handler.test.mjs` and the portal browser regression locally; both JavaScript suites run in deployment CI. Two temporary production accounts/files verified ownership and revocation and were deleted afterwards.

Desk source provides a paginated read-only history menu and includes template artwork in verified backups, repairing paths when restoring elsewhere. These desktop changes require a later EXE build; this task does not replace the installed executable.

Remaining limits: targeted account locking remains possible, especially from multiple source IPs. Already-issued signed links remain usable for their five-minute lifetime after session revocation. Database owners can modify audit tables; shared admin keys cannot prove who physically used a PC. Free-plan invocation quotas apply.

References: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [securing the API](https://supabase.com/docs/guides/api/securing-your-api).
