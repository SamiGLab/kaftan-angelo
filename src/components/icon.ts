import { Menu, X, Search, SlidersHorizontal, ChevronLeft, ChevronRight, ZoomIn, MapPin, Route, Phone, Clock, Scissors, Ruler, BookOpen, Store, Mail } from 'lucide';
const nodes = { menu: Menu, x: X, search: Search, filter: SlidersHorizontal, previous: ChevronLeft, next: ChevronRight, zoom: ZoomIn, location: MapPin, route: Route, phone: Phone, clock: Clock, scissors: Scissors, ruler: Ruler, book: BookOpen, store: Store, mail: Mail };
export type IconName = keyof typeof nodes;
const escape = (value: string) => value.replace(/[&"<>]/g, char => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[char]!));
export function icon(name: IconName, extraClass = '') {
  const body = nodes[name].map(([tag, attributes]) => `<${tag} ${Object.entries(attributes).map(([key, value]) => `${key}="${escape(String(value))}"`).join(' ')}></${tag}>`).join('');
  return `<svg class="ui-icon ${extraClass}" data-icon="${name}" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
// Enrich the existing static content without changing labels, URLs or product data.
export function withIcons(html: string) {
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (whole, attributes, label) => {
    if (/<(?:svg|picture|img|h[1-6])\b/.test(label)) return whole;
    const href = attributes.match(/href="([^"]+)"/)?.[1] || '';
    const name: IconName | undefined = href.startsWith('tel:') ? 'phone' : href.startsWith('mailto:') ? 'mail' : /maps\.app\.goo\.gl|google\.com\/maps/.test(href) ? 'route' : /^(\/uzlet\/|\/en\/visit\/)$/.test(href) ? 'location' : /^(\/egyedi-rendeles\/|\/en\/custom-orders\/)$/.test(href) ? 'scissors' : /^(\/utmutatok\/|\/en\/guides\/)$/.test(href) ? 'book' : /borkabat-meret-utmutato|leather-jacket-size-guide/.test(href) ? 'ruler' : undefined;
    return name ? `<a${attributes}>${icon(name)}${label}</a>` : whole;
  }).replace(/(<button[^>]*data-filter="all"[^>]*>)/g, `$1${icon('filter')}`)
    .replace(/(<span class="image-hint">)([^<]*)/g, (_whole, start, label) => `${start}${icon('zoom')}${label.replace(/\s*↗$/, '')}`)
    .replace(/(<a class="text-link" href="[^"]+">)([^<]*)( ↗<\/a>)/g, `$1${icon('zoom')}$2</a>`);
}
