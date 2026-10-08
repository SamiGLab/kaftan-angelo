(() => {
  const $ = id => document.getElementById(id);
  const form = $('portal-login-form');
  if (!form) return;
  const en = document.documentElement.lang.startsWith('en');
  const t = (english, hungarian) => en ? english : hungarian;
  const money = value => new Intl.NumberFormat(en ? 'en-GB' : 'hu-HU', { maximumFractionDigits: 0 }).format(Number(value) || 0) + ' HUF';
  const text = (id, value) => { if ($(id)) $(id).textContent = value ?? '—'; };
  let transactions = [];
  const sessionKey = 'kaftan_portal_view_v1';
  const sessionLifetime = 30 * 60 * 1000;
  function clearSession() {
    try { sessionStorage.removeItem(sessionKey); } catch {}
  }
  function rememberView(data) {
    // Keep this tab's read-only dashboard, never the PIN or login credentials.
    try { sessionStorage.setItem(sessionKey, JSON.stringify({expires: Date.now() + sessionLifetime, data})); } catch {}
  }
  const previewDialog = document.createElement('dialog');
  previewDialog.className = 'portal-preview-dialog';
  previewDialog.setAttribute('aria-labelledby','portal-preview-title');
  const previewTitle = document.createElement('h3');
  previewTitle.id = 'portal-preview-title';
  previewTitle.textContent = t('Material preview','Anyag előnézete');
  const previewClose = document.createElement('button');
  previewClose.type = 'button';
  previewClose.className = 'btn btn-ghost';
  previewClose.textContent = t('Close preview','Előnézet bezárása');
  const previewBody = document.createElement('div');
  previewDialog.append(previewClose, previewTitle, previewBody);
  document.body.append(previewDialog);
  previewClose.addEventListener('click', () => previewDialog.close());
  previewDialog.addEventListener('click', event => {
    if (event.target !== previewDialog) return;
    const bounds = previewDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) previewDialog.close();
  });
  previewDialog.addEventListener('close', () => previewBody.replaceChildren());
  function openMaterialPreview(url, title) {
    previewTitle.textContent = title;
    const image = document.createElement('img');
    image.alt = title;
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => {
      const note = document.createElement('p');
      note.setAttribute('role','status');
      note.textContent = t('Preview unavailable. Try opening the PNG file or sign in again.','Az előnézet nem érhető el. Nyissa meg a PNG fájlt, vagy jelentkezzen be újra.');
      previewBody.replaceChildren(note);
    }, {once:true});
    image.src = url;
    previewBody.replaceChildren(image);
    previewDialog.showModal();
  }
  function renderMaterials(data) {
    const grid = $('portal-materials-grid');
    grid.replaceChildren();
    const manifest = data.materials;
    const owned = !manifest?.code || manifest.code === data.code;
    if (owned && manifest?.status === 'paused') {
      const notice = document.createElement('p');
      notice.className = 'portal-material-draft';
      notice.setAttribute('role','status');
      notice.textContent = t('Materials temporarily unavailable.','Az anyagok átmenetileg nem érhetők el.');
      grid.append(notice);
      return;
    }
    const materials = Array.isArray(manifest) ? manifest : [];
    const files = owned && Array.isArray(manifest?.files) ? manifest.files : [];
    if (owned && manifest?.draft === true) {
      const draft = document.createElement('p');
      draft.className = 'portal-material-draft';
      draft.textContent = t('Draft materials — check the details before printing or sending.','Tervezet — nyomtatás vagy küldés előtt ellenőrizze az adatokat.');
      grid.append(draft);
    }
    const safeUrl = value => {
      try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
    };
    for (const format of ['card','poster','mobile']) {
      for (const language of ['hu','en']) {
        const entry = materials.find(item => item && item.kind === (format === 'card' ? 'print' : format) && item.language === language && (!item.partner_code || item.partner_code === data.code));
        const matching = files.filter(file => file && file.format === format && file.language === language);
        const pdf = safeUrl(matching.find(file => file.type === 'pdf')?.url) || safeUrl(entry?.pdf_url);
        const png = safeUrl(matching.find(file => file.type === 'png')?.url) || safeUrl(entry?.png_url);
        const preview = safeUrl(entry?.preview_url) || png;
        const card = document.createElement('article');
        card.className = 'portal-material-card';
        const heading = document.createElement('h4');
        heading.textContent = (format === 'card' ? t('Print card · 10 × 15 cm','Nyomtatott kártya · 10 × 15 cm') : format === 'poster' ? t('Poster · A4','Plakát · A4') : t('Mobile invitation · 9:16','Mobil meghívó · 9:16')) + ' · ' + (language === 'hu' ? t('Hungarian','Magyar') : t('English','Angol'));
        card.append(heading);
        if (preview) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn btn-ghost portal-material-preview';
          button.textContent = t('Preview','Előnézet');
          button.setAttribute('aria-haspopup','dialog');
          button.addEventListener('click', () => openMaterialPreview(preview, heading.textContent + ' · ' + data.code));
          card.append(button);
        }
        const actions = document.createElement('div');
        actions.className = 'portal-material-actions';
        for (const [url, label] of [[pdf,t('Open PDF / print','PDF megnyitása / nyomtatás')],[png,t('Open / save PNG','PNG megnyitása / mentés')]]) {
          if (!url) continue;
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'btn btn-ghost';
          link.textContent = label;
          actions.append(link);
        }
        if (png && format === 'mobile') {
          const note = document.createElement('p');
          note.textContent = t('Save the image, then attach it in WhatsApp, Viber or your messaging app.','Mentse el a képet, majd csatolja WhatsAppon, Viberen vagy más üzenetküldő alkalmazásban.');
          card.append(note);
        }
        if (!pdf && !png) {
          const note = document.createElement('p');
          note.className = 'portal-material-pending';
          note.textContent = t('Your personalized material is being prepared.','Személyre szabott anyaga előkészítés alatt áll.');
          card.append(note);
        }
        card.append(actions);
        grid.append(card);
      }
    }
  }
  const kind = tx => {
    if (['Kifizetve','Settled','Paid'].includes(tx.status)) return 'paid';
    if (['İptal','Cancelled','Visszatérítve'].includes(tx.status) || (Number(tx.amount) === 0 && Number(tx.comm) === 0)) return 'cancelled';
    return ['Kifizethető','Cleared'].includes(tx.status) ? 'cleared' : 'holding';
  };
  const labels = () => en ? ['Date','Item / Purchase','Sale Amount','Commission','Status'] : ['Dátum','Termék / Vásárlás','Vásárlási összeg','Jutalék','Állapot'];
  function render() {
    const query = $('portal-search').value.trim().toLocaleLowerCase();
    const filter = $('portal-status-filter').value;
    const selected = transactions.filter(tx => (filter === 'all' || kind(tx) === filter) && [tx.item,tx.date].join(' ').toLocaleLowerCase().includes(query));
    const body = $('transactions-tbody');
    body.replaceChildren();
    selected.forEach(tx => {
      const row = document.createElement('tr');
      const status = kind(tx);
      const statusText = status === 'paid' ? t('Paid','Kifizetve') : status === 'cancelled' ? t('Returned / cancelled','Visszatérítve / törölve') : status === 'cleared' ? t('Available','Kifizethető') : t('Pending · 14 days','Függőben · 14 nap');
      [tx.date, tx.item, money(tx.amount), money(tx.comm), statusText].forEach((value,index) => {
        const cell = document.createElement('td');
        cell.dataset.label = labels()[index];
        if (index === 4) {
          const badge = document.createElement('span');
          badge.className = 'badge-status ' + status;
          badge.textContent = value;
          cell.append(badge);
        } else cell.textContent = value ?? '—';
        row.append(cell);
      });
      body.append(row);
    });
    text('portal-results-status', selected.length ? t(`${selected.length} completed sales`, `${selected.length} teljesült vásárlás`) : transactions.length ? t('No sales match these filters.','Nincs a szűrésnek megfelelő vásárlás.') : t('No completed sales recorded yet.','Még nincs rögzített teljesült vásárlás.'));
  }
  function populate(data) {
    renderMaterials(data);
    text('partner-display-code', data.code);
    text('partner-display-name', data.name);
    text('partner-display-type', data.type);
    text('partner-contact-person', data.contact_person);
    text('partner-phone', data.phone);
    const iban = String(data.iban || '').replace(/\s/g,'');
    text('partner-iban', iban ? iban.slice(0,4) + ' •••• •••• ' + iban.slice(-4) : t('Not provided','Nincs megadva'));
    text('stat-guests', Number(data.guests) || 0);
    text('stat-paid', money(data.paid));
    text('stat-cleared', money(data.cleared));
    text('stat-holding', money(data.holding));
    text('payout-amount-preview', money(data.cleared));
    text('voucher-code-val', data.code);
    transactions = Array.isArray(data.txs) ? data.txs : [];
    $('portal-search').value = '';
    $('portal-status-filter').value = 'all';
    render();
    const payout = $('request-payout-btn');
    const available = Number(data.cleared) > 0;
    payout.setAttribute('aria-disabled', String(!available));
    payout.textContent = available ? t('Discuss payout via WhatsApp →','Kifizetés egyeztetése WhatsAppon →') : t('No available commission yet','Még nincs kifizethető jutalék');
    if (available) payout.href = 'https://wa.me/36203593216?text=' + encodeURIComponent(t(`Hello! Partner ${data.code}: I would like to discuss payout of my available commission (${money(data.cleared)}) to my registered account.`, `Üdvözlöm! Partnerkód: ${data.code}. Szeretném egyeztetni kifizethető jutalékom (${money(data.cleared)}) átutalását a regisztrált számlámra.`));
    else payout.removeAttribute('href');
    const message = t(`Visit Kaftan Angelo for leather, shearling and fur outerwear. Present VIP code ${data.code} for 10% in-store savings.\nKossuth Lajos u. 18, Budapest 1053\nhttps://kaftanangelo.com/en/`, `Látogasson el a Kaftan Angelo bőr-, irha- és szőrmeüzletébe. Partnerkód: ${data.code}, 10% bolti kedvezmény.\nKossuth Lajos u. 18, Budapest 1053\nhttps://kaftanangelo.com/`);
    $('share-voucher-wa').href = 'https://wa.me/?text=' + encodeURIComponent(message);
    let contract = null;
    try { const url = new URL(data.contract_url); if (url.protocol === 'https:') contract = url.href; } catch {}
    $('contract-ready-box').style.display = contract ? 'flex' : 'none';
    $('contract-pending-box').style.display = contract ? 'none' : 'flex';
    if (contract) $('contract-download-link').href = contract;
    else $('contract-download-link').removeAttribute('href');
    const badge = document.querySelector('.contract-badge');
    if (badge) badge.textContent = contract ? t('Document available','Dokumentum elérhető') : t('Document pending','Dokumentum előkészítés alatt');
    $('portal-login-gate').hidden = true;
    $('portal-dashboard').hidden = false;
    $('partner-pin-input').value = '';
    $('partner-display-name').tabIndex = -1;
    $('partner-display-name').focus();
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('gate-submit-btn');
    if (button.disabled) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = t('Checking your account…','Fiók ellenőrzése…');
    form.setAttribute('aria-busy','true');
    $('portal-error-msg').hidden = true;
    try {
      const response = await fetch('https://bezlzeojivucnqkfjpwo.supabase.co/rest/v1/rpc/get_partner_portal', {
        method: 'POST', headers: { apikey: 'sb_publishable_M-lTei71UX1lmxv62xiNdQ_5t94kZZD', 'Content-Type':'application/json' },
        body: JSON.stringify({p_code: $('partner-code-input').value.trim().toUpperCase(), p_pin: $('partner-pin-input').value.trim()}),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error('network');
      const data = await response.json();
      if (!data?.success) {
        text('portal-error-msg',t('Invalid partner code or PIN. Please try again.','Érvénytelen partnerkód vagy PIN. Próbálja újra.'));
        $('portal-error-msg').hidden = false;
      } else {
        populate(data);
        rememberView(data);
      }
    } catch {
      text('portal-error-msg',t('Unable to reach your account. Please try again shortly.','A fiók jelenleg nem érhető el. Próbálja újra később.'));
      $('portal-error-msg').hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = original;
      form.removeAttribute('aria-busy');
    }
  });
  $('portal-logout-btn').addEventListener('click', () => {
    clearSession();
    transactions = [];
    if (previewDialog.open) previewDialog.close();
    previewBody.replaceChildren();
    $('portal-materials-grid').replaceChildren();
    $('transactions-tbody').replaceChildren();
    $('portal-dashboard').hidden = true;
    $('portal-login-gate').hidden = false;
    form.reset();
    $('partner-pin-input').type = 'password';
    $('toggle-pin').setAttribute('aria-pressed','false');
    $('toggle-pin').textContent = t('Show PIN','PIN megjelenítése');
    $('partner-code-input').focus();
  });
  $('toggle-pin').addEventListener('click', event => {
    const visible = $('partner-pin-input').type === 'password';
    $('partner-pin-input').type = visible ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-pressed',String(visible));
    event.currentTarget.textContent = visible ? t('Hide PIN','PIN elrejtése') : t('Show PIN','PIN megjelenítése');
  });
  $('copy-voucher-btn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('voucher-code-val').textContent); text('copy-voucher-status',t('Partner code copied.','Partnerkód másolva.')); }
    catch { text('copy-voucher-status',t('Select and copy the partner code manually.','Jelölje ki és másolja a partnerkódot.')); }
  });
  $('portal-search').addEventListener('input',render);
  $('portal-status-filter').addEventListener('change',render);
  // Remove legacy persisted credentials; PINs remain in the login request only.
  try { localStorage.removeItem('kaftan_portal_session'); } catch {}
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    if (saved?.expires > Date.now() && saved.expires <= Date.now() + sessionLifetime && saved.data?.success === true && typeof saved.data.code === 'string') {
      populate(saved.data);
    } else clearSession();
  } catch { clearSession(); }
})();
