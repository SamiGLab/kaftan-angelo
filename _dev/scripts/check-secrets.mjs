import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, lstat, writeFile, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root=process.cwd();
const executable=process.env.GITLEAKS_BIN || 'gitleaks';
const config=path.join(root,'.gitleaks.toml');
const temp=await mkdtemp(path.join(tmpdir(),'kaftan-secret-check-'));
const args=folder=>['dir',folder,'--config',config,'--redact=100','--no-banner','--no-color','--timeout','120'];
try {
  const control=path.join(temp,'control');
  await mkdir(control);
  await writeFile(path.join(control,'fixture.js'),`const github_token = "ghp_${randomBytes(18).toString('hex')}";\n`);
  const negative=spawnSync(executable,args(control),{stdio:'pipe'});
  if(negative.error || negative.status!==1) throw Error('Secret scanner failed its synthetic credential detection control');
  await writeFile(path.join(control,'fixture.js'),`const API_KEY = "sb_publishable_${randomBytes(24).toString('hex')}";\n`);
  const positive=spawnSync(executable,args(control),{stdio:'pipe'});
  if(positive.error || positive.status!==0) throw Error('Public identifier exception failed its control');
  const snapshot=path.join(temp,'source');
  await mkdir(snapshot);
  const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  for(const file of files) {
    const source=path.resolve(root,file);
    if(!source.startsWith(root+path.sep)) throw Error('Invalid source path');
    const info=await lstat(source);
    if(info.isSymbolicLink()) throw Error('Secret snapshot must not follow symbolic links');
    if(!info.isFile()) continue;
    const target=path.join(snapshot,file);
    await mkdir(path.dirname(target),{recursive:true});
    await copyFile(source,target);
  }
  const result=spawnSync(executable,args(snapshot),{stdio:'inherit'});
  if(result.error || result.status!==0) throw Error('Current-source secret scan failed');
  console.log(`PASS: ${files.length} current-source files; synthetic secret detection and public identifier controls`);
} finally {await rm(temp,{recursive:true,force:true});}
