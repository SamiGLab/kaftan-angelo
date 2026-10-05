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

        const dom = new JSDOM(html, {
            runScripts: "dangerously",
            beforeParse(window) {
                window.matchMedia = window.matchMedia || function() {
                    return {
                        matches: false,
                        addListener: function() {},
                        removeListener: function() {}
                    };
                };
                window.setInterval = jest.fn();
            }
        });
        window = dom.window;
        document = window.document;

        const originalSetInterval = window.setInterval;


        // Spy on window.open
        openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});



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
