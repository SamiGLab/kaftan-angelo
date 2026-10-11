import { existsSync, readdirSync } from 'node:fs';
const files = readdirSync('public/assets/images');
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
  return html.replace(/--card-img:url\('([^']+)'\)/g, (_match,url)=>`--card-img:${backgroundImage(url)}`)
    .replace(/<picture>[\s\S]*?<\/picture>/g, picture => {
      const src = picture.match(/<img[^>]*src="\/([^"/]+)\.webp"/)?.[1];
      const width = picture.match(/<img[^>]*width="(\d+)"/)?.[1];
      if (!src || !width) return picture;
      return picture.replace(/srcset="([^"]+)"/g, (_match,set) => {
        const ext = set.includes('.avif') ? 'avif' : 'webp';
        const full = `/assets/images/${src}-${width}.${ext}`;
        return existsSync(`public${full}`) && !set.includes(full) ? `srcset="${set}, ${full} ${width}w"` : `srcset="${set}"`;
      });
    });
}
