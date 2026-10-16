import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import paths from '../paths';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [react()],
  base: '/',
  root: paths.srcDir,
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    outDir: paths.distDir,
    copyPublicDir: true,
    emptyOutDir: true,
    lib: {
      entry: `${paths.srcDir}/hooks/index.ts`,
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@microsoft/signalr'],
      output: {
        dir: paths.distDir,
        hoistTransitiveImports: false,
      },
    },
    chunkSizeWarningLimit: 4096,
  },
});
