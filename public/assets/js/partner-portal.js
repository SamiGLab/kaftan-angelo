(() => {
  const $ = id => document.getElementById(id);
  const form = $('portal-login-form');
  if (!form) return;
  const en = document.documentElement.lang.startsWith('en');
  const t = (english, hungarian) => en ? english : hungarian;
  const money = value => new Intl.NumberFormat(en ? 'en-GB' : 'hu-HU', { maximumFractionDigits: 0 }).format(Number(value) || 0) + ' HUF';
  const text = (id, value) => { if ($(id)) $(id).textContent = value ?? '—'; };
  let transactions = [];
  let sessionToken = '';
  let contractPending = false;
  let contractExpires = 0;
  let contractTimer;
  const contractEndpoint = 'https://bezlzeojivucnqkfjpwo.supabase.co/functions/v1/partner-contract';
  const sessionKey = 'kaftan_portal_view_v1';
  const sessionLifetime = 30 * 60 * 1000;
  let expiresAt = 0;
  let expiryTimer;
  function armExpiry(expires) {
    expiresAt = expires;
    clearTimeout(expiryTimer);
    expiryTimer = setTimeout(logout, Math.max(0, expires-Date.now()));
  }
  function clearSession() {
    clearTimeout(expiryTimer);
    expiresAt = 0;
    try { sessionStorage.removeItem(sessionKey); } catch {}
  }
  function rememberView(data) {
    // Keep this tab's dashboard and short-lived document capability, never its PIN or admin credentials.
    const view = {};
    for (const field of ['success','code','name','type','contact_person','phone','iban','guests','paid','cleared','holding','sales','txs','materials','has_contract','session_token']) {
      if (Object.hasOwn(data, field)) view[field] = data[field];
    }
    const pick = (entry,fields) => Object.fromEntries(fields.filter(field=>Object.hasOwn(entry,field)).map(field=>[field,entry[field]]));
    view.txs = Array.isArray(data.txs) ? data.txs.filter(entry=>entry && typeof entry==='object').map(entry=>pick(entry,['date','item','amount','comm','status'])) : [];
    if (Array.isArray(data.materials)) {
      view.materials = data.materials.filter(entry=>entry && typeof entry==='object').map(entry=>pick(entry,['partner_code','kind','language','pdf_url','png_url','preview_url']));
    } else if (data.materials && typeof data.materials==='object') {
      view.materials = pick(data.materials,['code','draft','status']);
      view.materials.files = Array.isArray(data.materials.files) ? data.materials.files.filter(entry=>entry && typeof entry==='object').map(entry=>pick(entry,['format','language','type','url'])) : [];
    }
    const iban = String(data.iban || '').replace(/\s/g,'');
    view.iban = iban ? iban.slice(0,4)+'••••'+iban.slice(-4) : '';
    const expires = Date.now() + sessionLifetime;
    armExpiry(expires);
    try { sessionStorage.setItem(sessionKey, JSON.stringify({expires, data:view})); } catch {}
  }
  function safeDocumentUrl(value, contract = false) {
    try {
      const url = new URL(value);
      const prefix = contract ? '/storage/v1/object/sign/partner-contracts/' : '/storage/v1/object/public/partner-materials/';
      return url.origin === 'https://bezlzeojivucnqkfjpwo.supabase.co' && !url.username && !url.password && url.pathname.startsWith(prefix) ? url.href : null;
    } catch { return null; }
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
    const owned = manifest?.code === data.code;
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
    const safeUrl = safeDocumentUrl;
    for (const format of ['card','poster','mobile']) {
      for (const language of ['hu','en']) {
        const entry = materials.find(item => item && item.kind === (format === 'card' ? 'print' : format) && item.language === language && item.partner_code === data.code);
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
    sessionToken = /^[0-9a-f]{64}$/.test(data.session_token || '') ? data.session_token : '';
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
    const contract = data.has_contract === true && !!sessionToken;
    $('contract-ready-box').style.display = contract ? 'flex' : 'none';
    $('contract-pending-box').style.display = contract ? 'none' : 'flex';
    $('contract-download-link').removeAttribute('href');
    if (contract) $('contract-download-link').href = '#portal-account';
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
      const requestedCode = $('partner-code-input').value.trim().toUpperCase();
      const response = await fetch('https://bezlzeojivucnqkfjpwo.supabase.co/rest/v1/rpc/get_partner_portal', {
        method: 'POST', headers: { apikey: 'sb_publishable_M-lTei71UX1lmxv62xiNdQ_5t94kZZD', 'Content-Type':'application/json' },
        body: JSON.stringify({p_code: requestedCode, p_pin: $('partner-pin-input').value.trim()}),
        signal: AbortSignal.timeout(15000)
      });
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After')) || 900;
        const minutes = Math.max(1, Math.min(15, Math.ceil(seconds/60)));
        text('portal-error-msg',t(`Too many sign-in attempts. Try again in ${minutes} minutes.`,`Túl sok belépési kísérlet. Próbálja újra ${minutes} perc múlva.`));
        $('portal-error-msg').hidden = false;
        return;
      }
      if (!response.ok) throw new Error('network');
      const data = await response.json();
      if (!data?.success) {
        text('portal-error-msg',t('Invalid partner code or PIN. Please try again.','Érvénytelen partnerkód vagy PIN. Próbálja újra.'));
        $('portal-error-msg').hidden = false;
      } else {
        if (data.code !== requestedCode) throw new Error('Partner account mismatch');
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
  function logout() {
    const token = sessionToken;
    sessionToken = '';
    contractExpires = 0;
    clearTimeout(contractTimer);
    contractLink.textContent = contractLabel;
    contractStatus.textContent = '';
    if (token) fetch(contractEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout',token}),keepalive:true}).catch(()=>{});
    clearSession();
    transactions = [];
    if (previewDialog.open) previewDialog.close();
    previewBody.replaceChildren();
    $('portal-materials-grid').replaceChildren();
    $('transactions-tbody').replaceChildren();
    for (const id of ['partner-display-code','partner-display-name','partner-display-type','partner-contact-person','partner-phone','partner-iban','stat-guests','stat-paid','stat-cleared','stat-holding','payout-amount-preview','voucher-code-val','portal-results-status']) text(id,'');
    text('partner-display-name',t('Partner account','Partnerfiók'));
    for (const id of ['request-payout-btn','share-voucher-wa','contract-download-link']) $(id).removeAttribute('href');
    $('portal-dashboard').hidden = true;
    $('portal-login-gate').hidden = false;
    form.reset();
    $('partner-pin-input').type = 'password';
    $('toggle-pin').setAttribute('aria-pressed','false');
    $('toggle-pin').textContent = t('Show PIN','PIN megjelenítése');
    $('partner-code-input').focus();
  }
  $('portal-logout-btn').addEventListener('click', logout);
  const contractStatus = document.createElement('p');
  contractStatus.setAttribute('role','status');
  $('contract-ready-box').after(contractStatus);
  const contractLink = $('contract-download-link');
  const contractLabel = contractLink.textContent;
  contractLink.addEventListener('click', async event => {
    if (contractExpires > Date.now()) return;
    event.preventDefault();
    if (!sessionToken || contractPending) return;
    const token = sessionToken;
    const popup = window.open('about:blank','_blank');
    if (popup) popup.opener = null;
    contractPending = true;
    contractLink.setAttribute('aria-busy','true');
    contractStatus.textContent = t('Preparing your private contract…','A privát szerződés előkészítése…');
    try {
      const response = await fetch(contractEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'download',token}),signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('contract');
      const data = await response.json();
      const url = safeDocumentUrl(data.url,true);
      if (!data.success || !url || token !== sessionToken) throw new Error('contract');
      contractExpires = Date.now()+300000;
      contractLink.href = url;
      contractLink.textContent = t('Open contract · valid for 5 minutes','Szerződés megnyitása · 5 percig érvényes');
      clearTimeout(contractTimer);
      contractTimer = setTimeout(()=>{contractExpires=0;contractLink.href='#portal-account';contractLink.textContent=contractLabel;},300000);
      contractStatus.textContent = t('Your private link is ready and expires in 5 minutes.','A privát hivatkozás elkészült, és 5 perc múlva lejár.');
      if (popup) popup.location.replace(url);
    } catch {
      if (popup) popup.close();
      if (token === sessionToken) contractStatus.textContent = t('Contract unavailable. Sign in again if your session expired, or try again shortly.','A szerződés nem érhető el. Lejárt munkamenet esetén jelentkezzen be újra, vagy próbálja meg később.');
    } finally {
      contractPending = false;
      contractLink.removeAttribute('aria-busy');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (expiresAt && Date.now() >= expiresAt) logout();
  });
  window.addEventListener('pageshow', () => {
    if (expiresAt && Date.now() >= expiresAt) logout();
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
      armExpiry(saved.expires);
    } else clearSession();
  } catch { clearSession(); }
})();
