# -*- coding: utf-8 -*-
"""Masterpiece 5-Star Hotel Concierge & VIP Partner Portal for Kaftan Angelo.
Completely clean: 100% genuine Hungarian for HU, 100% polished British/International English for EN.
Zero Turkish leaks. Zero cross-language contamination.
"""

import json

with open('src/data/pages.json', 'r', encoding='utf-8') as f:
    pages = json.load(f)

# 1. Clean /partnerprogram/ button text if it had Turkish
if '/partnerprogram/' in pages:
    old_html = pages['/partnerprogram/']['mainHtml']
    # Remove any previous button with 'Hak Ediş'
    old_html = old_html.replace('Belépés a Partner Portálra (Hak Ediş &amp; Jutalék)', 'Belépés a Partner Portálra (Jutalék &amp; Elszámolás)')
    old_html = old_html.replace('Belépés a Partner Portálra (Hak Ediş & Jutalék)', 'Belépés a Partner Portálra (Jutalék &amp; Elszámolás)')
    if '/partner-portal/' not in old_html:
        portal_btn = '<div class="actions" style="margin-top:1.5rem"><a class="btn btn-primary" href="/partner-portal/">Belépés a Partner Portálra (Jutalék &amp; Elszámolás) &rarr;</a></div>'
        old_html = old_html.replace('</div></div></section>', f'{portal_btn}</div></div></section>', 1)
    pages['/partnerprogram/']['mainHtml'] = old_html

# 2. Clean /en/partners/ button text
if '/en/partners/' in pages:
    old_en_html = pages['/en/partners/']['mainHtml']
    if '/en/partner-portal/' not in old_en_html:
        en_portal_btn = '<div class="actions" style="margin-top:1.5rem"><a class="btn btn-primary" href="/en/partner-portal/">Partner Portal Login (Commissions &amp; Payouts) &rarr;</a></div>'
        old_en_html = old_en_html.replace('</div></div></section>', f'{en_portal_btn}</div></div></section>', 1)
    pages['/en/partners/']['mainHtml'] = old_en_html

# ==============================================================================
# HUNGARIAN PORTAL HTML (100% Natural Hungarian)
# ==============================================================================
portal_hu_html = """
<link rel="stylesheet" href="/assets/css/portal.css">
<section class="page-hero" style="--hero:url('/assets/images/kaftan-angelo-hero-leather-collection-800.avif');--hero-mobile:url('/assets/images/kaftan-angelo-hero-leather-collection-480.avif')">
<div class="wrap">
<div class="breadcrumbs"><a href="/">Főoldal</a> / <a href="/partnerprogram/">Partnerprogram</a> / Partner Portál</div>
<span class="tag mono">Kaftan Angelo · Five-Star Concierge &amp; VIP Club</span>
<h1>Partner &amp; Concierge Portál</h1>
<p>Közvetített vendégek, vásárlások és valós idejű jutalék egyenleg nyomon követése budapesti partnereink számára.</p>
</div>
</section>

<section class="portal-section">
<div class="wrap">

<!-- Login Gate -->
<div class="portal-gate-card" id="portal-login-gate">
  <div class="gate-badge-pill">🔒 Biztonságos Partner Belépés</div>
  <h2>Partner Fiók Belépés</h2>
  <p>Adja meg az Önnek kiállított egyedi partnerkódot és PIN-kódot a jutalék egyenleg és elszámolások megtekintéséhez.</p>

  <form id="portal-login-form" class="gate-form">
    <div class="gate-field">
      <label for="partner-code-input">Partner azonosító kód</label>
      <div class="gate-input-wrapper">
        <span class="gate-input-icon" aria-hidden="true">🏷️</span>
        <input type="text" id="partner-code-input" class="gate-input" placeholder="pl. HOTEL-01" required autocomplete="username">
      </div>
    </div>

    <div class="gate-field">
      <label for="partner-pin-input">Személyes PIN-kód</label>
      <div class="gate-input-wrapper">
        <span class="gate-input-icon" aria-hidden="true">🔑</span>
        <input type="password" id="partner-pin-input" class="gate-input" placeholder="••••" required autocomplete="current-password">
      </div>
    </div>

    <p id="portal-error-msg" class="gate-error" hidden>⚠️ Érvénytelen partnerkód vagy PIN-kód. Kérjük, ellenőrizze az adatokat!</p>

    <button type="submit" class="gate-submit-btn" id="gate-submit-btn">Belépés a Fiókba &rarr;</button>
  </form>

  <div class="gate-demo-pills">
    <span class="demo-label">Gyors próba demó fiókokkal:</span>
    <button type="button" class="demo-btn" data-demo-code="HOTEL-01" data-demo-pin="1904">
      <span>🏨 Four Seasons Hotel Concierge</span>
      <span class="mono" style="opacity:0.75">HOTEL-01 / PIN: 1904</span>
    </button>
    <button type="button" class="demo-btn" data-demo-code="GUIDE-02" data-demo-pin="4821">
      <span>🗺️ Budapesti Idegenvezető</span>
      <span class="mono" style="opacity:0.75">GUIDE-02 / PIN: 4821</span>
    </button>
  </div>
</div>

<!-- Logged In Dashboard -->
<div class="portal-dashboard" id="portal-dashboard" hidden>

  <!-- Partner Header Profile -->
  <div class="dashboard-hero-card">
    <div class="dashboard-partner-meta">
      <span class="badge-status active">● Aktív B2B Partner Státusz</span>
      <h2 id="partner-display-name" class="dashboard-partner-title">Partner Fiók</h2>
      <p id="partner-display-type" class="dashboard-partner-sub">Hotel Concierge</p>
    </div>
    <div class="dashboard-actions">
      <button type="button" id="portal-logout-btn" class="btn btn-ghost" style="border-radius:12px; padding:0.65rem 1.4rem;">Kijelentkezés</button>
    </div>
  </div>

  <!-- 4-Stat Metric Grid -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Közvetített vendégek</span>
        <span class="stat-icon" aria-hidden="true">👥</span>
      </div>
      <strong id="stat-guests" class="stat-val">0 fő</strong>
      <span class="stat-sub">Sikeres bolti vásárlás</span>
    </div>

    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Generált forgalom</span>
        <span class="stat-icon" aria-hidden="true">🛍️</span>
      </div>
      <strong id="stat-sales" class="stat-val">0 HUF</strong>
      <span class="stat-sub">Összes vásárlási érték</span>
    </div>

    <div class="stat-card highlight">
      <div class="stat-header">
        <span class="stat-label" style="color:var(--bright);">Függőben lévő jutalék</span>
        <span class="stat-icon" aria-hidden="true">💰</span>
      </div>
      <strong id="stat-unpaid" class="stat-val accent">0 HUF</strong>
      <span class="stat-sub" style="color:#ffd8a8;">Azonnal kifizethető egyenleg</span>
    </div>

    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Kifizetett jutalék</span>
        <span class="stat-icon" aria-hidden="true">✅</span>
      </div>
      <strong id="stat-paid" class="stat-val">0 HUF</strong>
      <span class="stat-sub">Korábban rendezve</span>
    </div>
  </div>

  <!-- Actions Grid: VIP Concierge Pass + Instant Payout -->
  <div class="portal-actions-grid">

    <!-- Luxury Apple Wallet Style Concierge Pass -->
    <div class="vip-pass-card">
      <div class="vip-pass-top">
        <div class="vip-pass-brand">
          <span class="vip-brand-name">Kaftan Angelo</span>
          <span class="vip-brand-city">Budapest · Luxury Outerwear</span>
        </div>
        <span class="vip-pass-pill">10% VIP Guest Pass</span>
      </div>

      <div class="vip-pass-body">
        <p class="vip-pass-desc">Mutassa be ezt a kártyát vendégének vagy küldje el WhatsAppon. A vásárló <strong>10% exkluzív VIP kedvezményt</strong> kap az üzletben, a vásárlás pedig automatikusan az Ön jutalékához íródik.</p>

        <div class="vip-pass-voucher-strip">
          <div class="vip-strip-info">
            <span class="vip-strip-label">Az Ön Hivatalos VIP Kódja:</span>
            <strong id="voucher-code-val" class="vip-strip-code">HOTEL-01</strong>
          </div>
          <button type="button" id="copy-voucher-btn" class="btn btn-ghost" style="padding:0.6rem 1.1rem; border-radius:10px;">📋 Kód Másolása</button>
        </div>

        <p class="vip-pass-address">📍 Kossuth Lajos u. 18, Budapest 1053 (Astoria — Ferenciek tere)</p>
      </div>

      <div class="vip-pass-actions">
        <a id="share-voucher-wa" class="btn-luxury-wa" target="_blank" rel="noopener noreferrer" href="#">📲 VIP Kártya Küldése Vendégnek WhatsAppon</a>
      </div>
      <span id="copy-voucher-status" class="copy-status" role="status"></span>
    </div>

    <!-- Payout Request Card -->
    <div class="payout-card">
      <div>
        <div class="payout-header">
          <div class="payout-icon-wrap" aria-hidden="true">🏦</div>
          <div>
            <h3>Jutalék Kifizetése</h3>
            <p>A felhalmozott jutalékot készpénzben a Kossuth Lajos utcai üzletben vagy banki átutalással veheti át.</p>
          </div>
        </div>
      </div>

      <div class="payout-summary-box">
        <span class="payout-summary-label">Jelenlegi igényelhető egyenleg:</span>
        <strong id="payout-amount-preview" class="payout-summary-val">0 HUF</strong>
      </div>

      <a id="request-payout-btn" class="btn-payout-wa" target="_blank" rel="noopener noreferrer" href="#">Kifizetés kérése WhatsAppon &rarr;</a>
    </div>

  </div>

  <!-- Official B2B Partnership Agreement Card -->
  <div class="contract-card">
    <div class="contract-header">
      <div class="contract-header-text">
        <span class="tag mono">Hivatalos B2B Dokumentáció · Bilateral B2B Agreement</span>
        <h3>Partneri Megállapodás &amp; Általános Feltételek</h3>
        <p>A Kaftan Angelo Luxury Outerwear és az Ön intézménye közötti hivatalos kétnyelvű (magyar és angol) együttműködési szerződés.</p>
      </div>
      <div class="contract-badge">● Érvényes &amp; Hitelesített Megállapodás</div>
    </div>

    <div class="contract-preview-grid">
      <div>
        <div class="contract-col-title">🇭🇺 Magyar Nyelvű Záradék</div>
        <ul class="contract-clause-list">
          <li><span>✓</span> <div><strong>10% VIP Vendégkedvezmény:</strong> Minden közvetített szállóvendég azonnali 10% kedvezményt kap az üzletben az Ön partnerkódjával.</div></li>
          <li><span>✓</span> <div><strong>10% Partneri Jutalék:</strong> A közvetített vásárlások nettó összege után 10% jutalék jár, mely készpénzben vagy banki átutalással kérhető.</div></li>
          <li><span>✓</span> <div><strong>VIP Kiszolgálás:</strong> Személyes méretre igazítás, prémium kávé és transzfer koordináció a Kossuth Lajos utcai szalonban.</div></li>
        </ul>
      </div>

      <div>
        <div class="contract-col-title">🇬🇧 English Bilateral Clause</div>
        <ul class="contract-clause-list">
          <li><span>✓</span> <div><strong>10% VIP Guest Privilege:</strong> All referred hotel guests receive an exclusive 10% in-store savings upon presenting your VIP code.</div></li>
          <li><span>✓</span> <div><strong>10% Partner Commission:</strong> A 10% commission is earned on completed boutique purchases, payable via instant cash or bank wire.</div></li>
          <li><span>✓</span> <div><strong>Boutique Hospitality:</strong> Bespoke tailoring adjustments, VIP concierge lounge reception &amp; multilingual service in Budapest.</div></li>
        </ul>
      </div>
    </div>

    <div class="contract-action-bar">
      <span class="contract-secure-note">🔒 Hitelesített, titkosított Supabase tárolóból származó hivatalos PDF példány.</span>
      <a id="contract-download-link" class="btn btn-primary" target="_blank" rel="noopener noreferrer" href="https://bezlzeojivucnqkfjpwo.supabase.co/storage/v1/object/sign/partner-contracts/b2b-contract.pdf?token=eyJraWQiOiJmZWIxYzExNS0xM2ZlLTRhODYtYThiOC01MWM4N2ZmMjNkMjciLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJwYXJ0bmVyLWNvbnRyYWN0cy9iMmItY29udHJhY3QucGRmIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MTM5MDAyNywiZXhwIjoxODIyOTI2MDI3fQ.7NDbvw2memZll3qPq3bn8IrBUUOzzV1kS2PHpXImlvZA5kCeTRsBC6Qv5-Hrg6ab2gvmEkRdrKsyHOyK4iVJDw">📄 Hivatalos Szerződés Letöltése (Kétnyelvű PDF) &rarr;</a>
    </div>
  </div>

  <!-- Financial Ledger / Transactions Section -->
  <div class="transactions-section">
    <div class="transactions-header">
      <div>
        <span class="tag mono" style="margin-bottom:0.3rem;">Elszámolás</span>
        <h3>Közvetített Vásárlások &amp; Jutalékok</h3>
      </div>
      <span class="badge-status active">Valós idejű szinkronizáció</span>
    </div>

    <div class="table-responsive">
      <table class="portal-table">
        <thead>
          <tr>
            <th>Dátum</th>
            <th>Tétel / Vásárlás</th>
            <th>Vásárlási Összeg</th>
            <th>Jutalék (10%)</th>
            <th>Állapot</th>
          </tr>
        </thead>
        <tbody id="transactions-tbody">
          <!-- Populated by JS -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- 4-Step Partner Guide -->
  <div class="portal-guide-section">
    <h3 class="portal-guide-title">Hogyan működik a partnerség?</h3>
    <div class="guide-steps-grid">
      <div class="guide-step-card">
        <span class="guide-step-num">01</span>
        <h4>Ajánlja a butikot</h4>
        <p>Küldje el a fenti VIP kártyát vendégének WhatsAppon vagy említse meg a belvárosi Kossuth Lajos utcai üzletet.</p>
      </div>
      <div class="guide-step-card">
        <span class="guide-step-num">02</span>
        <h4>10% VIP Kedvezmény</h4>
        <p>A vendég bemutatja az Ön partnerkódját és azonnali 10% kedvezményben részesül minden prémium bőrkabátból és bundából.</p>
      </div>
      <div class="guide-step-card">
        <span class="guide-step-num">03</span>
        <h4>Azonnali Jóváírás</h4>
        <p>A sikeres bolti vásárlás automatikusan rögzítésre kerül az Ön fiókjában, jutaléka valós időben megjelenik.</p>
      </div>
      <div class="guide-step-card">
        <span class="guide-step-num">04</span>
        <h4>Gyors Kifizetés</h4>
        <p>A felhalmozott jutalék összegét bármikor kikérheti készpénzben a boltban vagy azonnali banki átutalással.</p>
      </div>
    </div>
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
      name: 'Four Seasons Hotel Gresham Palace Concierge',
      type: 'Hotel Concierge',
      code: 'HOTEL-01',
      guests: 2,
      sales: 1300000,
      unpaid: 82000,
      paid: 48000,
      txs: [
        { date: '2026.10.04', item: 'Női Toszkán Irhabunda (Hosszú)', amount: 820000, comm: 82000, status: 'Függőben' },
        { date: '2026.09.28', item: 'Férfi Báránybőr Pilótakabát', amount: 480000, comm: 48000, status: 'Kifizetve' }
      ]
    },
    'GUIDE-02': {
      pin: '4821',
      name: 'Kovács Péter – Luxury Budapest Tours',
      type: 'Idegenvezető',
      code: 'GUIDE-02',
      guests: 2,
      sales: 730000,
      unpaid: 73000,
      paid: 0,
      txs: [
        { date: '2026.10.05', item: 'Férfi Báránybőr Motoros Dzseki', amount: 420000, comm: 42000, status: 'Függőben' },
        { date: '2026.10.02', item: 'Női Karcsúsított Nappa Bőrkabát', amount: 310000, comm: 31000, status: 'Függőben' }
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
      // Supabase RPC fallback
    }
    return null;
  }

  async function handleLogin(code, pin) {
    const cleanCode = (code || '').trim().toUpperCase();
    const cleanPin = (pin || '').trim();

    if (submitBtn) submitBtn.textContent = 'Ellenőrzés...';

    // 1. Try Supabase cloud database
    let data = await querySupabase(cleanCode, cleanPin);

    // 2. Fallback to local accounts if Supabase not populated
    if (!data && FALLBACK_DB[cleanCode] && FALLBACK_DB[cleanCode].pin === cleanPin) {
      data = FALLBACK_DB[cleanCode];
    }

    if (submitBtn) submitBtn.textContent = 'Belépés a Fiókba →';

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

    const payoutPreview = document.getElementById('payout-amount-preview');
    if (payoutPreview) payoutPreview.textContent = fmtHuf(data.unpaid);

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
    if (txs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty-state"><div class="table-empty-icon">📋</div><div>Még nincs rögzített vásárlási tranzakció. Amint vendége vásárol a kóddal, azonnal itt fog megjelenni!</div></td></tr>';
    } else {
      txs.forEach(function(tx) {
        const tr = document.createElement('tr');
        const isPaid = tx.status === 'Kifizetve' || tx.status === 'Settled';
        tr.innerHTML = '<td><strong>' + tx.date + '</strong></td>' +
          '<td>' + tx.item + '</td>' +
          '<td>' + fmtHuf(tx.amount) + '</td>' +
          '<td class="accent-col">+' + fmtHuf(tx.comm) + '</td>' +
          '<td><span class="badge-status ' + (isPaid ? 'paid' : 'unpaid') + '">' + tx.status + '</span></td>';
        tbody.appendChild(tr);
      });
    }

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

# ==============================================================================
# ENGLISH PORTAL HTML (100% British / International Luxury English)
# ==============================================================================
portal_en_html = """
<link rel="stylesheet" href="/assets/css/portal.css">
<section class="page-hero" style="--hero:url('/assets/images/kaftan-angelo-hero-leather-collection-800.avif');--hero-mobile:url('/assets/images/kaftan-angelo-hero-leather-collection-480.avif')">
<div class="wrap">
<div class="breadcrumbs"><a href="/en/">Home</a> / <a href="/en/partners/">Partner Program</a> / Concierge Portal</div>
<span class="tag mono">Kaftan Angelo · Five-Star Concierge &amp; VIP Club</span>
<h1>Partner &amp; Concierge Portal</h1>
<p>Track referred guest purchases, live commission earnings, and payout balance for Budapest hospitality partners.</p>
</div>
</section>

<section class="portal-section">
<div class="wrap">

<!-- Login Gate -->
<div class="portal-gate-card" id="portal-login-gate">
  <div class="gate-badge-pill">🔒 Secure Concierge Portal</div>
  <h2>Partner Portal Login</h2>
  <p>Enter your unique partner referral code and personal PIN to view your referred guest purchases, commission balance, and statements.</p>

  <form id="portal-login-form" class="gate-form">
    <div class="gate-field">
      <label for="partner-code-input">Partner Referral Code</label>
      <div class="gate-input-wrapper">
        <span class="gate-input-icon" aria-hidden="true">🏷️</span>
        <input type="text" id="partner-code-input" class="gate-input" placeholder="e.g. HOTEL-01" required autocomplete="username">
      </div>
    </div>

    <div class="gate-field">
      <label for="partner-pin-input">Personal Security PIN</label>
      <div class="gate-input-wrapper">
        <span class="gate-input-icon" aria-hidden="true">🔑</span>
        <input type="password" id="partner-pin-input" class="gate-input" placeholder="••••" required autocomplete="current-password">
      </div>
    </div>

    <p id="portal-error-msg" class="gate-error" hidden>⚠️ Invalid partner referral code or PIN. Please verify your credentials.</p>

    <button type="submit" class="gate-submit-btn" id="gate-submit-btn">Access Partner Dashboard &rarr;</button>
  </form>

  <div class="gate-demo-pills">
    <span class="demo-label">Quick test with demo partner accounts:</span>
    <button type="button" class="demo-btn" data-demo-code="HOTEL-01" data-demo-pin="1904">
      <span>🏨 Four Seasons Hotel Concierge</span>
      <span class="mono" style="opacity:0.75">HOTEL-01 / PIN: 1904</span>
    </button>
    <button type="button" class="demo-btn" data-demo-code="GUIDE-02" data-demo-pin="4821">
      <span>🗺️ Budapest Tour Specialist</span>
      <span class="mono" style="opacity:0.75">GUIDE-02 / PIN: 4821</span>
    </button>
  </div>
</div>

<!-- Logged In Dashboard -->
<div class="portal-dashboard" id="portal-dashboard" hidden>

  <!-- Partner Header Profile -->
  <div class="dashboard-hero-card">
    <div class="dashboard-partner-meta">
      <span class="badge-status active">● Active B2B Partner Status</span>
      <h2 id="partner-display-name" class="dashboard-partner-title">Partner Account</h2>
      <p id="partner-display-type" class="dashboard-partner-sub">Hotel Concierge</p>
    </div>
    <div class="dashboard-actions">
      <button type="button" id="portal-logout-btn" class="btn btn-ghost" style="border-radius:12px; padding:0.65rem 1.4rem;">Log Out</button>
    </div>
  </div>

  <!-- 4-Stat Metric Grid -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Referred Guests</span>
        <span class="stat-icon" aria-hidden="true">👥</span>
      </div>
      <strong id="stat-guests" class="stat-val">0 guests</strong>
      <span class="stat-sub">Completed boutique sales</span>
    </div>

    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Total Sales Volume</span>
        <span class="stat-icon" aria-hidden="true">🛍️</span>
      </div>
      <strong id="stat-sales" class="stat-val">0 HUF</strong>
      <span class="stat-sub">Total purchase value</span>
    </div>

    <div class="stat-card highlight">
      <div class="stat-header">
        <span class="stat-label" style="color:var(--bright);">Pending Commission</span>
        <span class="stat-icon" aria-hidden="true">💰</span>
      </div>
      <strong id="stat-unpaid" class="stat-val accent">0 HUF</strong>
      <span class="stat-sub" style="color:#ffd8a8;">Available for payout</span>
    </div>

    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Settled Commissions</span>
        <span class="stat-icon" aria-hidden="true">✅</span>
      </div>
      <strong id="stat-paid" class="stat-val">0 HUF</strong>
      <span class="stat-sub">Previously settled</span>
    </div>
  </div>

  <!-- Actions Grid: VIP Concierge Pass + Instant Payout -->
  <div class="portal-actions-grid">

    <!-- Luxury Apple Wallet Style Concierge Pass -->
    <div class="vip-pass-card">
      <div class="vip-pass-top">
        <div class="vip-pass-brand">
          <span class="vip-brand-name">Kaftan Angelo</span>
          <span class="vip-brand-city">Budapest · Luxury Outerwear</span>
        </div>
        <span class="vip-pass-pill">10% VIP Guest Pass</span>
      </div>

      <div class="vip-pass-body">
        <p class="vip-pass-desc">Share this pass with your hotel guests or tour groups. Visitors receive an <strong>exclusive 10% VIP discount</strong> in store, and commissions are credited to your account automatically.</p>

        <div class="vip-pass-voucher-strip">
          <div class="vip-strip-info">
            <span class="vip-strip-label">Your Official VIP Code:</span>
            <strong id="voucher-code-val" class="vip-strip-code">HOTEL-01</strong>
          </div>
          <button type="button" id="copy-voucher-btn" class="btn btn-ghost" style="padding:0.6rem 1.1rem; border-radius:10px;">📋 Copy Code</button>
        </div>

        <p class="vip-pass-address">📍 Kossuth Lajos u. 18, Budapest 1053 (Astoria — Ferenciek tere)</p>
      </div>

      <div class="vip-pass-actions">
        <a id="share-voucher-wa" class="btn-luxury-wa" target="_blank" rel="noopener noreferrer" href="#">📲 Send VIP Pass via WhatsApp</a>
      </div>
      <span id="copy-voucher-status" class="copy-status" role="status"></span>
    </div>

    <!-- Payout Request Card -->
    <div class="payout-card">
      <div>
        <div class="payout-header">
          <div class="payout-icon-wrap" aria-hidden="true">🏦</div>
          <div>
            <h3>Commission Payout</h3>
            <p>Collect your accrued balance in cash at our Kossuth Lajos boutique or request an instant wire transfer.</p>
          </div>
        </div>
      </div>

      <div class="payout-summary-box">
        <span class="payout-summary-label">Current available balance:</span>
        <strong id="payout-amount-preview" class="payout-summary-val">0 HUF</strong>
      </div>

      <a id="request-payout-btn" class="btn-payout-wa" target="_blank" rel="noopener noreferrer" href="#">Request Payout on WhatsApp &rarr;</a>
    </div>

  </div>

  <!-- Official B2B Partnership Agreement Card -->
  <div class="contract-card">
    <div class="contract-header">
      <div class="contract-header-text">
        <span class="tag mono">Official B2B Documentation · Bilateral B2B Agreement</span>
        <h3>Partnership Agreement &amp; General Terms</h3>
        <p>Official bilateral (Hungarian &amp; English) cooperation agreement between Kaftan Angelo Luxury Outerwear and your partner organization.</p>
      </div>
      <div class="contract-badge">● Active &amp; Certified Agreement</div>
    </div>

    <div class="contract-preview-grid">
      <div>
        <div class="contract-col-title">🇬🇧 English Bilateral Clause</div>
        <ul class="contract-clause-list">
          <li><span>✓</span> <div><strong>10% VIP Guest Privilege:</strong> All referred hotel guests receive an exclusive 10% in-store savings upon presenting your VIP code.</div></li>
          <li><span>✓</span> <div><strong>10% Partner Commission:</strong> A 10% commission is earned on completed boutique purchases, payable via instant cash or bank wire.</div></li>
          <li><span>✓</span> <div><strong>Boutique Hospitality:</strong> Bespoke tailoring adjustments, VIP concierge lounge reception &amp; multilingual service in Budapest.</div></li>
        </ul>
      </div>

      <div>
        <div class="contract-col-title">🇭🇺 Hungarian Bilateral Clause</div>
        <ul class="contract-clause-list">
          <li><span>✓</span> <div><strong>10% VIP Vendégkedvezmény:</strong> Minden közvetített szállóvendég azonnali 10% kedvezményt kap az üzletben az Ön partnerkódjával.</div></li>
          <li><span>✓</span> <div><strong>10% Partneri Jutalék:</strong> A közvetített vásárlások nettó összege után 10% jutalék jár, mely készpénzben vagy banki átutalással kérhető.</div></li>
          <li><span>✓</span> <div><strong>VIP Kiszolgálás:</strong> Személyes méretre igazítás, prémium kávé és transzfer koordináció a Kossuth Lajos utcai szalonban.</div></li>
        </ul>
      </div>
    </div>

    <div class="contract-action-bar">
      <span class="contract-secure-note">🔒 Official certified document served from private encrypted Supabase storage.</span>
      <a id="contract-download-link" class="btn btn-primary" target="_blank" rel="noopener noreferrer" href="https://bezlzeojivucnqkfjpwo.supabase.co/storage/v1/object/sign/partner-contracts/b2b-contract.pdf?token=eyJraWQiOiJmZWIxYzExNS0xM2ZlLTRhODYtYThiOC01MWM4N2ZmMjNkMjciLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJwYXJ0bmVyLWNvbnRyYWN0cy9iMmItY29udHJhY3QucGRmIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MTM5MDAyNywiZXhwIjoxODIyOTI2MDI3fQ.7NDbvw2memZll3qPq3bn8IrBUUOzzV1kS2PHpXImlvZA5kCeTRsBC6Qv5-Hrg6ab2gvmEkRdrKsyHOyK4iVJDw">📄 Download Official Agreement (Bilingual PDF) &rarr;</a>
    </div>
  </div>

  <!-- Financial Ledger / Transactions Section -->
  <div class="transactions-section">
    <div class="transactions-header">
      <div>
        <span class="tag mono" style="margin-bottom:0.3rem;">Ledger</span>
        <h3>Referred Purchases &amp; Commissions</h3>
      </div>
      <span class="badge-status active">Real-time sync</span>
    </div>

    <div class="table-responsive">
      <table class="portal-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Item / Purchase</th>
            <th>Sale Amount</th>
            <th>Commission (10%)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="transactions-tbody">
          <!-- Populated by JS -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- 4-Step Partner Guide -->
  <div class="portal-guide-section">
    <h3 class="portal-guide-title">How the Partnership Works</h3>
    <div class="guide-steps-grid">
      <div class="guide-step-card">
        <span class="guide-step-num">01</span>
        <h4>Recommend the Boutique</h4>
        <p>Share your VIP pass with your guests on WhatsApp or recommend our Kossuth Lajos boutique in person.</p>
      </div>
      <div class="guide-step-card">
        <span class="guide-step-num">02</span>
        <h4>10% VIP Guest Savings</h4>
        <p>Guests present your referral code to receive an instant 10% VIP savings on all handcrafted leather &amp; shearling coats.</p>
      </div>
      <div class="guide-step-card">
        <span class="guide-step-num">03</span>
        <h4>Automatic Credit</h4>
        <p>Completed purchases are recorded in your account, with your commission updated in real time.</p>
      </div>
      <div class="guide-step-card">
        <span class="guide-step-num">04</span>
        <h4>Instant Payouts</h4>
        <p>Withdraw your accrued balance anytime in cash at our central boutique or request an instant bank wire.</p>
      </div>
    </div>
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
      name: 'Four Seasons Hotel Gresham Palace Concierge',
      type: 'Hotel Concierge',
      code: 'HOTEL-01',
      guests: 2,
      sales: 1300000,
      unpaid: 82000,
      paid: 48000,
      txs: [
        { date: '2026.10.04', item: 'Women\'s Tuscan Shearling Coat (Long)', amount: 820000, comm: 82000, status: 'Pending' },
        { date: '2026.09.28', item: 'Men\'s Shearling Aviator Jacket', amount: 480000, comm: 48000, status: 'Settled' }
      ]
    },
    'GUIDE-02': {
      pin: '4821',
      name: 'Peter Kovacs – Luxury Budapest Tours',
      type: 'Tour Specialist',
      code: 'GUIDE-02',
      guests: 2,
      sales: 730000,
      unpaid: 73000,
      paid: 0,
      txs: [
        { date: '2026.10.05', item: 'Men\'s Lambskin Biker Jacket', amount: 420000, comm: 42000, status: 'Pending' },
        { date: '2026.10.02', item: 'Women\'s Tailored Nappa Leather Jacket', amount: 310000, comm: 31000, status: 'Pending' }
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
    return Number(num).toLocaleString('en-US') + ' HUF';
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
      // Supabase RPC fallback
    }
    return null;
  }

  async function handleLogin(code, pin) {
    const cleanCode = (code || '').trim().toUpperCase();
    const cleanPin = (pin || '').trim();

    if (submitBtn) submitBtn.textContent = 'Verifying...';

    // 1. Try Supabase cloud database
    let data = await querySupabase(cleanCode, cleanPin);

    // 2. Fallback to local accounts if Supabase not populated
    if (!data && FALLBACK_DB[cleanCode] && FALLBACK_DB[cleanCode].pin === cleanPin) {
      data = FALLBACK_DB[cleanCode];
    }

    if (submitBtn) submitBtn.textContent = 'Access Partner Dashboard →';

    if (!data) {
      if (errorMsg) errorMsg.hidden = false;
      return;
    }

    if (errorMsg) errorMsg.hidden = true;
    localStorage.setItem('kaftan_portal_session', JSON.stringify({ code: cleanCode, pin: cleanPin }));

    // Populate dashboard
    document.getElementById('partner-display-name').textContent = data.name;
    document.getElementById('partner-display-type').textContent = data.type;
    document.getElementById('stat-guests').textContent = data.guests + ' guests';
    document.getElementById('stat-sales').textContent = fmtHuf(data.sales);
    document.getElementById('stat-unpaid').textContent = fmtHuf(data.unpaid);
    document.getElementById('stat-paid').textContent = fmtHuf(data.paid);
    document.getElementById('voucher-code-val').textContent = data.code;

    const payoutPreview = document.getElementById('payout-amount-preview');
    if (payoutPreview) payoutPreview.textContent = fmtHuf(data.unpaid);

    // WhatsApp payout link
    const payoutMsg = encodeURIComponent('Hello! As partner ' + data.code + ' (' + data.name + '), I would like to request payout of my accrued commission of ' + fmtHuf(data.unpaid) + ' in cash or wire transfer.');
    document.getElementById('request-payout-btn').href = 'https://wa.me/36203593216?text=' + payoutMsg;

    // WhatsApp share voucher link
    const voucherMsg = encodeURIComponent('Dear Guest,\\n\\nWe warmly invite you to visit Kaftan Angelo, Budapest\'s premier luxury leather, shearling, and fur coat boutique.\\n\\nPresent our VIP code for an exclusive 10% discount:\\nVIP Code: ' + data.code + '\\n\\nAddress: Kossuth Lajos u. 18, Budapest 1053\\nLocation & Website: https://kaftanangelo.com/en/');
    document.getElementById('share-voucher-wa').href = 'https://wa.me/?text=' + voucherMsg;

    // Render transactions
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = '';
    const txs = data.txs || [];
    if (txs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty-state"><div class="table-empty-icon">📋</div><div>No guest purchases recorded yet. As soon as a guest redeems your code in store, transactions appear here.</div></td></tr>';
    } else {
      txs.forEach(function(tx) {
        const tr = document.createElement('tr');
        const isPaid = tx.status === 'Kifizetve' || tx.status === 'Settled';
        const displayStatus = isPaid ? 'Settled' : 'Pending';
        tr.innerHTML = '<td><strong>' + tx.date + '</strong></td>' +
          '<td>' + tx.item + '</td>' +
          '<td>' + fmtHuf(tx.amount) + '</td>' +
          '<td class="accent-col">+' + fmtHuf(tx.comm) + '</td>' +
          '<td><span class="badge-status ' + (isPaid ? 'paid' : 'unpaid') + '">' + displayStatus + '</span></td>';
        tbody.appendChild(tr);
      });
    }

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
        copyStatus.textContent = 'Code ' + code + ' copied to clipboard!';
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

pages['/partner-portal/']['mainHtml'] = portal_hu_html
pages['/en/partner-portal/']['mainHtml'] = portal_en_html

# Update titles and descriptions in pages.json
pages['/partner-portal/']['title'] = 'Partner Portál | Kaftan Angelo Budapest'
pages['/partner-portal/']['description'] = 'Exkluzív partner és concierge portál budapesti szállodák, idegenvezetők és utazási szakemberek számára. Közvetített vendégek és jutalék nyomon követése.'

pages['/en/partner-portal/']['title'] = 'Concierge Partner Portal | Kaftan Angelo Budapest'
pages['/en/partner-portal/']['description'] = 'Exclusive concierge and VIP partner portal for Budapest luxury hotels and travel specialists. Track referred guest purchases and commission earnings.'

with open('src/data/pages.json', 'w', encoding='utf-8') as f:
    json.dump(pages, f, ensure_ascii=False, indent=2)

print("SUCCESS: pages.json updated with 100% clean Hungarian and English portal pages.")
