# Production HTTPS and HSTS verification

Kaftan Angelo is rendered as static HTML on GitHub Pages; a `<meta>` tag or file in the Astro repository cannot add the HTTP `Strict-Transport-Security` response header.

## Evidence and safe change procedure

1. Run the `Production transport headers audit` workflow or inspect the public site with `curl -sS -D - -o /dev/null https://kaftanangelo.com/`, then repeat for `https://www.kaftanangelo.com/` and check `http://kaftanangelo.com/` redirects to HTTPS. Capture the final hostname, certificate, response status, redirect Location and response headers. A successful GitHub Pages deploy does not prove HSTS is present.
2. Confirm who terminates HTTPS and manages DNS/proxy. Cloudflare Worker used for CMS authorization does **not** establish that the public site is proxied by Cloudflare. If the public site is directly served by GitHub Pages, ask the hosting provider about HSTS support or evaluate a correctly configured proxy; do not add a fake HTML header.
3. Before setting HSTS, validate HTTPS on all impacted hostnames and current and future subdomains. For a controlled rollout, start with a short `max-age` on the correct HTTPS response, then verify from multiple networks/browsers. Do not enable `includeSubDomains` or `preload` without separately reviewing every subdomain and certificate.
4. Verify the public HTTP response after the change, the HTTPS redirect, HU/EN homepage and product links, and the CMS/OAuth callback hostnames. Record the setting, operator, date, verification evidence and rollback path.
5. This informational workflow emits warnings for missing headers or unreachable endpoints; **it intentionally does not mutate domain configuration, open an inbound port, or claim HSTS was enabled**.

Relevant documentation:
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
