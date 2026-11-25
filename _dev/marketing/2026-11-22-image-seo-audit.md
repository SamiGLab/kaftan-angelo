# Kaftan Angelo — image SEO release and audit (2026-11-22)

## Evidence and scope

Reviewed the actual Astro source, including `src/data/models.json`, `src/data/pages.json`, `src/data/model-pages.ts`, `src/components/ModelDetail.astro`, `src/pages/sitemap.xml.js` and the image optimization scripts.

The catalog contains **49 model records**, generating **98 HU/EN product detail pages**. Existing photo URLs are stable and use WebP source assets. Responsive AVIF/WebP variants are produced at build time; images use `srcset`, intrinsic dimensions and appropriate lazy/eager behavior. Product records already have language-specific alt descriptions, generally with specific colour/style and front/back/interior views. An initial source audit found no missing `alt` in 334 examined model image markup occurrences or 186 inline `<img>` occurrences in the 30 base page HTML records. Those are HTML occurrences, **not unique physical files** or an assurance of image quality. These are meaningful existing foundations, not work introduced by this release.

## Improvements implemented

1. **Sitemap coverage:** The previous sitemap included images for model galleries and `data-product-image` listing controls, but omitted the cover photos on guide articles and ordinary `<img>` images on some collection/home/local landing pages. A focused shared helper now enumerates the **first-party original photos actually referenced** in the site's source plus the existing page preview image, with deduplication, extension/origin checks, and Google's 1,000-images-per-URL ceiling. On a product detail page, only the specified product's gallery is listed, not unrelated recommendation thumbnails.
2. **HU/EN article covers:** Each published guide's declared `frontmatter.heroImage` is connected to its own sitemap URL; both guide hubs have their actual original social-cover asset.
3. **Product photo context:** Each model's `ItemPage.image` now includes `ImageObject` records with the **actual first-party image URL and the existing human-written, localized alt description**. The `ItemPage.primaryImageOfPage` also names its primary photograph. As the business does not publish offers, ratings or prices, the ineligible `Product` rich-result markup was subsequently removed while keeping these original image records. The existing gallery image URL order is preserved.
4. **Social image descriptions:** `og:image:alt` and `twitter:image:alt` on product pages now match the primary photo, rather than using a generic SEO page title.
5. **Regression testing:** The post-build `test-image-seo.mjs` checks 98 model pages against their source gallery images, descriptive `ItemPage` metadata, absence of ineligible `Product` markup and social tags, selected HU/EN category and local landing pages, **every published HU/EN guide cover**, both guide hubs, first-party image availability, duplicates and negative external-URL cases. The site's pre-existing static HTML audit, accessibility, model inquiry tests, and Lighthouse remain in place.

## Why we did not rename or duplicate photo files

Image filenames contain a mix of Turkish product naming, Hungarian descriptive segments and existing catalogue IDs. Google says filenames offer *light clues*; descriptive surrounding content and alternative text are materially more useful. Bulk renaming would break already-indexed image URLs and existing references across model pages, guides, sitemap and social sharing. Generating keyword-stuffed duplicates would waste bytes and crawl attention. Keep stable URLs unless an individual source is genuinely wrong.

## What we deliberately did not claim

- **No guaranteed Google Images ranking, rich result, image pack placement, clicks or sales.** Changes improve crawl clarity, not ranking guarantees.
- **No invented price, Offer, in-stock status, ratings or Merchant Center feed.** This is a showroom site with inquiries, not live online checkout.
- **No fictitious copyright owner, photographer, usage rights or licensing fields.** Add IPTC/schema image licensing only after those rights are documented.
- **No automatic claims about sharpness, pixel quality, colour accuracy, compression or photo relevance.** These require review of the actual delivered images and production performance.
- **No new derivative URLs solely for a keyword.** Keep existing original WebP and optimized, responsive AVIF/WebP choices.

## Release verification and measurement

1. Merge only when the full GitHub Actions quality suite (including image SEO regression, accessibility, link audit and Lighthouse) is green and a reviewer checks the visible pages.
2. Confirm the deployment and fetch the live sitemap plus several HU/EN product pages; inspect `image:loc`, `Product.image`, `og:image:alt`, correct `src` and `srcset`. Ensure image URLs return HTTP 200.
3. In Google Search Console, separately review **Performance → Search type: Image** and regular Web results. Filter by page, country, query and device. Check image indexing or crawl availability through URL Inspection as appropriate.
4. Record matched before/after windows **after recrawling**, accounting for image index latency and seasonal changes. Track image impressions, clicks, image search CTR, landing-page visits and genuine model inquiries separately.
5. If additional improvement is needed, prioritize manually verifying high-impact photos (women's genuine leather, men's leather jackets, fur and shearling) for image relevance and sufficiently detailed angles. Do not rewrite descriptions without checking what the photograph truly depicts.

## Official documentation

- [Google Search Central: Image SEO best practices](https://developers.google.com/search/docs/appearance/google-images)
- [Google Search Central: Image sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
- [Google Search Central: Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
- [Google Search Central: Image licensing metadata](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata)

## Follow-up: Search Console rich-result and Cloudflare endpoint reports

Owner-provided Search Console issue snapshots on 2026-11-22 show two product pages (a HU/EN pair for the black quilted men's jacket) marked invalid for missing `offers`, `review`, or `aggregateRating` and a 404 for `/cdn-cgi/l/email-protection`. The Product issue was detected on 2026-11-10, with sample crawls dated 2026-11-09 and 2026-11-15; the 404 sample was crawled 2026-11-16. These dates predate the current PR and do not verify it.

**Fix:** Keep descriptive `ItemPage`, image URLs, localized image names, and model-specific enquiry links; remove `Product` structured data because these pages do not publish price/offer or verified product reviews. This eliminates the *ineligible markup* once recrawled; it does **not** make these pages eligible for Google product rich results. Eligibility would require truthful public offer/price or genuine review/rating data that meets Google requirements. No such data was invented.

For the Cloudflare URL, exclude the site's actual footer mailto link from the Email Address Obfuscation transformation with Cloudflare's supported `<!--email_off-->` comments around the anchor, and add `Disallow: /cdn-cgi/` to the crawler policy. This endpoint is not a real content page. Test the **live** HTML after deployment and use Search Console's URL Inspection / validation tools. Cloudflare explicitly says `/cdn-cgi/` crawling errors do not affect rankings. Note that `/cdn-cgi/` robots exclusions should be reconsidered if a future setup uses Cloudflare image delivery under `/cdn-cgi/image/`.

- Google: https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- Cloudflare email opt-out: https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
- Cloudflare crawl errors: https://developers.cloudflare.com/support/troubleshooting/general-troubleshooting/troubleshooting-crawl-errors/
