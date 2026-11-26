import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const references=/(\/assets\/(?:css|js)\/[a-zA-Z0-9_./-]+\.(?:css|m?js))(?:\?v=[a-f0-9]{16})?/g;
export async function versionStaticAssets(directory) {
  const root=resolve(directory instanceof URL?fileURLToPath(directory):directory);
  const files=[];
  async function visit(folder) {
    for(const entry of await readdir(folder,{withFileTypes:true})) {
      const file=join(folder,entry.name);
      if(entry.isDirectory())await visit(file);
      else if(/\.(?:html|css|m?js)$/.test(entry.name))files.push(file);
    }
  }
  await visit(root);
  files.sort();
  const assets=files.filter(file=>/^assets\/(?:css|js)\//.test(relative(root,file).replaceAll('\\','/')));
  const hash=createHash('sha256');
  for(const file of assets) {
    hash.update(relative(root,file).replaceAll('\\','/'));
    hash.update((await readFile(file,'utf8')).replace(references,'$1'));
  }
  const version=hash.digest('hex').slice(0,16);
  for(const file of files) {
    const before=await readFile(file,'utf8');
    const after=before.replace(references,(_match,url)=>`${url}?v=${version}`);
    if(after!==before)await writeFile(file,after);
  }
  return version;
}
