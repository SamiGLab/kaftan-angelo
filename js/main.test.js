/**
 * @jest-environment jsdom
 */

// Mock matchMedia for JSDOM
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

// We need to set up a mock DOM before importing main.js because main.js runs immediately and tries to access DOM elements.
document.body.innerHTML = `
  <div id="lang-menu"></div>
  <div id="lang-current">
    <span class="flag"></span><span class="code"></span>
  </div>
  <div id="ticker"></div>
  <div id="tag-grid"></div>
  <div id="receipt"></div>
`;

const { buildTicker, tickerItems } = require('./main.js');

describe('buildTicker', () => {
  let tickerElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="ticker"></div>';
    tickerElement = document.getElementById('ticker');
  });

  afterEach(() => {
    // Reset ticker items if modified during tests
    tickerItems.length = 0;
    tickerItems.push(
      {hu:'Férfi bőrkabát', en:"Men's Leather Jackets", de:'Herren-Lederjacken', tr:'Erkek Deri Ceketler', ar:'سترات جلدية رجالية'},
      {hu:'Női bőrkabát', en:"Women's Leather Jackets", de:'Damen-Lederjacken', tr:'Kadın Deri Ceketler', ar:'سترات جلدية نسائية'},
      {hu:'Irhakabát', en:'Shearling Jackets', de:'Lammfelljacken', tr:'Shearling Ceketler', ar:'سترات جلد خروف'},
      {hu:'Szőrmekabát', en:'Fur Jackets', de:'Pelzjacken', tr:'Kürk Ceketler', ar:'سترات فراء'},
      {hu:'Bőr kiegészítők', en:'Leather Accessories', de:'Lederaccessoires', tr:'Deri Aksesuarlar', ar:'إكسسوارات جلدية'},
      {hu:'Sapka & sál', en:'Hats & Scarves', de:'Mützen & Schals', tr:'Şapka & Atkı', ar:'قبعات وأوشحة'},
      {hu:'Egyedi rendelés', en:'Custom Orders', de:'Sonderanfertigungen', tr:'Özel Sipariş', ar:'طلبات خاصة'}
    );
  });

  it('should render the correct number of elements based on tickerItems', () => {
    buildTicker();

    // Each item generates an <span class="item">...</span> and a <span>·</span> (2 elements)
    // The loop runs twice (rep = 0 to 1)
    // So expected total child elements: tickerItems.length * 2 * 2
    expect(tickerElement.children.length).toBe(tickerItems.length * 4);

    // Number of '.item' elements should be tickerItems.length * 2
    const items = tickerElement.querySelectorAll('.item');
    expect(items.length).toBe(tickerItems.length * 2);
  });

  it('should contain the correct localized text for a specific item', () => {
    buildTicker();

    const items = tickerElement.querySelectorAll('.item');
    const firstItem = items[0];

    expect(firstItem.querySelector('.lang-hu').textContent).toBe('Férfi bőrkabát');
    expect(firstItem.querySelector('.lang-en').textContent).toBe("Men's Leather Jackets");
    expect(firstItem.querySelector('.lang-de').textContent).toBe('Herren-Lederjacken');
    expect(firstItem.querySelector('.lang-tr').textContent).toBe('Erkek Deri Ceketler');
    expect(firstItem.querySelector('.lang-ar').textContent).toBe('سترات جلدية رجالية');
  });

  it('should not throw an error if #ticker element is missing', () => {
    document.body.innerHTML = ''; // Remove all elements including #ticker
    expect(() => {
      buildTicker();
    }).not.toThrow();
  });

  it('should render nothing if tickerItems is empty', () => {
    tickerItems.length = 0; // Empty the array
    buildTicker();

    expect(tickerElement.innerHTML).toBe('');
    expect(tickerElement.children.length).toBe(0);
  });
});
