import basePages from '../data/pages.json';
import { modelPages } from '../data/model-pages';
import { pageImageUrls } from '../data/image-seo.js';
const pages = { ...basePages, ...modelPages };
const huGuides = import.meta.glob('../content/guides/hu/*.md', { eager:true });
const enGuides = import.meta.glob('../content/guides/en/*.md', { eager:true });
const BASE = 'https://kaftanangelo.com';

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[character]));
}

function slug(path){ return path.split('/').pop().replace('.md',''); }

function getPriority(u) {
  if (u === '/' || u === '/en/') return '1.0';
  if (u.includes('kollekciok') || u.includes('collections') || u.includes('borkabat') || u.includes('leather-jackets') || u.includes('irha') || u.includes('shearling') || u.includes('szorme') || u.includes('fur') || u.includes('egyedi') || u.includes('custom-orders')) return '0.9';
  if (u.includes('utmutatok') || u.includes('guides')) return '0.8';
  return '0.7';
}

function getChangefreq(u) {
  if (u === '/' || u === '/en/' || u.includes('kollekciok') || u.includes('collections')) return 'weekly';
  return 'monthly';
}

export function GET() {
  const excluded = new Set(['/partner-portal/', '/en/partner-portal/']);
  const urls = new Set(Object.keys(pages).filter(url => !excluded.has(url)));
  urls.add('/utmutatok/');
  urls.add('/en/guides/');
  Object.keys(huGuides).forEach(p=>urls.add(`/utmutatok/${slug(p)}/`));
  Object.keys(enGuides).forEach(p=>urls.add(`/en/guides/${slug(p)}/`));
  // Both guide index pages render this same existing photograph as their hero.
  const guideIndexHero = '/assets/images/kaftan-angelo-leather-jackets-budapest-800.avif';
  const guideImages = new Map([
    ['/utmutatok/', guideIndexHero],
    ['/en/guides/', guideIndexHero],
  ]);
  const modified = new Map(Object.entries(pages).filter(([, page]) => page.modifiedDate).map(([url, page]) => [url, page.modifiedDate]));
  for (const [modules, root] of [[huGuides, '/utmutatok/'], [enGuides, '/en/guides/']]) {
    for (const [path, mod] of Object.entries(modules)) {
      const route = `${root}${slug(path)}/`;
      modified.set(route, mod.frontmatter.modifiedDate ?? mod.frontmatter.publishDate);
      if (mod.frontmatter.heroImage) guideImages.set(route, mod.frontmatter.heroImage);
    }
    const dates = Object.values(modules).map(mod => mod.frontmatter.modifiedDate ?? mod.frontmatter.publishDate).filter(Boolean).sort();
    if (dates.length) modified.set(root, dates.at(-1));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${[...urls].sort().map(u=>`  <url><loc>${BASE}${u}</loc>${modified.has(u) ? `<lastmod>${modified.get(u)}</lastmod>` : ''}<changefreq>${getChangefreq(u)}</changefreq><priority>${getPriority(u)}</priority>${pageImageUrls(pages[u], guideImages.get(u)).map(image=>`<image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>`).join('')}</url>`).join('\n')}\n</urlset>`;
  return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
