import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../public/', import.meta.url));
const out = path.join(root,'assets','images');
await mkdir(out,{recursive:true});
const files=(await readdir(root)).filter(x=>x.endsWith('.webp'));
for(const file of files){
  const input=path.join(root,file); const meta=await sharp(input).metadata();
  const sourceTime=(await stat(input)).mtimeMs;
  for(const width of [...new Set([480,800,1200,meta.width])]){
    if(!width || !meta.width || width>meta.width) continue;
    const stem=file.replace(/\.webp$/,'');
    const targets=[path.join(out,`${stem}-${width}.webp`),path.join(out,`${stem}-${width}.avif`)];
    const current=await Promise.all(targets.map(target=>stat(target).then(info=>info.mtimeMs>=sourceTime).catch(()=>false)));
    if(current.every(Boolean))continue;
    await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:78,effort:5}).toFile(path.join(out,`${stem}-${width}.webp`));
    await sharp(input).resize({width,withoutEnlargement:true}).avif({quality:52,effort:2}).toFile(path.join(out,`${stem}-${width}.avif`));
  }
}
console.log(`Optimized ${files.length} source images.`);
