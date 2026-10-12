import { spawnSync } from 'node:child_process';
function getPython() {
  if (process.platform !== 'win32') return 'python3';
  const testPy = spawnSync('py', ['--version'], { stdio: 'ignore' });
  return testPy.status === 0 ? 'py' : 'python';
}
const result = spawnSync(getPython(), ['_dev/scripts/site_audit.py', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
