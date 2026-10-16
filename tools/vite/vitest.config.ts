/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import paths from '../paths';

export default defineConfig({
  root: paths.srcDir,
  cacheDir: `${paths.rootDir}/node_modules/.vite`,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      reporter: ['text', 'html'],
      include: [`${paths.srcDir}/**/*.tsx`, `${paths.srcDir}/**/*.ts`],
    },
    mockReset: true,
    clearMocks: true,
    testTimeout: 5000,
    css: true,
  },
});
