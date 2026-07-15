import { defineConfig } from 'tsup';

export default defineConfig([
  // Library: subpath entries, ESM + .d.ts, tree-shakeable
  {
    entry: {
      index: 'src/index.ts',
      ui: 'src/ui.ts',
      presets: 'src/presets.ts',
      nodes: 'src/nodes.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2020',
  },
  // Script-tag build: everything on window.Dohwa (IIFE), minified
  {
    entry: { 'dohwa.global': 'src/global.ts' },
    format: ['iife'],
    globalName: 'Dohwa',
    minify: true,
    sourcemap: true,
    target: 'es2020',
    outExtension: () => ({ js: '.js' }),
  },
]);
