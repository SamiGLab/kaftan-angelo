# Store-focused product and shopping content

Product prices, starting prices and product price ranges are not published. Product pages emit factual `ItemPage` structured data, photographs and product-specific private enquiry links, and intentionally omit `@type: "Product"` (along with Offer, fabricated availability, product ratings and placeholder prices) so Search Console does not flag incomplete Product snippets.

The bilingual shopping, material comparison and second-hand inspection guides describe checks a visitor can make, rather than guaranteed temperatures, repair costs, stock, reservation or material certification. The Budapest shop opened in 2004; 1973 refers to Angelo's work with leather in Istanbul. Route details link to the visit pages, where checked estimates are maintained from shared data.

The women's and fur category titles and canonical URLs remain stable. Their introductions, descriptions and fitting questions describe the actual photographed selection, private price enquiries and non-live availability. Fur-category copy no longer describes the full gallery as one white vest. Homepages link naturally to the matching-language Budapest shopping page.

The existing consent-gated `kaftan_interest` instrumentation remains the measurement path. Tests cover one phone, WhatsApp and directions event per activation, including landmark walking links, with only page path and language metadata. Rejection and withdrawal prevent analytics initialization. Local tests intercept tracking requests; they do not create production Analytics sessions or prove that downstream reports contain the events. Public GTM configuration can be inspected separately from actual property data.

Private Search Console or Analytics observations belong in local review notes, not this public repository. Search results vary by query, country, device and reporting period. Do not infer that a category received a query's impressions without reading the query's Pages breakdown. Indexing requests should be considered after the reviewed content is live; do not submit the old live version as verification of unpublished changes.

Validation includes the existing source, content, build, HTML, local-link, privacy, mobile, WCAG and Lighthouse gates. `test-editorial-products.mjs` checks every generated HU/EN model page for factual Product/ItemPage information and the absence of commercial price/Offer enhancements.

Real store photos, review requests and Business Profile service attributes require actual business evidence. Do not fabricate photos, reviews, services, published prices or a search-ranking guarantee.

## Storefront copy and local-business review markup

Write HU and EN as natural customer-facing prose, preserving facts and URLs. Remove inflated quality claims, repeated marketing phrases, unnecessary dramatic contrasts and unsupported guarantees. Treat the storefront title change as a limited search-snippet experiment; keep category titles and canonicals stable and compare finalized query/page/device data after indexing. Cross-link relevant buying guides from the collections. The existing fitting list should be reused rather than duplicated. Keep the genuine Google review link, but do not hardcode a changing review count or import third-party aggregate ratings into the store’s own LocalBusiness schema. Follow Google’s review snippet guidelines: https://developers.google.com/search/docs/appearance/structured-data/review-snippet .
