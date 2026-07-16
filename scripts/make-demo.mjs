import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const bundle = readFileSync('dist/dohwa.global.js', 'utf8');
const template = readFileSync('demo/template.html', 'utf8');

if (!template.includes('__DOHWA_VERSION__')) {
  throw new Error(
    'demo/template.html has no __DOHWA_VERSION__ placeholder — the demo would ship a stale version string',
  );
}

// Version first, bundle second: the bundle is never scanned for placeholders.
// Both use a function replacer so `$&` and friends in the replacement stay literal.
const html = template
  .replaceAll('__DOHWA_VERSION__', () => version)
  .replace('/*__DOHWA_BUNDLE__*/', () => bundle);

writeFileSync('demo/index.html', html);
console.log(`demo/index.html generated: v${version}, ${html.length} bytes`);