# Kaftan Angelo — Search, Competitor and Growth Sprint

**Research snapshot:** 2026-11-17  
**Owner/project:** Kaftan Angelo, Kossuth Lajos u. 18, Budapest 1053  
**Status:** Research-backed execution plan. Publication and ad-spend checkpoints are identified separately.

This plan uses the supplied Marketing Skills approaches for product marketing, competitor profiling, SEO audit, content strategy and conversion measurement. It is specific to the Budapest retail boutique, **not** an online checkout or a separate business.

## 1. Business objective and decision rule

**Why people might choose us:** A leather, shearling or fur purchase is easier to evaluate when visitors can examine actual model photographs, ask about materials and sizes, and try garments in a central Budapest shop. This is a positioning hypothesis, not a measured customer survey.

**Goal:** More *qualified* store visits and genuine model-specific enquiries, with touristic-partner conversations as a second path.

**Do not mistake:** A website visit ≠ contact click ≠ delivered WhatsApp message ≠ store visit ≠ sale. Site events are leading indicators only. There is no online cart, live inventory or public price feed.

**Audience segments:**

1. Hungarian shoppers looking for women's or men's genuine leather jackets, shearling and fitting in Budapest.
2. English-speaking visitors planning a short shopping stop in central Budapest.
3. Hotels, guides and concierges who may recommend a relevant store to their guests.

**Brand boundaries:** See root `AGENTS.md` and `.agents/product-marketing.md`. Keep product descriptions factual, do not invent stock, ratings, fulfilment guarantees or universal alterations, and do not publish product prices.

## 2. Current website baseline (repository evidence)

- Astro static site with 30 named site pages in `src/data/pages.json`.
- 49 photographed model records in `src/data/models.json`, with HU/EN model pages.
- Before this sprint: 13 paired Hungarian/English guides. This sprint adds one further pair.
- Existing landing pages already cover `/borkabat-budapest/`, `/en/leather-jackets-budapest/`, `/ferfi-borkabatok/`, `/en/mens-leather-jackets/`, `/irhakabatok/`, `/en/shearling-jackets/`, and core visiting/partner queries.
- Site includes consent-gated `kaftan_interest` actions, reciprocal multilingual guide URLs, a sitemap, model-specific WhatsApp routes and store directions.
- CI tests source types, dependencies, local links, mobile flows, privacy, accessibility and page performance. See `.github/workflows/quality.yml`.

**Unknown, not zero:** Verified Search Console impressions/CTR/positions, GA4 sessions, consent rate, contact-to-visit rate, offline sales, cost per qualified conversation, customer objections and current ad spend. No numeric traffic, conversion or market-volume claims can responsibly be made yet.

## 3. Competitor snapshot — observation vs implication

| Publicly observable offer (2026-11-17) | Evidence | Implication for Kaftan Angelo (inference, not competitor claim) |
| --- | --- | --- |
| **Bőrkabátbolt** lists a Budapest shop in Balzac u. 17–19 and locations in other Hungarian cities; it sells leather/shearling and accessories, offers fitting alterations and discusses specific materials. | [Own store list](https://borkabatbolt.hu/uzleteink), [own service page](https://borkabatbolt.hu/szolgaltatasok) | **Do not claim alterations are unique.** Instead demonstrate the central District V visit, HU/EN model selection and clear questions visitors should ask before fitting. |
| **Pompár Szőrme & Bőr** positions around leather, shearling and fur, advertises cleaning and shows public product-price claims. Its current homepage's contact/address section repeats a Szeged address, so a current Budapest location is **not verified here**. | [Own site](https://www.pomparszorme.hu/) | Do not enter a price-war or copy unsupported service promises. Distinguish the shopping *process* and model-specific advice. |
| **Chrisand Fur** is listed at Deák Ferenc u. 13 by a Budapest shopping-street association and emphasizes high-end fur fashion and accessories. | [Budapest shopping-street listing](https://bevasarloutca.hu/en/shops/chrisand-fur) | Fur boutiques also compete for central tourists. Keep English fur/shearling pages accurate and make the visit route easy. |
| **Vespucci** publishes leather-jacket alteration and repair services in Budapest. This is adjacent service search intent, not necessarily a direct retail substitute. | [Own alteration page](https://www.vespucci.hu/szolgaltatas/borszabosag-es-irhavarras/borkabat-javitas/borzako-igazitas/) | Paid retail search should avoid repair-only queries unless a specific, confirmed service campaign is approved. |

**Important:** These sources show what companies *say* online, not actual prices, stock, conversion rates, customer experience, traffic share or ranking. Research depth: quick scan. Recheck before publishing competitor comparisons; do not publish these in customer-facing copy.

## 4. Intent-first HU/EN keyword map

The following are **candidate search phrases**, not measured search volume or ranking data. Priorities reflect relevance, page fit and distance to a store visit. Validate impressions, clicks and position in Search Console before creating more URLs.

| Priority | Language / query cluster | Intent | Existing or newly created page | Next action |
| --- | --- | --- | --- | --- |
| P0 | HU: `bőrkabát Budapest`, `bőrkabát üzlet Budapest` | Local purchase | `/borkabat-budapest/` and `/uzlet/` | Inspect GSC CTR and actual Maps queries; refine existing page, no duplicate |
| P0 | EN: `leather jackets Budapest`, `leather shop Budapest` | Traveller purchase | `/en/leather-jackets-budapest/`, `/en/visit/` | Check English mobile routes, query relevance and snippets |
| P0 | HU: `női bőrkabát Budapest`, `férfi bőrkabát Budapest` | Category comparison | `/noi-borkabatok/`, `/ferfi-borkabatok/` | Link relevant actual model examples; avoid stock promises |
| P0 | EN: `women's leather jackets Budapest`, `men's leather jackets Budapest` | Category comparison | `/en/womens-leather-jackets/`, `/en/mens-leather-jackets/` | Track model enquiry paths, not just entrances |
| P1 | HU: `irhakabát Budapest`, `szőrmekabát Budapest` | Seasonal in-store purchase | `/irhakabatok/`, `/szormekabatok/` | Review material explanations and correct internal links |
| P1 | EN: `shearling coat Budapest`, `fur coat Budapest` | Traveller/seasonal | `/en/shearling-jackets/`, `/en/fur-coats/` | Confirm visitor search terms and photos |
| P1 | HU: `motoros bőrdzseki`, `klasszikus férfi bőrdzseki` | Style selection | **New:** `/utmutatok/ferfi-motoros-vagy-klasszikus-bordzseki/` | First-party examples and real fitting checklist |
| P1 | EN: `biker vs classic leather jacket`, `men's biker leather jacket Budapest` | Style selection | **New:** `/en/guides/mens-biker-vs-classic-leather-jacket/` | Reciprocal translation with photographed examples |
| P2 | HU/EN: leather/shearling care, fit, material comparisons | Education | Existing paired `/utmutatok/`, `/en/guides/` | Update genuinely outdated guidance before adding near-duplicates |
| P2 | HU/EN: hotel concierge Budapest shopping partnership | B2B referral | `/partnerprogram/`, `/en/partners/` | Verify actual partner proposition and privacy boundary with owner |

**Cannibalization rule:** A new guide must supply something the existing page does not: photographed model comparison, field-tested store FAQ, or original customer insight. Don't mass-generate near-identical Budapest keyword pages.

## 5. First on-site content release

Added two reciprocal guides built around existing, photographed catalogue examples:

- HU: `src/content/guides/hu/ferfi-motoros-vagy-klasszikus-bordzseki.md`
- EN: `src/content/guides/en/mens-biker-vs-classic-leather-jacket.md`

They compare biker-inspired vs classic men's jacket styles, link to the **actual** model entries, explain four fit checks and tell visitors to confirm sizes and availability with the store. They add useful detail beyond generic style definitions. Neither promises stock, production, pricing, a repair service or sales outcomes.

## 6. Four-week organic content and distribution sprint

| When | Execution item | Channel / owner | Evidence and success signal |
| --- | --- | --- | --- |
| Week 1 | Publish reciprocal men's style guides and validate both sitemap entries and navigation links | Website / maintainer | Pages return 200, hreflang pairs are correct, links work |
| Week 1 | Reuse **existing** product photography for a side-by-side style post; link back to the guide | Organic Instagram/Facebook / store | Post approved and published; use tagged link only if URL passes consent rules |
| Week 2 | Verify Google Business Profile categories, address, phone, hours and profile landing URL against the website; upload current store photographs if approved | Local search / profile owner | Matching NAP and dated evidence, no invented rating claim |
| Week 2 | Publish a short HU/EN size-and-fitting checklist derived from the new guide, with an invitation to ask about a specific model | Organic social / store | Actual post URL; qualified conversations, not vanity reach alone |
| Week 3 | Ask staff for **10 anonymized** recurring customer questions; verify answers before updating existing FAQ/guide | In-store / store manager | Question list and 3 confirmed high-frequency improvements |
| Week 3 | Prepare one B2B hotel/concierge partner explainer using only confirmed commission terms; no automated outreach | Partner marketing / owner | Owner-approved one-page explainer, manual lead quality feedback |
| Week 4 | Review Search Console by HU/EN landing pages, query intent and mobile CTR; revise two underperforming existing titles/descriptions if evidence supports it | SEO / maintainer | Before/after GSC export with date window and query-level decision |
| Week 4 | Review consented site intent events alongside **separate** manual store visit/sale tally | Measurement / owner | Events and outcomes kept distinct; baseline, no fictitious conversion rate |

**Small-team rule:** One substantive original asset can feed a guide, two short social posts and a store conversation. Do not add new platforms or a daily publishing obligation without a person to operate them.

### Organic post drafts — owner approval before publishing

**HU:** „Motoros vagy klasszikus bőrdzseki? A fotó jó kiindulópont, de a váll, az ujjhossz és a mozgás személyes próbán derül ki. Két férfi modellt és a próbaellenőrző listát itt találja: https://kaftanangelo.com/utmutatok/ferfi-motoros-vagy-klasszikus-bordzseki/”

**EN:** “Biker-inspired or classic leather jacket? Compare two real styles from our Budapest selection, then check shoulders, layering and movement in person. Guide: https://kaftanangelo.com/en/guides/mens-biker-vs-classic-leather-jacket/”

Photos must be actual approved catalogue assets; no AI depiction of a specific in-stock garment.

## 7. Measurement definitions and review

| Funnel stage | Metric | Truth condition | Tool / gap |
| --- | --- | --- | --- |
| Discovery | Organic search impressions and clicks by HU/EN query and landing page | Search Console property export | **Not connected for this research** |
| Website intent | `kaftan_interest` actions: `whatsapp_click`, `phone_click`, `directions_click`, `partner_contact_start` | Analytics accepted and URL permitted; none establishes delivery | Existing `dataLayer` events; **GTM-to-GA4 mapping unverified** |
| Qualified contact | Conversation actually received about a named item / visit | Human-reviewed, deduplicated enquiry count | Store workflow needed; keep message content outside analytics |
| Visit | Customer actually visits the shop | Staff-confirmed count or optional aggregated tally | Not yet instrumented |
| Sale | Completed in-store purchase | Store-owned sales record | Not accessible; never infer from clicks |
| B2B | Genuine partner discussion / signed terms | Human confirmation / signed document | Distinct from a form attempt |

Weekly meeting: record each stage as **count**, source method, date range, owner and unknowns. Only calculate contact-to-visit and visit-to-sale rates once matching cohorts and valid denominators exist. For a first 4-week review, do not assume statistically meaningful A/B test power.

## 8. Paid search preparation — intentionally **not activated**

See [HU/EN paid-search drafts](./2026-11-search-ad-drafts.md). Search ads can capture urgent local intent, but there is no confirmed advertising account, payment authority, monthly budget, location targeting choice, CPC baseline or offline conversion method. **No campaign was submitted and no money spent.**

The first pilot should be tightly local and query-specific, not a broad automated campaign. Set a small **owner-approved** budget only after offline enquiry/visit logging exists, and stop groups that generate irrelevant or unqualified conversations.

## 9. 30/60/90-day decisions

- **Days 1–30:** Complete this content release, verify local profile, make one weekly sales-question log, check Search Console access and GTM-to-GA4 event mapping.
- **Days 31–60:** Improve existing pages using actual search queries and in-store objections; collect four weekly outcome snapshots; validate partner/referral proposition with direct operator conversations.
- **Days 61–90:** If enough offline data and a confirmed budget exist, test one limited Search campaign with agreed stop criteria. Otherwise continue organic content and local reputation hygiene.

**Owner input needed for irreversible steps:** access to Search Console/GA4 and Google Business Profile; actual marketing spend authority; permission to publish social posts or run ads; confirmation of any public customer-facing service/heritage/rating claims. Continue technical, research and draft work without these inputs.

## 10. Research sources and caveats

- [Bőrkabátbolt — stores](https://borkabatbolt.hu/uzleteink), [alterations](https://borkabatbolt.hu/szolgaltatasok), accessed 2026-11-17.
- [Pompár Szőrme & Bőr](https://www.pomparszorme.hu/), accessed 2026-11-17; current contact-page ambiguity noted.
- [Chrisand Fur — Budapest shopping-street association](https://bevasarloutca.hu/en/shops/chrisand-fur), accessed 2026-11-17.
- [Vespucci leather alterations](https://www.vespucci.hu/szolgaltatas/borszabosag-es-irhavarras/borkabat-javitas/borzako-igazitas/), accessed 2026-11-17.
- [Kaftan Angelo HU](https://kaftanangelo.com/), [EN](https://kaftanangelo.com/en/), [English shop guide](https://kaftanangelo.com/en/guides/budapest-leather-shopping-guide/), accessed 2026-11-17, plus local source code as inspected.

This is a qualitative search-landscape scan, **not** a paid keyword-tool export or traffic study. The keyword priorities are hypotheses until first-party search and sales evidence is supplied.
