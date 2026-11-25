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

const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('[data-menu]');
function closeMenu() {
  menuButton?.setAttribute('aria-expanded', 'false');
  menu?.removeAttribute('data-open');
}
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menu.toggleAttribute('data-open', open);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') { closeMenu(); menuButton.focus(); }
});
matchMedia('(min-width: 1101px)').addEventListener('change', closeMenu);
menu?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('click', event => {
  if (menuButton?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) closeMenu();
});
document.addEventListener('focusin', event => {
  if (menuButton?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) closeMenu();
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
function collectionElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}
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
  const toolbar = collectionElement('div', '', 'collection-discovery');
  const search = collectionElement('input', '', 'collection-search');
  search.type = 'search';
  search.placeholder = hu ? 'Modell, szín vagy fazon keresése' : 'Search models, colours or styles';
  search.setAttribute('aria-label', search.placeholder);
  search.setAttribute('data-model-search', '');
  search.setAttribute('data-clarity-mask', 'true');
  const searchWrap = collectionElement('div', '', 'collection-search-row');
  searchWrap.append(search);
  function facetSelect(facets, attribute, label) {
    const select = collectionElement('select', '', 'collection-select');
    select.setAttribute(attribute, '');
    select.setAttribute('aria-label', label);
    select.setAttribute('data-clarity-mask', 'true');
    select.add(new Option(label, ''));
    for (const [value, labelHu, labelEn, pattern] of facets) {
      if (records.some(record => pattern.test(record.searchable))) select.add(new Option(hu ? labelHu : labelEn, value));
    }
    return select;
  }
  const colour = facetSelect(colourFacets, 'data-model-colour', hu ? 'Szín' : 'Colour');
  const style = facetSelect(styleFacets, 'data-model-style', hu ? 'Fazon' : 'Style');
  const facets = collectionElement('div', '', 'collection-facets');
  facets.append(colour, style);
  const nav = collectionElement('nav', '', 'collection-shortcuts');
  nav.setAttribute('aria-label', hu ? 'Kollekció műveletei' : 'Collection actions');
  const collection = collectionElement('a', hu ? 'Kollekció' : 'Collection');
  collection.href = fittingHub;
  const saved = collectionElement(isHub ? 'button' : 'a');
  if (isHub) {
    saved.type = 'button';
    saved.setAttribute('data-fitting-toggle', '');
    saved.setAttribute('aria-pressed', 'false');
  } else saved.href = fittingHub + '#fitting-list';
  const visit = collectionElement('a', hu ? 'Üzlet' : 'Visit us');
  visit.href = hu ? '/uzlet/' : '/en/visit/';
  nav.append(collection, saved, visit);
  const result = collectionElement('p', '', 'collection-result');
  result.setAttribute('aria-live', 'polite');
  result.setAttribute('aria-atomic', 'true');
  const notice = collectionElement('p', '', 'collection-notice');
  notice.setAttribute('role', 'status');
  const panel = collectionElement('div', '', 'fitting-panel');
  panel.hidden = true;
  panel.id = 'fitting-list';
  const heading = collectionElement('h2', hu ? 'Próbalistám' : 'My fitting list');
  const explanation = collectionElement('p', hu ? 'A lista ezen az eszközön marad. Kérdezzen a kiválasztott modellek elérhetőségéről; a lista nem foglalás.' : 'Your list stays on this device. Ask about the selected models before visiting; saving a model does not reserve it.');
  const inquiry = collectionElement('a', hu ? 'Érdeklődés a listáról WhatsAppon' : 'Ask about my list on WhatsApp', 'btn btn-primary');
  inquiry.setAttribute('data-fitting-inquiry', '');
  inquiry.setAttribute('data-interest-source', 'fitting_list');
  inquiry.hidden = true;
  panel.append(heading, explanation, inquiry);
  toolbar.append(nav, searchWrap, facets, panel, result, notice);
  grid.before(toolbar);
  grid.classList.add('collection-grid-v2');
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
    const button = collectionElement('button', '', 'collection-save');
    button.type = 'button';
    button.setAttribute('data-model-save', '');
    record.button = button;
    record.card.append(button);
    const description = record.card.querySelector('.product-card-body p');
    if (description && /^(Front and back photographs|Elöl- és hátulnézeti fotók)$/.test(description.textContent.trim())) description.classList.add('collection-repeated-description');
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
  }
  if (isHub) saved.addEventListener('click', () => setSavedMode(!savedOnly));
  search.addEventListener('input', onChange);
  colour.addEventListener('change', onChange);
  style.addEventListener('change', onChange);
  window.addEventListener('kaftan-fitting-change', () => { refreshSaved(); if (savedOnly) onChange(); });
  window.addEventListener('storage', event => {
    if (event.key !== fittingStorageKey && event.key !== null) return;
    fittingList = readFittingList();
    refreshSaved();
    if (savedOnly) onChange();
  });
  refreshSaved();
  if (isHub && location.hash === '#fitting-list') {
    // Wait until collectionViews and the existing filter event delegation are initialized.
    queueMicrotask(() => { setSavedMode(true); saved.focus(); });
  }
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
  const controls = document.createElement('div');
  controls.className = 'center-action collection-controls';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'btn btn-ghost';
  more.textContent = hu ? 'További modellek' : 'Show more models';
  grid.id ||= `collection-grid-${index}`;
  more.setAttribute('aria-controls', grid.id);
  const empty = document.createElement('div');
  empty.className = 'collection-empty';
  empty.hidden = true;
  const explanation = document.createElement('p');
  explanation.textContent = hu
    ? 'Ebben a kategóriában még nincs modellfotó. Az aktuális elérhetőségről érdeklődjön üzletünkben.'
    : 'There are no model photos in this category yet. Ask our store about current availability.';
  const reset = document.createElement('button');
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
  more.addEventListener('click', () => {
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
