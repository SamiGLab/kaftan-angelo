# 90-day retention: controlled rollout and backup plan

Status on 17 October 2026: **automation OFF**. Owner confirmed there is no existing encrypted backup destination and requested a plan while deletion stays off. Production metadata check found no `kaftan_intake` schema, purge function or pg_cron extension. Pages run #38963000287 succeeded for commit `57567b2e2c4f4005c3dc8310cdb26a35ca1f1119`; that deploy does not apply database migrations.

## Proposed backup service level — requires destination and cost approval

- Responsible owner/contact: alfinafashionkft@gmail.com. Identify the named backup custodian and a second recovery custodian privately before setup; mailbox responsibility alone does not grant database administration.
- Proposed recovery point: 24 hours; proposed recovery time: one business day. These are targets, not measured guarantees. Take a verified recovery checkpoint before the first approved production migration/deletion rollout. Backups do not justify delaying valid deletion requests.
- Export schema, required roles/grants, application rows and migration baseline from an authorized client using supported Supabase tools. Back up private contract/public material **object bytes** separately with a restricted checksum manifest and bucket/policy configuration. Inventory Edge Function versions/configuration; keep credentials in a separate controlled secret store. Do not assume a database dump includes Storage bytes or all platform settings.
- Encrypt before leaving the trusted execution environment, using maintained authenticated encryption and an independent recovery recipient/key. Select a private off-site destination with MFA, least privilege and audit access; keep recovery keys separately, with a tested second recovery route. A same-computer-only key is insufficient for loss of that computer. Do not put plaintext, encryption keys or signed URLs in GitHub, public Actions artifacts or this repository. No paid account or destination is provisioned by this plan.
- Proposed rolling retention for enquiry-containing daily backup snapshots: 7 days, with automatic expiry and periodic verification of expiry/versioned copies; this is a proposal needing owner/processor review. Contract/accounting backup schedules are separate and must not be shortened by enquiry cleanup. Avoid indefinite weekly/monthly full snapshots that silently retain expired enquiry PII. Document any lawful hold separately.
- If daily deletion is eventually adopted, an eligible active row is normally removed by the next successful daily run; it may remain in a restricted pre-deletion backup for that approved backup window. Failure/backlog alerts must trigger human action. Publish the actual timing, not an exact day-90 everywhere promise. Define mailbox/Brevo copy expiry separately; the database routine cannot erase them.

## Isolated recovery acceptance before live deletion

1. Record a successful encrypted export and checksum verification with no PII in the evidence log. Test decryption using the recovery key, not only the backup writer's session.
2. Restore database and object bytes into a separate, access-controlled test instance with email/webhooks/jobs disabled. Confirm table counts/checksums privately; compare constraints, RLS, grants, fixed search paths, triggers and document ownership. Revoke restored sessions/secrets before opening access.
3. Reapply current enquiry expiry/holds in the isolated copy before returning it to any operational workflow; a restore must not resurrect deleted/expired leads or resend notifications. Use an authorized private deletion ledger where necessary; never place applicant identifiers in public evidence. Test signed records, transactions, commissions and contract checksums unchanged.
4. Run synthetic acceptance/preview/deletion/status-conversion and operator-access tests, record measured recovery time and sanitized results, then destroy the isolated personal-data copy under the approved procedure. Neither a static site ZIP nor generic CI SQL is this full recovery evidence.

## Rollout order and stop conditions

1. Complete [HU/EN notice review](PRIVACY_NOTICE_REVIEW.md), processor/transfer inventory, signed-status handoff and staff authorization. A signed agreement must reconcile to `signed` before deletion; unresolved conversions stop the rollout. Archive dated approval/evidence privately.
2. Complete #60's production baseline comparison and the isolated recovery above. On a fresh representative staging database apply the source-only intake/retention migrations in order and run both regression SQL suites. The existing staging hold constraint changed: recreate disposable staging or explicitly reconcile its constraint; do not expect `IF NOT EXISTS` to upgrade an old constraint.
3. An administrator reviews/applies the additive production migration separately. Never run fake CI role setup in production. Re-run metadata-only checks of private schema, RLS and all function grants. Start with `purge_expired_inquiries(100,false)` only; retain aggregate counts, no names/emails. Missing/failed checks mean OFF.
4. Before any scheduled execution, compare eligible rows privately with signed-partner handoff and expiring holds, confirm operator evidence and backups, and record the explicit rollout authorization. First supervised deletion uses an approved small batch; inspect aggregate results and signed/financial invariants. This document executes none of these steps.
5. Only after success configure a server/database-owned daily job in UTC with bounded batches, lock/statement timeouts, single-run overlap control and an alert on failed/missing runs or remaining backlog. Do not create a public purge endpoint or put a service key into browser/config/cron command text. Verify actual cron extension permissions/behavior with current Supabase docs before choosing the final executor. No cron command is installed here.
6. Keep an independently accessible OFF switch; disabling schedule does not cancel an already running transaction. Investigate unexpected counts before another run. Never automatically restore production to undo a deletion: use authorized, isolated, selective recovery with current expiry/holds re-applied. Never touch signed partners/contracts/sales/commissions as cleanup targets.

## Evidence required to close this subtask

- [x] Owner policy: 90 days; exclude signed/financial records.
- [x] Staging SQL and regression coverage in PR #67; live Pages identity verified.
- [x] HU/EN review drafts and controlled backup/rollout plan prepared.
- [ ] Final legal/controller notice and processor/transfer record.
- [ ] Approved private destination/key custody and full database + Storage recovery test.
- [ ] Authorized production migration, preview and signed-status reconciliation.
- [ ] Supervised synthetic E2E, bounded job, alerts and OFF-switch verification.

Sources: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [roadmap #43](https://github.com/SamiGLab/kaftan-angelo/issues/43), [baseline/recovery #60](https://github.com/SamiGLab/kaftan-angelo/issues/60). Free projects need an off-site backup plan; database backups omit Storage object bytes. This plan is not a claim that a backup or production deletion already exists.
