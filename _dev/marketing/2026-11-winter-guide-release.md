# Winter guides — HU/EN release

Four paired seasonal topics: winter leather vs shearling, elegant women's leather outfits, fur styling, Budapest Christmas market clothing. These are editorial hypotheses, not search-volume forecasts. The guides are published together to keep reciprocal language URLs intact.

The existing guide glob, sitemap, Article metadata and canonical handling register the new Markdown files. The shared contact block now prioritises directions, then WhatsApp and phone. No cart, prices, live availability or reservation claims are introduced. Existing catalogue titles and canonical URLs remain stable; ten category/landing descriptions are revised around model browsing, personal fitting and location. Google may rewrite snippets. Review query-to-page mapping before changing existing titles.

## Measurement

Reuse the existing consent-gated kaftan_interest event and its interest_action, page_path and page_language fields. Report directions_click, whatsapp_click and phone_click separately on guide URLs. Do not count a click as a message, call, visit or sale. No additional tracker or collection of message content is necessary. Validate the public GTM configuration and actual GA4 reporting separately. Filter reports by language, guide URL and consented interactions. For catalogue navigation, use GA4 page-path exploration where available.

After publication, check URL inspection and sitemap discovery in Search Console, then compare impressions, clicks, CTR and relevant queries at 7, 14 and 28 days. Use anonymised in-store counts (source, visit, sale) outside the public repository. Account for Christmas seasonality and small sample sizes. Confirm holiday opening hours. Refresh the Christmas article for the next season only when current details have been checked.

## Release verification

Run the existing PR quality workflow: content validation, build, sitemap, internal links, accessibility and existing consent checks. The store-visit test additionally checks all eight article pages, three contact options, mobile tap targets and the existing consent-gated contact events. No external contact is initiated by the test. Review actual store photography and language copy before release.
