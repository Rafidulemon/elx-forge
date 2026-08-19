import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = process.cwd();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(root, 'src/shared'),
      '@ui': resolve(root, 'src/ui'),
      '@content': resolve(root, 'src/content'),
      '@background': resolve(root, 'src/background'),
      '@injected': resolve(root, 'src/injected'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(root, 'index.html'),
        popup: resolve(root, 'popup.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
