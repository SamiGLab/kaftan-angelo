module.exports = {
  defaults: {
    standard: 'WCAG2AA',
    // Hosted Ubuntu runners restrict Chrome's user-namespace sandbox.
    chromeLaunchConfig: process.env.CI ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] } : {},
    timeout: 30000,
    wait: 300,
    includeWarnings: false,
    includeNotices: false,
    viewport: { width: 1365, height: 768 }
  },
  urls: [
    'http://127.0.0.1:4173/',
    'http://127.0.0.1:4173/kollekciok/',
    'http://127.0.0.1:4173/noi-borkabatok/',
    'http://127.0.0.1:4173/partnerprogram/',
    'http://127.0.0.1:4173/utmutatok/',
    'http://127.0.0.1:4173/en/'
  ]
};
