# Budapest landmark walking routes

Implementation date: 2026-10-25. Source baseline: main at 1a9f99a.

## Published behavior

The two Budapest leather jacket landing pages show six individual landmarks. The HU/EN visit pages show all seven, plus approach guidance from Váci utca, Astoria and Deák Ferenc tér. Each link opens Google Maps walking directions from a named starting point to Kaftan Angelo, Kossuth Lajos utca 18, 1053 Budapest. Opening the page does not load an additional map or third-party script.

Names, origins and bilingual descriptions live in `src/data/landmarks.ts`. The additional visible FAQ and JSON-LD answer are generated from the same function. Existing landing-page FAQ schemas were aligned with their visible answers. The existing Váci/bridge five-minute claim and the conflicting WebMCP Váci two-to-three-minute claim were replaced by route-based guidance.

## Distance verification status

The Google Maps route-reading attempt did not return accessible route results in the authoring environment. Consequently the proposed new numeric distances and times are **not published**. Existing metro figures elsewhere in site content were not independently remeasured by this change. Route links are structurally checked; live pedestrian accessibility, the selected metro exits and the exact entrance pin still require map/on-site confirmation.

| Landmark | Starting point used in the route URL | Proposed distance/time, not verified |
|---|---|---|
| Astoria | Astoria metro station, Budapest | 150 m / 2 min |
| Ferenciek tere | Ferenciek tere metro station, Budapest | 250 m / 3 min |
| Váci utca | Junction with Kossuth Lajos utca | 350 m / 4 min |
| Dohány Street Synagogue | Dohány utca 2, Budapest | 350 m / 4 min |
| Elisabeth Bridge | Március 15. tér, Pest side | 500 m / 6 min |
| Deák Ferenc tér | Metro station, Budapest; not the airport bus stop | 650 m / 7 min |
| Central Market Hall | Vámház körút 1–3, Budapest | 850 m / 10 min |

Before adding numeric card labels or hero times, record a checked pedestrian origin/exit, the shop entrance, measured distance, estimated time, evidence URL and verification date in the shared data. Use approximate wording, and derive all repeated labels and answers from that record. Do not infer a stop count or airport-bus walking time from the square name.

## Validation

Run the existing site quality workflow. The new `test-landmark-routes.mjs` checks all four built pages, card counts, distinct origins, walking-mode destination links, FAQ/schema parity, unloaded map iframe, 320/390/1365 px tap targets and keyboard focus. It blocks external network requests and does not follow Maps links. Optional `LANDMARK_SCREENSHOTS` saves EN visit section images at 390 and 1365 px.

No database, RPC, partner intake or analytics changes are included. No new proximity properties were added to ClothingStore. This change does not merge or deploy itself.
