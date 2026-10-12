import {readdir,readFile,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import sharp from 'sharp';

export async function validateContent(root) {
  const publicRoot=await realpath(path.join(root,'public'));
  const issues=[];
  async function localImage(url,context) {
    if(typeof url!=='string'||!url.startsWith('/')||url.startsWith('//')||/[?#\\]/.test(url)) {issues.push(`${context}: image must be a local public path`);return;}
    let file;
    try{file=path.resolve(publicRoot,'.'+decodeURIComponent(url));}catch{issues.push(`${context}: invalid image URL encoding`);return;}
    if(!file.startsWith(publicRoot+path.sep)) {issues.push(`${context}: image escapes public directory`);return;}
    try {
      let actual;
      try {
        actual = await realpath(file);
      } catch (err) {
        if (url.startsWith('/assets/images/')) {
          const baseName = path.basename(file).replace(/-(480|800|1200)\.(avif|webp)$/, '');
          for (const ext of ['.webp', '.jpg', '.png']) {
            try { actual = await realpath(path.join(publicRoot, baseName + ext)); break; } catch {}
          }
        }
        if (!actual) throw err;
      }
      if(!actual.startsWith(publicRoot+path.sep))throw Error('outside public directory');
      const info=await sharp(actual,{limitInputPixels:40000000}).metadata();
      if(!['jpeg','png','webp','avif','gif'].includes(info.format)&&!(info.format==='heif'&&info.compression==='av1'))throw Error('use JPG, PNG, WebP, AVIF or GIF');
      if(!info.width||!info.height)throw Error('image has no dimensions');
    }catch(error){issues.push(`${context}: invalid image (${error.message})`);}
  }
  const guides=new Map();
  for(const lang of ['hu','en']) {
    const folder=path.join(root,'src/content/guides',lang);
    for(const file of await readdir(folder)) {
      if(!file.endsWith('.md'))continue;
      const context=`${lang}/${file}`,source=await readFile(path.join(folder,file),'utf8');
      const match=source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if(!match){issues.push(`${context}: missing frontmatter`);continue;}
      let data;
      try{data=parse(match[1]);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('metadata must be an object');}catch(error){issues.push(`${context}: invalid YAML (${error.message})`);continue;}
      const url=`${lang==='hu'?'/utmutatok/':'/en/guides/'}${file.slice(0,-3)}/`;
      guides.set(url,{data,context});
      for(const key of ['title','description','topic'])if(typeof data?.[key]!=='string'||!data[key].trim())issues.push(`${context}: ${key} is required`);
      for(const key of ['publishDate','modifiedDate']) {
        const value=data?.[key];
        if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)issues.push(`${context}: ${key} must be a valid YYYY-MM-DD date`);
      }
      if(data.modifiedDate<data.publishDate)issues.push(`${context}: modifiedDate precedes publishDate`);
      if(!match[2].trim())issues.push(`${context}: body is empty`);
      if(/<(?:script|iframe|object|embed)\b|<[^>]+\son[a-z]+\s*=|(?:href|src)\s*=\s*["']\s*(?:javascript|vbscript|data):|\]\(\s*(?:javascript|vbscript|data):/i.test(match[2]))issues.push(`${context}: active scripts/embeds are not allowed in guide content`);
      await localImage(data.heroImage,context);
    }
  }
  for(const [url,{data,context}] of guides) {
    const target=guides.get(data.counterpart);
    if(!target||target.data.counterpart!==url)issues.push(`${context}: missing or nonreciprocal HU/EN counterpart`);
  }
  const uploads=path.join(publicRoot,'uploads');
  async function walk(folder) {
    let entries;try{entries=await readdir(folder,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}
    for(const entry of entries) {
      const file=path.join(folder,entry.name);
      if(entry.isDirectory()){await walk(file);continue;}
      if(entry.name==='.gitkeep')continue;
      const url='/'+path.relative(publicRoot,file).split(path.sep).join('/');
      if((await stat(file)).size>5242880)issues.push(`${url}: upload exceeds 5 MiB`);
      if(!/\.(?:jpe?g|png|webp|avif|gif)$/i.test(entry.name)){issues.push(`${url}: unsupported upload type`);continue;}
      await localImage(url,url);
    }
  }
  await walk(uploads);
  return issues;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const issues=await validateContent(process.cwd());
  if(issues.length){issues.forEach(issue=>console.error(issue));process.exitCode=1;}
  else console.log('PASS: guide content, reciprocal languages and uploaded images validated.');
}
