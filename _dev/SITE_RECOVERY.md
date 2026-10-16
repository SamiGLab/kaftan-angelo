# Site recovery

The Pages deployment keeps `site-release` for **7 days**. This is a short-term recovery copy of the tested static website, not a database or Storage backup. Expired artifacts cannot be recovered by this workflow. Keep a separate, access-controlled long-term copy if the business needs longer recovery coverage.

## Artifact completeness

The actual recovery ZIP from deployment #38930323802 was downloaded on 16 October 2026. Its digest matched GitHub, but its manifest verification failed because `.well-known/ai-catalog.json` was missing. Treat that old artifact as incomplete; do not edit its manifest to hide the failure. A local tar round trip alone did not exercise GitHub's hidden-file exclusion.

New uploads explicitly include hidden files from the already-public built site, fail when no files exist, and are downloaded and verified before Pages publishing. PR quality also uploads/downloads a one-day rehearsal artifact and checks its full file list, commit identity, hashes and local metadata. This is evidence of an actual artifact round trip when those steps pass, not a production rollback or long-term backup.

## Rehearsal before publishing

1. Open Actions → **Restore tested site release** → Run workflow on `main`.
2. Enter the run ID of a successful **Deploy GitHub Pages** run from the last seven days. Leave **deploy unchecked**.
3. Confirm the run succeeds: source workflow/main/event checks, artifact download, commit identity, complete file list, every SHA-256 digest, local links and page metadata. Keep the run URL as evidence. This rehearsal does not publish.
4. Only after rehearsal, rerun with the same source ID and **deploy checked** to publish that release. Verify HU/EN home, collection, contact and partner pages plus `/_release.json` on the public domain. Record the source commit and restore run in issue #43.

Restoring Pages does not revert the Git branch. Follow up with a reviewed revert PR so the next main deployment does not reintroduce the problem. Keep the normal PR checks enabled. CMS uses `publish_mode: editorial_workflow`: editors save drafts on branches, then the PR must satisfy the same required checks. Do not grant CMS a bypass to publish unverified changes. Validate the actual editor/approval arrangement before enforcing an approval count that a solo maintainer cannot satisfy.

`Site quality` rehearses archive creation/extraction from each newly built PR release, then verifies hashes and local links. Unit tests reject changed, missing, extra, incomplete and wrong-commit releases, malformed manifests and symbolic links. These checks are **not evidence of a successful GitHub artifact download or a production rollback**; retain a separate manual restore rehearsal run for that acceptance criterion.

## Database and confidential documents remain separate

The daily Supabase health check is not a backup. Do not mark database recovery complete until an authorized operator has:

- Confirmed the actual plan, backup availability, recovery point and recovery time requirements.
- Exported schema, data and required roles using the current supported Supabase backup procedure into encrypted private storage; never use this public repository or public Actions artifacts for partner data, credentials or database dumps.
- Separately backed up Storage object bytes (a database export alone does not restore contract documents), with a restricted manifest and a compatible bucket/policy configuration.
- Restored into an isolated non-production project with outbound notifications disabled; verified record counts, constraints, RLS/grants, functions, triggers, document ownership and synthetic partner login/session flows.
- Recorded recovery duration and results without personal data; confirmed retention/deletion and periodic rehearsal ownership. Production restore requires an explicit, reviewed recovery decision.

No production database backup/export, paid project, schema change or restore is performed by these site workflows.
