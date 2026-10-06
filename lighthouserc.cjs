module.exports = {
  ci: {
    collect: {
      startServerCommand: 'python3 -m http.server 4173 --directory dist',
      startServerReadyPattern: 'Serving HTTP',
      url: [
        'http://127.0.0.1:4173/',
        'http://127.0.0.1:4173/kollekciok/',
        'http://127.0.0.1:4173/noi-borkabatok/',
        'http://127.0.0.1:4173/partnerprogram/',
        'http://127.0.0.1:4173/utmutatok/',
        'http://127.0.0.1:4173/en/'
      ],
      numberOfRuns: 2
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.85}],
        'categories:accessibility': ['error', {minScore: 0.95}],
        'categories:best-practices': ['error', {minScore: 0.90}],
        'categories:seo': ['error', {minScore: 0.95}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.10}],
        'total-blocking-time': ['error', {maxNumericValue: 300}],
        'speed-index': ['warn', {maxNumericValue: 3500}]
      }
    },
    upload: { target: 'temporary-public-storage' }
  }
};
