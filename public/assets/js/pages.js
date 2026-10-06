(()=>{document.querySelectorAll('.current-year').forEach(x=>x.textContent=new Date().getFullYear());const f=document.querySelector('[data-partner-form]');if(f){f.addEventListener('submit',e=>{e.preventDefault();if(!f.reportValidity())return;const data=new FormData(f);const subject='Partnership inquiry — '+(data.get('company')||data.get('name')||'Kaftan Angelo');const body=['Name: '+(data.get('name')||''),'Company: '+(data.get('company')||''),'Email: '+(data.get('email')||''),'Phone: '+(data.get('phone')||''),'Partner type: '+(data.get('type')||''),'','Message:',data.get('message')||''].join('\n');location.href='mailto:alfinafashionkft@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);});}})();
// Delegate clicks so filters added after page load also clear every active state.
document.addEventListener('click', event => {
  const button = event.target.closest('.filter-btn[data-filter]');
  if (!button) return;
  const scope = button.closest('[data-product-filters]')?.parentElement || document;
  scope.querySelectorAll('.filter-btn').forEach(item => {
    item.classList.remove('active');
    item.setAttribute('aria-pressed', 'false');
  });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  const filter = button.dataset.filter;
  scope.querySelectorAll('.product-card[data-category]').forEach(card => {
    const visible = filter === 'all' || card.dataset.category.split(/\s+/).includes(filter);
    card.classList.toggle('hidden', !visible);
    card.hidden = !visible;
  });
});
