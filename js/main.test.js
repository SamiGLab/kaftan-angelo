/**
 * @jest-environment jsdom
 */

// Mock window.matchMedia before requiring main.js
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

// Basic mock for the DOM needed by setLang
document.body.innerHTML = `
  <div id="ticker"></div>
  <div id="tag-grid"></div>
  <div id="receipt"></div>
  <div id="lang-current">
    <span class="flag"></span>
    <span class="code"></span>
  </div>
  <div id="lang-menu" class="open"></div>
  <button class="lang-option" data-lang="en"></button>
`;

const { setLang } = require('./main.js');

describe('setLang function', () => {
  beforeEach(() => {
    // Reset any previous mocks
    jest.restoreAllMocks();

    // Reset DOM state
    document.body.className = '';
    document.documentElement.lang = '';
    document.documentElement.dir = '';
    document.getElementById('lang-menu').classList.add('open');
  });

  it('should not crash when localStorage.setItem throws QuotaExceededError', () => {
    // Mock localStorage.setItem to throw an error
    const mockSetItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    // Run the function
    expect(() => {
      setLang('en');
    }).not.toThrow();

    // Verify it was called
    expect(mockSetItem).toHaveBeenCalledWith('kaftan-lang', 'en');

    // Verify other effects of the function still took place
    expect(document.body.classList.contains('lang-en')).toBe(true);
    expect(document.getElementById('lang-menu').classList.contains('open')).toBe(false);
  });
});
