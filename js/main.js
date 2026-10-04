  // ---- four-image hero slider ----
  let heroSlides=Array.prototype.slice.call(document.querySelectorAll('.hero-media'));
  let heroDots=Array.prototype.slice.call(document.querySelectorAll('.hero-dot'));
  let heroIndex=0;
  let heroTimer;
  function showHeroSlide(index){
    if(!heroSlides.length) return;
    heroIndex=(index+heroSlides.length)%heroSlides.length;
    heroSlides.forEach(function(slide,i){slide.classList.toggle('active',i===heroIndex);});
    heroDots.forEach(function(dot,i){
      dot.classList.toggle('active',i===heroIndex);
      if(i===heroIndex) dot.setAttribute('aria-current','true'); else dot.removeAttribute('aria-current');
    });
  }
  function startHeroSlider(){
    clearInterval(heroTimer);
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      heroTimer=setInterval(function(){showHeroSlide(heroIndex+1);},6000);
    }
  }
  heroDots.forEach(function(dot,i){dot.addEventListener('click',function(){showHeroSlide(i);startHeroSlider();});});
  document.addEventListener('visibilitychange',function(){if(document.hidden) clearInterval(heroTimer); else startHeroSlider();});
  startHeroSlider();

  // ---- animated mobile navigation ----
  let mobileNav=document.querySelector('.mobile-actions');
  let mobileNavItems=mobileNav ? Array.prototype.slice.call(mobileNav.querySelectorAll('a')) : [];
  function activateMobileNav(item){
    if(!mobileNav || !item) return;
    mobileNav.style.setProperty('--active-index',item.getAttribute('data-index'));
    mobileNavItems.forEach(function(link){
      let active=link===item;
      link.classList.toggle('active',active);
      if(active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
  }
  mobileNavItems.forEach(function(item){item.addEventListener('click',function(){activateMobileNav(item);});});
  let mobileSectionLinks=mobileNavItems.filter(function(item){return item.hash && document.querySelector(item.hash);});
  let mobileScrollQueued=false;
  function syncMobileNavToScroll(){
    mobileScrollQueued=false;
    if(!mobileNav || window.innerWidth>860 || !mobileSectionLinks.length) return;
    let marker=window.scrollY+Math.min(window.innerHeight*.38,280);
    let current=mobileSectionLinks[0];
    mobileSectionLinks.forEach(function(item){
      let section=document.querySelector(item.hash);
      if(section && section.offsetTop<=marker) current=item;
    });
    activateMobileNav(current);
  }
  window.addEventListener('scroll',function(){
    if(!mobileScrollQueued){
      mobileScrollQueued=true;
      window.requestAnimationFrame(syncMobileNavToScroll);
    }
  },{passive:true});
  window.addEventListener('resize',syncMobileNavToScroll);
  syncMobileNavToScroll();

  // ---- language switcher ----
  let langMeta = {
    hu:{flag:'🇭🇺',code:'HU',dir:'ltr'}, en:{flag:'🇬🇧',code:'EN',dir:'ltr'},
    de:{flag:'🇩🇪',code:'DE',dir:'ltr'}, tr:{flag:'🇹🇷',code:'TR',dir:'ltr'}, ar:{flag:'🇸🇦',code:'AR',dir:'rtl'}
  };
  let seoMeta = {
    hu:{title:'Bőrkabát Budapest | Kaftan Angelo bőr üzlet',desc:'Bőrkabát Budapest belvárosában: férfi és női valódi bőrkabátok, bőrdzsekik, irha- és szőrmekabátok a Kaftan Angelo bőr üzletben, Kossuth Lajos u. 18.',locale:'hu_HU'},
    en:{title:'Leather Jackets Budapest | Kaftan Angelo Leather Store',desc:'Leather jackets in Budapest for men and women, plus leather coats, shearling and fur styles. Visit Kaftan Angelo leather store in central Budapest, Kossuth Lajos u. 18.',locale:'en_GB'},
    de:{title:'Lederjacken Budapest | Kaftan Angelo Ledergeschäft',desc:'Lederjacken in Budapest für Damen und Herren sowie Ledermäntel, Lammfell- und Pelzmodelle. Besuchen Sie Kaftan Angelo im Zentrum von Budapest.',locale:'de_DE'},
    tr:{title:'Budapeşte Deri Ceket | Kaftan Angelo Deri Mağazası',desc:'Budapeşte’de kadın ve erkek gerçek deri ceketler, deri montlar, shearling ve kürk modeller. Kaftan Angelo deri mağazası, Kossuth Lajos u. 18.',locale:'tr_TR'},
    ar:{title:'سترات جلدية بودابست | متجر Kaftan Angelo للجلود',desc:'سترات ومعاطف جلد طبيعي للرجال والنساء في بودابست، مع تصاميم من جلد الخروف والفراء. زوروا متجر Kaftan Angelo في وسط بودابست.',locale:'ar_SA'}
  };
  function setLang(lang){
    if(!langMeta[lang]) lang='hu';
    document.body.classList.remove('lang-hu','lang-en','lang-de','lang-tr','lang-ar');
    document.body.classList.add('lang-' + lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', langMeta[lang].dir);
    if(seoMeta[lang]){
      document.title=seoMeta[lang].title;
      let md=document.querySelector('meta[name="description"]'); if(md) md.setAttribute('content',seoMeta[lang].desc);
      let ogt=document.querySelector('meta[property="og:title"]'); if(ogt) ogt.setAttribute('content',seoMeta[lang].title);
      let ogd=document.querySelector('meta[property="og:description"]'); if(ogd) ogd.setAttribute('content',seoMeta[lang].desc);
      let ogl=document.querySelector('meta[property="og:locale"]'); if(ogl) ogl.setAttribute('content',seoMeta[lang].locale);
      let twt=document.querySelector('meta[name="twitter:title"]'); if(twt) twt.setAttribute('content',seoMeta[lang].title);
      let twd=document.querySelector('meta[name="twitter:description"]'); if(twd) twd.setAttribute('content',seoMeta[lang].desc);
    }
    document.querySelectorAll('.lang-option').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    let current=document.getElementById('lang-current');
    if(current){
      current.querySelector('.flag').textContent=langMeta[lang].flag;
      current.querySelector('.code').textContent=langMeta[lang].code;
    }
    try{localStorage.setItem('kaftan-lang',lang);}catch(e){}
    try{
      let u=new URL(window.location.href); u.searchParams.set('lang',lang);
      window.history.replaceState({},'',u.pathname+u.search+u.hash);
    }catch(e){}
    document.getElementById('lang-menu').classList.remove('open');
    current && current.setAttribute('aria-expanded','false');
  }
  let langMenu=document.getElementById('lang-menu');
  let langCurrent=document.getElementById('lang-current');
  langCurrent.addEventListener('click',function(e){
    e.stopPropagation();
    let isOpen=langMenu.classList.toggle('open');
    langCurrent.setAttribute('aria-expanded',String(isOpen));
  });
  document.querySelectorAll('.lang-option').forEach(function(btn){
    btn.addEventListener('click',function(){ setLang(btn.getAttribute('data-lang')); });
  });
  document.addEventListener('click',function(){
    langMenu.classList.remove('open'); langCurrent.setAttribute('aria-expanded','false');
  });

  // ---- ticker content ----
  let tickerItems = [
    {hu:'Férfi bőrkabát', en:"Men's Leather Jackets", de:'Herren-Lederjacken', tr:'Erkek Deri Ceketler', ar:'سترات جلدية رجالية'},
    {hu:'Női bőrkabát', en:"Women's Leather Jackets", de:'Damen-Lederjacken', tr:'Kadın Deri Ceketler', ar:'سترات جلدية نسائية'},
    {hu:'Irhakabát', en:'Shearling Jackets', de:'Lammfelljacken', tr:'Shearling Ceketler', ar:'سترات جلد خروف'},
    {hu:'Szőrmekabát', en:'Fur Jackets', de:'Pelzjacken', tr:'Kürk Ceketler', ar:'سترات فراء'},
    {hu:'Bőr kiegészítők', en:'Leather Accessories', de:'Lederaccessoires', tr:'Deri Aksesuarlar', ar:'إكسسوارات جلدية'},
    {hu:'Sapka & sál', en:'Hats & Scarves', de:'Mützen & Schals', tr:'Şapka & Atkı', ar:'قبعات وأوشحة'},
    {hu:'Egyedi rendelés', en:'Custom Orders', de:'Sonderanfertigungen', tr:'Özel Sipariş', ar:'طلبات خاصة'}
  ];
  function buildTicker(){
    let el = document.getElementById('ticker');
    let html = '';
    for (let rep = 0; rep < 2; rep++){
      tickerItems.forEach(function(it){
        html += '<span class="item"><span class="lang-hu">' + it.hu + '</span><span class="lang-en">' + it.en + '</span><span class="lang-de">' + it.de + '</span><span class="lang-tr">' + it.tr + '</span><span class="lang-ar">' + it.ar + '</span></span><span>·</span>';
      });
    }
    el.innerHTML = html;
  }
  buildTicker();

  // ---- collection cards ----
  let icons = [
    '<path d="M16 8 L11 13 L11 40 H37 L37 13 L32 8 L27 12 H21 Z"/><path d="M21 12 L18 24 L24 21 L30 24 L27 12"/>',
    '<path d="M17 8 L12 14 L12 40 H36 L36 14 L31 8 L26 13 L24 11 L22 13 Z"/><path d="M22 13 L19 27 L24 24 L29 27 L26 13"/>',
    '<path d="M15 9 Q12 12 13 18 L13 39 H35 L35 18 Q36 12 33 9 L28 13 L24 10 L20 13 Z"/><path d="M18 20 q2 -2 4 0 q2 -2 4 0 q2 -2 4 0" stroke-width="1.1"/>',
    '<path d="M14 10 Q10 13 12 20 L11 38 H37 L36 20 Q38 13 34 10" /><path d="M15 16 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0" stroke-width="1.1"/><path d="M15 24 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0" stroke-width="1.1"/>',
    '<rect x="9" y="21" width="30" height="7" rx="1.5"/><circle cx="24" cy="24.5" r="3"/><path d="M14 32 h8 v9 h-8 z"/><path d="M14 34 h8" stroke-width="1"/>',
    '<path d="M11 34 L34 11 L39 16 L16 39 Z"/><path d="M31 14 l3 3 M27 18 l3 3 M23 22 l3 3"/>'
  ];
  let collections = [
    {ref:'01', hu:'Női bőrkabátok', en:"Women's Leather Jackets", de:'Damen-Lederjacken', tr:'Kadın Deri Ceketler', ar:'سترات جلدية نسائية', huDesc:'Klasszikus és modern valódi bőrkabátok, üzletünkben felpróbálhatók.', enDesc:'Classic and modern genuine leather jackets to try on in store.', deDesc:'Klassische und moderne Echtlederjacken zum Anprobieren.', trDesc:'Mağazada deneyebileceğiniz klasik ve modern gerçek deri ceketler.', arDesc:'سترات جلد طبيعي كلاسيكية وعصرية للتجربة في المتجر.'},
    {ref:'02', hu:'Férfi bőrkabátok', en:"Men's Leather Jackets", de:'Herren-Lederjacken', tr:'Erkek Deri Ceketler', ar:'سترات جلدية رجالية', huDesc:'Valódi bőrdzsekik és bőrkabátok többféle fazonban és méretben.', enDesc:'Genuine leather jackets in a range of fits and sizes.', deDesc:'Echte Lederjacken in verschiedenen Schnitten und Größen.', trDesc:'Farklı kalıp ve bedenlerde gerçek deri ceketler.', arDesc:'سترات جلد طبيعي بقصات ومقاسات مختلفة.'},
    {ref:'03', hu:'Irhakabátok', en:'Shearling Jackets', de:'Lammfelljacken', tr:'Shearling Ceketler', ar:'سترات جلد الخروف', huDesc:'Meleg női és férfi irhadzsekik, irhakabátok szezonális választékban.', enDesc:'Warm shearling jackets and coats for women and men.', deDesc:'Warme Lammfelljacken und -mäntel für Damen und Herren.', trDesc:'Kadın ve erkek sıcak shearling ceket ve montlar.', arDesc:'سترات ومعاطف دافئة من جلد الخروف للنساء والرجال.'},
    {ref:'04', hu:'Szőrmekabátok', en:'Fur Jackets & Coats', de:'Pelzjacken & -mäntel', tr:'Kürk Ceket & Montlar', ar:'سترات ومعاطف فراء', huDesc:'Női szőrmekabátok, szőrmedzsekik és rókamellények.', enDesc:'Women’s fur jackets, coats and fox fur vests.', deDesc:'Pelzjacken, Pelzmäntel und Fuchspelzwesten für Damen.', trDesc:'Kadın kürk ceketleri, montları ve tilki kürkü yelekler.', arDesc:'سترات ومعاطف فراء نسائية وسترات من فرو الثعلب.'},
    {ref:'05', hu:'Bőr kiegészítők', en:'Leather Accessories', de:'Lederaccessoires', tr:'Deri Aksesuarlar', ar:'إكسسوارات جلدية', huDesc:'Bőrövek, bőr pénztárcák és válogatott kiegészítők.', enDesc:'Leather belts, wallets and selected accessories.', deDesc:'Ledergürtel, Geldbörsen und ausgewählte Accessoires.', trDesc:'Deri kemerler, cüzdanlar ve seçilmiş aksesuarlar.', arDesc:'أحزمة ومحافظ جلدية وإكسسوارات مختارة.'},
    {ref:'06', hu:'Egyedi bőrkabát rendelés', en:'Custom Leather Jackets', de:'Leder-Sonderanfertigungen', tr:'Özel Deri Ceket', ar:'سترات جلد حسب الطلب', huDesc:'Egyedi fazon, szín és méret személyes egyeztetés alapján.', enDesc:'Custom style, colour and sizing discussed in person.', deDesc:'Individueller Schnitt, Farbe und Größe nach Beratung.', trDesc:'Model, renk ve beden mağazada birlikte belirlenir.', arDesc:'تصميم ولون ومقاس مخصص بعد الاستشارة في المتجر.'}
  ];
  function buildTagGrid(){
    let el = document.getElementById('tag-grid');
    let html = '';
    collections.forEach(function(c, i){
      html += '<div class="tag-card"><div class="tag-hole"></div>' +
        '<span class="tag-ref mono">Ref. ' + c.ref + '</span>' +
        '<svg class="tag-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4">' + icons[i] + '</svg>' +
        '<h3><span class="lang-hu">' + c.hu + '</span><span class="lang-en">' + c.en + '</span><span class="lang-de">' + c.de + '</span><span class="lang-tr">' + c.tr + '</span><span class="lang-ar">' + c.ar + '</span></h3>' +
        '<p><span class="lang-hu">' + c.huDesc + '</span><span class="lang-en">' + c.enDesc + '</span><span class="lang-de">' + c.deDesc + '</span><span class="lang-tr">' + c.trDesc + '</span><span class="lang-ar">' + c.arDesc + '</span></p>' +
        '<div class="stitch stitch-edge"></div></div>';
    });
    el.innerHTML = html;
  }
  buildTagGrid();

  // ---- open product photography at full size ----
  Array.prototype.forEach.call(document.querySelectorAll('.product-card img'), function(img){
    img.setAttribute('role','button');
    img.setAttribute('tabindex','0');
    img.setAttribute('aria-label',(img.getAttribute('alt') || 'Product image') + ' — nagyítás');
    function openProductImage(){
      window.open(img.currentSrc || img.src,'_blank','noopener,noreferrer');
    }
    img.addEventListener('click',openProductImage);
    img.addEventListener('keydown',function(event){
      if(event.key === 'Enter' || event.key === ' '){
        event.preventDefault();
        openProductImage();
      }
    });
  });

  // ---- opening hours ----
  let hours = [
    {hu:'Hétfő', en:'Monday', de:'Montag', tr:'Pazartesi', ar:'الاثنين', time:'10:00–19:00'},
    {hu:'Kedd', en:'Tuesday', de:'Dienstag', tr:'Salı', ar:'الثلاثاء', time:'10:00–19:00'},
    {hu:'Szerda', en:'Wednesday', de:'Mittwoch', tr:'Çarşamba', ar:'الأربعاء', time:'10:00–19:00'},
    {hu:'Csütörtök', en:'Thursday', de:'Donnerstag', tr:'Perşembe', ar:'الخميس', time:'10:00–19:00'},
    {hu:'Péntek', en:'Friday', de:'Freitag', tr:'Cuma', ar:'الجمعة', time:'10:00–19:00'},
    {hu:'Szombat', en:'Saturday', de:'Samstag', tr:'Cumartesi', ar:'السبت', time:'10:00–17:00'},
    {hu:'Vasárnap', en:'Sunday', de:'Sonntag', tr:'Pazar', ar:'الأحد', time:null}
  ];
  function buildReceipt(){
    let el = document.getElementById('receipt');
    let html = '';
    hours.forEach(function(d){
      let timeHtml = d.time
        ? '<b>' + d.time + '</b>'
        : '<b><span class="lang-hu">Zárva</span><span class="lang-en">Closed</span><span class="lang-de">Geschlossen</span><span class="lang-tr">Kapalı</span><span class="lang-ar">مغلق</span></b>';
      html += '<div class="receipt-row"><span><span class="lang-hu">' + d.hu + '</span><span class="lang-en">' + d.en + '</span><span class="lang-de">' + d.de + '</span><span class="lang-tr">' + d.tr + '</span><span class="lang-ar">' + d.ar + '</span></span>' + timeHtml + '</div>';
    });
    el.innerHTML = html;
  }
  buildReceipt();

  let savedLang='hu';
  try{
    let queryLang=new URLSearchParams(window.location.search).get('lang');
    savedLang=(queryLang && langMeta[queryLang]) ? queryLang : (localStorage.getItem('kaftan-lang')||'hu');
  }catch(e){}
  setLang(savedLang);

  // ---- footer current year ----
  let yearElements = document.querySelectorAll('.current-year');
  let currentYear = new Date().getFullYear();
  yearElements.forEach(function(el) {
    el.textContent = currentYear;
  });

  // ---- FAQ Accordion ----
  let faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function(item) {
    let question = item.querySelector('.faq-question');
    question.addEventListener('click', function() {
      // Close others
      faqItems.forEach(function(other) {
        if (other !== item) {
          other.classList.remove('active');
        }
      });
      // Toggle current
      item.classList.toggle('active');
    });
  });
