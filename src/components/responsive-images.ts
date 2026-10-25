import { existsSync, readdirSync } from 'node:fs';
const files = readdirSync('public/assets/images');
// Match .wrap padding, .product-grid columns/gaps and each card's 1px border.
// The two-card layout is capped at 860px and keeps two columns on desktop.
const smallCardSizes = '(max-width: 360px) calc((100vw - 44px) / 2), (max-width: 620px) calc((100vw - 48px) / 2), (max-width: 768px) calc((100vw - 72px) / 2), ';
const gridCardSizes = smallCardSizes + '(max-width: 1100px) calc((100vw - 94px) / 3), (max-width: 1120px) calc((100vw - 124px) / 4), 249px';
const twoCardSizes = smallCardSizes + '(max-width: 916px) calc((100vw - 76px) / 2), (max-width: 1100px) 420px, 418px';
function croppedCardSizes(sizes: string, card: string) {
  const image = card.match(/<img\b[^>]*>/)?.[0] ?? '';
  const width = Number(image.match(/\bwidth="(\d+)"/)?.[1]);
  const height = Number(image.match(/\bheight="(\d+)"/)?.[1]);
  // object-fit:cover fills a 3:4 frame. Wider source photos need enough pixels
  // for the frame's height too; do not sacrifice Retina detail to save bytes.
  const crop = width && height ? Math.max(1, width / height / (3 / 4)) : 1;
  if (crop === 1) return sizes;
  return sizes.split(', ').map(part => {
    const [, media = '', length] = part.match(/^(\(max-width: \d+px\) )?(.*)$/)!;
    return `${media}calc(${length} * ${crop})`;
  }).join(', ');
}
export function backgroundImage(url: string, maximum = 1200) {
  const stem = url.match(/\/assets\/images\/(.+)-\d+\.avif$/)?.[1];
  if (!stem) return `url('${url}')`;
  const widths = files.map(file => file.match(new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.avif$`))?.[1]).filter(Boolean).map(Number).sort((a,b)=>a-b);
  const large = widths.filter(width=>width<=maximum).at(-1) ?? widths[0];
  if (!large) return `url('${url}')`;
  const standard = widths.find(width=>width>=800) ?? large;
  return `image-set(url('/assets/images/${stem}-${standard}.avif') 1x, url('/assets/images/${stem}-${large}.avif') 2x)`;
}
export function responsiveImages(html: string) {
  return html.replace(/--card-img:url\('([^']+)'\)/g, (_match,url)=>`--card-img:${backgroundImage(url, 800)}`)
    .replace(/<picture>[\s\S]*?<\/picture>/g, picture => {
      const src = picture.match(/<img[^>]*src="\/([^"/]+)\.webp"/)?.[1];
      const width = picture.match(/<img[^>]*width="(\d+)"/)?.[1];
      if (!src || !width) return picture;
      return picture.replace(/srcset="([^"]+)"/g, (_match,set) => {
        const ext = set.includes('.avif') ? 'avif' : 'webp';
        const full = `/assets/images/${src}-${width}.${ext}`;
        return existsSync(`public${full}`) && !set.includes(full) ? `srcset="${set}, ${full} ${width}w"` : `srcset="${set}"`;
      });
    })
    .replace(/<div class="product-grid"[^>]*>[\s\S]*?<\/section>/g, grid => {
      const sizes = (grid.match(/<article class="product-card"/g) ?? []).length === 2 ? twoCardSizes : gridCardSizes;
      return grid.replace(/<article class="product-card"[\s\S]*?<\/article>/g, card => card
        .replace(/<source type="image\/webp"[^>]*>/g, '')
        .replace(/sizes="[^"]*"/g, `sizes="${croppedCardSizes(sizes, card)}"`)
        .replace(/srcset="([^"]+)"/g, (_match, set) => `srcset="${set.split(',').filter((candidate: string) => Number(candidate.trim().match(/(\d+)w$/)?.[1]) <= 1200).join(',')}"`)
        .replace(/<img src="\/([^"/]+)\.webp"/g, (_match, stem) => existsSync(`public/assets/images/${stem}-800.webp`) ? `<img src="/assets/images/${stem}-800.webp"` : _match));
    });
}
