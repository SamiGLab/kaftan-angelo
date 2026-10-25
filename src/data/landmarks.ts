export type LandmarkLanguage = 'en' | 'hu';

// Only publish measured distances after a specific pedestrian route is checked.
// Route links deliberately use named starting points, rather than a whole street.
export const landmarks = [
  { id: 'astoria', origin: 'Astoria metro station, Budapest', name: { en: 'Astoria', hu: 'Astoria' }, description: { en: 'M2 metro and the Kossuth Lajos utca junction', hu: 'M2-es metró és a Kossuth Lajos utca csomópontja' } },
  { id: 'ferenciek', origin: 'Ferenciek tere metro station, Budapest', name: { en: 'Ferenciek tere', hu: 'Ferenciek tere' }, description: { en: 'M3 metro, west of the showroom', hu: 'M3-as metró, az üzlettől nyugatra' } },
  { id: 'vaci', origin: 'Váci utca & Kossuth Lajos utca, Budapest', name: { en: 'Váci utca', hu: 'Váci utca' }, description: { en: 'Start at the Kossuth Lajos utca junction', hu: 'Indulás a Kossuth Lajos utcai kereszteződéstől' } },
  { id: 'synagogue', origin: 'Dohány Street Synagogue, Dohány utca 2, Budapest', name: { en: 'Dohány Street Synagogue', hu: 'Dohány utcai zsinagóga' }, description: { en: 'The Great Synagogue on Dohány utca', hu: 'A Dohány utcai Nagy Zsinagóga' } },
  { id: 'bridge', origin: 'Március 15. tér, Budapest', name: { en: 'Elisabeth Bridge', hu: 'Erzsébet híd' }, description: { en: 'Start at Március 15. tér on the Pest side', hu: 'Indulás a pesti oldalon, a Március 15. térről' } },
  { id: 'deak', origin: 'Deák Ferenc tér metro station, Budapest', name: { en: 'Deák Ferenc tér', hu: 'Deák Ferenc tér' }, description: { en: 'Central metro interchange; check the route from your exit', hu: 'Belvárosi metrócsomópont; az útvonal a választott kijárattól függ' } },
  { id: 'market', origin: 'Central Market Hall, Vámház körút 1-3, Budapest', name: { en: 'Central Market Hall', hu: 'Nagyvásárcsarnok' }, description: { en: 'The market on Vámház körút', hu: 'Vásárcsarnok a Vámház körúton' } },
] as const;

export function walkingRoute(origin: string) {
  const query = new URLSearchParams({ api: '1', origin, destination: 'Kaftan Angelo, Kossuth Lajos utca 18, 1053 Budapest, Hungary', travelmode: 'walking' });
  return `https://www.google.com/maps/dir/?${query}`;
}

export function locationFaq(lang: LandmarkLanguage) {
  return lang === 'en' ? {
    question: 'How do I reach Kaftan Angelo from Váci utca and Deák Ferenc tér?',
    answer: 'Our showroom is at Kossuth Lajos u. 18, 1053 Budapest, between Astoria and Ferenciek tere. From the Váci utca junction, follow Kossuth Lajos utca towards Astoria. From Deák Ferenc tér, open the walking route from your chosen metro exit. Our landmark links open walking directions to the store; the route planner shows the current distance and estimated time.',
  } : {
    question: 'Hogyan jutok el a Kaftan Angelo üzletébe a Váci utcától és a Deák térről?',
    answer: 'Üzletünk címe: 1053 Budapest, Kossuth Lajos u. 18., az Astoria és a Ferenciek tere között. A Váci utcai kereszteződéstől a Kossuth Lajos utcán haladjon az Astoria felé. A Deák Ferenc térről a választott metrókijárattól tervezze meg a sétát. A helyszínekhez tartozó linkek az üzlethez vezető gyalogos útvonalat nyitják meg; az aktuális távolságot és becsült időt az útvonaltervező mutatja.',
  };
}

export const landmarkPages = ['/en/leather-jackets-budapest/', '/borkabat-budapest/', '/en/visit/', '/uzlet/'];
export const landmarkMarker = '<!-- store-landmarks -->';
