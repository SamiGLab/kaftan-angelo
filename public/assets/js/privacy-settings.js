(() => {
  const hu = document.documentElement.lang === 'hu';
  document.querySelectorAll('[data-map-panel]').forEach(panel => {
    const slot = panel.querySelector('[data-map-slot]');
    const button = panel.querySelector('[data-map-load]');
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      slot.replaceChildren();
      if (open) {
        const frame = document.createElement('iframe');
        frame.src = 'https://www.google.com/maps?q=Kossuth%20Lajos%20u.%2018%2C%20Budapest%201053&output=embed';
        frame.title = hu ? 'Kaftan Angelo térkép' : 'Kaftan Angelo map';
        frame.loading = 'lazy'; slot.append(frame);
      }
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? (hu ? 'Térkép bezárása' : 'Hide map') : (hu ? 'Térkép megjelenítése' : 'Show map');
    });
  });
})();
