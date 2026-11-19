import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@safar-shared': fileURLToPath(new URL('../src/lib', import.meta.url)),
    },
  },
  css: { postcss: { plugins: [] } },
  server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  build: { target: ['es2022', 'safari15'] },
});
