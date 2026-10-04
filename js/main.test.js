const fs = require('fs');
const path = require('path');

describe('Language Initialization', () => {
  let originalLocalStorage;
  let originalMatchMedia;
  let originalRequestAnimationFrame;
  let originalScrollTo;

  beforeEach(() => {
    document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    originalLocalStorage = window.localStorage;

    // Mock matchMedia
    originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Mock requestAnimationFrame
    originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));

    // Mock scrollTo
    originalScrollTo = window.scrollTo;
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, writable: true });
    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.scrollTo = originalScrollTo;
    jest.resetModules();
  });

  test('falls back to "hu" when localStorage.getItem throws an error', () => {
    // Mock localStorage to throw an error on getItem
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => {
          throw new Error('localStorage is not accessible');
        }),
        setItem: jest.fn(),
      },
      writable: true,
    });

    // Make sure search is empty for window.location (default jsdom behavior should be fine)
    const scriptCode = fs.readFileSync(path.resolve(__dirname, 'main.js'), 'utf8');
    eval(scriptCode);

    expect(document.body.classList.contains('lang-hu')).toBe(true);
    expect(document.documentElement.getAttribute('lang')).toBe('hu');
  });
});
