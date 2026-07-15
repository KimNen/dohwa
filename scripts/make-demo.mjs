import { readFileSync, writeFileSync } from 'node:fs';

const bundle = readFileSync('dist/dohwa.global.js', 'utf8');
const template = readFileSync('demo/template.html', 'utf8');
const html = template.replace('/*__DOHWA_BUNDLE__*/', () => bundle);
writeFileSync('demo/index.html', html);
console.log('demo/index.html generated:', html.length, 'bytes');
