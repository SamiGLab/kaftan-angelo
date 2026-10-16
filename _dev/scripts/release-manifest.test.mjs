import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createManifest, verifyManifest } from './release-manifest.mjs';

const sha = '678cf2ad0f4ac55e91c85b87fccc5bd2708ea851';
async function release(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'kaftan-release-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'index.html'), '<h1>Recovery fixture</h1>');
  await writeFile(path.join(root, 'sitemap.xml'), '<urlset/>');
  await writeFile(path.join(root, 'assets', 'image.bin'), Buffer.from([0, 255, 128, 1]));
  await writeFile(path.join(root, '.well-known'), 'fixture');
  return root;
}

test('a complete recovered release verifies, including nested binary and hidden files', async t => {
  const root = await release(t);
  await createManifest(root, sha);
  assert.equal(await verifyManifest(root, sha), 4);
  const original = await readFile(path.join(root, '_release.json'), 'utf8');
  await createManifest(root, sha);
  assert.equal(await readFile(path.join(root, '_release.json'), 'utf8'), original);
});

test('a recovery from another commit is rejected', async t => {
  const root = await release(t);
  await createManifest(root, sha);
  await assert.rejects(verifyManifest(root, 'a'.repeat(40)), /identity mismatch/);
});

for (const mutation of ['changed', 'missing', 'extra']) {
  test(`a recovered release with a ${mutation} file is rejected`, async t => {
    const root = await release(t);
    await createManifest(root, sha);
    if (mutation === 'changed') await writeFile(path.join(root, 'assets', 'image.bin'), 'tampered');
    if (mutation === 'missing') await rm(path.join(root, '.well-known'));
    if (mutation === 'extra') await writeFile(path.join(root, 'unexpected.js'), 'alert(1)');
    await assert.rejects(verifyManifest(root, sha), /integrity mismatch|file list differs/);
  });
}

test('missing required pages cannot be fingerprinted or accepted', async t => {
  const root = await release(t);
  await rm(path.join(root, 'index.html'));
  await assert.rejects(createManifest(root, sha), /lacks homepage or sitemap/);
  const manifest = await createManifest(await release(t), sha);
  delete manifest.files['index.html'];
  await writeFile(path.join(root, '_release.json'), JSON.stringify(manifest));
  await assert.rejects(verifyManifest(root, sha), /Incomplete release/);
});

test('truncated or unsupported manifests fail closed', async t => {
  const root = await release(t);
  await writeFile(path.join(root, '_release.json'), '{');
  await assert.rejects(verifyManifest(root, sha), SyntaxError);
  await writeFile(path.join(root, '_release.json'), JSON.stringify({ schema: 2, commit: sha, files: {} }));
  await assert.rejects(verifyManifest(root, sha), /identity mismatch/);
  await assert.rejects(createManifest(root, 'main'), /full Git commit SHA/);
});

test('symbolic links cannot enter a release or a restored tree', async t => {
  const root = await release(t);
  await createManifest(root, sha);
  // Windows commonly requires an extra privilege for symlinks; Linux CI runs this case.
  try { await symlink('index.html', path.join(root, 'linked.html')); }
  catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows symlink privilege unavailable');
    throw error;
  }
  await assert.rejects(createManifest(root, sha), /symbolic links/);
  await assert.rejects(verifyManifest(root, sha), /symbolic links/);
});
