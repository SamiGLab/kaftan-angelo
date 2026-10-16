import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer';
import { evaluateBudgets } from './lighthouse-budgets.mjs';

const require = createRequire(import.meta.url);
const { collect, assert: { assertions } } = require('../../lighthouserc.cjs').ci;
if (!Array.isArray(collect.url) || collect.url.length !== 6 || collect.numberOfRuns !== 2) throw Error('Expected six routes and two runs per route');
for (const url of collect.url) if (new URL(url).origin !== 'http://127.0.0.1:4174') throw Error('Only the local tested release may be audited');

const output = '.lighthouseci';
await mkdir(output, { recursive: true });
const server = spawn(process.platform === 'win32' ? 'python' : 'python3', ['-u', '-m', 'http.server', '4174', '--bind', '127.0.0.1', '--directory', 'dist'], { stdio:['ignore','pipe','pipe'], windowsHide:true });
server.stderr.resume();
let chrome;
const summary = [];
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Lighthouse server did not start')), 10000);
    const ready = data => { if (data.toString().includes('Serving HTTP')) { clearTimeout(timer); resolve(); } };
    server.stdout.on('data', ready);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', () => { clearTimeout(timer); reject(Error('Lighthouse server exited')); });
  });
  const chromeFlags = ['--headless', '--disable-gpu', '--disable-dev-shm-usage'];
  if (process.env.CI) chromeFlags.push('--no-sandbox');
  chrome = await chromeLauncher.launch({chromePath:puppeteer.executablePath(), chromeFlags});
  for (const [index,url] of collect.url.entries()) {
    for (let run = 1; run <= collect.numberOfRuns; run++) {
      const result = await lighthouse(url, {port:chrome.port, logLevel:'error', output:['html','json']});
      if (!result?.lhr || result.lhr.runtimeError) throw Error(`Lighthouse failed for ${url}`);
      if (result.lhr.finalDisplayedUrl !== url) throw Error(`Unexpected Lighthouse destination for ${url}`);
      const checks = evaluateBudgets(result.lhr, assertions);
      await writeFile(`${output}/route-${index + 1}-run-${run}.html`, result.report[0]);
      await writeFile(`${output}/route-${index + 1}-run-${run}.json`, result.report[1]);
      summary.push({url,run,version:result.lhr.lighthouseVersion,checks});
      for (const check of checks.filter(check => !check.passed)) console.log(`${check.level.toUpperCase()}: ${url} run ${run} ${check.metric}: ${check.value} (limit ${check.limit})`);
      console.log(`Audited ${url} (${run}/${collect.numberOfRuns})`);
    }
  }
  const failures = summary.flatMap(entry => entry.checks.filter(check => !check.passed && check.level === 'error'));
  if (summary.length !== 12) throw Error('Incomplete Lighthouse collection');
  console.log(`Lighthouse: 12 runs, ${failures.length} hard budget failures`);
  if (failures.length) process.exitCode = 1;
} finally {
  try { await writeFile(`${output}/summary.json`, JSON.stringify(summary, null, 2)); }
  finally { try { if (chrome) await chrome.kill(); } finally { server.kill(); } }
}
