# -*- coding: utf-8 -*-
"""Sets up live Supabase connection for Kaftan Angelo Partner Portal."""

import json

with open('src/data/pages.json', 'r', encoding='utf-8') as f:
    pages = json.load(f)

# Update existing /partnerprogram/ to link to portal if not already
if '/partnerprogram/' in pages:
    old_html = pages['/partnerprogram/']['mainHtml']
    if '/partner-portal/' not in old_html:
        portal_btn = '<div class="actions" style="margin-top:1.5rem"><a class="btn btn-primary" href="/partner-portal/">Belépés a Partner Portálra (Hak Edi\u015f &amp; Jutal\u00e9k) &rarr;</a></div>'
        pages['/partnerprogram/']['mainHtml'] = old_html.replace('</div></div></section>', f'{portal_btn}</div></div></section>', 1)

if '/en/partners/' in pages:
    old_en_html = pages['/en/partners/']['mainHtml']
    if '/en/partner-portal/' not in old_en_html:
        en_portal_btn = '<div class="actions" style="margin-top:1.5rem"><a class="btn btn-primary" href="/en/partner-portal/">Partner Portal Login (Commissions &amp; Payouts) &rarr;</a></div>'
        pages['/en/partners/']['mainHtml'] = old_en_html.replace('</div></div></section>', f'{en_portal_btn}</div></div></section>', 1)

portal_hu_html = """
<section class="page-hero" style="--hero:url('/assets/images/kaftan-angelo-hero-leather-collection-800.avif');--hero-mobile:url('/assets/images/kaftan-angelo-hero-leather-collection-480.avif')">
<div class="wrap">
<div class="breadcrumbs"><a href="/">Főoldal</a> / <a href="/partnerprogram/">Partnerprogram</a> / Partner Portál</div>
<span class="tag mono">Kaftan Angelo · B2B &amp; Turisztikai Partnerek</span>
<h1>Partner &amp; Concierge Portál</h1>
<p>Közvetített vendégek, forgalom és valós idejű jutalék (hak edis) egyenleg nyomon követése budapesti partnereink számára.</p>
</div>
</section>

<section class="portal-section">
<div class="wrap">

<!-- Login Gate -->
<div class="portal-gate-card" id="portal-login-gate">
  <div class="gate-icon" aria-hidden="true">🔑</div>
  <h2>Partner bejelentkezés</h2>
  <p>Adja meg partnerkódját és személyes PIN-kódját a forgalom és a kifizetési egyenleg megtekintéséhez.</p>
  <form id="portal-login-form" class="gate-form">
    <div class="gate-input-wrap">
      <input type="text" id="partner-code-input" class="gate-input" placeholder="Partnerkód (pl. HOTEL-01)" required autocomplete="username">
      <input type="password" id="partner-pin-input" class="gate-input" placeholder="PIN-kód (pl. 1904)" required autocomplete="current-password">
      <button type="submit" class="btn btn-primary gate-submit-btn" id="gate-submit-btn">Belépés a fiókba</button>
    </div>
    <p id="portal-error-msg" class="gate-error" hidden>Érvénytelen partnerkód vagy PIN-kód. Kérjük, ellenőrizze az adatokat!</p>
  </form>

  <div class="gate-demo-pills">
    <span class="demo-label">Gyors próba demó fiókokkal:</span>
    <button type="button" class="btn btn-ghost demo-btn" data-demo-code="HOTEL-01" data-demo-pin="1904">🏨 Hotel Concierge (HOTEL-01 / PIN: 1904)</button>
    <button type="button" class="btn btn-ghost demo-btn" data-demo-code="GUIDE-02" data-demo-pin="4821">🗺️ Idegenvezető (GUIDE-02 / PIN: 4821)</button>
  </div>
</div>

<!-- Logged In Dashboard -->
<div class="portal-dashboard" id="portal-dashboard" hidden>
  <div class="dashboard-top-bar">
    <div>
      <span class="badge-status active">● Aktív partner státusz</span>
      <h2 id="partner-display-name" class="dashboard-partner-title">Partner Fiók</h2>
      <p id="partner-display-type" class="dashboard-partner-sub">Hotel &amp; Concierge</p>
    </div>
    <div class="dashboard-actions">
      <button type="button" id="portal-logout-btn" class="btn btn-ghost">Kijelentkezés</button>
    </div>
  </div>

  <!-- Stat Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-icon" aria-hidden="true">👥</span>
      <span class="stat-label">Közvetített vendégek</span>
      <strong id="stat-guests" class="stat-val">0 fő</strong>
      <span class="stat-sub">Sikeres bolti látogatás</span>
    </div>
    <div class="stat-card">
      <span class="stat-icon" aria-hidden="true">🛍️</span>
      <span class="stat-label">Generált forgalom</span>
      <strong id="stat-sales" class="stat-val">0 HUF</strong>
      <span class="stat-sub">Összes vásárlási érték</span>
    </div>
    <div class="stat-card highlight">
      <span class="stat-icon" aria-hidden="true">💰</span>
      <span class="stat-label">Függőben lévő jutalék (Hak edis)</span>
      <strong id="stat-unpaid" class="stat-val accent">0 HUF</strong>
      <span class="stat-sub">Azonnal kérhető egyenleg</span>
    </div>
    <div class="stat-card">
      <span class="stat-icon" aria-hidden="true">✅</span>
      <span class="stat-label">Eddig kifizetett jutalék</span>
      <strong id="stat-paid" class="stat-val">0 HUF</strong>
      <span class="stat-sub">Korábban rendezve</span>
    </div>
  </div>

  <!-- Digital VIP Voucher Card -->
  <div class="vip-voucher-section">
    <div class="vip-voucher-box">
      <div class="voucher-header">
        <span class="voucher-brand">Kaftan Angelo · Budapest</span>
        <span class="voucher-badge">10% VIP Vendégkedvezmény</span>
      </div>
      <div class="voucher-body">
        <p class="voucher-desc">Mutassa be ezt a kártyát vendégének telefonon vagy küldje el WhatsAppon. A vendég 10% kedvezményt kap a boltban, a vásárlás pedig automatikusan az Ön jutalékához íródik.</p>
        <div class="voucher-code-wrap">
          <span class="voucher-code-label">Partner azonosító kód:</span>
          <strong id="voucher-code-val" class="voucher-code-text">HOTEL-01</strong>
        </div>
        <p class="voucher-address">📍 Kossuth Lajos u. 18, Budapest 1053 (Astoria — Ferenciek tere)</p>
      </div>
      <div class="voucher-actions">
        <button type="button" id="copy-voucher-btn" class="btn btn-ghost">📋 Partnerkód másolása</button>
        <a id="share-voucher-wa" class="btn btn-primary" target="_blank" rel="noopener noreferrer" href="#">📲 Kártya küldése vendégnek WhatsAppon</a>
      </div>
      <span id="copy-voucher-status" class="copy-status" role="status"></span>
    </div>
  </div>

  <!-- Transactions Table -->
  <div class="transactions-section">
    <div class="section-head">
      <div>
        <span class="tag mono">Elszámolás</span>
        <h3>Közvetített vásárlások és jutalékok</h3>
      </div>
    </div>
    <div class="table-responsive">
      <table class="portal-table">
        <thead>
          <tr>
            <th>Dátum</th>
            <th>Tétel / Kategória</th>
            <th>Vásárlási összeg</th>
            <th>Jutalék</th>
            <th>Állapot</th>
          </tr>
        </thead>
        <tbody id="transactions-tbody">
          <!-- Filled by JS -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Payout Action Box -->
  <div class="payout-box">
    <div class="payout-content">
      <span class="payout-icon" aria-hidden="true">🏦</span>
      <div>
        <h3>Jutalék kifizetésének kérése</h3>
        <p>A felhalmozott jutalékot készpénzben a Kossuth Lajos utcai üzletben vagy banki átutalással veheti át.</p>
      </div>
    </div>
    <a id="request-payout-btn" class="btn btn-primary payout-btn" target="_blank" rel="noopener noreferrer" href="#">Kifizetés kérése WhatsAppon &rarr;</a>
  </div>

</div>

</div>
</section>

<script is:inline>
(function() {
  const SUPABASE_URL = 'https://bezlzeojivucnqkfjpwo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M-lTei71UX1lmxv62xiNdQ_5t94kZZD';

  const FALLBACK_DB = {
    'HOTEL-01': {
      pin: '1904',
      name: 'Kempinski Hotel Corvinus Concierge',
      type: 'Hotel & Concierge Desk · 12% jutalék',
      rate: 12,
      code: 'HOTEL-01',
      guests: 18,
      sales: 2450000,
      unpaid: 294000,
      paid: 180000,
      txs: [
        { date: '2026-10-06', item: 'Férfi toszkán irhakabát (prémium)', amount: 480000, comm: 57600, status: 'Függőben' },
        { date: '2026-10-04', item: 'Női báránybőr motoros dzseki', amount: 320000, comm: 38400, status: 'Függőben' },
        { date: '2026-09-28', item: 'Női szőrmebunda és gallér', amount: 850000, comm: 102000, status: 'Kifizetve' },
        { date: '2026-09-20', item: 'Férfi klasszikus bőrdzseki + öv', amount: 280000, comm: 33600, status: 'Kifizetve' },
        { date: '2026-09-15', item: 'Egyedi méretre készített bőrkabát', amount: 520000, comm: 62400, status: 'Kifizetve' }
      ]
    },
    'GUIDE-02': {
      pin: '4821',
      name: 'Zoltán K. — Budapesti Idegenvezető',
      type: 'Idegenvezető / Tour Guide · 12% jutalék',
      rate: 12,
      code: 'GUIDE-02',
      guests: 14,
      sales: 1680000,
      unpaid: 201600,
      paid: 120000,
      txs: [
        { date: '2026-10-05', item: 'Férfi aviátor irhadzseki', amount: 420000, comm: 50400, status: 'Függőben' },
        { date: '2026-10-02', item: 'Női karcsúsított nappa dzseki', amount: 310000, comm: 37200, status: 'Függőben' },
        { date: '2026-09-25', item: 'Bőr kiegészítők, kesztyűk, táska', amount: 150000, comm: 18000, status: 'Kifizetve' },
        { date: '2026-09-18', item: 'Toszkán női irhakabát', amount: 800000, comm: 96000, status: 'Kifizetve' }
      ]
    }
  };

  const gate = document.getElementById('portal-login-gate');
  const dash = document.getElementById('portal-dashboard');
  const form = document.getElementById('portal-login-form');
  const codeInput = document.getElementById('partner-code-input');
  const pinInput = document.getElementById('partner-pin-input');
  const errorMsg = document.getElementById('portal-error-msg');
  const logoutBtn = document.getElementById('portal-logout-btn');
  const submitBtn = document.getElementById('gate-submit-btn');

  function fmtHuf(num) {
    return Number(num).toLocaleString('hu-HU') + ' HUF';
  }

  async function querySupabase(code, pin) {
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/get_partner_portal', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_code: code, p_pin: pin })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
    } catch (err) {
      // Supabase RPC pending table setup, proceed to fallback
    }
    return null;
  }

  async function handleLogin(code, pin) {
    const cleanCode = (code || '').trim().toUpperCase();
    const cleanPin = (pin || '').trim();

    if (submitBtn) submitBtn.textContent = 'Ellenőrzés...';

    // 1. Try Supabase cloud database
    let data = await querySupabase(cleanCode, cleanPin);

    // 2. Fallback to local accounts if Supabase SQL not yet executed
    if (!data && FALLBACK_DB[cleanCode] && FALLBACK_DB[cleanCode].pin === cleanPin) {
      data = FALLBACK_DB[cleanCode];
    }

    if (submitBtn) submitBtn.textContent = 'Belépés a fiókba';

    if (!data) {
      if (errorMsg) errorMsg.hidden = false;
      return;
    }

    if (errorMsg) errorMsg.hidden = true;
    localStorage.setItem('kaftan_portal_session', JSON.stringify({ code: cleanCode, pin: cleanPin }));

    // Populate dashboard
    document.getElementById('partner-display-name').textContent = data.name;
    document.getElementById('partner-display-type').textContent = data.type;
    document.getElementById('stat-guests').textContent = data.guests + ' fő';
    document.getElementById('stat-sales').textContent = fmtHuf(data.sales);
    document.getElementById('stat-unpaid').textContent = fmtHuf(data.unpaid);
    document.getElementById('stat-paid').textContent = fmtHuf(data.paid);
    document.getElementById('voucher-code-val').textContent = data.code;

    // WhatsApp payout link
    const payoutMsg = encodeURIComponent('Üdvözlöm! A(z) ' + data.code + ' partnerként (' + data.name + ') szeretném kérni a ' + fmtHuf(data.unpaid) + ' összegű felhalmozott jutalékom kifizetését készpénzben vagy átutalással.');
    document.getElementById('request-payout-btn').href = 'https://wa.me/36203593216?text=' + payoutMsg;

    // WhatsApp share voucher link
    const voucherMsg = encodeURIComponent('Kedves Vendégünk!\\n\\nSzeretettel ajánlom figyelmébe a budapesti Kaftan Angelo prémium bőr-, irha- és szőrmeboltot.\\n\\nBemutatva az alábbi partnerkódomat 10% VIP kedvezményt kap:\\nKód: ' + data.code + '\\n\\nCím: Kossuth Lajos u. 18, Budapest 1053\\nTérkép & Weboldal: https://kaftanangelo.com/');
    document.getElementById('share-voucher-wa').href = 'https://wa.me/?text=' + voucherMsg;

    // Render transactions
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = '';
    const txs = data.txs || [];
    txs.forEach(function(tx) {
      const tr = document.createElement('tr');
      const isPaid = tx.status === 'Kifizetve' || tx.status === 'Settled';
      tr.innerHTML = '<td><strong>' + tx.date + '</strong></td>' +
        '<td>' + tx.item + '</td>' +
        '<td>' + fmtHuf(tx.amount) + '</td>' +
        '<td class="accent-col"><strong>+' + fmtHuf(tx.comm) + '</strong></td>' +
        '<td><span class="badge-status ' + (isPaid ? 'paid' : 'unpaid') + '">' + tx.status + '</span></td>';
      tbody.appendChild(tr);
    });

    gate.hidden = true;
    dash.hidden = false;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    handleLogin(codeInput.value, pinInput.value);
  });

  document.querySelectorAll('.demo-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const c = btn.getAttribute('data-demo-code');
      const p = btn.getAttribute('data-demo-pin');
      codeInput.value = c;
      pinInput.value = p;
      handleLogin(c, p);
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('kaftan_portal_session');
      dash.hidden = true;
      gate.hidden = false;
      codeInput.value = '';
      pinInput.value = '';
    });
  }

  const copyBtn = document.getElementById('copy-voucher-btn');
  const copyStatus = document.getElementById('copy-voucher-status');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      const code = document.getElementById('voucher-code-val').textContent;
      navigator.clipboard.writeText(code).then(function() {
        copyStatus.textContent = 'A(z) ' + code + ' kód a vágólapra másolva!';
        setTimeout(function() { copyStatus.textContent = ''; }, 3000);
      });
    });
  }

  const saved = localStorage.getItem('kaftan_portal_session');
  if (saved) {
    try {
      const sess = JSON.parse(saved);
      if (sess && sess.code && sess.pin) {
        handleLogin(sess.code, sess.pin);
      }
    } catch(e) {}
  }
})();
</script>
"""

# EN portal HTML
portal_en_html = portal_hu_html.replace('Főoldal', 'Home') \
  .replace('Partnerprogram', 'Partner Program') \
  .replace('Partner Portál', 'Partner Portal') \
  .replace('Partner bejelentkezés', 'Partner Portal Login') \
  .replace('Adja meg partnerkódját és személyes PIN-kódját a forgalom és a kifizetési egyenleg megtekintéséhez.', 'Enter your unique partner code and personal PIN to view your referred guest transactions, earnings, and payout balance.') \
  .replace('Partnerkód (pl. HOTEL-01)', 'Partner Code (e.g. HOTEL-01)') \
  .replace('PIN-kód (pl. 1904)', 'PIN Code (e.g. 1904)') \
  .replace('Belépés a fiókba', 'Access Dashboard') \
  .replace('Érvénytelen partnerkód vagy PIN-kód. Kérjük, ellenőrizze az adatokat!', 'Invalid partner code or PIN. Please check your credentials.') \
  .replace('Gyors próba demó fiókokkal:', 'Quick test with demo partner accounts:') \
  .replace('Idegenvezető', 'Tour Specialist') \
  .replace('Kijelentkezés', 'Log Out') \
  .replace('Közvetített vendégek', 'Referred Guests') \
  .replace('Generált forgalom', 'Total Sales Volume') \
  .replace('Függőben lévő jutalék (Hak edis)', 'Pending Commission (Hak Edis)') \
  .replace('Eddig kifizetett jutalék', 'Settled Commissions') \
  .replace('10% VIP Vendégkedvezmény', '10% VIP Guest Discount') \
  .replace('📋 Partnerkód másolása', '📋 Copy Referral Code') \
  .replace('📲 Kártya küldése vendégnek WhatsAppon', '📲 Send Pass to Guest on WhatsApp') \
  .replace('Jutalék kifizetésének kérése', 'Request Commission Payout') \
  .replace('A felhalmozott jutalékot készpénzben a Kossuth Lajos utcai üzletben vagy banki átutalással veheti át.', 'Collect your balance directly at our Kossuth Lajos boutique or request a wire transfer.') \
  .replace('Kifizetés kérése WhatsAppon &rarr;', 'Request Payout on WhatsApp &rarr;') \
  .replace('Ellenőrzés...', 'Verifying...') \
  .replace('fő', 'guests')

pages['/partner-portal/']['mainHtml'] = portal_hu_html
pages['/en/partner-portal/']['mainHtml'] = portal_en_html

with open('src/data/pages.json', 'w', encoding='utf-8') as f:
    json.dump(pages, f, ensure_ascii=False, indent=2)

print("pages.json successfully configured with Supabase connection.")
