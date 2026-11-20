import { spawnSync } from 'node:child_process';
function getPython() {
  if (process.platform !== 'win32') return 'python3';
  const testPy = spawnSync('py', ['--version'], { stdio: 'ignore' });
  return testPy.status === 0 ? 'py' : 'python';
}
const result = spawnSync(getPython(), ['_dev/scripts/site_audit.py', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status ?? 1);
const images = spawnSync(process.execPath, ['_dev/scripts/test-social-images.mjs', ...process.argv.slice(2)], { stdio: 'inherit' });
if (images.error) console.error(images.error.message);
process.exit(images.status ?? 1);
