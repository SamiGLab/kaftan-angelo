// Images listed in sitemaps are existing first-party assets, not generated keyword aliases.
// Google only needs the source photograph once, not every responsive srcset size.
const SITE = 'https://kaftanangelo.com';
const EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)$/i;

function firstPartyImage(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, SITE + '/');
    if (url.origin !== SITE || !EXTENSION.test(url.pathname)) return null;
    return SITE + url.pathname;
  } catch {
    return null;
  }
}

export function pageImageUrls(page = {}, guideHero) {
  const html = page.mainHtml || '';
  const primary = page.pageSchema?.primaryImageOfPage?.contentUrl;
  const gallery = Array.isArray(page.pageSchema?.image) ? page.pageSchema.image : [];
  // Keep originals referenced by <img> and the product-photo lightbox.
  // CSS-only hero imagery is represented by the page's existing ogImage.
  const inlinePhotos = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map(match => match[1]);
  const detailPhotos = [...html.matchAll(/\bdata-product-image="([^"]+)"/gi)].map(match => match[1]);
  const candidates = [primary, ...gallery, page.ogImage, ...inlinePhotos, ...detailPhotos, guideHero];
  return [...new Set(candidates.map(firstPartyImage).filter(Boolean))].slice(0, 1000);
}
