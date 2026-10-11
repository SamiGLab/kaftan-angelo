# Partner security

`2026-10-11-hardening.sql` was applied to production on 2026-10-11. It removes direct anonymous and authenticated table privileges, prevents unknown partner codes from creating login-attempt records, and enforces case-insensitive unique partner codes. Existing hashed PIN checks and the five-failure / fifteen-minute lock remain in place.

`regression.sql` creates two temporary partners inside a transaction and rolls everything back. It checks account isolation, cross-account PIN rejection, lock expiry, PIN storage and role permissions. Run it through an authenticated database management connection. Credentials and real PINs must never be committed here.

The anonymous SECURITY DEFINER advisor warning reflects the current PIN-based RPC architecture. The function has a fixed search path and checks the PIN before returning partner-owned records. RLS with no public table policies is intentional; do not add public policies merely to remove advisor notices.

Browser regression tests cover cache expiry, logout cleanup, partner ownership, allowed Storage origins and unsafe content. A cached dashboard is a read-only preview, not an authorization token. Promotion files are publicly shareable; confidential contracts belong in the private bucket. Desktop uploads currently store a contract filename, so portal downloads still require a trusted backend to issue short-lived signed links. No partner had an assigned contract at this audit.

Remaining limits: the lock is per partner code, not per trusted client IP, so someone knowing a code can trigger a temporary lock. Valid signed document links are bearer links until they expire. Stronger authentication and backend contract signing remain separate work.

References: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [securing the API](https://supabase.com/docs/guides/api/securing-your-api).
