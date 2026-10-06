# Kaftan Angelo — Production Multi-Page Site

This repository contains the production-ready multi-page website for **Kaftan Angelo**, Budapest.

## Live architecture

Hungarian:
- `/` — homepage
- `/kollekciok/` — collections hub
- `/noi-borkabatok/`
- `/ferfi-borkabatok/`
- `/irhakabatok/`
- `/szormekabatok/`
- `/egyedi-rendeles/`
- `/rolunk/`
- `/uzlet/`
- `/gyik/`
- `/partnerprogram/`
- `/utmutatok/`

English:
- `/en/`
- `/en/collections/`
- `/en/womens-leather-jackets/`
- `/en/mens-leather-jackets/`
- `/en/shearling-jackets/`
- `/en/fur-coats/`
- `/en/custom-orders/`
- `/en/about/`
- `/en/visit/`
- `/en/faq/`
- `/en/partners/`
- `/en/guides/`

## Build system

The source of truth is now `src/` and the site is built with **Astro**. Astro is used only at build time; the deployed output is static HTML/CSS/JS.

- `src/components/` — shared header, footer and SEO layout
- `src/data/` — shared site and page data
- `src/content/guides/` — Markdown guides edited by the CMS
- `src/pages/` — route generation
- `public/` — assets copied directly into the generated site
- `dist/` — generated site; not committed

Generated HTML and the old one-page frontend are not committed. Build the site to create the deployable `dist/` directory.

## Quality pipeline

GitHub Actions now contains:

- **Lighthouse CI** — performance/SEO/accessibility/best-practices budgets
- **Pa11y CI** — WCAG 2 AA checks across the generated sitemap
- **Lychee** — local broken-link gate on deploy plus weekly external-link monitoring
- **HTML Validate** — generated HTML validation
- **Static audit** — canonical, title, H1 and local asset/link checks

Deployment only proceeds after the deployment workflow passes the quality gates.

### Performance budgets

- Lighthouse Performance ≥ 0.85
- Accessibility ≥ 0.95
- Best Practices ≥ 0.90
- SEO ≥ 0.95
- LCP ≤ 2.5 s
- CLS ≤ 0.10
- TBT ≤ 300 ms
- Speed Index ≤ 3.5 s warning threshold

## Images

`_dev/scripts/optimize-images.mjs` uses **Sharp** to create responsive WebP and AVIF variants at 480, 800 and 1200 px where source dimensions allow it.

Category pages use `<picture>`, AVIF/WebP `srcset`, explicit width/height, lazy loading and responsive sizes for content images.

## Search

The Guides pages use **Pagefind**. `npm run build` runs Pagefind after Astro and creates the static search index under `dist/pagefind/`.

## CMS

Decap CMS is prepared at `/admin/` and edits Markdown files under:

- `src/content/guides/hu/`
- `src/content/guides/en/`

### One-time CMS authentication requirement

GitHub Pages alone does not provide the OAuth callback service Decap's GitHub backend needs. Before `/admin/` can log into GitHub in production, configure a GitHub OAuth app plus a Decap-compatible OAuth bridge and add its `base_url` / `auth_endpoint` to `public/admin/config.yml`.

The content model and admin interface are already included; this external authentication step cannot be completed only by repository files.

## SEO implemented

- Separate HU/EN URLs
- Canonical URLs and hreflang
- Central ClothingStore schema
- WebSite schema
- BreadcrumbList schema
- FAQPage schema
- Article schema for guides
- Per-page Open Graph + Twitter cards
- Internal linking between guides, categories, custom orders and store pages
- Dynamic sitemap generation in Astro
- Custom 404 page
- Google Search Console verification preserved
- Google Tag Manager `GTM-5D5T9W6Q` preserved

## Partner proof preserved

The partner page retains:
- `15+` partner proof
- all seven existing verified partner testimonials
- horizontal continuously scrolling review cards

## Commands

```bash
npm ci
npm run dev
npm run build
npm run audit:static
npm run audit:dist
```

## GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`.
For this workflow to publish, GitHub Pages must use **GitHub Actions** as its deployment source.

Custom domain file `CNAME` is preserved as `kaftanangelo.com`.

Fonts are bundled locally through Fontsource. Hero images are preloaded and category backgrounds use optimized AVIF files. The custom domain is required: root-relative URLs intentionally deploy at https://kaftanangelo.com/, not under /kaftan-angelo/.

Responsive image variants in `public/assets/images/` are generated during build and are not committed. Python 3 is required for the static audit. Local dependency auditing currently reports advisories in the Lighthouse/Pa11y development toolchain; these packages do not ship as site JavaScript.
