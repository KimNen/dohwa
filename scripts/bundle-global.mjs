/**
 * Minimal IIFE bundler for the script-tag build.
 * The project has zero runtime dependencies and only relative imports,
 * so a topological inline + re-export flattening is enough — no esbuild needed.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { transform } from 'esbuild';

const ENTRY = 'dist/global.js';
const OUT = 'dist/dohwa.global.js';

const modules = new Map(); // path -> { code, deps, exports }
const order = [];

/** Collect `export { a, b } from './x.js'`, `export * from './x.js'`, `import ... from './x.js'` */
function parse(file) {
  const src = readFileSync(file, 'utf8');
  const deps = [];
  const reexports = []; // { names: [{local, exported}] | '*', from }

  const specRe = /from\s+['"](\.\/[^'"]+)['"]/g;
  let m;
  while ((m = specRe.exec(src))) {
    deps.push(resolve(dirname(file), m[1]));
  }

  // export * from './x.js'
  const starRe = /export\s+\*\s+from\s+['"](\.\/[^'"]+)['"]\s*;?/g;
  while ((m = starRe.exec(src))) {
    reexports.push({ names: '*', from: resolve(dirname(file), m[1]) });
  }
  // export { a, b as c } from './x.js'
  const namedRe = /export\s*\{([^}]*)\}\s*from\s+['"](\.\/[^'"]+)['"]\s*;?/g;
  while ((m = namedRe.exec(src))) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('type '))
      .map((s) => {
        const [local, , exported] = s.split(/\s+/);
        return { local, exported: exported || local };
      });
    reexports.push({ names, from: resolve(dirname(file), m[2]) });
  }

  return { src, deps: [...new Set(deps)], reexports };
}

/** Strip import/export syntax, leaving plain declarations in one shared scope. */
function stripModuleSyntax(src) {
  return src
    // import ... from '...';  (side-effect free — everything is inlined)
    .replace(/^import\s+[^;]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    // export { ... } from '...';  and  export * from '...';
    .replace(/^export\s*\{[^}]*\}\s*from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^export\s+\*\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    // export { a, b };  (local re-export — declarations already exist)
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
    // export const/function/class/let/var  ->  drop the keyword
    .replace(/^export\s+(default\s+)?(const|let|var|function|class|async)\b/gm, '$2');
}

/** Which top-level names does a module declare? */
function declaredNames(code) {
  const names = new Set();
  const re = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(code))) names.add(m[1]);
  const asyncRe = /^async\s+function\s+([A-Za-z_$][\w$]*)/gm;
  while ((m = asyncRe.exec(code))) names.add(m[1]);
  return names;
}

function visit(file, seen = new Set()) {
  const path = file;
  if (modules.has(path)) return;
  if (seen.has(path)) return; // cycle — types only, safe to skip
  seen.add(path);
  if (!existsSync(path)) throw new Error(`missing module: ${path}`);
  const mod = parse(path);
  modules.set(path, mod);
  for (const dep of mod.deps) visit(dep, seen);
  order.push(path);
}

visit(resolve(ENTRY));

// entry is last in `order` (post-order DFS) — inline deps first
const bodies = [];
const allNames = new Set();
for (const path of order) {
  const mod = modules.get(path);
  const code = stripModuleSyntax(mod.src).trim();
  if (code) {
    bodies.push(`// ---- ${path.replace(process.cwd() + '/', '')}\n${code}`);
    for (const n of declaredNames(code)) allNames.add(n);
  }
}

// Public surface = everything declared across the graph that the entry re-exports.
// Since global.ts does `export * from` each entry, exposing all declared names is correct.
const exported = [...allNames].sort();

const out = `var Dohwa = (function () {
${bodies.join('\n\n')}

return { ${exported.join(', ')} };
})();
`;

// Minify — this file is fetched directly by a <script> tag, so bytes here are
// transfer size, unlike the ESM entries which the consumer's bundler compresses.
const { code } = await transform(out, { minify: true, target: 'es2020' });
const banner = '/* dohwa — IIFE build. window.Dohwa.* */\n';

writeFileSync(OUT, banner + code);
console.log(
  `bundled ${order.length} modules -> ${OUT} ` +
    `(${code.length} bytes, was ${out.length}, ${exported.length} exports)`,
);
