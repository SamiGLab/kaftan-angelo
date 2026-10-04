const fs = require('fs');
const path = require('path');

// Read main.js
const mainJsCode = fs.readFileSync(path.resolve(__dirname, './main.js'), 'utf8');

describe('main.js tests', () => {
  beforeEach(() => {
    // Basic DOM setup for the script
    document.body.innerHTML = `
      <div class="hero-media"></div>
      <div class="hero-media"></div>
      <div class="hero-dot"></div>
      <div class="hero-dot"></div>

      <nav class="nav-links">
        <a href="#about" class="active">About</a>
        <a href="#products">Products</a>
      </nav>

      <div id="about"></div>
      <div id="products"></div>

      <div id="lang-menu"></div>
      <button id="lang-current">
        <span class="flag"></span>
        <span class="code"></span>
      </button>
      <button class="lang-option" data-lang="en"></button>

      <div id="ticker"></div>
      <div id="tag-grid"></div>

      <div class="product-card">
        <img src="test.jpg" alt="Test image">
      </div>

      <div id="receipt"></div>

      <span class="current-year"></span>

      <div class="faq-item active">
        <div class="faq-question"></div>
      </div>
      <div class="faq-item">
        <div class="faq-question"></div>
      </div>
    `;

    // Define localStorage mock if not available
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });

    // Mock matchMedia
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

    // langMeta and seoMeta mock
    window.langMeta = {
      en: { dir: 'ltr', flag: '🇬🇧', code: 'EN' },
      hu: { dir: 'ltr', flag: '🇭🇺', code: 'HU' }
    };
    window.seoMeta = {
      en: { title: 'EN Title', desc: 'EN Desc', locale: 'en_GB' },
      hu: { title: 'HU Title', desc: 'HU Desc', locale: 'hu_HU' }
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('executes without throwing errors on a well-formed DOM', () => {
    expect(() => {
      eval(mainJsCode);
    }).not.toThrow();
  });

  test('hero slider sets active classes', () => {
    eval(mainJsCode);

    // Trigger window load
    window.dispatchEvent(new Event('load'));

    // Check initial state or trigger click
    const dots = document.querySelectorAll('.hero-dot');
    dots[1].click();

    const slides = document.querySelectorAll('.hero-media');
    expect(slides[1].classList.contains('active')).toBe(true);
  });

  test('language switcher changes language', () => {
    eval(mainJsCode);
    const langBtn = document.querySelector('.lang-option[data-lang="en"]');
    langBtn.click();

    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('kaftan-lang', 'en');
  });

  test('builds ticker correctly', () => {
    eval(mainJsCode);
    const ticker = document.getElementById('ticker');
    expect(ticker.innerHTML).toContain("Men's Leather Jackets");
  });

  test('builds tag grid correctly', () => {
    eval(mainJsCode);
    const grid = document.getElementById('tag-grid');
    expect(grid.innerHTML).toContain("Women's Leather Jackets");
    expect(grid.querySelectorAll('.tag-card').length).toBe(6);
  });

  test('builds receipt correctly', () => {
    eval(mainJsCode);
    const receipt = document.getElementById('receipt');
    expect(receipt.innerHTML).toContain('Monday');
    expect(receipt.innerHTML).toContain('10:00–19:00');
  });

  test('sets current year in footer', () => {
    eval(mainJsCode);
    const yearEl = document.querySelector('.current-year');
    expect(yearEl.textContent).toBe(new Date().getFullYear().toString());
  });

  test('FAQ accordion toggles active class', () => {
    eval(mainJsCode);
    const faqItems = document.querySelectorAll('.faq-item');
    const q0 = faqItems[0].querySelector('.faq-question');
    const q1 = faqItems[1].querySelector('.faq-question');

    q1.click();
    expect(faqItems[1].classList.contains('active')).toBe(true);
    expect(faqItems[0].classList.contains('active')).toBe(false);

    q1.click();
    expect(faqItems[1].classList.contains('active')).toBe(false);
  });
});
