module.exports = {
  ci: {
    collect: {
      url: [
        'http://127.0.0.1:4174/',
        'http://127.0.0.1:4174/kollekciok/',
        'http://127.0.0.1:4174/noi-borkabatok/',
        'http://127.0.0.1:4174/partnerprogram/',
        'http://127.0.0.1:4174/utmutatok/',
        'http://127.0.0.1:4174/en/'
      ],
      numberOfRuns: 2
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.80}],
        'categories:accessibility': ['error', {minScore: 0.95}],
        'categories:best-practices': ['error', {minScore: 0.90}],
        'categories:seo': ['error', {minScore: 0.95}],
        'largest-contentful-paint': ['error', {maxNumericValue: 3000}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.10}],
        'total-blocking-time': ['error', {maxNumericValue: 400}],
        'speed-index': ['warn', {maxNumericValue: 4000}]
      }
    }
  }
};
