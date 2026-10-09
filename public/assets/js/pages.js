const hu = document.documentElement.lang === 'hu';
document.querySelectorAll('.current-year').forEach(element => { element.textContent = String(new Date().getFullYear()); });

const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('[data-menu]');
function closeMenu() {
  menuButton?.setAttribute('aria-expanded', 'false');
  menu?.removeAttribute('data-open');
}
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menu.toggleAttribute('data-open', open);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') { closeMenu(); menuButton.focus(); }
});
matchMedia('(min-width: 981px)').addEventListener('change', closeMenu);
menu?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });

// Native dialogs trap focus, handle Escape, and restore focus to the trigger.
const dialog = document.querySelector('[data-product-dialog]');
const imageButtons = [...document.querySelectorAll('[data-product-image]')];
const visibleImageButtons = () => imageButtons.filter(button => !button.closest('.product-card').hidden);
let selectedImage = 0;
function showImage(index) {
  const visible = visibleImageButtons();
  selectedImage = (index + visible.length) % visible.length;
  const trigger = visible[selectedImage];
  const card = trigger.closest('.product-card');
  const title = card.querySelector('h3').textContent;
  const image = dialog.querySelector('[data-preview-image]');
  image.src = trigger.dataset.productImage;
  image.alt = title;
  dialog.querySelector('[data-preview-title]').textContent = title;
  dialog.querySelector('[data-preview-count]').textContent = `${selectedImage + 1} / ${visible.length}`;
  dialog.querySelector('[data-preview-inquiry]').href = card.querySelector('a[href*="wa.me"]').href;
  if (!dialog.open) dialog.showModal();
}
imageButtons.forEach(button => button.addEventListener('click', () => showImage(visibleImageButtons().indexOf(button))));
dialog?.querySelector('[data-preview-close]').addEventListener('click', () => dialog.close());
dialog?.querySelector('[data-preview-prev]').addEventListener('click', () => showImage(selectedImage - 1));
dialog?.querySelector('[data-preview-next]').addEventListener('click', () => showImage(selectedImage + 1));
dialog?.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showImage(selectedImage + (event.key === 'ArrowRight' ? 1 : -1)); }
});
dialog?.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});

const partnerForm = document.querySelector('[data-partner-form]');
function partnershipMessage() {
  const data = new FormData(partnerForm);
  const body = [
    `${hu ? 'Név' : 'Name'}: ${data.get('name') || ''}`,
    `${hu ? 'Cég' : 'Company'}: ${data.get('company') || ''}`,
    `Email: ${data.get('email') || ''}`,
    `${hu ? 'Telefon' : 'Phone'}: ${data.get('phone') || ''}`,
    `${hu ? 'Partner típusa' : 'Partner type'}: ${data.get('type') || ''}`,
    '', String(data.get('message') || ''),
  ].join('\n');
  const subject = `${hu ? 'Partnerprogram' : 'Partnership inquiry'} — ${data.get('company') || data.get('name') || 'Kaftan Angelo'}`;
  return { body, subject };
}
partnerForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (!partnerForm.reportValidity()) return;
  const { body, subject } = partnershipMessage();
  location.href = `mailto:alfinafashionkft@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
partnerForm?.querySelector('[data-partner-whatsapp]').addEventListener('click', () => {
  if (!partnerForm.reportValidity()) return;
  const { body, subject } = partnershipMessage();
  location.href = `https://wa.me/36203593216?text=${encodeURIComponent(subject + '\n\n' + body)}`;
});

// Keep growing collections manageable; all cards remain available without JavaScript.
const collectionViews = [...document.querySelectorAll('.product-grid')].map((grid, index) => {
  const cards = [...grid.querySelectorAll('.product-card')];
  const scope = grid.parentElement;
  const controls = document.createElement('div');
  controls.className = 'center-action collection-controls';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'btn btn-ghost';
  more.textContent = hu ? 'További modellek' : 'Show more models';
  grid.id ||= `collection-grid-${index}`;
  more.setAttribute('aria-controls', grid.id);
  controls.append(status, more);
  grid.after(controls);
  let limit = 12;
  let filter = 'all';
  const matches = () => cards.filter(card => filter === 'all' || (card.dataset.category || '').split(/\s+/).includes(filter));
  function render() {
    const matching = matches();
    const shown = new Set(matching.slice(0, limit));
    cards.forEach(card => {
      card.hidden = !shown.has(card);
      card.classList.toggle('hidden', card.hidden);
    });
    status.textContent = hu ? `${Math.min(limit, matching.length)} / ${matching.length} modell` : `${Math.min(limit, matching.length)} of ${matching.length} models`;
    more.hidden = limit >= matching.length;
    controls.hidden = cards.length <= 12 && filter === 'all';
  }
  more.addEventListener('click', () => {
    const firstNew = matches()[limit];
    limit += 12;
    render();
    firstNew?.querySelector('button, a')?.focus();
  });
  render();
  return { scope, setFilter(value) { filter = value; limit = 12; render(); } };
});

document.addEventListener('click', event => {
  const button = event.target.closest('.filter-btn[data-filter]');
  if (!button) return;
  const scope = button.closest('[data-product-filters]')?.parentElement || document;
  scope.querySelectorAll('.filter-btn').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  collectionViews.filter(view => scope.contains(view.scope)).forEach(view => view.setFilter(button.dataset.filter));
});
