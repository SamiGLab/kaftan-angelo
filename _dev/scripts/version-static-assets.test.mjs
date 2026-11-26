import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {versionStaticAssets} from './version-static-assets.mjs';

test('one stable release version reaches HTML, deferred modules and lazy CSS; changed assets invalidate it',async()=>{
  const root=await mkdtemp(join(tmpdir(),'showroom-assets-'));
  try {
    await mkdir(join(root,'assets/css'),{recursive:true});
    await mkdir(join(root,'assets/js'),{recursive:true});
    await writeFile(join(root,'assets/css/pages.css'),'body{color:gold}');
    await writeFile(join(root,'assets/css/catalog-ui.css'),'.catalog{display:grid}');
    await writeFile(join(root,'assets/js/pages.js'),"import('/assets/js/catalog-ui.mjs');");
    await writeFile(join(root,'assets/js/catalog-ui.mjs'),"const css='/assets/css/catalog-ui.css';");
    await writeFile(join(root,'index.html'),'<link rel="stylesheet" href="/assets/css/pages.css"><script src="/assets/js/pages.js"></script><img src="/coat.webp" alt="Coat">');
    const first=await versionStaticAssets(root);
    assert.match(await readFile(join(root,'index.html'),'utf8'),new RegExp(`pages.css\\?v=${first}`));
    assert.match(await readFile(join(root,'assets/js/pages.js'),'utf8'),new RegExp(`catalog-ui.mjs\\?v=${first}`));
    assert.match(await readFile(join(root,'assets/js/catalog-ui.mjs'),'utf8'),new RegExp(`catalog-ui.css\\?v=${first}`));
    assert.match(await readFile(join(root,'index.html'),'utf8'),/src="\/coat.webp"/);
    assert.equal(await versionStaticAssets(root),first,'Re-running the same build preserves its version');
    await writeFile(join(root,'assets/css/pages.css'),'body{color:linen}');
    const next=await versionStaticAssets(root);
    assert.notEqual(next,first);
    assert.ok(!(await readFile(join(root,'index.html'),'utf8')).includes(first));
  } finally {await rm(root,{recursive:true,force:true});}
});
