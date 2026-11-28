const hu = document.documentElement.lang === 'hu';
const modelInquiry = document.querySelector('[data-model-inquiry]');
const modelInquiryBase = modelInquiry?.getAttribute('href');
const modelEnquiryFields = document.querySelector('[data-model-enquiry-fields]');
let selectedModelColour = null;
function updateModelInquiry() {
  if (!modelInquiry || !modelInquiryBase) return;
  const url = new URL(modelInquiryBase);
  const parts = [url.searchParams.get('text')];
  const size = modelEnquiryFields?.querySelector('[data-enquiry-size]')?.value.trim();
  const colour = selectedModelColour?.name || modelEnquiryFields?.querySelector('[data-enquiry-colour]')?.value.trim();
  if (size) parts.push(`${hu ? 'Méret' : 'Size'}: ${size}`);
  if (colour) parts.push(`${hu ? 'Szín' : 'Colour'}: ${colour}`);
  if (selectedModelColour?.image) parts.push(selectedModelColour.image);
  url.searchParams.set('text', parts.join('\n'));
  modelInquiry.href = url.href;
}
modelEnquiryFields?.addEventListener('input', updateModelInquiry);

const colourSelector = document.querySelector('[data-colour-selector]');
if (colourSelector) {
  const panels = [...document.querySelectorAll('[data-colour-panel]')];
  function selectColour(key) {
    const selected = panels.find(panel => panel.dataset.colourPanel === key);
    if (!selected) return;
    panels.forEach(panel => { panel.hidden = panel !== selected; });
    colourSelector.querySelectorAll('[data-colour]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.colour === key)));
    colourSelector.querySelector('[data-colour-status]').textContent = `${hu ? 'Kiválasztott szín:' : 'Selected colour:'} ${selected.dataset.colourName}`;
    selectedModelColour = {name:selected.dataset.colourName,image:new URL(selected.querySelector('img').getAttribute('src'), 'https://kaftanangelo.com').href};
    updateModelInquiry();
  }
  colourSelector.hidden = false;
  const requestedColour = new URLSearchParams(location.search).get('colour');
  selectColour(panels.some(panel => panel.dataset.colourPanel === requestedColour) ? requestedColour : panels[0].dataset.colourPanel);
  colourSelector.addEventListener('click', event => {
    const button = event.target.closest('[data-colour]');
    if (button) selectColour(button.dataset.colour);
  });
}
document.querySelectorAll('.current-year').forEach(element => { element.textContent = String(new Date().getFullYear()); });

// Guide topic filter pills on /utmutatok/ and /en/guides/
const guideTopicBar = document.querySelector('[data-guide-topic-bar]');
const guideGrid = document.querySelector('[data-guide-grid]');
if (guideTopicBar && guideGrid) {
  const pills = [...guideTopicBar.querySelectorAll('[data-guide-topic]')];
  const cards = [...guideGrid.querySelectorAll('[data-guide-card-topic]')];
  guideTopicBar.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-guide-topic]');
    if (!btn) return;
    const topic = btn.dataset.guideTopic;
    pills.forEach(p => {
      const active = p === btn;
      p.classList.toggle('is-active', active);
      p.setAttribute('aria-pressed', String(active));
    });
    cards.forEach(card => {
      card.hidden = topic !== 'all' && card.dataset.guideCardTopic !== topic;
    });
  });
}

// Subtle Back-to-Top button on long pages
const backToTop = document.querySelector('[data-back-to-top]');
if (backToTop) {
  const syncTop = () => { backToTop.hidden = window.scrollY < 640; };
  window.addEventListener('scroll', syncTop, { passive: true });
  syncTop();
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
}

const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('[data-menu]');
const menuBackdrop = document.querySelector('[data-menu-backdrop]');
const menuClose = menu?.querySelector('[data-menu-close]');
const isMenuOpen = () => menuButton?.getAttribute('aria-expanded') === 'true';
function closeMenu(restoreFocus = false) {
  menuButton?.setAttribute('aria-expanded', 'false');
  menu?.removeAttribute('data-open');
  if (menuBackdrop) menuBackdrop.hidden = true;
  document.documentElement.classList.remove('menu-open');
  if (restoreFocus) menuButton?.focus();
}
function openMenu() {
  window.dispatchEvent(new CustomEvent('kaftan-close-overlays', { detail: { except: 'menu' } }));
  menuButton?.setAttribute('aria-expanded', 'true');
  menu?.setAttribute('data-open', '');
  if (menu) { menu.scrollTop = 0; menu.scrollLeft = 0; }
  if (menuBackdrop) menuBackdrop.hidden = false;
  document.documentElement.classList.add('menu-open');
  requestAnimationFrame(() => (menuClose || menu?.querySelector('a, button, summary'))?.focus());
}
window.addEventListener('kaftan-close-overlays', event => {
  if (event.detail?.except !== 'menu' && isMenuOpen()) closeMenu(false);
});
menuButton?.addEventListener('click', () => {
  if (isMenuOpen()) closeMenu(true);
  else openMenu();
});
menuClose?.addEventListener('click', () => closeMenu(true));
menuBackdrop?.addEventListener('click', () => closeMenu(true));
document.addEventListener('keydown', event => {
  if (!isMenuOpen()) return;
  if (event.key === 'Escape') { closeMenu(true); return; }
  if (event.key === 'Tab' && menu) {
    const focusables = [...menu.querySelectorAll('a[href], button:not([disabled]), summary')].filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
matchMedia('(min-width: 1101px)').addEventListener('change', () => closeMenu(false));
menu?.addEventListener('click', event => {
  if (event.target.closest('a') || event.target.closest('[data-drawer-search-btn]')) closeMenu(false);
});
document.addEventListener('click', event => {
  if (isMenuOpen() && !event.target.closest('.site-header')) closeMenu(false);
});

// Native dialogs trap focus, handle Escape, and restore focus to the trigger.
const dialog = document.querySelector('[data-product-dialog]');
const imageButtons = [...document.querySelectorAll('[data-product-image]')];
const visibleImageButtons = () => imageButtons.filter(button => !button.closest('.product-card').hidden);
let selectedImage = 0;
function showImage(index) {
  const visible = visibleImageButtons();
  selectedImage = (index + visible.length) % visible.length;
  const trigger = visible[selectedImage];
  const card = trigger.closest('.product-card');
  const title = card.querySelector('h3').textContent;
  const image = dialog.querySelector('[data-preview-image]');
  image.src = trigger.dataset.productImage;
  image.alt = title;
  dialog.querySelector('[data-preview-title]').textContent = title;
  dialog.querySelector('[data-preview-count]').textContent = `${selectedImage + 1} / ${visible.length}`;
  dialog.querySelector('[data-preview-inquiry]').href = card.querySelector('a[href*="wa.me"]').href;
  if (!dialog.open) dialog.showModal();
}
imageButtons.forEach(button => button.addEventListener('click', () => showImage(visibleImageButtons().indexOf(button))));
dialog?.querySelector('[data-preview-close]').addEventListener('click', () => dialog.close());
dialog?.querySelector('[data-preview-prev]').addEventListener('click', () => showImage(selectedImage - 1));
dialog?.querySelector('[data-preview-next]').addEventListener('click', () => showImage(selectedImage + 1));
dialog?.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showImage(selectedImage + (event.key === 'ArrowRight' ? 1 : -1)); }
});
dialog?.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});

const partnerForm = document.querySelector('[data-partner-form]');
function partnershipMessage() {
  const data = new FormData(partnerForm);
  const body = [
    `${hu ? 'Név' : 'Name'}: ${data.get('name') || ''}`,
    `${hu ? 'Cég' : 'Company'}: ${data.get('company') || ''}`,
    `Email: ${data.get('email') || ''}`,
    `${hu ? 'Telefon' : 'Phone'}: ${data.get('phone') || ''}`,
    `${hu ? 'Partner típusa' : 'Partner type'}: ${data.get('type') || ''}`,
    '', String(data.get('message') || ''),
  ].join('\n');
  const subject = `${hu ? 'Partnerprogram' : 'Partnership inquiry'} — ${data.get('company') || data.get('name') || 'Kaftan Angelo'}`;
  return { body, subject };
}
partnerForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (!partnerForm.reportValidity()) return;
  const { body, subject } = partnershipMessage();
  location.href = `mailto:alfinafashionkft@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
partnerForm?.querySelector('[data-partner-whatsapp]').addEventListener('click', () => {
  if (!partnerForm.reportValidity()) return;
  const { body, subject } = partnershipMessage();
  location.href = `https://wa.me/36203593216?text=${encodeURIComponent(subject + '\n\n' + body)}`;
});


const fittingStorageKey = 'kaftan_fitting_list_v1';
const fittingHub = hu ? '/kollekciok/' : '/en/collections/';
const fittingLimit = 12;
const validModelKey = key => typeof key === 'string' && /^[a-z0-9-]{1,120}$/.test(key);
function readFittingList() {
  try {
    const data = JSON.parse(localStorage.getItem(fittingStorageKey) || '[]');
    return new Set(Array.isArray(data) ? data.filter(validModelKey).slice(0, fittingLimit) : []);
  } catch { return new Set(); }
}
let fittingList = readFittingList();
function normalizedModelText(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
const colourFacets = [
  ['black','Fekete','Black',/fekete|\bblack\b/],
  ['brown','Barna','Brown / tan',/barna|\bbrown\b|\btan\b|\btaupe\b/],
  ['beige','Bézs / krém','Beige / cream',/bezs|krem|\bbeige\b|\bcream\b/],
  ['white','Fehér','White',/feher|\bwhite\b/],
  ['grey','Szürke','Grey',/szurke|\bgrey\b|\bgray\b/],
  ['red','Piros / bordó','Red / burgundy',/piros|bordo|\bred\b|\bburgundy\b/],
  ['blue','Kék','Blue',/kek|\bblue\b|\bnavy\b/],
  ['green','Zöld','Green',/zold|\bgreen\b/],
  ['yellow','Sárga','Yellow',/\bsarga\b|\byellow\b/],
  ['orange','Narancs / korall','Orange / coral',/narancs|korall|\borange\b|\bcoral\b/],
];
const styleFacets = [
  ['reversible','Kétoldalas','Reversible',/ketoldalas|\breversible\b/],
  ['biker','Motoros','Biker',/motoros|\bbiker\b/],
  ['blazer','Blézer','Blazer',/blezer|\bblazer\b/],
  ['belted','Öves','Belted',/\boves\b|\bbelted\b/],
  ['hooded','Kapucnis','Hooded',/kapucni|\bhood(?:ed)?\b/],
  ['quilted','Steppelt','Quilted',/steppelt|\bquilted\b/],
  ['patterned','Mintás','Patterned',/mintas|\bpatterned\b/],
  ['poncho','Poncsó','Poncho',/poncso|\bponcho\b/],
];
function createDiscovery(grid, cards, onChange) {
  const models = cards.filter(card => validModelKey(card.dataset.modelKey));
  if (!models.length) return null;
  const isHub = location.pathname === fittingHub;
  const records = models.map(card => ({
    card,
    key: card.dataset.modelKey,
    name: card.querySelector('h3').textContent.trim(),
    link: card.querySelector('.product-detail-link'),
    searchable: normalizedModelText([card.querySelector('h3').textContent, card.dataset.modelVariants || '', card.querySelector('img')?.alt || ''].join(' ')),
  }));
  // The production catalogue provides this markup before the first paint.
  const toolbar = grid.previousElementSibling;
  if (!toolbar?.matches('[data-static-discovery]')) return null;
  const search = toolbar.querySelector('[data-model-search]');
  const colour = toolbar.querySelector('[data-model-colour]');
  const style = toolbar.querySelector('[data-model-style]');
  const saved = toolbar.querySelector('[data-fitting-shortcut]');
  const result = toolbar.querySelector('.collection-result');
  const notice = toolbar.querySelector('.collection-notice');
  const panel = toolbar.querySelector('.fitting-panel');
  const inquiry = toolbar.querySelector('[data-fitting-inquiry]');
  function enableFacet(select, facets) {
    for (const [value, labelHu, labelEn, pattern] of facets) {
      if (records.some(record => pattern.test(record.searchable))) select.add(new Option(hu ? labelHu : labelEn, value));
    }
    select.disabled = false;
  }
  enableFacet(colour, colourFacets);
  enableFacet(style, styleFacets);
  search.disabled = false;
  if (isHub) saved.disabled = false;
  let savedOnly = false;
  function refreshSaved() {
    const availableSaved = records.filter(record => fittingList.has(record.key));
    saved.textContent = (hu ? 'Próbalista' : 'Fitting list') + ' (' + fittingList.size + ')';
    for (const record of records) {
      const active = fittingList.has(record.key);
      record.button.setAttribute('aria-pressed', String(active));
      record.button.setAttribute('aria-label', (active ? (hu ? 'Eltávolítás a próbalistáról: ' : 'Remove from fitting list: ') : (hu ? 'Mentés a próbalistára: ' : 'Save to fitting list: ')) + record.name);
      record.button.textContent = active ? '♥' : '♡';
    }
    inquiry.hidden = !availableSaved.length;
    if (availableSaved.length) {
      const intro = hu ? 'Üdvözlöm! A következő modelleket szeretném felpróbálni. Érdeklődöm az aktuális elérhetőségről:' : 'Hello! I would like to try on the following models. Could you confirm current availability?';
      const message = [intro, ...availableSaved.map(record => record.name + '\n' + new URL(record.link.getAttribute('href'), 'https://kaftanangelo.com').href)].join('\n\n');
      const url = new URL('https://wa.me/36203593216');
      url.searchParams.set('text', message);
      inquiry.href = url.href;
    } else inquiry.removeAttribute('href');
  }
  for (const record of records) {
    const button = record.card.querySelector('[data-model-save]');
    record.button = button;
    button.disabled = false;
    button.addEventListener('click', () => {
      if (fittingList.has(record.key)) fittingList.delete(record.key);
      else if (fittingList.size < fittingLimit) fittingList.add(record.key);
      else {
        notice.textContent = hu ? 'Legfeljebb 12 modell menthető.' : 'You can save up to 12 models.';
        return;
      }
      try { localStorage.setItem(fittingStorageKey, JSON.stringify([...fittingList])); }
      catch { notice.textContent = hu ? 'A lista nem menthető ezen az eszközön.' : 'The list cannot be stored on this device.'; }
      window.dispatchEvent(new Event('kaftan-fitting-change'));
      if (savedOnly && record.card.hidden) saved.focus();
    });
  }
  function clearFields() { search.value = ''; colour.value = ''; style.value = ''; }
  function setSavedMode(value) {
    savedOnly = value;
    saved.setAttribute('aria-pressed', String(value));
    panel.hidden = !value;
    clearFields();
    const all = grid.parentElement.querySelector('[data-product-filters] [data-filter="all"]');
    if (all) all.click();
    else onChange();
    if (value) panel.scrollIntoView({ block: 'center' });
  }
  if (isHub) saved.addEventListener('click', () => setSavedMode(!savedOnly));
  const finder = isHub && document.querySelector('[data-style-finder]');
  if (finder) {
    const tone = finder.elements.namedItem('tone');
    const look = finder.elements.namedItem('look');
    for (const option of [...colour.options].slice(1)) tone.add(option.cloneNode(true));
    finder.querySelector('button').disabled = false;
    finder.addEventListener('submit', event => {
      event.preventDefault();
      setSavedMode(false);
      colour.value = tone.value;
      style.value = look.value;
      onChange();
      finder.closest('details').open = false;
      result.tabIndex = -1;
      result.focus();
      result.scrollIntoView({ block: 'center' });
    });
    const openFinder = () => {
      if (location.hash === '#style-finder') finder.closest('details').open = true;
    };
    openFinder();
    window.addEventListener('hashchange', openFinder);
  }
  search.addEventListener('input', onChange);
  colour.addEventListener('change', onChange);
  style.addEventListener('change', onChange);
  window.addEventListener('kaftan-fitting-change', () => { fittingList = readFittingList(); refreshSaved(); if (savedOnly) onChange(); });
  window.addEventListener('storage', event => {
    if (event.key !== fittingStorageKey && event.key !== null) return;
    fittingList = readFittingList();
    refreshSaved();
    if (savedOnly) onChange();
  });
  refreshSaved();
  if (isHub) {
    const openSavedList = () => {
      setSavedMode(true);
      saved.focus();
    };
    if (location.hash === '#fitting-list') queueMicrotask(openSavedList);
    window.addEventListener('hashchange', () => {
      if (location.hash === '#fitting-list') openSavedList();
    });
  }
  let catalogUiPromise = null;
  const loadCatalogUi = () => {
    if (!catalogUiPromise) catalogUiPromise = import('/assets/js/catalog-ui.mjs').catch(() => null);
    return catalogUiPromise;
  };
  const bootPhase2 = (event) => {
    const target = event?.target instanceof Element ? event.target : null;
    loadCatalogUi().then(mod => mod?.initCatalogPhase2({ toolbar, grid, triggerTarget: target }));
  };
  search.addEventListener('input', () => bootPhase2(null), { once: true });
  colour.addEventListener('change', () => bootPhase2(null), { once: true });
  style.addEventListener('change', () => bootPhase2(null), { once: true });
  toolbar.addEventListener('click', (e) => {
    if (e.target.closest('[data-view-option], [data-filter-drawer-btn]')) bootPhase2(e);
  });
  grid.addEventListener('pointerenter', () => bootPhase2(null), { once: true, capture: true });
  window.addEventListener('scroll', () => bootPhase2(null), { once: true, passive: true });
  return {
    matches(card) {
      const record = records.find(item => item.card === card);
      if (!record) return !savedOnly && !search.value.trim() && !colour.value && !style.value;
      if (savedOnly && !fittingList.has(record.key)) return false;
      const tokens = normalizedModelText(search.value).trim().split(/\s+/).filter(Boolean);
      const colourPattern = colourFacets.find(facet => facet[0] === colour.value)?.[3];
      const stylePattern = styleFacets.find(facet => facet[0] === style.value)?.[3];
      return tokens.every(token => record.searchable.includes(token)) && (!colourPattern || colourPattern.test(record.searchable)) && (!stylePattern || stylePattern.test(record.searchable));
    },
    active: () => savedOnly || Boolean(search.value.trim() || colour.value || style.value),
    clear() {
      clearFields();
      savedOnly = false;
      panel.hidden = true;
      if (isHub) saved.setAttribute('aria-pressed', 'false');
    },
    render(count) {
      result.textContent = hu ? count + ' modell' : count + (count === 1 ? ' model' : ' models');
      refreshSaved();
    },
  };
}

// Keep growing collections manageable; all cards remain available without JavaScript.
const collectionViews = [...document.querySelectorAll('.product-grid')].map((grid, index) => {
  const cards = [...grid.querySelectorAll('.product-card')];
  const scope = grid.parentElement;
  let controls = grid.nextElementSibling;
  let status, more, empty, explanation, reset;
  if (controls?.matches('[data-static-controls]')) {
    status = controls.querySelector('[role="status"]');
    more = controls.querySelector(':scope > button');
    empty = controls.querySelector('.collection-empty');
    explanation = empty.querySelector('p');
    reset = empty.querySelector('[data-collection-reset]');
    more.disabled = false;
    reset.disabled = false;
  } else {
    // Legacy galleries and the synthetic regression fixture remain supported.
    controls = document.createElement('div');
    controls.className = 'center-action collection-controls';
      status = document.createElement('p');
    status.setAttribute('role', 'status');
      more = document.createElement('button');
    more.type = 'button';
    more.className = 'btn btn-ghost';
    more.textContent = hu ? 'További modellek' : 'Show more models';
    grid.id ||= `collection-grid-${index}`;
    more.setAttribute('aria-controls', grid.id);
      empty = document.createElement('div');
    empty.className = 'collection-empty';
    empty.hidden = true;
      explanation = document.createElement('p');
    explanation.textContent = hu
      ? 'Ebben a kategóriában még nincs modellfotó. Az aktuális elérhetőségről érdeklődjön üzletünkben.'
      : 'There are no model photos in this category yet. Ask our store about current availability.';
      reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn btn-ghost';
    reset.setAttribute('data-collection-reset', '');
    reset.setAttribute('aria-controls', grid.id);
    reset.textContent = hu ? 'Összes modell' : 'Show all models';
    const visit = document.createElement('a');
    visit.className = 'btn btn-ghost';
    visit.href = hu ? '/uzlet/' : '/en/visit/';
    visit.textContent = hu ? 'Üzlet és elérhetőség' : 'Store and contact';
    empty.append(explanation, reset, visit);
    controls.append(status, more, empty);
    grid.after(controls);
  }
  let limit = 12;
  let filter = 'all';
  const discovery = createDiscovery(grid, cards, () => { limit = 12; render(); });
  const matches = () => cards.filter(card => (filter === 'all' || (card.dataset.category || '').split(/\s+/).includes(filter)) && (!discovery || discovery.matches(card)));
  function render() {
    const matching = matches();
    const shown = new Set(matching.slice(0, limit));
    cards.forEach(card => {
      card.hidden = !shown.has(card);
      card.classList.toggle('hidden', card.hidden);
    });
    grid.dataset.galleryReady = 'true';
    status.textContent = hu ? `${Math.min(limit, matching.length)} / ${matching.length} modell` : `${Math.min(limit, matching.length)} of ${matching.length} models`;
    more.hidden = limit >= matching.length;
    empty.hidden = matching.length > 0;
    if (discovery) {
      discovery.render(matching.length);
      explanation.textContent = discovery.active()
        ? (hu ? 'Nincs a keresésnek megfelelő modell. Próbáljon másik szűrőt, vagy nézze meg az összes modellt.' : 'No models match this selection. Try another filter or show all models.')
        : (hu ? 'Ebben a kategóriában még nincs modellfotó. Az aktuális elérhetőségről érdeklődjön üzletünkben.' : 'There are no model photos in this category yet. Ask our store about current availability.');
    }
    controls.hidden = cards.length > 0 && cards.length <= 12 && filter === 'all' && !discovery?.active();
  }
  reset.addEventListener('click', () => {
    discovery?.clear();
    const all = scope.querySelector('[data-product-filters] [data-filter="all"]');
    if (all) {
      all.click();
      all.focus();
    } else {
      filter = 'all';
      limit = 12;
      render();
      grid.querySelector('button, a')?.focus();
    }
  });
  let lastClickAt = 0;
  let scrollTimer = 0;
  let userScrolling = false;
  function maybeAutoLoad() {
    if (more.hidden || controls.hidden || Date.now() - lastClickAt < 250) return;
    if (window.scrollY < 40) return;
    const rect = controls.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 360) {
      limit += 12;
      render();
    }
  }
  const onUserGesture = () => {
    userScrolling = true;
    requestAnimationFrame(maybeAutoLoad);
  };
  window.addEventListener('wheel', onUserGesture, { passive: true });
  window.addEventListener('touchmove', onUserGesture, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'PageDown' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'End') onUserGesture();
  }, { passive: true });
  window.addEventListener('scroll', () => {
    if (userScrolling) {
      requestAnimationFrame(maybeAutoLoad);
      return;
    }
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(maybeAutoLoad, 180);
  }, { passive: true });
  more.addEventListener('click', () => {
    lastClickAt = Date.now();
    clearTimeout(scrollTimer);
    const firstNew = matches()[limit];
    limit += 12;
    render();
    firstNew?.querySelector('button, a')?.focus();
  });
  render();
  return { scope, setFilter(value) { filter = value; limit = 12; render(); } };
});

document.addEventListener('click', event => {
  const button = event.target.closest('.filter-btn[data-filter]');
  if (!button) return;
  const scope = button.closest('[data-product-filters]')?.parentElement || document;
  scope.querySelectorAll('.filter-btn').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  collectionViews.filter(view => scope.contains(view.scope)).forEach(view => view.setFilter(button.dataset.filter));
});
document.querySelectorAll('.newsletter-form').forEach(form => {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true' || !form.reportValidity()) return;
    const hu = form.dataset.language === 'hu';
    const status = form.querySelector('.newsletter-status');
    const button = form.querySelector('button[type="submit"]');
    const endpoint = new URL(form.action);
    if (endpoint.protocol !== 'https:' || !/^[a-z0-9-]+\.sibforms\.com$/i.test(endpoint.hostname)) return;
    endpoint.searchParams.set('isAjax', '1');
    status.hidden = false;
    status.textContent = hu ? 'Küldés…' : 'Sending…';
    form.setAttribute('aria-busy', 'true');
    button.disabled = true;
    try {
      const data = new FormData(form);
      data.delete('html_type');
      const response = await fetch(endpoint, { method: 'POST', body: data, credentials: 'omit', signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Subscription failed');
      status.textContent = hu ? 'Kérjük, erősítse meg feliratkozását a kapott e-mailben.' : 'Please confirm your subscription using the email we have sent you.';
      form.reset();
    } catch {
      status.textContent = hu ? 'A feliratkozást nem sikerült menteni. Kérjük, próbálja újra.' : 'We could not save your subscription. Please try again.';
    } finally {
      form.removeAttribute('aria-busy');
      button.disabled = false;
    }
  });
});
