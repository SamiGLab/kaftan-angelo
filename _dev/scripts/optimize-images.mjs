import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../public/', import.meta.url));
const out = path.join(root,'assets','images');
await mkdir(out,{recursive:true});
const files=(await readdir(root)).filter(x=>x.endsWith('.webp'));
for(const file of files){
  const input=path.join(root,file); const meta=await sharp(input).metadata();
  for(const width of [480,800,1200]){
    if(!meta.width || width>=meta.width) continue;
    const stem=file.replace(/\.webp$/,'');
    await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:78,effort:5}).toFile(path.join(out,`${stem}-${width}.webp`));
    await sharp(input).resize({width,withoutEnlargement:true}).avif({quality:52,effort:5}).toFile(path.join(out,`${stem}-${width}.avif`));
  }
}
console.log(`Optimized ${files.length} source images.`);
