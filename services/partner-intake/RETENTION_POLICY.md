# B2B partner enquiry retention — staging policy

## Owner-approved operational decision (16 October 2026)

Kaftan Angelo's business owner approved **90 days from server-recorded creation** for enquiries **that have not become a signed business partnership**. This means the private `kaftan_intake.partner_inquiries` statuses `new`, `contacted`, `qualified`, and `rejected` are eligible after 90 days; `signed` is **never** automatically purged by this process.

The policy is **not** permission to erase an existing signed partner, a contract, a sale, a commission, a partner-account record, or Supabase Storage objects. Partner financial and contractual retention is governed by a different process. The decision does **not** constitute legal review of the HU/EN privacy notice, processor terms, retention exceptions, or a production deletion rollout.

## Staging-only PostgreSQL implementation

- Apply `supabase/migrations/20261016_private_intake.sql` first, then the additive **`supabase/migrations/20261016_90_day_retention.sql`** to a disposable PostgreSQL 17 staging database.
- `kaftan_intake.purge_expired_inquiries(batch_limit,execute)` is accessible **only** to a trusted `service_role`, not `anon` or `authenticated`. A missing `execute` argument defaults to **preview / no deletion**.
- Preview returns bounded eligible count only; execution must be explicitly `true` and deletes **at most 100 old unsigned enquiries per call**, with `FOR UPDATE SKIP LOCKED`, cutoff/status/hold predicates verified inside the DELETE. Returns aggregate counts only.
- `notification_outbox` rows are removed with their parent lead via the existing database foreign key `ON DELETE CASCADE`. The retention function does **not** touch `public.partners`, transactions, PINs, commissions, contract Storage or unrelated tables.
- `retention_purge_runs` records execution time, policy duration and aggregate delete count **without applicant names, emails, UUIDs, messages or IP-key hashes**. It has RLS enabled and no public policy.
- An explicit **time-limited legal preservation exception** may exist only for `legal_obligation` or `active_dispute`; no public form can set this field. Legal hold creation/extension/review requires an authorized operator and documented case record stored privately **outside the public site and retention audit**. Holds stop protecting the record after their end time. The job must track and periodically review holds before automation starts.

## Operational gates — not satisfied by this migration

1. Obtain HU/EN legal/privacy review covering the approved 90-day period, lawful basis, exceptional holds, rights requests, and the actual processor/data-processing setup.
2. Confirm which staff may administer the lead statuses and lawful holds. Record signed status **before** the 90-day expiry and establish a reconciled handoff to the signed-partner contract/accounting system.
3. Verify encrypted database **and Storage** backups, backup expiry/deletion handling and any legal hold obligations. Deleting an active lead row does not automatically remove existing backup copies, third-party Brevo copies or messages sent to operator inboxes.
4. Validate actual Supabase production roles, RLS, function grants and query performance in a representative **isolated** instance. Never run this migration or function against production as a side effect of GitHub Pages deployment.
5. Approve and separately configure a scheduled, authorized server job. Initially run preview-only reports and synthetic deletion E2E, then enable actual execution only after owner/administrator rollout authorization. Configure failed-run alerts, paginated batches, retention audit review and safe rollback/recovery documentation (never restore expired PII without reapplying expiry rules).

**No scheduled purge job, production SQL, real enquiries, or real applicant data are created or deleted here.** CI uses fake contacts inside a database transaction rolled back after each test.

### Standalone staging verification

After setting up a temporary PostgreSQL 17 database and running the fake roles from `supabase/tests/roles.sql`, apply both migrations in order and run:

`psql -X -v ON_ERROR_STOP=1 -f services/partner-intake/supabase/tests/retention-regression.sql`

The tests cover dry-run default, 90-day cutoff, 2-row and 100-row limits, signed-partner protection, recent and held exclusions, hold expiry, cascade deletion, public role denial and anonymous aggregate audit. Database changes in the test are rolled back.
