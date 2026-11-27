import basePages from '../data/pages.json';
import { modelPages } from '../data/model-pages';
const pages = { ...basePages, ...modelPages };
const huGuides = import.meta.glob('../content/guides/hu/*.md', { eager:true });
const enGuides = import.meta.glob('../content/guides/en/*.md', { eager:true });
const BASE = 'https://kaftanangelo.com';

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[character]));
}

// Include the original model photos, independently of thumbnail formats and batch display.
function modelImages(url) {
  const html = pages[url]?.mainHtml ?? '';
  const modelPhoto = pages[url]?.pageSchema?.primaryImageOfPage?.contentUrl;
  if (modelPhoto) return (pages[url]?.pageSchema?.image ?? pages[url]?.productSchema?.image ?? [modelPhoto]).map(image => `<image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>`).join('');
  return [...new Set([...html.matchAll(/data-product-image="([^"<>]+)"/g)].map(match => match[1]))]
    .filter(image => image.startsWith('/') && !image.startsWith('//'))
    .map(image => `<image:image><image:loc>${xmlEscape(BASE + image)}</image:loc></image:image>`).join('');
}

function slug(path){ return path.split('/').pop().replace('.md',''); }

function languageLinks(url, counterpart, urls) {
  if (!counterpart || !urls.has(counterpart)) throw new Error(`Missing sitemap language counterpart for ${url}`);
  const hu = url.startsWith('/en/') ? counterpart : url;
  const en = url.startsWith('/en/') ? url : counterpart;
  return [['hu', hu], ['en', en], ['x-default', hu]]
    .map(([lang, path]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(BASE + path)}"/>`).join('');
}

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
  const excluded = new Set(['/404.html', '/404/', '/partner-portal/', '/en/partner-portal/']);
  const urls = new Set(Object.keys(pages).filter(url => !excluded.has(url)));
  urls.add('/utmutatok/');
  urls.add('/en/guides/');
  Object.keys(huGuides).forEach(p=>urls.add(`/utmutatok/${slug(p)}/`));
  Object.keys(enGuides).forEach(p=>urls.add(`/en/guides/${slug(p)}/`));
  const guideImages = new Map();
  const modified = new Map(Object.entries(pages).filter(([, page]) => page.modifiedDate).map(([url, page]) => [url, page.modifiedDate]));
  const counterparts = new Map(Object.entries(pages).map(([url, page]) => [url, page.counterpart]));
  counterparts.set('/utmutatok/', '/en/guides/');
  counterparts.set('/en/guides/', '/utmutatok/');
  for (const [modules, root] of [[huGuides, '/utmutatok/'], [enGuides, '/en/guides/']]) {
    for (const [path, mod] of Object.entries(modules)) {
      const url = `${root}${slug(path)}/`;
      modified.set(url, mod.frontmatter.modifiedDate ?? mod.frontmatter.publishDate);
      counterparts.set(url, mod.frontmatter.counterpart);
      if (mod.frontmatter.editorialImages?.length) guideImages.set(url, [mod.frontmatter.heroImage, ...mod.frontmatter.editorialImages]);
    }
    const dates = Object.values(modules).map(mod => mod.frontmatter.modifiedDate ?? mod.frontmatter.publishDate).filter(Boolean).sort();
    if (dates.length) modified.set(root, dates.at(-1));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[...urls].sort().map(u=>`  <url><loc>${BASE}${u}</loc>${languageLinks(u, counterparts.get(u), urls)}${modified.has(u) ? `<lastmod>${modified.get(u)}</lastmod>` : ''}<changefreq>${getChangefreq(u)}</changefreq><priority>${getPriority(u)}</priority>${guideImages.has(u) ? [...new Set(guideImages.get(u))].map(src => `<image:image><image:loc>${xmlEscape(BASE + src)}</image:loc></image:image>`).join('') : modelImages(u)}</url>`).join('\n')}\n</urlset>`;
  return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
