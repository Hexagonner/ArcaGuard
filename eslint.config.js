import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.vitest/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: { globals: globals.browser },
    rules: { 'no-eval': 'error', 'no-implied-eval': 'error' },
  },
  {
    files: ['*.config.js', 'scripts/**/*.js', 'tests/build.test.js'],
    languageOptions: { globals: globals.node },
  },
];
