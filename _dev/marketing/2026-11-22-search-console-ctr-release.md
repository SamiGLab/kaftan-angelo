# Search Console CTR optimisation — 2026-11-22

**Source:** Search Console query-level table supplied by the store owner in conversation. The export's date range, search type, country, device and landing-page dimensions were not supplied. These are **query aggregates**, not page-level attribution. Average position is not a guarantee that any individual result occupied that position on every impression.

## Why this release prioritises snippets and search intent

A boutique visit or model-specific message is more valuable than a broad irrelevant click. The highest-impression non-branded searches currently have weak observed CTR despite some strong average positions. Update already-indexed category and local visit pages before creating duplicate keyword URLs.

| Query (exact supplied spelling) | Impressions | Clicks | CTR | Avg. position | Best existing page to review* |
| --- | ---: | ---: | ---: | ---: | --- |
| bőrkabát | 661 | 6 | 0.91% | 1.9 | `/borkabat-budapest/`, `/` |
| szőrme kabát | 480 | 2 | 0.42% | 5.0 | `/szormekabatok/` |
| fur coat | 428 | 4 | 0.93% | 4.2 | `/en/fur-coats/` |
| női bőrkabát | 351 | 2 | 0.57% | 3.5 | `/noi-borkabatok/` |
| leather jacket | 335 | 1 | 0.30% | 4.3 | `/en/leather-jackets-budapest/`, `/en/` |
| szőrme kabát női | 222 | 2 | 0.90% | 5.8 | `/szormekabatok/` |
| bőrkabát női | 187 | 0 | 0.00% | 3.1 | `/noi-borkabatok/` |
| bőrkabát budapest | 65 | 3 | 4.62% | 5.2 | `/borkabat-budapest/`, `/uzlet/` |
| kaftán angelo | 86 | 29 | 33.72% | 3.9 | `/` |
| kaftan angelo | 14 | 6 | 42.86% | 2.4 | `/` |

*Candidate landing pages are based on the site's architecture; the query export does not identify which page Google actually surfaced. Verify in Search Console's **Pages** tab after applying each query filter before inferring attribution or cannibalisation.

## Changes in this branch

- Reworded unique HU/EN titles and descriptions for 14 key pages. Titles distinguish brand, category, local shop and store-visit intent without introducing new keyword-stuffed routes.
- Clarified five visible H1 headings. The HU homepage now says `bőrkabátok`, the women's pages explicitly address women's jacket intent, and the fur pages distinguish coats and jackets.
- Added reciprocal, genuinely relevant guide links to the existing HU and EN Budapest shopping pages.
- Removed unverified 5.0-star promotional snippets from core search metadata, and the store's own `AggregateRating` from `ClothingStore` structured data. Google does not show self-serving review stars for the rated business's own LocalBusiness/Organization pages. Do not add fake product prices, offers or ratings.
- Preserved original canonical URLs, existing reciprocal hreflang, photographic models, no-checkout catalogue and privacy/consent boundaries.
- Added a source-level regression test to the quality pipeline.

## Verification after deployment

1. Let the existing GitHub Actions quality gate validate the build, SEO audit, mobile flows, language pairs, links and performance. Do **not** merge if it fails. Confirm the live page HTML (title, H1, meta description, canonical and hreflang) after a successful deploy.
2. In Search Console, record the exact baseline **date range and search type**. For each priority query, inspect **Pages, Devices, Countries and Search appearance** separately. Pay special attention to unexpected page attribution, Hungary vs international searches, and image/search-feature impressions.
3. Compare matched 28-day windows **after** Google has recrawled the pages, ideally with the same device/country/search type filters. Record impressions, clicks, CTR, average position and the specific URL. Account for seasonality and query mix; do not call a simple change causal uplift.
4. Separately track consented `kaftan_interest` interactions, verified inbound product enquiries and **actual** store visits. A link click alone is not a completed WhatsApp message or sale.
5. Check Google Business Profile details (business name, address, hours, phone, categories, official URL), but only change them with verified current store information.

## Constraints

No numeric product prices, invented availability, star claims, unverified material claims, checkout, tax-free promises or handcrafting claims have been introduced. The site remains an in-store boutique with model-specific enquiries.

**References:** [Google title link guidelines](https://developers.google.com/search/docs/appearance/title-link), [snippet guidance](https://developers.google.com/search/docs/appearance/snippet), [review snippet policies](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
