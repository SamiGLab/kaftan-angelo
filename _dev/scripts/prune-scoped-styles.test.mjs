import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pruneScopedStyles } from './prune-scoped-styles.mjs';

test('drops absent component scopes while preserving active, global and responsive styles', () => {
  const html = `<style>.missing[data-astro-cid-absent]{color:red}.active[data-astro-cid-present],.missing[data-astro-cid-absent]{color:blue}body{margin:0}@media(max-width:600px){.active[data-astro-cid-present]{display:grid}.missing[data-astro-cid-absent]{display:none}}</style><main data-astro-cid-present></main><script>const template="data-astro-cid-absent";</script>`;
  const output = pruneScopedStyles(html);
  const css = output.match(/<style>(.*?)<\/style>/s)[1];
  assert.doesNotMatch(css, /color:red|display:none/);
  assert.match(css, /\.active\[data-astro-cid-present\].*color:#00f/);
  assert.match(css, /body\{margin:0\}/);
  assert.match(css, /@media.*data-astro-cid-present.*display:grid/);
  assert.ok(output.endsWith('<main data-astro-cid-present></main><script>const template="data-astro-cid-absent";</script>'));
});
