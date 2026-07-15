import { build } from 'esbuild';

const entries = {
  index: 'src/index.ts',
  ui: 'src/ui.ts',
  presets: 'src/presets.ts',
  nodes: 'src/nodes.ts',
};

for (const [name, entry] of Object.entries(entries)) {
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    outfile: `dist/${name}.js`,
    sourcemap: true,
  });
}

// IIFE bundle — everything on window.Dohwa (script-tag / demo usage)
await build({
  entryPoints: ['src/global.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'Dohwa',
  outfile: 'dist/dohwa.global.js',
  minify: true,
});

console.log('build ok');
