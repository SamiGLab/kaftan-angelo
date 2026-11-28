// Deferred showroom catalog enhancements: active filter chips, floating fitting tray,
// lazy hover/in-card multi-photo slider, Quick View thumbnails, view switcher,
// mobile/tablet off-canvas filter drawer, and side-by-side model comparison.
const hu = document.documentElement.lang === 'hu';
const fittingHub = hu ? '/kollekciok/' : '/en/collections/';
const viewPrefName = 'kaftan_catalog_view_v1';
const comparePrefName = 'kaftan_compare_v1';
const compareLimit = 3;
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
  const card = button.closest('.product-card');
  const key = card?.dataset.modelKey;
  if (!key || button.querySelector('.collection-alt-photo')) return;
  loadGalleryMap().then(map => {
    const extra = Array.isArray(map[key]) ? map[key] : [];
    const src = extra[0] || '';
    if (!src || button.querySelector('.collection-alt-photo')) return;
    const altImg = document.createElement('img');
    altImg.className = 'collection-alt-photo';
    altImg.src = src;
    altImg.alt = '';
    altImg.loading = 'lazy';
    altImg.decoding = 'async';
    altImg.setAttribute('aria-hidden', 'true');
    button.append(altImg);

    // Attach in-card mini slider arrows when multiple photos exist
    const photoWrap = button.closest('.collection-photo');
    if (photoWrap && !photoWrap.querySelector('[data-card-slider]')) {
      attachCardSlider(photoWrap, button, extra);
    }
  });
}

function attachCardSlider(photoWrap, button, extraPhotos) {
  const primaryImg = button.querySelector('picture img') || button.querySelector('img:not(.collection-alt-photo)');
  if (!primaryImg || !extraPhotos.length) return;
  const primarySrc = primaryImg.currentSrc || primaryImg.getAttribute('src') || '';
  const slides = [primarySrc, ...extraPhotos].filter(Boolean);
  if (slides.length <= 1) return;

  let slideIdx = 0;
  const nav = document.createElement('div');
  nav.className = 'card-slider-controls';
  nav.dataset.cardSlider = '';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'card-slider-btn card-slider-prev';
  prevBtn.setAttribute('aria-label', hu ? 'Előző fotó' : 'Previous photo');
  prevBtn.textContent = '‹';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'card-slider-btn card-slider-next';
  nextBtn.setAttribute('aria-label', hu ? 'Következő fotó' : 'Next photo');
  nextBtn.textContent = '›';

  const counter = document.createElement('span');
  counter.className = 'card-slider-count';
  counter.setAttribute('aria-hidden', 'true');
  counter.textContent = `1/${slides.length}`;

  const showSlide = (next) => {
    slideIdx = (next + slides.length) % slides.length;
    const altImg = button.querySelector('.collection-alt-photo');
    if (slideIdx === 0) {
      if (altImg) {
        altImg.src = slides[1];
        altImg.classList.remove('is-pinned');
      }
    } else if (altImg) {
      altImg.src = slides[slideIdx];
      altImg.classList.add('is-pinned');
    }
    counter.textContent = `${slideIdx + 1}/${slides.length}`;
  };

  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showSlide(slideIdx - 1);
  });
  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showSlide(slideIdx + 1);
  });

  nav.append(prevBtn, counter, nextBtn);
  photoWrap.append(nav);
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
  const drawerBadge = toolbar.querySelector('[data-drawer-filter-count]');
  if (drawerBadge) {
    drawerBadge.textContent = chips.length ? `(${chips.length})` : '';
    drawerBadge.hidden = chips.length === 0;
  }

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

// Phase 2: View Switcher (2/3/4/list), Mobile Off-Canvas Filter Drawer, and Side-by-Side Compare
function readCompareList() {
  try {
    const data = JSON.parse(sessionStorage.getItem(comparePrefName) || '[]');
    return Array.isArray(data) ? data.slice(0, compareLimit) : [];
  } catch {
    return [];
  }
}

function writeCompareList(list) {
  try {
    sessionStorage.setItem(comparePrefName, JSON.stringify(list.slice(0, compareLimit)));
  } catch { /* ignore storage errors */ }
}

function setupViewSwitcher(toolbar, grid, triggerTarget) {
  const switcher = toolbar.querySelector('[data-view-switcher]');
  if (!switcher || switcher.dataset.bound === 'true') return;
  switcher.dataset.bound = 'true';

  const validViews = ['grid-2', 'grid-3', 'grid-4', 'list'];
  const applyView = (viewId) => {
    if (!validViews.includes(viewId)) return;
    grid.dataset.catalogView = viewId;
    switcher.querySelectorAll('button[data-view-option]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.viewOption === viewId));
    });
    try {
      localStorage.setItem(viewPrefName, viewId);
    } catch { /* ignore */ }
  };

  switcher.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view-option]');
    if (btn) applyView(btn.dataset.viewOption);
  });

  const clickedBtn = triggerTarget?.closest?.('button[data-view-option]');
  if (clickedBtn) {
    applyView(clickedBtn.dataset.viewOption);
  }
}

function setupFilterDrawer(toolbar, triggerTarget) {
  const openBtn = toolbar.querySelector('[data-filter-drawer-btn]');
  const filterStrip = toolbar.querySelector('.collection-filter-strip');
  if (!openBtn || !filterStrip || openBtn.dataset.bound === 'true') return;
  openBtn.dataset.bound = 'true';

  const drawerHead = document.createElement('div');
  drawerHead.className = 'filter-drawer-head';
  const drawerTitle = document.createElement('strong');
  drawerTitle.textContent = hu ? 'Szűrés' : 'Filter models';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'filter-drawer-close';
  closeBtn.setAttribute('aria-label', hu ? 'Szűrőpanel bezárása' : 'Close filters');
  closeBtn.textContent = '×';
  drawerHead.append(drawerTitle, closeBtn);

  const drawerDone = document.createElement('button');
  drawerDone.type = 'button';
  drawerDone.className = 'btn btn-primary filter-drawer-done';
  drawerDone.textContent = hu ? 'Találatok mutatása' : 'Show results';

  filterStrip.prepend(drawerHead);
  filterStrip.append(drawerDone);

  const backdrop = document.createElement('div');
  backdrop.className = 'filter-drawer-backdrop';
  backdrop.hidden = true;
  toolbar.append(backdrop);

  const setOpen = (open) => {
    toolbar.classList.toggle('is-drawer-open', open);
    backdrop.hidden = !open;
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) closeBtn.focus();
    else openBtn.focus();
  };

  openBtn.addEventListener('click', () => setOpen(true));
  closeBtn.addEventListener('click', () => setOpen(false));
  drawerDone.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  toolbar.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toolbar.classList.contains('is-drawer-open')) setOpen(false);
  });

  if (triggerTarget?.closest?.('[data-filter-drawer-btn]')) {
    setOpen(true);
  }
}

function setupCompare(grid, triggerTarget) {
  if (grid.dataset.compareReady === 'true') return;
  grid.dataset.compareReady = 'true';

  const cards = Array.from(grid.querySelectorAll('.product-card'));
  const cardData = new Map();

  for (const card of cards) {
    const key = card.dataset.modelKey;
    const photoWrap = card.querySelector('.collection-photo') || card;
    if (!key || !photoWrap) continue;
    const name = card.querySelector('h3')?.textContent?.trim() || key;
    const material = card.querySelector('.collection-material-tag')?.textContent?.trim() || '';
    const variants = card.dataset.modelVariants || '';
    const imgEl = card.querySelector('.product-image-button img');
    const imgSrc = imgEl?.getAttribute('src') || '';
    const detailHref = card.querySelector('.collection-detail')?.getAttribute('href') || fittingHub;
    const waHref = card.querySelector('.collection-contact')?.getAttribute('href') || 'https://wa.me/36203593216';
    cardData.set(key, { key, name, material, variants, imgSrc, detailHref, waHref, card });
    if (!photoWrap.querySelector('[data-model-compare]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'collection-compare';
      btn.dataset.modelCompare = key;
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', (hu ? 'Összehasonlítás: ' : 'Compare: ') + name);
      btn.setAttribute('title', hu ? 'Összehasonlítás' : 'Compare');
      btn.textContent = '⇄';
      photoWrap.append(btn);
    }
  }

  let bar = document.querySelector('[data-compare-bar]');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'compare-float-bar';
    bar.dataset.compareBar = '';
    bar.hidden = true;
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'btn btn-primary compare-open-btn';
    openBtn.dataset.compareOpen = '';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'compare-clear-btn';
    clearBtn.dataset.compareClear = '';
    clearBtn.setAttribute('aria-label', hu ? 'Összehasonlítás törlése' : 'Clear comparison');
    clearBtn.textContent = '×';
    bar.append(openBtn, clearBtn);
    document.body.append(bar);
  }

  let dialog = document.querySelector('[data-compare-dialog]');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'compare-dialog';
    dialog.dataset.compareDialog = '';
    dialog.setAttribute('aria-labelledby', 'compare-dialog-title');
    dialog.innerHTML = `<div class="compare-dialog-head">
      <h2 id="compare-dialog-title">${hu ? 'Modellek összehasonlítása' : 'Compare models'}</h2>
      <button type="button" class="compare-dialog-close" data-compare-close aria-label="${hu ? 'Bezárás' : 'Close'}">×</button>
    </div>
    <div class="compare-dialog-body" data-compare-body></div>`;
    document.body.append(dialog);
    dialog.querySelector('[data-compare-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  const syncCompareUi = () => {
    const selected = readCompareList().filter(k => cardData.has(k));
    grid.querySelectorAll('[data-model-compare]').forEach(btn => {
      const k = btn.dataset.modelCompare;
      btn.setAttribute('aria-pressed', String(selected.includes(k)));
    });
    const openBtn = bar.querySelector('[data-compare-open]');
    if (!selected.length) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    if (openBtn) {
      openBtn.textContent = hu ? `⇄ Összehasonlítás (${selected.length}/${compareLimit})` : `⇄ Compare (${selected.length}/${compareLimit})`;
    }
  };

  const renderCompareDialog = () => {
    const body = dialog.querySelector('[data-compare-body]');
    if (!body) return;
    const selected = readCompareList().map(k => cardData.get(k)).filter(Boolean);
    body.replaceChildren();
    if (!selected.length) {
      dialog.close();
      return;
    }
    const cols = document.createElement('div');
    cols.className = 'compare-grid';
    for (const item of selected) {
      const col = document.createElement('article');
      col.className = 'compare-col';
      const img = document.createElement('img');
      img.src = item.imgSrc;
      img.alt = item.name;
      img.width = 240;
      img.height = 300;
      img.loading = 'lazy';
      const title = document.createElement('h3');
      title.textContent = item.name;
      const mat = document.createElement('p');
      mat.className = 'compare-meta';
      mat.textContent = item.material || (hu ? 'Valódi bőr / szőrme' : 'Genuine leather / fur');
      const vars = document.createElement('p');
      vars.className = 'compare-variants';
      vars.textContent = item.variants ? ((hu ? 'Színek: ' : 'Colours: ') + item.variants) : '';
      const actions = document.createElement('div');
      actions.className = 'compare-col-actions';
      const detailLink = document.createElement('a');
      detailLink.className = 'btn btn-ghost';
      detailLink.href = item.detailHref;
      detailLink.textContent = hu ? 'Részletek' : 'Details';
      const waLink = document.createElement('a');
      waLink.className = 'btn btn-primary';
      waLink.href = item.waHref;
      waLink.textContent = 'WhatsApp';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'compare-remove-btn';
      removeBtn.textContent = hu ? 'Eltávolítás' : 'Remove';
      removeBtn.addEventListener('click', () => {
        const next = readCompareList().filter(k => k !== item.key);
        writeCompareList(next);
        syncCompareUi();
        renderCompareDialog();
      });
      actions.append(detailLink, waLink, removeBtn);
      col.append(img, title, mat);
      if (item.variants) col.append(vars);
      col.append(actions);
      cols.append(col);
    }
    body.append(cols);
  };

  const toggleCompareKey = (key) => {
    if (!key) return;
    let list = readCompareList();
    if (list.includes(key)) list = list.filter(k => k !== key);
    else if (list.length < compareLimit) list.push(key);
    else list = [...list.slice(1), key];
    writeCompareList(list);
    syncCompareUi();
  };

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-model-compare]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    toggleCompareKey(btn.dataset.modelCompare);
  });

  bar.querySelector('[data-compare-open]')?.addEventListener('click', () => {
    renderCompareDialog();
    if (!dialog.open) dialog.showModal();
  });
  bar.querySelector('[data-compare-clear]')?.addEventListener('click', () => {
    writeCompareList([]);
    syncCompareUi();
  });

  const initialCompareBtn = triggerTarget?.closest?.('[data-model-compare]');
  if (initialCompareBtn) {
    toggleCompareKey(initialCompareBtn.dataset.modelCompare);
  } else {
    syncCompareUi();
  }
}

function setupActiveFilterChips(toolbar) {
  const search = toolbar.querySelector('[data-model-search]');
  const colour = toolbar.querySelector('[data-model-colour]');
  const style = toolbar.querySelector('[data-model-style]');
  if (!search || !colour || !style) return;

  let chipBar = toolbar.querySelector('[data-active-filters]');
  if (!chipBar) {
    chipBar = document.createElement('div');
    chipBar.className = 'collection-active-filters';
    chipBar.setAttribute('data-active-filters', '');
    chipBar.setAttribute('role', 'region');
    chipBar.setAttribute('aria-label', hu ? 'Aktív szűrők' : 'Active filters');
    chipBar.hidden = true;
    const metaRow = toolbar.querySelector('.collection-meta-row');
    if (metaRow) metaRow.after(chipBar);
    else toolbar.append(chipBar);
  }

  const renderChips = () => {
    chipBar.replaceChildren();
    const active = [];
    const q = search.value.trim();
    if (q) {
      active.push({
        label: `“${q}”`,
        clear: () => { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); },
      });
    }
    if (colour.value) {
      const opt = colour.options[colour.selectedIndex];
      active.push({
        label: opt ? opt.textContent.trim() : colour.value,
        clear: () => { colour.value = ''; colour.dispatchEvent(new Event('change', { bubbles: true })); },
      });
    }
    if (style.value) {
      const opt = style.options[style.selectedIndex];
      active.push({
        label: opt ? opt.textContent.trim() : style.value,
        clear: () => { style.value = ''; style.dispatchEvent(new Event('change', { bubbles: true })); },
      });
    }
    if (!active.length) {
      chipBar.hidden = true;
      return;
    }
    for (const item of active) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.setAttribute('aria-label', `${hu ? 'Szűrő törlése: ' : 'Remove filter: '}${item.label}`);
      chip.innerHTML = `<span></span><span class="filter-chip-x" aria-hidden="true">×</span>`;
      chip.firstElementChild.textContent = item.label;
      chip.addEventListener('click', () => { item.clear(); renderChips(); });
      chipBar.append(chip);
    }
    const clearAll = document.createElement('button');
    clearAll.type = 'button';
    clearAll.className = 'filter-chip-clear';
    clearAll.textContent = hu ? 'Szűrők törlése' : 'Clear all';
    clearAll.addEventListener('click', () => {
      search.value = '';
      colour.value = '';
      style.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      colour.dispatchEvent(new Event('change', { bubbles: true }));
      style.dispatchEvent(new Event('change', { bubbles: true }));
      renderChips();
    });
    chipBar.append(clearAll);
    chipBar.hidden = false;
  };

  search.addEventListener('input', renderChips);
  colour.addEventListener('change', renderChips);
  style.addEventListener('change', renderChips);
  renderChips();
}

function setupQuickView(grid) {
  const cards = [...grid.querySelectorAll('.product-card[data-model-key]')];
  if (!cards.length) return;

  for (const card of cards) {
    const photoBox = card.querySelector('.collection-photo');
    if (!photoBox || photoBox.querySelector('[data-quick-view-btn]')) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-qv-btn';
    btn.setAttribute('data-quick-view-btn', card.dataset.modelKey || '');
    btn.textContent = hu ? 'Gyorsnézet' : 'Quick view';
    photoBox.append(btn);
  }

  let dialog = document.querySelector('[data-qv-dialog]');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'qv-dialog';
    dialog.setAttribute('data-qv-dialog', '');
    dialog.setAttribute('aria-labelledby', 'qv-title');
    dialog.innerHTML = `<div class="qv-head">
      <h2 id="qv-title" data-qv-title></h2>
      <button type="button" class="qv-close" data-qv-close aria-label="${hu ? 'Gyorsnézet bezárása' : 'Close quick view'}">×</button>
    </div>
    <div class="qv-body">
      <div class="qv-media">
        <div class="qv-stage"><img data-qv-img alt="" width="480" height="600" /></div>
        <div class="qv-thumbs" data-qv-thumbs hidden></div>
      </div>
      <div class="qv-info">
        <span class="qv-cat" data-qv-cat></span>
        <p class="qv-meta" data-qv-meta></p>
        <p class="qv-note">${hu ? 'Próbálja fel személyesen budapesti üzletünkben (Kossuth Lajos u. 18), vagy kérdezzen WhatsAppon az aktuális méretekről.' : 'Try this piece in person at our Budapest store (Kossuth Lajos u. 18) or ask on WhatsApp about available sizes.'}</p>
        <div class="qv-actions">
          <a class="btn btn-primary" data-qv-wa target="_blank" rel="noopener noreferrer">${hu ? 'Ár és méret érdeklődés' : 'Ask about price & size'}</a>
          <a class="btn btn-ghost" data-qv-detail>${hu ? 'Teljes termékoldal' : 'Full product page'}</a>
          <button type="button" class="btn btn-ghost qv-save-btn" data-qv-save aria-pressed="false">♡ ${hu ? 'Próbalistára' : 'Save to list'}</button>
        </div>
      </div>
    </div>`;
    document.body.append(dialog);
    dialog.querySelector('[data-qv-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    window.addEventListener('kaftan-close-overlays', (e) => {
      if (e.detail?.except !== 'quickview' && dialog.open) dialog.close();
    });
  }

  let currentKey = '';
  const openCard = (card) => {
    const key = card.dataset.modelKey || '';
    const title = card.querySelector('h3')?.textContent?.trim() || '';
    const cat = card.querySelector('.product-card-cat')?.textContent?.trim() || '';
    const imgEl = card.querySelector('.product-image-button img');
    const primarySrc = imgEl?.getAttribute('src') || '';
    const detailHref = card.querySelector('.product-detail-link')?.getAttribute('href') || '#';
    const waHref = card.querySelector('a[href^="https://wa.me/"]')?.getAttribute('href') || 'https://wa.me/36203593216';
    const variants = card.dataset.modelVariants || '';
    currentKey = key;

    dialog.querySelector('[data-qv-title]').textContent = title;
    dialog.querySelector('[data-qv-cat]').textContent = cat;
    dialog.querySelector('[data-qv-meta]').textContent = variants
      ? `${hu ? 'Elérhető variációk: ' : 'Available variants: '}${variants}`
      : (hu ? 'Valódi bőr / prémium kidolgozás — pontos részletek az üzletben.' : 'Genuine leather / boutique finish — full details in store.');
    const mainImg = dialog.querySelector('[data-qv-img]');
    mainImg.src = primarySrc;
    mainImg.alt = title;
    dialog.querySelector('[data-qv-detail]').setAttribute('href', detailHref);
    dialog.querySelector('[data-qv-wa]').setAttribute('href', waHref);

    const saveBtn = dialog.querySelector('[data-qv-save]');
    const syncQvSave = () => {
      try {
        const list = JSON.parse(localStorage.getItem('kaftan_fitting_list_v1') || '[]');
        const saved = Array.isArray(list) && list.includes(currentKey);
        saveBtn.setAttribute('aria-pressed', String(saved));
        saveBtn.textContent = saved
          ? (hu ? '♥ Próbalistán' : '♥ On fitting list')
          : (hu ? '♡ Próbalistára' : '♡ Save to list');
      } catch {}
    };
    saveBtn.onclick = () => {
      card.querySelector('[data-model-save]')?.click();
      syncQvSave();
    };
    syncQvSave();

    const thumbsEl = dialog.querySelector('[data-qv-thumbs]');
    thumbsEl.replaceChildren();
    thumbsEl.hidden = true;
    loadGalleryMap().then((map) => {
      if (currentKey !== key) return;
      const extra = Array.isArray(map[key]) ? map[key] : [];
      renderPreviewThumbs(thumbsEl, mainImg, title, primarySrc, extra);
    });

    window.dispatchEvent(new CustomEvent('kaftan-close-overlays', { detail: { except: 'quickview' } }));
    if (!dialog.open) dialog.showModal();
  };

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick-view-btn]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const card = btn.closest('.product-card');
    if (card) openCard(card);
  });
}

export function initCatalogPhase2({ toolbar, grid, triggerTarget = null }) {
  if (!toolbar || !grid || toolbar.dataset.phase2Ready === 'true') return;
  toolbar.dataset.phase2Ready = 'true';
  ensureCatalogCss();
  setupActiveFilterChips(toolbar);
  setupQuickView(grid);
  setupViewSwitcher(toolbar, grid, triggerTarget);
  setupFilterDrawer(toolbar, triggerTarget);
  setupCompare(grid, triggerTarget);
}
