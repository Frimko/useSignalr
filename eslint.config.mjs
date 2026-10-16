import { FlatCompat } from '@eslint/eslintrc';
import eslint from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line no-undef
const configDirectory = fileURLToPath(new URL('.', import.meta.url));

const compat = new FlatCompat({
  baseDirectory: configDirectory,
  recommendedConfig: eslint.configs.recommended,
});

/** @type {import('eslint').Linter.Config} */
const forTSFiles = {
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
    globals: { ...globals.node, ...globals.browser },
  },
  plugins: {
    '@stylistic': stylisticPlugin,
    '@typescript-eslint': tsPlugin,
    import: importPlugin,
  },
  rules: {
    ...tsPlugin.configs.recommended.rules,
    '@stylistic/object-curly-spacing': ['warn', 'always'],
    '@stylistic/padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: ['export'] },
      { blankLine: 'never', prev: ['case'], next: '*' },
      {
        blankLine: 'any',
        prev: ['const', 'let', 'var'],
        next: ['const', 'let', 'var'],
      },
      {
        blankLine: 'always',
        prev: [
          'multiline-const',
          'multiline-let',
          'multiline-var',
          'block-like',
        ],
        next: '*',
      },
    ],
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-empty-object-type': [
      'error',
      { allowInterfaces: 'never', allowObjectTypes: 'always' },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/no-unused-expressions': [
      'error',
      { allowShortCircuit: true },
    ],
    'import/no-cycle': ['error', { maxDepth: 10 }],
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Program > ExportDefaultDeclaration:not(:last-child)',
        message: 'export default must be the last statement in the file',
      },
      {
        selector: 'ExportDefaultDeclaration > FunctionDeclaration',
        message:
          'Declare the function separately and use export default at the bottom of the file',
      },
    ],
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
  },
};

/** @type {import('eslint').Linter.Config} */
const forTestFiles = {
  files: ['**/*.test.ts', '**/*.test.tsx'],
  languageOptions: {
    globals: globals.vitest,
  },
};

export default defineConfig([
  {
    ignores: [
      '**/node_modules/**',
      '.yarn/**',
      '.idea/**',
      'mocks/generated/**',
      '**/*.json',
      'dist/**',
      'coverage/**',
    ],
  },
  ...compat.extends('eslint:recommended', 'plugin:prettier/recommended'),
  forTSFiles,
  forTestFiles,
]);
