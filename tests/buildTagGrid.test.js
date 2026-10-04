const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');

describe('buildTagGrid', () => {
    let window, document;

    beforeAll(() => {
        const htmlPath = path.resolve(__dirname, '../index.html');
        const html = fs.readFileSync(htmlPath, 'utf-8');
        const dom = new JSDOM(html, { runScripts: 'dangerously' });
        window = dom.window;

        window.matchMedia = window.matchMedia || function() {
            return {
                matches: false,
                addListener: function() {},
                removeListener: function() {}
            };
        };
        // Prevent setInterval from blocking
        window.setInterval = function() {};

        document = window.document;

        const scriptPath = path.resolve(__dirname, '../js/main.js');
        const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
        const scriptElement = document.createElement('script');
        scriptElement.textContent = scriptContent;
        document.body.appendChild(scriptElement);
    });

    it('should generate 6 tag cards', () => {
        const tagGrid = document.getElementById('tag-grid');
        expect(tagGrid).not.toBeNull();

        const tagCards = tagGrid.querySelectorAll('.tag-card');
        expect(tagCards.length).toBe(6);
    });

    it('should include correct references in the tag cards', () => {
        const tagGrid = document.getElementById('tag-grid');
        const refs = Array.from(tagGrid.querySelectorAll('.tag-ref.mono')).map(el => el.textContent);
        expect(refs).toEqual([
            'Ref. 01',
            'Ref. 02',
            'Ref. 03',
            'Ref. 04',
            'Ref. 05',
            'Ref. 06'
        ]);
    });

    it('should include translated headers', () => {
        const tagGrid = document.getElementById('tag-grid');
        const firstCardHuHeader = tagGrid.querySelector('.tag-card:nth-child(1) h3 .lang-hu');
        expect(firstCardHuHeader.textContent).toBe('Női bőrkabátok');

        const secondCardEnHeader = tagGrid.querySelector('.tag-card:nth-child(2) h3 .lang-en');
        expect(secondCardEnHeader.textContent).toBe("Men's Leather Jackets");
    });
});
