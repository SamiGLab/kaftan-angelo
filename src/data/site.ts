export const BASE = 'https://kaftanangelo.com';

export const businessSchema = {
  '@type': 'ClothingStore',
  '@id': `${BASE}/#store`,
  url: `${BASE}/`,
  name: 'Kaftan Angelo',
  legalName: 'Alfina Fashion Kft.',
  description: "Clothing store in central Budapest offering genuine men's and women's leather jackets, leather coats, shearling and fur clothing, leather accessories and custom-made leather jackets.",
  image: [
    `${BASE}/kaftan-angelo-hero-leather-collection.webp`,
    `${BASE}/womens-leather-jacket-budapest.webp`,
    `${BASE}/womens-shearling-jacket-budapest.webp`,
    `${BASE}/womens-fur-coat-budapest.webp`,
  ],
  logo: `${BASE}/kaftan-angelo-hero-leather-collection.webp`,
  foundingDate: '2004',
  founder: { '@type': 'Person', name: 'Angelo' },
  telephone: '+36 1 266 7274',
  email: 'alfinafashionkft@gmail.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Kossuth Lajos u. 18',
    postalCode: '1053',
    addressLocality: 'Budapest',
    addressRegion: 'Budapest',
    addressCountry: 'HU',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 47.4940457, longitude: 19.0584288 },
  hasMap: 'https://www.google.com/maps/place/Kaftan+Angelo/@47.4944346,19.0600201,17.25z/data=!4m6!3m5!1s0x4741dc43988120f9:0x928c92ecc4745e63!8m2!3d47.4940457!4d19.0584288!16s%2Fg%2F11bwy_15vk',
  areaServed: [
    { '@type': 'City', name: 'Budapest' },
    { '@type': 'Country', name: 'Hungary' },
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+36 1 266 7274',
      contactType: 'customer service',
      areaServed: 'HU',
      availableLanguage: ['hu', 'en', 'de', 'tr', 'ar'],
    },
    {
      '@type': 'ContactPoint',
      telephone: '+36 20 359 3216',
      contactType: 'sales and appointments',
      availableLanguage: ['hu', 'en', 'de', 'tr', 'ar'],
    },
  ],
  paymentAccepted: 'Cash, Credit Card',
  priceRange: '€€',
  currenciesAccepted: 'HUF, EUR',
  knowsLanguage: ['hu', 'en', 'de', 'tr', 'ar'],
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '10:00', closes: '19:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '10:00', closes: '17:00' },
  ],
  sameAs: [
    'https://www.google.com/maps/place/Kaftan+Angelo/@47.4944346,19.0600201,17.25z/data=!4m6!3m5!1s0x4741dc43988120f9:0x928c92ecc4745e63!8m2!3d47.4940457!4d19.0584288!16s%2Fg%2F11bwy_15vk',
    'https://www.instagram.com/kaftanangelo.budapest/',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Kaftan Angelo leather and outerwear collections',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: "Men's genuine leather jackets" } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: "Women's genuine leather jackets" } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Shearling jackets and coats' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Fur jackets and coats' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Leather accessories' } },
    ],
  },
};

export const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  url: `${BASE}/`,
  name: 'Kaftan Angelo',
  inLanguage: ['hu', 'en'],
  publisher: { '@id': `${BASE}/#store` },
};

export const nav = {
  hu: [
    ['Kollekciók', '/kollekciok/'],
    ['Egyedi rendelés', '/egyedi-rendeles/'],
    ['Rólunk', '/rolunk/'],
    ['Útmutatók', '/utmutatok/'],
    ['Partnerprogram', '/partnerprogram/'],
    ['Üzlet', '/uzlet/'],
  ],
  en: [
    ['Collections', '/en/collections/'],
    ['Custom Orders', '/en/custom-orders/'],
    ['About', '/en/about/'],
    ['Guides', '/en/guides/'],
    ['Partners', '/en/partners/'],
    ['Visit', '/en/visit/'],
  ],
};
