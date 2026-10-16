import { promises as fs, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ENGINE_DIR = path.join(ROOT, 'engine');
export const TEMPLATES_DIR = path.join(ROOT, 'templates');

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Escapa tudo e reabre só um punhado de tags inofensivas de ênfase. */
export function richText(s) {
  return esc(s).replace(/&lt;(\/?)(strong|em|b|i|br|small|span)\s*\/?&gt;/gi, '<$1$2>');
}

export function attrs(obj) {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (v === true) { out.push(k); continue; }
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
    out.push(`${k}="${esc(val)}"`);
  }
  return out.join(' ');
}

export function slug(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'site';
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* Cada site ganha sua própria porta, estável pelo nome (5100–5899). */
export function portFor(name) {
  return 5100 + (hashStr(String(name || 'site')) % 800);
}

export async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }
export function exists(p) { return existsSync(p); }
export function isDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }

export async function readJson(p, fallback = null) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fallback; }
}
export async function writeJson(p, data) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
export async function writeText(p, text) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, text, 'utf8');
}

const SKIP = new Set(['node_modules', '.git', '.imersao', '.next', '.cache', 'dist-imersivo']);
export async function copyDir(src, dest, { skip = SKIP, filter } = {}) {
  await ensureDir(dest);
  let count = 0;
  for (const ent of await fs.readdir(src, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const s = path.join(src, ent.name), d = path.join(dest, ent.name);
    if (filter && !filter(s, ent)) continue;
    if (ent.isDirectory()) count += await copyDir(s, d, { skip, filter });
    else if (ent.isFile()) { await fs.copyFile(s, d); count++; }
  }
  return count;
}

export async function listFiles(dir, { exts, max = 5000, skip = SKIP } = {}) {
  const out = [];
  async function walk(d) {
    if (out.length >= max) return;
    let ents;
    try { ents = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (skip.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (!exts || exts.includes(path.extname(e.name).toLowerCase())) out.push(p);
      if (out.length >= max) return;
    }
  }
  await walk(dir);
  return out;
}

export function rel(from, to) { return path.relative(from, to).split(path.sep).join('/'); }

export function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

export function lang(ctx) { return String((ctx && ctx.lang) || 'pt-BR'); }
export function isEn(ctx) { return lang(ctx).toLowerCase().startsWith('en'); }
export function tr(ctx) { return (pt, en) => (isEn(ctx) ? en : pt); }

/* Resposta padrão das ferramentas: texto legível + JSON estruturado. */
export function result(text, data) {
  const content = [{ type: 'text', text }];
  if (data !== undefined) content.push({ type: 'text', text: '```json\n' + JSON.stringify(data, null, 2) + '\n```' });
  return { content };
}
export function fail(text) {
  return { content: [{ type: 'text', text }], isError: true };
}
