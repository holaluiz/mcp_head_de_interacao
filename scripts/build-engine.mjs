// Junta engine/src/*.js em engine/imersao.js e copia o Lenis para engine/vendor.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const srcDir = join(root, 'engine', 'src');
const parts = readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
const code = parts.map((f) => readFileSync(join(srcDir, f), 'utf8')).join('\n').replaceAll('__VERSION__', pkg.version);
writeFileSync(join(root, 'engine', 'imersao.js'), code);

const require = createRequire(import.meta.url);
const lenis = require.resolve('lenis/dist/lenis.min.js');
mkdirSync(join(root, 'engine', 'vendor'), { recursive: true });
copyFileSync(lenis, join(root, 'engine', 'vendor', 'lenis.min.js'));
console.log(`engine/imersao.js: ${parts.length} partes, ${(code.length / 1024).toFixed(1)} KB · lenis copiado`);
