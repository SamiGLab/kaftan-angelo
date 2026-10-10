# Decap GitHub sign-in

The website stays on GitHub Pages. This small Cloudflare Worker exchanges GitHub
authorization codes for Decap CMS. It has no database and uses the Workers Free plan.

## Deployment and credentials

- Worker: `kaftan-decap-auth`
- Service: `https://kaftan-decap-auth.samigrowlab.workers.dev`
- GitHub OAuth application homepage: `https://kaftanangelo.com/admin/`
- Exact callback: `https://kaftan-decap-auth.samigrowlab.workers.dev/callback`
- Keep wildcard redirects and device flow disabled; keep token expiration enabled.
- Cloudflare variable: `GITHUB_CLIENT_ID` (public app identifier).
- Cloudflare **Secret**: `GITHUB_CLIENT_SECRET` (server only).
- Never put the client secret, access tokens or refresh tokens in the repository,
  website configuration, chat or screenshots.

Deploy `worker.mjs` with Cloudflare's code editor, or use Wrangler with this
directory's `wrangler.jsonc` after authorizing your own account. Disable Worker
observability logs and preview URLs; callback URLs contain temporary OAuth codes.
The service refuses login until both required settings exist.

## Permissions and sessions

The OAuth request uses `public_repo`, not `repo`. This scope can edit public
repositories accessible to the signed-in user; GitHub OAuth scopes cannot restrict
the token to a single repository. The bridge additionally checks the user's
identity and requires write permission on `SamiGLab/kaftan-angelo` before handing
the token to the site's panel. Private repository access is not requested.

The popup sends the token only to `https://kaftanangelo.com`, and requires the
exact opener and origin handshake. OAuth state uses a signed Secure/HttpOnly
cookie with a ten-minute lifetime and PKCE. The service never logs credentials,
returns raw upstream errors, or stores tokens. Decap stores its session in the
editor's browser. Expiring GitHub tokens require signing in again after expiry;
refresh tokens are deliberately not passed to the panel.

## Verification

Run `node --test services/decap-auth/worker.test.mjs` from the repository root.
Tests mock GitHub, cover state validation, expiry, PKCE, repository permissions,
popup origin checks and credential handling. Real production login still needs
the OAuth app registration, Cloudflare secret and a final signed-in browser test.
