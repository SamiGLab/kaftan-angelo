(() => {
  const $ = id => document.getElementById(id);
  const form = $('portal-login-form');
  if (!form) return;
  const en = document.documentElement.lang.startsWith('en');
  const t = (english, hungarian) => en ? english : hungarian;
  const money = value => new Intl.NumberFormat(en ? 'en-GB' : 'hu-HU', { maximumFractionDigits: 0 }).format(Number(value) || 0) + ' HUF';
  const text = (id, value) => { if ($(id)) $(id).textContent = value ?? '—'; };
  let transactions = [];
  const kind = status => ['Kifizetve','Settled','Paid'].includes(status) ? 'paid' : ['Kifizethető','Cleared'].includes(status) ? 'cleared' : 'holding';
  const labels = () => en ? ['Date','Item / Purchase','Sale Amount','Commission','Status'] : ['Dátum','Termék / Vásárlás','Vásárlási összeg','Jutalék','Állapot'];
  function render() {
    const query = $('portal-search').value.trim().toLocaleLowerCase();
    const filter = $('portal-status-filter').value;
    const selected = transactions.filter(tx => (filter === 'all' || kind(tx.status) === filter) && [tx.item,tx.date].join(' ').toLocaleLowerCase().includes(query));
    const body = $('transactions-tbody');
    body.replaceChildren();
    selected.forEach(tx => {
      const row = document.createElement('tr');
      const status = kind(tx.status);
      const statusText = status === 'paid' ? t('Paid','Kifizetve') : status === 'cleared' ? t('Available','Kifizethető') : t('Pending · 14 days','Függőben · 14 nap');
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
      } else populate(data);
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
    transactions = [];
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
})();
