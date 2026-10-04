const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('openProductImage functionality', () => {
    let window;
    let document;
    let img;
    let openSpy;

    beforeAll(() => {
        const htmlPath = path.resolve(__dirname, '../index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');

        const dom = new JSDOM(html, { runScripts: "dangerously" });
        window = dom.window;
        document = window.document;

        // Mock window.matchMedia to prevent errors from slider scripts
        window.matchMedia = window.matchMedia || function() {
            return {
                matches: false,
                addListener: function() {},
                removeListener: function() {}
            };
        };

        // Stop setInterval from running indefinitely to allow the test to complete
        const originalSetInterval = window.setInterval;
        window.setInterval = jest.fn();

        // Spy on window.open
        openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});

        // Load the main.js script
        const scriptPath = path.resolve(__dirname, 'main.js');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        const scriptEl = document.createElement('script');
        scriptEl.textContent = scriptContent;
        document.body.appendChild(scriptEl);

        // Get the first product card image that has the event listeners attached
        img = document.querySelector('.product-card img');
    });

    beforeEach(() => {
        openSpy.mockClear();
    });

    it('should open image in lightbox when clicked instead of new window', () => {
        expect(img).not.toBeNull();

        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');

        expect(lightbox.classList.contains('active')).toBe(false);

        img.click();

        // The image shouldn't open in a new window anymore
        expect(openSpy).not.toHaveBeenCalled();
        
        // It should open in the lightbox
        expect(lightbox.classList.contains('active')).toBe(true);
        expect(lightboxImg.src).toContain('noi-sarga-borkabat-budapest.webp'); // Ensure it loads the correct image
    });
});
