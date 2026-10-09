(() => {
  const banner = document.querySelector('[data-consent-banner]');
  if (!banner) return;
  const key = 'kaftan_consent_v1';
  const maxAge = 180 * 86400000;
  const permitted = !location.pathname.includes('/partner-portal/') && !location.pathname.includes('/admin') && [...new URLSearchParams(location.search).keys()].every(k => /^utm_(source|medium|campaign|content|term)$/.test(k));
  let choice = {analytics:false, recordings:false};
  let loaded = false;
  let gaStarted = false;
  let clarityStarted = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
  window.gtag('consent','default',{analytics_storage:'denied',clarity_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  function safeCampaign() {
    const result={};
    for(const [key,value] of new URLSearchParams(location.search)) {
      if(/^utm_(source|medium|campaign|content|term)$/.test(key) && /^[\w .-]{1,80}$/.test(value)) result[key === 'utm_campaign' ? 'campaign_name' : key.replace('utm_','campaign_')]=value;
    }
    return result;
  }
  window.kaftanAnalytics = {choice, permitted, page:location.origin+location.pathname, campaign:safeCampaign()};
  function apply() {
    window.kaftanAnalytics.choice=choice;
    window.gtag('consent','update',{analytics_storage:choice.analytics?'granted':'denied',clarity_storage:choice.recordings?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    if (!permitted || (!choice.analytics && !choice.recordings)) return;
    if (!loaded) {
      loaded=true;
      window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
      const script=document.createElement('script');script.async=true;
      script.src='https://www.googletagmanager.com/gtm.js?id=GTM-5D5T9W6Q';document.head.append(script);
    }
    if(choice.analytics && !gaStarted){gaStarted=true;window.dataLayer.push({event:'kaftan_analytics_ready'});}
    if(choice.recordings && !clarityStarted){clarityStarted=true;window.dataLayer.push({event:'kaftan_recordings_ready'});}
  }
  function clearTrackingCookies() {
    for (const part of document.cookie.split(';')) {
      const name=part.trim().split('=')[0];
      if(!/^(_ga(?:_|$)|_gid$|_gat|_clck$|_clsk$)/.test(name))continue;
      for(const domain of ['',location.hostname,'.'+location.hostname]) document.cookie=name+'=; Max-Age=0; path=/'+(domain?'; domain='+domain:'')+'; SameSite=Lax';
    }
  }
  function save(next) {
    const withdrawn=(choice.analytics&&!next.analytics)||(choice.recordings&&!next.recordings);
    choice=next;
    try{localStorage.setItem(key,JSON.stringify({...choice,time:Date.now()}));}catch{}
    banner.hidden=true;
    if(withdrawn){
      if(window.clarity)window.clarity('consentv2',{analytics_Storage:'denied',ad_Storage:'denied'});
      window['ga-disable-G-9C5YRQ08JR']=true;
      clearTrackingCookies(); location.reload(); return;
    }
    apply();
  }
  function open(){
    banner.querySelector('[data-consent-analytics]').checked=choice.analytics;
    banner.querySelector('[data-consent-recordings]').checked=choice.recordings;
    banner.hidden=false;
  }
  document.querySelectorAll('[data-consent-open]').forEach(b=>b.addEventListener('click',open));
  banner.querySelector('[data-consent-reject]').addEventListener('click',()=>save({analytics:false,recordings:false}));
  banner.querySelector('[data-consent-accept]').addEventListener('click',()=>save({analytics:true,recordings:true}));
  banner.querySelector('[data-consent-customize]').addEventListener('click',()=>{
    banner.querySelector('[data-consent-options]').hidden=false;
    banner.querySelector('[data-consent-save]').hidden=false;
    banner.querySelector('[data-consent-customize]').hidden=true;
  });
  banner.querySelector('[data-consent-save]').addEventListener('click',()=>save({analytics:banner.querySelector('[data-consent-analytics]').checked,recordings:banner.querySelector('[data-consent-recordings]').checked}));
  let stored;
  try {stored=JSON.parse(localStorage.getItem(key));} catch{}
  if(stored && typeof stored.analytics==='boolean' && typeof stored.recordings==='boolean' && Number.isFinite(stored.time) && Date.now()-stored.time>=0 && Date.now()-stored.time<maxAge){choice={analytics:stored.analytics,recordings:stored.recordings};apply();}else open();
  document.querySelectorAll('form,input,textarea,select,[data-search]').forEach(el=>el.setAttribute('data-clarity-mask','true'));
  document.addEventListener('click',event=>{
    if(!choice.analytics || !permitted)return;
    const el=event.target.closest('a,[data-map-load]');if(!el)return;
    let action;
    const href=el.getAttribute('href')||'';
    if(href.startsWith('tel:'))action='phone_click';
    else if(/^https:\/\/(maps\.app\.goo\.gl|(?:www\.)?google\.com\/maps)/.test(href))action='directions_click';
    else if(/^https:\/\/wa\.me\//.test(href))action='whatsapp_click';
    else if(el.hasAttribute('data-map-load') && el.getAttribute('aria-expanded')==='true')action='map_view';
    if(action)window.dataLayer.push({event:'kaftan_interest',interest_action:action,page_path:location.pathname,page_language:document.documentElement.lang});
  });
})();
