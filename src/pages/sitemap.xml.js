import pages from '../data/pages.json';
const huGuides = import.meta.glob('../content/guides/hu/*.md', { eager:true });
const enGuides = import.meta.glob('../content/guides/en/*.md', { eager:true });
const BASE = 'https://kaftanangelo.com';

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
  const urls = new Set(Object.keys(pages));
  urls.add('/utmutatok/');
  urls.add('/en/guides/');
  Object.keys(huGuides).forEach(p=>urls.add(`/utmutatok/${slug(p)}/`));
  Object.keys(enGuides).forEach(p=>urls.add(`/en/guides/${slug(p)}/`));
  const modified = new Map(Object.entries(pages).filter(([, page]) => page.modifiedDate).map(([url, page]) => [url, page.modifiedDate]));
  for (const [modules, root] of [[huGuides, '/utmutatok/'], [enGuides, '/en/guides/']]) {
    for (const [path, mod] of Object.entries(modules)) modified.set(`${root}${slug(path)}/`, mod.frontmatter.modifiedDate ?? mod.frontmatter.publishDate);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map(u=>`  <url><loc>${BASE}${u}</loc>${modified.has(u) ? `<lastmod>${modified.get(u)}</lastmod>` : ''}<changefreq>${getChangefreq(u)}</changefreq><priority>${getPriority(u)}</priority></url>`).join('\n')}\n</urlset>`;
  return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
