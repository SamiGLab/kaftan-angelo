// Deferred showroom catalog enhancements: active filter chips, floating fitting tray,
// lazy hover 2nd photo, and Quick View multi-photo thumbnails.
const hu = document.documentElement.lang === 'hu';
const fittingHub = hu ? '/kollekciok/' : '/en/collections/';
let galleryMapPromise = null;

function ensureCatalogCss() {
  if (!document.head || document.querySelector('link[href="/assets/css/catalog-ui.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/assets/css/catalog-ui.css';
  document.head.append(link);
}

function loadGalleryMap() {
  ensureCatalogCss();
  if (!galleryMapPromise) {
    galleryMapPromise = fetch('/assets/data/collection-gallery.json')
      .then(res => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return galleryMapPromise;
}

function renderPreviewThumbs(thumbsEl, image, title, primarySrc, extraPhotos) {
  thumbsEl.replaceChildren();
  const photos = extraPhotos.length ? [primarySrc, ...extraPhotos] : [];
  if (photos.length <= 1) {
    thumbsEl.hidden = true;
    return;
  }
  photos.forEach((src, photoIdx) => {
    const label = photoIdx === 0
      ? (hu ? 'Elölnézet' : 'Front view')
      : (hu ? `Fotó ${photoIdx + 1}` : `Photo ${photoIdx + 1}`);
    const thumbBtn = document.createElement('button');
    thumbBtn.type = 'button';
    thumbBtn.className = 'preview-thumb';
    thumbBtn.setAttribute('aria-pressed', String(photoIdx === 0));
    thumbBtn.setAttribute('aria-label', `${title} — ${label}`);
    const thumbImg = document.createElement('img');
    thumbImg.src = src;
    thumbImg.alt = '';
    thumbImg.width = 72;
    thumbImg.height = 90;
    thumbImg.loading = 'lazy';
    thumbImg.decoding = 'async';
    thumbBtn.append(thumbImg);
    thumbBtn.addEventListener('click', () => {
      image.src = src;
      image.alt = `${title} — ${label}`;
      thumbsEl.querySelectorAll('.preview-thumb').forEach(btn => btn.setAttribute('aria-pressed', String(btn === thumbBtn)));
    });
    thumbsEl.append(thumbBtn);
  });
  thumbsEl.hidden = false;
}

export function loadPreviewThumbs(dialog, modelKey, title, primarySrc, isStillActive) {
  const thumbsEl = dialog.querySelector('[data-preview-thumbs]');
  const image = dialog.querySelector('[data-preview-image]');
  if (!thumbsEl || !image) return;
  thumbsEl.replaceChildren();
  thumbsEl.hidden = true;
  if (!modelKey) return;
  loadGalleryMap().then(map => {
    if (!isStillActive(modelKey)) return;
    const extraPhotos = Array.isArray(map[modelKey]) ? map[modelKey] : [];
    renderPreviewThumbs(thumbsEl, image, title, primarySrc, extraPhotos);
  });
}

export function attachHoverAltPhoto(button) {
  const key = button.closest('.product-card')?.dataset.modelKey;
  if (!key || button.querySelector('.collection-alt-photo')) return;
  loadGalleryMap().then(map => {
    const src = Array.isArray(map[key]) ? map[key][0] : '';
    if (!src || button.querySelector('.collection-alt-photo')) return;
    const altImg = document.createElement('img');
    altImg.className = 'collection-alt-photo';
    altImg.src = src;
    altImg.alt = '';
    altImg.loading = 'lazy';
    altImg.decoding = 'async';
    altImg.setAttribute('aria-hidden', 'true');
    button.append(altImg);
  });
}

export function syncFittingTray(ctx) {
  const { grid, panel, inquiry, isHub, totalSaved, availableSaved, savedOnly, setSavedMode } = ctx;
  let tray = grid.parentElement.querySelector('[data-fitting-tray]');
  if (totalSaved === 0) {
    if (tray) tray.hidden = true;
    return;
  }
  ensureCatalogCss();
  if (!tray) {
    tray = document.createElement('aside');
    tray.className = 'fitting-tray';
    tray.dataset.fittingTray = '';
    tray.setAttribute('aria-label', hu ? 'Próbalistám gyorselérés' : 'My fitting list quick bar');
    const inner = document.createElement('div');
    inner.className = 'fitting-tray-inner';
    const info = document.createElement('div');
    info.className = 'fitting-tray-info';
    const count = document.createElement('strong');
    count.dataset.fittingTrayCount = '';
    const names = document.createElement('span');
    names.dataset.fittingTrayNames = '';
    info.append(count, names);
    const actions = document.createElement('div');
    actions.className = 'fitting-tray-actions';
    if (isHub) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'btn btn-ghost fitting-tray-view';
      toggle.dataset.fittingTrayToggle = '';
      toggle.addEventListener('click', () => {
        const next = toggle.getAttribute('aria-pressed') !== 'true';
        setSavedMode(next);
        if (next) panel.scrollIntoView({ block: 'start' });
      });
      actions.append(toggle);
    } else {
      const link = document.createElement('a');
      link.className = 'btn btn-ghost fitting-tray-view';
      link.href = `${fittingHub}#fitting-list`;
      link.textContent = hu ? 'Lista megnyitása' : 'View list';
      actions.append(link);
    }
    const wa = document.createElement('a');
    wa.className = 'btn btn-primary fitting-tray-wa';
    wa.dataset.fittingTrayInquiry = '';
    wa.dataset.interestSource = 'fitting_list';
    wa.href = 'https://wa.me/36203593216';
    wa.textContent = 'WhatsApp';
    actions.append(wa);
    inner.append(info, actions);
    tray.append(inner);
    grid.parentElement.append(tray);
  }
  tray.hidden = false;
  const trayCount = tray.querySelector('[data-fitting-tray-count]');
  const trayNames = tray.querySelector('[data-fitting-tray-names]');
  const trayInquiry = tray.querySelector('[data-fitting-tray-inquiry]');
  const trayToggle = tray.querySelector('[data-fitting-tray-toggle]');
  if (trayCount) trayCount.textContent = hu ? `♥ Próbalistám (${totalSaved})` : `♥ Fitting list (${totalSaved})`;
  if (trayNames) {
    const previewNames = availableSaved.slice(0, 2).map(record => record.name);
    const extra = totalSaved - previewNames.length;
    trayNames.textContent = previewNames.length
      ? previewNames.join(' · ') + (extra > 0 ? ` +${extra}` : '')
      : (hu ? 'A kiválasztott modellek a próbalistán várják.' : 'Your selected models are saved on your list.');
  }
  if (trayInquiry) {
    if (availableSaved.length) {
      trayInquiry.href = inquiry.href;
    } else {
      const fallbackUrl = new URL('https://wa.me/36203593216');
      fallbackUrl.searchParams.set('text', hu
        ? 'Üdvözlöm! A próbalistámról szeretnék érdeklődni az aktuális elérhetőségről.'
        : 'Hello! I would like to ask about current availability for my fitting list.');
      trayInquiry.href = fallbackUrl.href;
    }
  }
  if (trayToggle) {
    trayToggle.textContent = savedOnly ? (hu ? 'Összes modell' : 'All models') : (hu ? 'Lista megnyitása' : 'View list');
    trayToggle.setAttribute('aria-pressed', String(savedOnly));
  }
}

export function renderFilterChips(toolbar, panel, chips, resetAll) {
  let box = toolbar.querySelector('[data-active-filters]');
  if (!chips.length) {
    if (box) {
      box.replaceChildren();
      box.hidden = true;
    }
    return;
  }
  ensureCatalogCss();
  if (!box) {
    box = document.createElement('div');
    box.className = 'collection-active-filters';
    box.dataset.activeFilters = '';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', hu ? 'Aktív szűrők' : 'Active filters');
    panel.before(box);
  }
  box.replaceChildren();
  for (const chip of chips) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip';
    btn.dataset.removeFilter = chip.key;
    btn.setAttribute('aria-label', (hu ? 'Szűrő eltávolítása: ' : 'Remove filter: ') + chip.label);
    const text = document.createElement('span');
    text.textContent = chip.label;
    const close = document.createElement('span');
    close.className = 'filter-chip-x';
    close.setAttribute('aria-hidden', 'true');
    close.textContent = '×';
    btn.append(text, close);
    btn.addEventListener('click', chip.onRemove);
    box.append(btn);
  }
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'filter-chip-clear';
  clearBtn.dataset.clearAllFilters = '';
  clearBtn.textContent = hu ? 'Szűrők törlése' : 'Clear all';
  clearBtn.addEventListener('click', resetAll);
  box.append(clearBtn);
  box.hidden = false;
}
