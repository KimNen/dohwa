import { readFileSync, writeFileSync } from 'node:fs';
const bundle = readFileSync('dist/dohwa.global.js', 'utf8');
const template = readFileSync('demo/bench-template.html', 'utf8');
writeFileSync('demo/bench.html', template.replace('/*__DOHWA_BUNDLE__*/', () => bundle));
console.log('demo/bench.html generated');
