export type LandmarkLanguage = 'en' | 'hu';

// Google Maps walking estimates checked on 2026-10-25; see docs/landmark-routes.md.
// Values refer to the linked starting points, not every exit or point on a street.
export const landmarks = [
  { id: 'astoria', meters: 170, minutes: 3, checkedOn: '2026-10-25', via: 'Kossuth Lajos utca', origin: 'Astoria metro station, Budapest', name: { en: 'Astoria', hu: 'Astoria' }, description: { en: 'M2 metro and the Kossuth Lajos utca junction', hu: 'M2-es metró és a Kossuth Lajos utca csomópontja' } },
  { id: 'ferenciek', meters: 180, minutes: 2, checkedOn: '2026-10-25', via: 'Kossuth Lajos utca', origin: 'Ferenciek tere metro station, Budapest', name: { en: 'Ferenciek tere', hu: 'Ferenciek tere' }, description: { en: 'M3 metro, west of the showroom', hu: 'M3-as metró, az üzlettől nyugatra' } },
  { id: 'vaci', meters: 500, minutes: 7, checkedOn: '2026-10-25', via: 'Duna utca / Kossuth Lajos utca', origin: '47.4918096,19.0537954', name: { en: 'Váci utca', hu: 'Váci utca' }, description: { en: 'Pedestrian shopping street; distance from the linked map point', hu: 'Sétálóutca; a távolság a linkelt térképponttól értendő' } },
  { id: 'synagogue', meters: 400, minutes: 6, checkedOn: '2026-10-25', via: 'Károly körút / Kossuth Lajos utca', origin: 'Dohány Street Synagogue, Dohány utca 2, Budapest', name: { en: 'Dohány Street Synagogue', hu: 'Dohány utcai zsinagóga' }, description: { en: 'The Great Synagogue on Dohány utca', hu: 'A Dohány utcai Nagy Zsinagóga' } },
  { id: 'bridge', meters: 500, minutes: 7, checkedOn: '2026-10-25', via: 'Kígyó utca / Kossuth Lajos utca', origin: 'Március 15. tér, Budapest', name: { en: 'Elisabeth Bridge', hu: 'Erzsébet híd' }, description: { en: 'Start at Március 15. tér on the Pest side', hu: 'Indulás a pesti oldalon, a Március 15. térről' } },
  { id: 'deak', meters: 800, minutes: 11, checkedOn: '2026-10-25', via: 'Károly körút', origin: 'Deák Ferenc tér metro station, Budapest', name: { en: 'Deák Ferenc tér', hu: 'Deák Ferenc tér' }, description: { en: 'Central metro interchange; check the route from your exit', hu: 'Belvárosi metrócsomópont; az útvonal a választott kijárattól függ' } },
  { id: 'market', meters: 1000, minutes: 14, checkedOn: '2026-10-25', via: 'Veres Pálné utca', origin: 'Central Market Hall, Vámház körút 1-3, Budapest', name: { en: 'Central Market Hall', hu: 'Nagyvásárcsarnok' }, description: { en: 'The market on Vámház körút', hu: 'Vásárcsarnok a Vámház körúton' } },
] as const;

export function walkingRoute(origin: string) {
  const query = new URLSearchParams({ api: '1', origin, destination: 'Kaftan Angelo, Kossuth Lajos utca 18, 1053 Budapest, Hungary', travelmode: 'walking' });
  return `https://www.google.com/maps/dir/?${query}`;
}

export function walkLabel(item: typeof landmarks[number], lang: LandmarkLanguage) {
  const distance = item.meters === 1000 ? '1 km' : `${item.meters} m`;
  return lang === 'en' ? `Approx. ${distance} · ${item.minutes} min walk` : `Kb. ${distance} · ${item.minutes} perc séta`;
}

export function heroWalkLabel(lang: LandmarkLanguage) {
  return [landmarks[0], landmarks[2]].map(item => `${item.name[lang]} ≈ ${item.minutes} ${lang === 'en' ? 'min' : 'perc'}`).join(' · ');
}

export function locationFaq(lang: LandmarkLanguage) {
  const vaci = landmarks[2], deak = landmarks[5], astoria = landmarks[0];
  return lang === 'en' ? {
    question: 'How far is Kaftan Angelo from Váci utca and Deák Ferenc tér?',
    answer: `Our showroom is at Kossuth Lajos u. 18, 1053 Budapest, between Astoria and Ferenciek tere. From the linked Váci utca map point, allow approximately ${vaci.minutes} minutes (${vaci.meters} m); from the Deák Ferenc tér metro map point, approximately ${deak.minutes} minutes (${deak.meters} m); and from Astoria, approximately ${astoria.minutes} minutes (${astoria.meters} m). Google Maps walking estimates were checked on 25 October 2026. Your starting point, crossings and pace can change the time. Open the walking links for current directions.`,
  } : {
    question: 'Milyen messze van a Kaftan Angelo a Váci utcától és a Deák tértől?',
    answer: `Üzletünk címe: 1053 Budapest, Kossuth Lajos u. 18., az Astoria és a Ferenciek tere között. A linkelt Váci utcai térképponttól körülbelül ${vaci.minutes} perc (${vaci.meters} m), a Deák Ferenc téri metró térképpontjától ${deak.minutes} perc (${deak.meters} m), az Astoriától pedig ${astoria.minutes} perc (${astoria.meters} m) séta. A Google Térkép gyalogos becsléseit 2026. október 25-én ellenőriztük. Az indulási pont, az átkelők és a tempó módosíthatják az időt. Az aktuális útvonalhoz nyissa meg a gyalogos linkeket.`,
  };
}

export const landmarkPages = ['/en/leather-jackets-budapest/', '/borkabat-budapest/', '/en/visit/', '/uzlet/'];
export const landmarkMarker = '<!-- store-landmarks -->';
