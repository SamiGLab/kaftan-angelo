import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { evaluateBudgets } from './lighthouse-budgets.mjs';
const require = createRequire(import.meta.url);
const rules = require('../../lighthouserc.cjs').ci.assert.assertions;
function result() {
  return { categories: { performance:{score:0.8}, accessibility:{score:0.95}, 'best-practices':{score:0.9}, seo:{score:0.95} }, audits: { 'largest-contentful-paint':{numericValue:3000}, 'cumulative-layout-shift':{numericValue:0.1}, 'total-blocking-time':{numericValue:400}, 'speed-index':{numericValue:4000} } };
}
test('existing category and timing budgets pass at their exact limits', () => {
  const checks = evaluateBudgets(result(), rules);
  assert.equal(checks.length, 8);
  assert.ok(checks.every(check => check.passed));
});
test('each category and timing regression is detected independently', () => {
  for (const metric of Object.keys(rules)) {
    const lhr = result();
    if (metric.startsWith('categories:')) lhr.categories[metric.slice(11)].score -= 0.01;
    else lhr.audits[metric].numericValue += 1;
    const checks = evaluateBudgets(lhr, rules);
    assert.deepEqual(checks.filter(check => !check.passed).map(check => check.metric), [metric]);
  }
});
test('Speed Index remains warning-only while hard budgets remain errors', () => {
  const lhr = result(); lhr.audits['speed-index'].numericValue = 5000;
  const failures = evaluateBudgets(lhr, rules).filter(check => !check.passed);
  assert.equal(failures[0].level, 'warn');
  assert.equal(failures.filter(check => check.level === 'error').length, 0);
});
test('missing, non-finite and failed runtime results fail closed', () => {
  for (const lhr of [null, {runtimeError:{code:'FAILED'}}, {}, {...result(), categories:{}}]) assert.throws(() => evaluateBudgets(lhr, rules));
  const lhr = result(); lhr.audits['total-blocking-time'].numericValue = NaN;
  assert.throws(() => evaluateBudgets(lhr, rules));
});
test('empty or unknown rule shapes cannot silently disable the gate', () => {
  assert.throws(() => evaluateBudgets(result(), {}));
  assert.throws(() => evaluateBudgets(result(), {'categories:performance':['off',{minScore:0.8}]}));
  assert.throws(() => evaluateBudgets(result(), {'categories:performance':['error',{maxNumericValue:1}]}));
});
