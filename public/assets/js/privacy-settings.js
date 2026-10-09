(() => {
  const dialog=document.getElementById('privacy-settings');
  if(!dialog)return;
  const hu=document.documentElement.lang==='hu';
  const choice=dialog.querySelector('[data-map-permission]');
  let allowed=false;
  function apply(value){
    allowed=value;choice.checked=value;
    for(const panel of document.querySelectorAll('[data-map-panel]')){
      const slot=panel.querySelector('[data-map-slot]');
      const button=panel.querySelector('[data-map-load]');
      slot.replaceChildren();
      if(value){
        const frame=document.createElement('iframe');
        frame.src='https://www.google.com/maps?q=Kossuth%20Lajos%20u.%2018%2C%20Budapest%201053&output=embed';
        frame.title=hu?'Kaftan Angelo térkép':'Kaftan Angelo map';frame.loading='lazy';slot.append(frame);
      }
      button.hidden=value;
    }
    dialog.querySelector('[data-privacy-status]').textContent=value?(hu?'A térkép engedélyezve ezen az oldalon.':'Maps allowed on this page.'):(hu?'A térkép leállítva. A már átadott adatokat ez nem vonja vissza.':'Maps stopped. This does not recall data already transmitted.');
  }
  document.querySelectorAll('[data-privacy-open]').forEach(b=>b.addEventListener('click',()=>{choice.checked=allowed;dialog.showModal();}));
  document.querySelectorAll('[data-map-load]').forEach(b=>b.addEventListener('click',()=>apply(true)));
  dialog.querySelector('[data-privacy-close]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-privacy-reject]').addEventListener('click',()=>{apply(false);dialog.close();});
  dialog.querySelector('[data-privacy-accept]').addEventListener('click',()=>{apply(true);dialog.close();});
  dialog.querySelector('[data-privacy-save]').addEventListener('click',()=>{apply(choice.checked);dialog.close();});
})();
