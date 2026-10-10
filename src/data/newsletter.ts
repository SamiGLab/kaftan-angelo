// Enable only after sender authentication and both double-opt-in flows pass.
export const newsletter = {
  enabled: true,
  forms: {"hu":"https://a090280c.sibforms.com/serve/MUIFADFmcxqiLv0hbNN37xcEUJiURtcAx7UpotOEBXZpSXaCS-RZq-Az4uHP0rizP_VaZgBXQb5Gy5uQCxBVZW0kmY4oXS5f8HQ0oIXQNpXw9u7wmi4pneoIvfOXTzguwdYA-dFqKw6ccfzR1JJaxr4fYiXa0fh851onBDRjpPbQXopd5Bmy4vsbr2NIg1IXP5UcLAJUyQ5ECW2ZSQ==","en":"https://a090280c.sibforms.com/serve/MUIFAPgvGrp00Syk2GI2MMOmTZTb9LKaiqiFN2Ooef02IqdR9aMsQev_1-2jUNH9lKTRUSdedwtDJb6zMWbl5iyHVDd_M5YWuViKAZcW7-1_0R1Dly6OHqS5TDZCNk0mZ_3oUnmUlQSEJSV3JVVr_RiGOsqv4XsUbSIWN3P4LSukXTxONdl65q5xsZiNu4vjgafaGbHcSR3w22fk4g=="},
  copy: {
    hu: {
      title: 'Új modellek, közvetlenül az üzletből',
      intro: 'Iratkozzon fel a Kaftan Angelo új modelljeiről és budapesti üzletünk híreiről szóló e-mailekre.',
      action: 'Feliratkozás',
      note: 'E-mailes megerősítés szükséges. Bármikor leiratkozhat.',
      consent: 'Hozzájárulok, hogy az Alfina Fashion Kft. e-mailben tájékoztasson a Kaftan Angelo új modelljeiről, ajánlatairól és üzleti híreiről. Bármikor leiratkozhatok.',
      privacy: 'Adatkezelési tájékoztató',
      privacyUrl: '/sutikezeles/#newsletter',
    },
    en: {
      title: 'New styles, straight from our store',
      intro: 'Subscribe to emails about new Kaftan Angelo styles and news from our Budapest store.',
      action: 'Subscribe',
      note: 'Confirm by email. Unsubscribe at any time.',
      consent: 'I agree to receive emails from Alfina Fashion Kft. about new Kaftan Angelo styles, offers and store news. I can unsubscribe at any time.',
      privacy: 'Privacy information',
      privacyUrl: '/en/cookies/#newsletter',
    },
  },
} as const;

