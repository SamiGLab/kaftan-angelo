import globals from 'globals';

const correctness = {
  'constructor-super':'error', 'for-direction':'error', 'getter-return':'error',
  'no-async-promise-executor':'error', 'no-class-assign':'error', 'no-compare-neg-zero':'error',
  'no-cond-assign':'error', 'no-const-assign':'error', 'no-dupe-args':'error',
  'no-dupe-class-members':'error', 'no-dupe-else-if':'error', 'no-dupe-keys':'error',
  'no-duplicate-case':'error', 'no-ex-assign':'error', 'no-func-assign':'error',
  'no-import-assign':'error', 'no-invalid-regexp':'error', 'no-new-native-nonconstructor':'error',
  'no-obj-calls':'error', 'no-promise-executor-return':'error', 'no-setter-return':'error',
  'no-unreachable':'error', 'no-unsafe-finally':'error', 'no-unsafe-negation':'error',
  'no-undef':'error', 'use-isnan':'error', 'valid-typeof':'error',
};

export default [
  {ignores:['node_modules/**','dist/**','.astro/**','.lighthouseci/**']},
  {files:['_dev/scripts/**/*.mjs','services/**/*.mjs','src/pages/*.js','*.mjs','*.cjs'],languageOptions:{globals:globals.node},rules:correctness},
  {files:['_dev/scripts/test-*.mjs'],languageOptions:{globals:globals.browser}},
  {files:['services/decap-auth/worker.mjs','services/partner-security/**/*.mjs','services/partner-intake/validation.mjs'],languageOptions:{globals:globals.worker}},
  {files:['public/assets/js/*.js'],languageOptions:{sourceType:'script',globals:{...globals.browser,lucide:'readonly'}},rules:correctness},
];
