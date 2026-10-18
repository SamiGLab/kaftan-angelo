# Source quality and secret checks

- `npm run check:types`: strict Astro/TypeScript diagnostics for `src`, including Astro components and their browser scripts. Deno Edge Function runtime checking is separate.
- `npm run check:lint`: JavaScript correctness rules for source scripts, tests, services and configuration. Browser and Node globals are scoped; this does not claim a full style rewrite or lint every Astro template.
- `npm run check:dependencies`: lockfile audit including development dependencies, failing on vulnerabilities.
- `npm run check:secrets`: Gitleaks 8.30.1 on a snapshot of current tracked/unignored source files. In CI, the pinned release archive is verified by SHA-256. Synthetic controls verify secret detection still fails and public publishable identifiers are accepted. Matches are redacted; reports are not automatically published as public artifacts.

For local secret scanning, install the official Gitleaks release and put it on PATH, or set `GITLEAKS_BIN` to the binary. The only global scanner exception is the intentionally public Supabase `sb_publishable_` namespace. There is no directory-wide exception for application source, service code or tests and no secret baseline that silently accepts future findings.

The current-source gate does not claim a clean Git history. History must be reviewed separately with `gitleaks git --redact=100`. An initial review of 161 commits found public publishable identifiers and one historical private Storage capability repeated across commits. Its target object no longer exists and is not assigned to a partner, but the old object path must not be reused while that capability can remain valid. Current development examples no longer embed it. Coordinate definitive signed-URL revocation with Supabase Support; Auth JWT signing-key rotation is not a substitute for Storage signed-URL revocation. Keep detailed incident records and token values private.

Reference: [Supabase private downloads and signed URLs](https://supabase.com/docs/guides/storage/serving/downloads). The scanner gate is a preventive control, not proof that every possible credential pattern or historical exposure has been eliminated.

## Branch protection and required checks (#44)

`main` is protected by repository branch protection (`enforce_admins: true`) and active repository ruleset `25358817` (`Protect main branch`, zero bypass actors):

- Direct pushes, force pushes and branch deletions on `main` are blocked for all actors, including repository administrators.
- Pull requests are required before merging, with stale review dismissal, conversation resolution and up-to-date branch enforcement (`strict: true`).
- Both `Site quality` check-run contexts from GitHub Actions (`app_id: 15368`) are mandatory before merging: `quality` and `intake-db`.
- Decap CMS uses `publish_mode: editorial_workflow` (`public/admin/config.yml`), so editorial changes open pull requests and must pass the same required checks without a bypass.

