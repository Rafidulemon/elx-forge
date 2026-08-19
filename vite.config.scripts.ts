import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(root, 'src/shared'),
      '@content': resolve(root, 'src/content'),
      '@background': resolve(root, 'src/background'),
      '@injected': resolve(root, 'src/injected'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      name: 'ElxStudio',
      entry: {
        background: resolve(root, 'src/background/index.ts'),
        content: resolve(root, 'src/content/index.ts'),
        injected: resolve(root, 'src/injected/index.ts'),
      },
      formats: ['iife'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
  },
});
