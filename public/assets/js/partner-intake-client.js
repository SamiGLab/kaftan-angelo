// Progressive HU/EN partner enquiry transport. Deliberately inert unless
// the operator supplies all deployment-reviewed data attributes. No tracking.
(() => {
  const form = document.querySelector('[data-partner-form]');
  if (!form || form.dataset.intakeInitialized === 'true') return;
  if (form.dataset.partnerIntakeEnabled !== 'true') return;

  const endpoint = form.dataset.partnerIntakeEndpoint;
  const siteKey = form.dataset.partnerIntakeSitekey;
  const privacyPath = form.dataset.partnerIntakePrivacyUrl;
  let privacyUrl;
  try { privacyUrl = new URL(privacyPath, location.origin); } catch { return; }
  // Restrict the public form to the configured project's fixed HTTPS endpoint.
  // A caller-provided/DOM-injected URL must never receive personal details.
  if (endpoint !== 'https://bezlzeojivucnqkfjpwo.supabase.co/functions/v1/partner-intake'
    || !/^[a-zA-Z0-9_-]{10,150}$/.test(siteKey || '')
    || privacyUrl.origin !== location.origin
    || !privacyUrl.pathname.startsWith('/')
    || privacyUrl.search || privacyUrl.hash) return;

  const hu = document.documentElement.lang === 'hu';
  const words = hu ? {
    submit:'Jelentkezés elküldése', preparing:'Küldés…',
    notice:'Elolvastam az adatkezelési tájékoztatót.',
    noticeLink:'Adatkezelési tájékoztató',
    help:'A jelentkezést biztonságos kapcsolaton küldjük el. A WhatsApp és az e-mail továbbra is választható.',
    sent:'Jelentkezését megkaptuk. Hivatkozási azonosító: ',
    retry:'Nem sikerült elküldeni. Próbálja újra, vagy használja a WhatsAppot / e-mailt.',
    limited:'Túl sok próbálkozás. Kérjük, próbálja meg később.',
    challenge:'A küldés előtt végezze el a biztonsági ellenőrzést.',
    email:'E-mail előkészítése helyette',
  } : {
    submit:'Send application',preparing:'Sending…',
    notice:'I have read the data processing notice.',
    noticeLink:'Data processing notice',
    help:'Your application will be sent over a secure connection. WhatsApp and email remain available.',
    sent:'Your application was received. Reference: ',
    retry:'We could not send this application. Try again, or use WhatsApp / email.',
    limited:'Too many attempts. Please try again later.',
    challenge:'Complete the security verification before sending.',
    email:'Prepare email instead',
  };

  const submit = form.querySelector('button[type="submit"]');
  const help = form.querySelector('.form-help');
  if (!submit || !help || !globalThis.crypto?.randomUUID) return;
  const originalText = submit.textContent;
  const originalHelp = help.textContent;

  // The privacy URL and legal wording must be reviewed before activation.
  const notice = document.createElement('label');
  notice.className = 'partner-intake-privacy';
  const acknowledgement = document.createElement('input');
  acknowledgement.type = 'checkbox';
  acknowledgement.name = 'privacyAcknowledged';
  acknowledgement.required = true;
  const noticeText = document.createElement('span');
  noticeText.textContent = words.notice + ' ';
  const link = document.createElement('a');
  link.href = privacyUrl.pathname;
  link.textContent = words.noticeLink;
  noticeText.append(link);
  notice.append(acknowledgement,noticeText);

  const status = document.createElement('p');
  status.className = 'partner-intake-status';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.hidden = true;

  const emailFallback = document.createElement('button');
  emailFallback.type = 'button';
  emailFallback.className = 'btn btn-ghost';
  emailFallback.dataset.partnerEmailFallback = '';
  emailFallback.textContent = words.email;

  submit.before(notice);
  submit.after(emailFallback,status);
  submit.textContent = words.submit;
  help.textContent = words.help;
  form.dataset.intakeInitialized = 'true';

  function show(message) {
    status.hidden = false;
    status.textContent = message; // Never put applicant values in innerHTML.
  }
  function getLead() {
    const fields = new FormData(form);
    const typeIndex = form.querySelector('select[name="type"]')?.selectedIndex;
    const type = ['hotel_concierge','guide','apartment','travel_agency','other'][typeIndex];
    if (!type) return null;
    return {
      name:String(fields.get('name')||''),
      company:String(fields.get('company')||''),
      email:String(fields.get('email')||''),
      phone:String(fields.get('phone')||''),
      type,
      message:String(fields.get('message')||''),
      language:hu?'hu':'en',
      privacyAcknowledged:acknowledgement.checked,
      website:'',
    };
  }
  let lastDraft='';
  let lastKey='';
  let busy=false;
  const validReceipt=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validChallenge=/^[A-Za-z0-9._-]{1,2048}$/;

  // Capture before the existing legacy mailto submit listener. If configured,
  // failure stays on the form; no false "submitted" nor automatic mail launch.
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy || !form.reportValidity()) return;
    const lead=getLead();
    if (!lead) return show(words.retry);
    const token=globalThis.turnstile?.getResponse?.();
    if (typeof token !== 'string' || !validChallenge.test(token)) return show(words.challenge);
    const draft=JSON.stringify(lead);
    if (lastDraft !== draft) {
      lastDraft=draft;
      lastKey=globalThis.crypto.randomUUID();
    }
    if (!validReceipt.test(lastKey)) return show(words.retry);
    busy=true;
    form.setAttribute('aria-busy','true');
    submit.disabled=true;
    submit.textContent=words.preparing;
    show(words.preparing);
    try {
      const result=await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json','X-Idempotency-Key':lastKey},
        body:JSON.stringify({...lead,challengeToken:token}),
        credentials:'omit',referrerPolicy:'no-referrer',
        signal:AbortSignal.timeout(15000),
      });
      if (!result.ok) {
        if (result.status===429) { show(words.limited); return; }
        throw new Error('no_receipt');
      }
      const data=await result.json();
      if (result.status!==202 || data?.accepted!==true || !validReceipt.test(data.receipt||'')) throw new Error('no_receipt');
      show(words.sent+data.receipt);
      form.reset();
      lastDraft='';
      lastKey='';
      globalThis.turnstile?.reset?.();
    } catch {
      show(words.retry);
    } finally {
      busy=false;
      form.removeAttribute('aria-busy');
      submit.disabled=false;
      submit.textContent=words.submit;
    }
  },true);

  // A deliberate secondary action; no mail is sent merely because HTTPS fails.
  emailFallback.addEventListener('click',()=>{
    if (!form.reportValidity()) return;
    const values=new FormData(form);
    const subject=(hu?'Partnerprogram':'Partnership inquiry')+' — '+String(values.get('company')||values.get('name')||'Kaftan Angelo');
    const message=[
      'Name: '+String(values.get('name')||''),
      'Company: '+String(values.get('company')||''),
      'Email: '+String(values.get('email')||''),
      'Phone: '+String(values.get('phone')||''),
      'Partner type: '+String(values.get('type')||''),
      '',String(values.get('message')||'')
    ].join('\n');
    location.href='mailto:alfinafashionkft@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message);
  });

  // Preserve manual mailto on any later operator deactivation of the feature.
  form.addEventListener('partner-intake-disable',()=>{
    submit.textContent=originalText;
    help.textContent=originalHelp;
    notice.remove();
    status.remove();
    emailFallback.remove();
  },{once:true});
})();
