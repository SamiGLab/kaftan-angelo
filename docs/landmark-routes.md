# Budapest landmark walking routes

Implementation date: 2026-10-25. Baseline: main at 1a9f99a.

## Published behavior

The HU/EN leather-jacket landing pages show six landmarks and the visit pages seven. Each has an approximate walking estimate and an explicit Google Maps walking link to Kaftan Angelo, Kossuth Lajos utca 18, 1053 Budapest. Maps resolved the destination to the existing store pin (47.4940457, 19.0584288). Page loading adds no third-party map/script requests.

The shared source is src/data/landmarks.ts. Numeric cards, hero proximity labels and the additional visible FAQ/JSON-LD are generated from this source. Existing landing-page FAQ schemas match their visible answers. Old 150/250 m landing-page statements and conflicting Váci/bridge times were replaced. The non-Schema.org publicTransport property was removed from ClothingStore; transport guidance remains visible on the site. No new proximity schema claims are added.

## Verification record

All seven estimates below were read from the Google Maps walking route UI on 25 October 2026, using its first recommended walking route. An initial text-fetch attempt failed; browser verification subsequently succeeded. These are approximate map estimates, not on-site measurements or guaranteed travel times. Metro map points do not specify or guarantee a particular accessible exit. The Deák estimate does not measure from the 100E bus stop.

| Landmark | Linked origin | Checked estimate | Route shown | Source |
|---|---|---|---|---|
| Astoria | Astoria metro station, Budapest | 170 m / 3 min | Kossuth Lajos utca | [Google Maps](https://www.google.com/maps/dir/?api=1&origin=Astoria+metro+station%2C+Budapest&destination=Kaftan+Angelo%2C+Kossuth+Lajos+utca+18%2C+1053+Budapest%2C+Hungary&travelmode=walking) |
| Ferenciek tere | Ferenciek tere metro station, Budapest | 180 m / 2 min | Kossuth Lajos utca | [Google Maps](https://www.google.com/maps/dir/?api=1&origin=Ferenciek+tere+metro+station%2C+Budapest&destination=Kaftan+Angelo%2C+Kossuth+Lajos+utca+18%2C+1053+Budapest%2C+Hungary&travelmode=walking) |
| Váci utca | 47.4918096,19.0537954 | 500 m / 7 min | Duna utca / Kossuth Lajos utca | [Google Maps](https://www.google.com/maps/dir/?api=1&origin=47.4918096%2C19.0537954&destination=Kaftan+Angelo%2C+Kossuth+Lajos+utca+18%2C+1053+Budapest%2C+Hungary&travelmode=walking) |
| Dohány Street Synagogue | Dohány Street Synagogue, Dohány utca 2, Budapest | 400 m / 6 min | Károly körút / Kossuth Lajos utca | [Google Maps](https://www.google.com/maps/dir/?api=1&origin=Doh%C3%A1ny+Street+Synagogue%2C+Doh%C3%A1ny+utca+2%2C+Budapest&destination=Kaftan+Angelo%2C+Kossuth+Lajos+utca+18%2C+1053+Budapest%2C+Hungary&travelmode=walking) |
| Elisabeth Bridge | Március 15. tér, Budapest | 500 m / 7 min | Kígyó utca / Kossuth Lajos utca | [Google Maps](https://www.google.com/maps/dir/?api=1&origin=M%C3%A1rcius+15.+t%C3%A9r%2C+Budapest&destination=Kaftan+Angelo%2C+Kossuth+Lajos+utca+18%2C+1053+Budapest%2C+Hungary&travelmode=walking) |
| Deák Ferenc tér | Deák Ferenc tér metro station, Budapest | 800 m / 11 min | Károly körút | [Google Maps](https://www.google.com/maps/dir/?api=1&origin=De%C3%A1k+Ferenc+t%C3%A9r+metro+station%2C+Budapest&destination=Kaftan+Angelo%2C+Kossuth+Lajos+utca+18%2C+1053+Budapest%2C+Hungary&travelmode=walking) |
| Central Market Hall | Central Market Hall, Vámház körút 1-3, Budapest | 1000 m / 14 min | Veres Pálné utca | [Google Maps](https://www.google.com/maps/dir/?api=1&origin=Central+Market+Hall%2C+V%C3%A1mh%C3%A1z+k%C3%B6r%C3%BAt+1-3%2C+Budapest&destination=Kaftan+Angelo%2C+Kossuth+Lajos+utca+18%2C+1053+Budapest%2C+Hungary&travelmode=walking) |

Váci utca is a long street. The original intersection query resolved to a generic street pin, so the link was pinned to the observed coordinates 47.4918096,19.0537954. Maps identified that point as Budapest Váci utca (1056). Its 500 m / 7 min route uses Duna utca and Kossuth Lajos utca. Cards explicitly say the estimate refers to the linked map point. Other locations along the street have different distances.

The bridge estimate starts at Március 15. tér on the Pest side. It does not describe walking across the whole bridge. The market estimate is 1 km / 14 min; no tram stop-count promise is published. Named origins and the exact store address are encoded in each route URL; current routes may change.

## Validation and scope

The new test-landmark-routes.mjs checks four built pages, card counts, distinct origins, walking-mode links, store destination, numeric labels, visible FAQ/schema parity, map privacy, 320/390/1365 px tap targets and keyboard focus. It blocks external network requests and never follows Maps links. Optional LANDMARK_SCREENSHOTS produces mobile/desktop section images.

Run the existing quality workflow before merging. Local types, lint, content, full build, HTML validation, static SEO/local links, four-page route tests, existing store CTA/privacy tests and WCAG2AA passed for the final measurement update. Targeted Lighthouse also passed every configured budget on all four changed routes after the measurement update. The configured six-route local run recorded /utmutatok/ LCP of 3001.353 and 3003.786 ms against a 3000 ms gate, followed by a Windows Chrome cleanup EPERM; thresholds were not relaxed. Final CI status is recorded in the PR.

No database, RPC, partner intake or analytics implementation changes are included. This PR does not merge or deploy itself.
