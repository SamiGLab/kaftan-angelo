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

const pauseButton = document.querySelector('[data-review-pause]');
pauseButton?.addEventListener('click', () => {
  const paused = pauseButton.getAttribute('aria-pressed') !== 'true';
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.textContent = paused ? (hu ? 'Folytatás' : 'Resume reviews') : (hu ? 'Szünet' : 'Pause reviews');
  document.querySelector('.partner-review-track').toggleAttribute('data-paused', paused);
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

// Delegation covers category buttons inserted after the initial page load.
document.addEventListener('click', event => {
  const button = event.target.closest('.filter-btn[data-filter]');
  if (!button) return;
  const scope = button.closest('[data-product-filters]')?.parentElement || document;
  scope.querySelectorAll('.filter-btn').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  scope.querySelectorAll('.product-card[data-category]').forEach(card => {
    const visible = button.dataset.filter === 'all' || card.dataset.category.split(/\s+/).includes(button.dataset.filter);
    card.classList.toggle('hidden', !visible);
    card.hidden = !visible;
  });
});
