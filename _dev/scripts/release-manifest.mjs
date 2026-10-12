import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

async function files(root,folder=root) {
  const result=[];
  for(const entry of await readdir(folder,{withFileTypes:true})) {
    if(entry.isSymbolicLink())throw Error('Release cannot contain symbolic links');
    const file=path.join(folder,entry.name);
    if(entry.isDirectory())result.push(...await files(root,file));
    else if(entry.isFile()&&file!==path.join(root,'_release.json'))result.push(path.relative(root,file).split(path.sep).join('/'));
  }
  return result.sort();
}
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
export async function createManifest(root,sha) {
  if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Expected full Git commit SHA');
  const hashes={};for(const name of await files(root))hashes[name]=digest(await readFile(path.join(root,name)));
  if(!hashes['index.html']||!hashes['sitemap.xml'])throw Error('Release lacks homepage or sitemap');
  const manifest={schema:1,commit:sha,files:hashes};
  await writeFile(path.join(root,'_release.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}
export async function verifyManifest(root,sha) {
  const manifest=JSON.parse(await readFile(path.join(root,'_release.json'),'utf8'));
  if(manifest.schema!==1||manifest.commit!==sha||!manifest.files||typeof manifest.files!=='object')throw Error('Release identity mismatch');
  const actual=await files(root),expected=Object.keys(manifest.files).sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Release file list differs from manifest');
  if(!expected.includes('index.html')||!expected.includes('sitemap.xml'))throw Error('Incomplete release');
  for(const name of expected)if(digest(await readFile(path.join(root,name)))!==manifest.files[name])throw Error(`Release integrity mismatch: ${name}`);
  return actual.length;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [mode,root,sha]=process.argv.slice(2);
  if(mode==='create')await createManifest(path.resolve(root),sha);
  else if(mode==='verify')console.log(`PASS: ${await verifyManifest(path.resolve(root),sha)} release files verified.`);
  else throw Error('Usage: release-manifest.mjs create|verify DIRECTORY COMMIT_SHA');
}
