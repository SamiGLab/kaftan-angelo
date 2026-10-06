import pages from '../data/pages.json';
const huGuides = import.meta.glob('../content/guides/hu/*.md', { eager:true });
const enGuides = import.meta.glob('../content/guides/en/*.md', { eager:true });
const BASE = 'https://kaftanangelo.com';

function slug(path){ return path.split('/').pop().replace('.md',''); }

export function GET() {
  const urls = new Set(Object.keys(pages));
  urls.add('/utmutatok/');
  urls.add('/en/guides/');
  Object.keys(huGuides).forEach(p=>urls.add(`/utmutatok/${slug(p)}/`));
  Object.keys(enGuides).forEach(p=>urls.add(`/en/guides/${slug(p)}/`));
  const today = new Date().toISOString().slice(0,10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map(u=>`  <url><loc>${BASE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>`;
  return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
