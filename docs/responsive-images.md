# Responsive catalogue images and guide hero preloads

Guide mobile preloads must match the 480px image used by the mobile hero. Desktop retains the 800px source. The shared layout derives a 480px fallback from the guide OG image when inline hero variables are absent.

Catalogue image sizes follow the CSS wrap padding, column counts, gaps and card borders. The two-card layout keeps its separate desktop width cap. Square photographs rendered inside a 3:4 object-fit frame require a crop adjustment so the selected source covers the frame height at the device pixel ratio. Keep these calculations aligned with layout changes.

Run `node _dev/scripts/test-responsive-images.mjs` after building and starting the local preview on port 4173. It checks all guide preloads, actual mobile hero requests, and catalogue source selection across six viewport/density combinations, including the two-card layout. It runs in both quality and deployment workflows.

Guide index summaries follow the same evidence rules as the articles: 1973 describes Angelo's leather work in Istanbul; the Budapest shop opened in 2004. Avoid unverified temperature, repair-cost and product-material claims.

Performance comparisons are laboratory measurements, not field Core Web Vitals or ranking guarantees. Compare repeated runs using the same server, browser and settings; retain variability and avoid attributing unrelated script timings to an image-only change.
