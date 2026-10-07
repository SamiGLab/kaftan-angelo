# -*- coding: utf-8 -*-
"""Adds Partner Portal and Hak Edi\u015f pages to pages.json and updates styling."""

import json

# 1. Load pages.json
with open('src/data/pages.json', 'r', encoding='utf-8') as f:
    pages = json.load(f)

# Update existing /partnerprogram/ to link to portal
if '/partnerprogram/' in pages:
    old_html = pages['/partnerprogram/']['mainHtml']
    if '/partner-portal/' not in old_html:
        portal_btn = '<div class="actions" style="margin-top:1.5rem"><a class="btn btn-primary" href="/partner-portal/">Belépés a Partner Portálra (Hak Edi\u015f &amp; Jutal\u00e9k) &rarr;</a></div>'
        pages['/partnerprogram/']['mainHtml'] = old_html.replace('</div></div></section>', f'{portal_btn}</div></div></section>', 1)

# Update existing /en/partners/ to link to portal
if '/en/partners/' in pages:
    old_en_html = pages['/en/partners/']['mainHtml']
    if '/en/partner-portal/' not in old_en_html:
        en_portal_btn = '<div class="actions" style="margin-top:1.5rem"><a class="btn btn-primary" href="/en/partner-portal/">Partner Portal Login (Commissions &amp; Payouts) &rarr;</a></div>'
        pages['/en/partners/']['mainHtml'] = old_en_html.replace('</div></div></section>', f'{en_portal_btn}</div></div></section>', 1)

# HTML for Hungarian Partner Portal
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
  <p>Adja meg egyedi partnerkódját vagy PIN-kódját a forgalom, a jutalékok és a kifizetési egyenleg megtekintéséhez.</p>
  <form id="portal-login-form" class="gate-form">
    <div class="gate-input-wrap">
      <input type="text" id="partner-code-input" class="gate-input" placeholder="Pl. HOTEL-01 vagy GUIDE-02" required autocomplete="off">
      <button type="submit" class="btn btn-primary gate-submit-btn">Belépés a fiókba</button>
    </div>
    <p id="portal-error-msg" class="gate-error" hidden>Nem található partner ezzel a kóddal. Kérjük, ellenőrizze a kódot vagy próbálja ki a demó fiókokat!</p>
  </form>

  <div class="gate-demo-pills">
    <span class="demo-label">Gyors próba demó kódokkal:</span>
    <button type="button" class="btn btn-ghost demo-btn" data-demo-code="HOTEL-01">🏨 Hotel Concierge (HOTEL-01)</button>
    <button type="button" class="btn btn-ghost demo-btn" data-demo-code="GUIDE-02">🗺️ Idegenvezető (GUIDE-02)</button>
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
            <th>Jutalék (12%)</th>
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
  const PARTNERS_DB = {
    'HOTEL-01': {
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
  const input = document.getElementById('partner-code-input');
  const errorMsg = document.getElementById('portal-error-msg');
  const logoutBtn = document.getElementById('portal-logout-btn');

  function fmtHuf(num) {
    return num.toLocaleString('hu-HU') + ' HUF';
  }

  function loadPartner(code) {
    const cleanCode = (code || '').trim().toUpperCase();
    let data = PARTNERS_DB[cleanCode];

    // If custom code, create an interactive dynamic workspace
    if (!data && cleanCode.length >= 3) {
      data = {
        name: 'Partner: ' + cleanCode,
        type: 'Regisztrált Partner · 10% jutalék',
        rate: 10,
        code: cleanCode,
        guests: 1,
        sales: 180000,
        unpaid: 18000,
        paid: 0,
        txs: [
          { date: '2026-10-07', item: 'Bőrkabát közvetítés (új partner)', amount: 180000, comm: 18000, status: 'Függőben' }
        ]
      };
    }

    if (!data) {
      if (errorMsg) errorMsg.hidden = false;
      return;
    }

    if (errorMsg) errorMsg.hidden = true;
    localStorage.setItem('kaftan_active_partner', cleanCode);

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
    data.txs.forEach(function(tx) {
      const tr = document.createElement('tr');
      const isPaid = tx.status === 'Kifizetve';
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

  // Form submit
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    loadPartner(input.value);
  });

  // Demo pills
  document.querySelectorAll('.demo-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const c = btn.getAttribute('data-demo-code');
      input.value = c;
      loadPartner(c);
    });
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('kaftan_active_partner');
      dash.hidden = true;
      gate.hidden = false;
      input.value = '';
    });
  }

  // Copy code button
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

  // Auto-login if previously active
  const saved = localStorage.getItem('kaftan_active_partner');
  if (saved) {
    loadPartner(saved);
  }
})();
</script>
"""

# HTML for English Partner Portal
portal_en_html = """
<section class="page-hero" style="--hero:url('/assets/images/kaftan-angelo-hero-leather-collection-800.avif');--hero-mobile:url('/assets/images/kaftan-angelo-hero-leather-collection-480.avif')">
<div class="wrap">
<div class="breadcrumbs"><a href="/en/">Home</a> / <a href="/en/partners/">Partner Program</a> / Partner Portal</div>
<span class="tag mono">Kaftan Angelo · B2B &amp; Concierge Partners</span>
<h1>Partner &amp; Concierge Portal</h1>
<p>Track your referred hotel guests, generated sales, and real-time commission payouts for our Budapest boutique.</p>
</div>
</section>

<section class="portal-section">
<div class="wrap">

<!-- Login Gate -->
<div class="portal-gate-card" id="portal-login-gate">
  <div class="gate-icon" aria-hidden="true">🔑</div>
  <h2>Partner Portal Login</h2>
  <p>Enter your unique partner code or PIN to view your referred guest transactions, earnings, and payout requests.</p>
  <form id="portal-login-form" class="gate-form">
    <div class="gate-input-wrap">
      <input type="text" id="partner-code-input" class="gate-input" placeholder="e.g. HOTEL-01 or GUIDE-02" required autocomplete="off">
      <button type="submit" class="btn btn-primary gate-submit-btn">Access Dashboard</button>
    </div>
    <p id="portal-error-msg" class="gate-error" hidden>No partner found with this code. Please check your code or try the demo accounts below!</p>
  </form>

  <div class="gate-demo-pills">
    <span class="demo-label">Quick test with demo partner accounts:</span>
    <button type="button" class="btn btn-ghost demo-btn" data-demo-code="HOTEL-01">🏨 Hotel Concierge (HOTEL-01)</button>
    <button type="button" class="btn btn-ghost demo-btn" data-demo-code="GUIDE-02">🗺️ Tour Specialist (GUIDE-02)</button>
  </div>
</div>

<!-- Logged In Dashboard -->
<div class="portal-dashboard" id="portal-dashboard" hidden>
  <div class="dashboard-top-bar">
    <div>
      <span class="badge-status active">● Active Partner Status</span>
      <h2 id="partner-display-name" class="dashboard-partner-title">Partner Account</h2>
      <p id="partner-display-type" class="dashboard-partner-sub">Hotel &amp; Concierge</p>
    </div>
    <div class="dashboard-actions">
      <button type="button" id="portal-logout-btn" class="btn btn-ghost">Log Out</button>
    </div>
  </div>

  <!-- Stat Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-icon" aria-hidden="true">👥</span>
      <span class="stat-label">Referred Guests</span>
      <strong id="stat-guests" class="stat-val">0 guests</strong>
      <span class="stat-sub">Showroom visits</span>
    </div>
    <div class="stat-card">
      <span class="stat-icon" aria-hidden="true">🛍️</span>
      <span class="stat-label">Total Sales Volume</span>
      <strong id="stat-sales" class="stat-val">0 HUF</strong>
      <span class="stat-sub">Purchases completed</span>
    </div>
    <div class="stat-card highlight">
      <span class="stat-icon" aria-hidden="true">💰</span>
      <span class="stat-label">Pending Commission (Hak Edis)</span>
      <strong id="stat-unpaid" class="stat-val accent">0 HUF</strong>
      <span class="stat-sub">Available for payout</span>
    </div>
    <div class="stat-card">
      <span class="stat-icon" aria-hidden="true">✅</span>
      <span class="stat-label">Settled Commissions</span>
      <strong id="stat-paid" class="stat-val">0 HUF</strong>
      <span class="stat-sub">Transferred or cash settled</span>
    </div>
  </div>

  <!-- Digital VIP Voucher Card -->
  <div class="vip-voucher-section">
    <div class="vip-voucher-box">
      <div class="voucher-header">
        <span class="voucher-brand">Kaftan Angelo · Budapest</span>
        <span class="voucher-badge">10% VIP Guest Discount</span>
      </div>
      <div class="voucher-body">
        <p class="voucher-desc">Share this digital pass with your hotel or tour guests via WhatsApp. Guests receive an exclusive 10% in-store discount, and purchases are automatically credited to your account.</p>
        <div class="voucher-code-wrap">
          <span class="voucher-code-label">Your Referral Code:</span>
          <strong id="voucher-code-val" class="voucher-code-text">HOTEL-01</strong>
        </div>
        <p class="voucher-address">📍 Kossuth Lajos u. 18, Budapest 1053 (Astoria — Ferenciek tere)</p>
      </div>
      <div class="voucher-actions">
        <button type="button" id="copy-voucher-btn" class="btn btn-ghost">📋 Copy Referral Code</button>
        <a id="share-voucher-wa" class="btn btn-primary" target="_blank" rel="noopener noreferrer" href="#">📲 Send Pass to Guest on WhatsApp</a>
      </div>
      <span id="copy-voucher-status" class="copy-status" role="status"></span>
    </div>
  </div>

  <!-- Transactions Table -->
  <div class="transactions-section">
    <div class="section-head">
      <div>
        <span class="tag mono">Ledger</span>
        <h3>Referred Purchases &amp; Commissions</h3>
      </div>
    </div>
    <div class="table-responsive">
      <table class="portal-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Item / Category</th>
            <th>Sale Amount</th>
            <th>Commission (12%)</th>
            <th>Status</th>
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
        <h3>Request Commission Payout</h3>
        <p>Collect your balance directly at our Kossuth Lajos boutique or request a wire transfer.</p>
      </div>
    </div>
    <a id="request-payout-btn" class="btn btn-primary payout-btn" target="_blank" rel="noopener noreferrer" href="#">Request Payout on WhatsApp &rarr;</a>
  </div>

</div>

</div>
</section>

<script is:inline>
(function() {
  const PARTNERS_DB = {
    'HOTEL-01': {
      name: 'Kempinski Hotel Corvinus Concierge',
      type: 'Hotel & Concierge Desk · 12% commission',
      rate: 12,
      code: 'HOTEL-01',
      guests: 18,
      sales: 2450000,
      unpaid: 294000,
      paid: 180000,
      txs: [
        { date: '2026-10-06', item: "Men's Tuscan Shearling Coat", amount: 480000, comm: 57600, status: 'Pending' },
        { date: '2026-10-04', item: "Women's Lambskin Biker Jacket", amount: 320000, comm: 38400, status: 'Pending' },
        { date: '2026-09-28', item: "Women's Luxury Fur Coat", amount: 850000, comm: 102000, status: 'Settled' },
        { date: '2026-09-20', item: "Men's Classic Leather Jacket & Belt", amount: 280000, comm: 33600, status: 'Settled' },
        { date: '2026-09-15', item: 'Bespoke Custom Tailored Jacket', amount: 520000, comm: 62400, status: 'Settled' }
      ]
    },
    'GUIDE-02': {
      name: 'Zolt\u00e1n K. \u2014 Budapest Tour Specialist',
      type: 'Private Guide / Tour Leader \u00b7 12% commission',
      rate: 12,
      code: 'GUIDE-02',
      guests: 14,
      sales: 1680000,
      unpaid: 201600,
      paid: 120000,
      txs: [
        { date: '2026-10-05', item: "Men's Aviator Shearling Jacket", amount: 420000, comm: 50400, status: 'Pending' },
        { date: '2026-10-02', item: "Women's Tailored Nappa Jacket", amount: 310000, comm: 37200, status: 'Pending' },
        { date: '2026-09-25', item: 'Leather Accessories & Gloves', amount: 150000, comm: 18000, status: 'Settled' },
        { date: '2026-09-18', item: "Women's Tuscan Shearling Coat", amount: 800000, comm: 96000, status: 'Settled' }
      ]
    }
  };

  const gate = document.getElementById('portal-login-gate');
  const dash = document.getElementById('portal-dashboard');
  const form = document.getElementById('portal-login-form');
  const input = document.getElementById('partner-code-input');
  const errorMsg = document.getElementById('portal-error-msg');
  const logoutBtn = document.getElementById('portal-logout-btn');

  function fmtHuf(num) {
    return num.toLocaleString('en-US') + ' HUF';
  }

  function loadPartner(code) {
    const cleanCode = (code || '').trim().toUpperCase();
    let data = PARTNERS_DB[cleanCode];

    if (!data && cleanCode.length >= 3) {
      data = {
        name: 'Partner: ' + cleanCode,
        type: 'Registered Partner \u00b7 10% commission',
        rate: 10,
        code: cleanCode,
        guests: 1,
        sales: 180000,
        unpaid: 18000,
        paid: 0,
        txs: [
          { date: '2026-10-07', item: 'Leather outerwear referral', amount: 180000, comm: 18000, status: 'Pending' }
        ]
      };
    }

    if (!data) {
      if (errorMsg) errorMsg.hidden = false;
      return;
    }

    if (errorMsg) errorMsg.hidden = true;
    localStorage.setItem('kaftan_active_partner', cleanCode);

    document.getElementById('partner-display-name').textContent = data.name;
    document.getElementById('partner-display-type').textContent = data.type;
    document.getElementById('stat-guests').textContent = data.guests + ' guests';
    document.getElementById('stat-sales').textContent = fmtHuf(data.sales);
    document.getElementById('stat-unpaid').textContent = fmtHuf(data.unpaid);
    document.getElementById('stat-paid').textContent = fmtHuf(data.paid);
    document.getElementById('voucher-code-val').textContent = data.code;

    const payoutMsg = encodeURIComponent('Hello! As partner ' + data.code + ' (' + data.name + '), I would like to request my accrued commission payout of ' + fmtHuf(data.unpaid) + '.');
    document.getElementById('request-payout-btn').href = 'https://wa.me/36203593216?text=' + payoutMsg;

    const voucherMsg = encodeURIComponent('Dear Guest,\\n\\nI warmly recommend visiting Kaftan Angelo in downtown Budapest for authentic genuine leather, shearling, and fur coats.\\n\\nPresent my referral code for an exclusive 10% VIP discount:\\nCode: ' + data.code + '\\n\\nAddress: Kossuth Lajos u. 18, Budapest 1053\\nDirections & Website: https://kaftanangelo.com/en/');
    document.getElementById('share-voucher-wa').href = 'https://wa.me/?text=' + voucherMsg;

    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = '';
    data.txs.forEach(function(tx) {
      const tr = document.createElement('tr');
      const isPaid = tx.status === 'Settled';
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
    loadPartner(input.value);
  });

  document.querySelectorAll('.demo-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const c = btn.getAttribute('data-demo-code');
      input.value = c;
      loadPartner(c);
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('kaftan_active_partner');
      dash.hidden = true;
      gate.hidden = false;
      input.value = '';
    });
  }

  const copyBtn = document.getElementById('copy-voucher-btn');
  const copyStatus = document.getElementById('copy-voucher-status');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      const code = document.getElementById('voucher-code-val').textContent;
      navigator.clipboard.writeText(code).then(function() {
        copyStatus.textContent = 'Code ' + code + ' copied to clipboard!';
        setTimeout(function() { copyStatus.textContent = ''; }, 3000);
      });
    });
  }

  const saved = localStorage.getItem('kaftan_active_partner');
  if (saved) {
    loadPartner(saved);
  }
})();
</script>
"""

# Register in pages.json
pages['/partner-portal/'] = {
    "path": "/partner-portal/",
    "lang": "hu",
    "title": "Partner & Concierge Portál | Kaftan Angelo Budapest",
    "description": "Közvetített vendégek, forgalom és valós idejű jutalék (hak edis) elszámolása budapesti turisztikai partnereink számára.",
    "canonical": "https://kaftanangelo.com/partner-portal/",
    "ogImage": "https://kaftanangelo.com/kaftan-angelo-hero-leather-collection.webp",
    "counterpart": "/en/partner-portal/",
    "mainHtml": portal_hu_html,
    "pageSchema": {
        "@type": "WebPage",
        "name": "Partner Portál",
        "url": "https://kaftanangelo.com/partner-portal/",
        "inLanguage": "hu",
        "isPartOf": { "@id": "https://kaftanangelo.com/#website" },
        "about": { "@id": "https://kaftanangelo.com/#store" }
    },
    "breadcrumbs": [
        { "name": "Főoldal", "url": "/" },
        { "name": "Partnerprogram", "url": "/partnerprogram/" },
        { "name": "Partner Portál", "url": "/partner-portal/" }
    ]
}

pages['/en/partner-portal/'] = {
    "path": "/en/partner-portal/",
    "lang": "en",
    "title": "Partner & Concierge Portal | Kaftan Angelo Budapest",
    "description": "Real-time referred guest tracking, commissions and payout portal for hotel concierges and tour specialists in Budapest.",
    "canonical": "https://kaftanangelo.com/en/partner-portal/",
    "ogImage": "https://kaftanangelo.com/kaftan-angelo-hero-leather-collection.webp",
    "counterpart": "/partner-portal/",
    "mainHtml": portal_en_html,
    "pageSchema": {
        "@type": "WebPage",
        "name": "Partner Portal",
        "url": "https://kaftanangelo.com/en/partner-portal/",
        "inLanguage": "en",
        "isPartOf": { "@id": "https://kaftanangelo.com/#website" },
        "about": { "@id": "https://kaftanangelo.com/#store" }
    },
    "breadcrumbs": [
        { "name": "Home", "url": "/en/" },
        { "name": "Partners", "url": "/en/partners/" },
        { "name": "Partner Portal", "url": "/en/partner-portal/" }
    ]
}

with open('src/data/pages.json', 'w', encoding='utf-8') as f:
    json.dump(pages, f, ensure_ascii=False, indent=2)

print("pages.json updated with /partner-portal/ and /en/partner-portal/")
