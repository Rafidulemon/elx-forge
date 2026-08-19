import { build } from 'vite';
import { resolve } from 'node:path';

const root = process.cwd();
const aliases = {
  '@shared': resolve(root, 'src/shared'),
  '@content': resolve(root, 'src/content'),
  '@background': resolve(root, 'src/background'),
  '@injected': resolve(root, 'src/injected'),
};

const entries = {
  background: resolve(root, 'src/background/index.ts'),
  content: resolve(root, 'src/content/index.ts'),
  injected: resolve(root, 'src/injected/index.ts'),
};

for (const [name, entry] of Object.entries(entries)) {
  console.log(`\nBuilding ${name}.js ...`);
  await build({
    configFile: false,
    logLevel: 'info',
    resolve: { alias: aliases },
    build: {
      outDir: resolve(root, 'dist'),
      emptyOutDir: false,
      sourcemap: false,
      lib: {
        name: 'ElxForge',
        entry,
        formats: ['iife'],
        fileName: () => `${name}.js`,
      },
    },
  });
}

console.log('\nAll extension scripts built.');