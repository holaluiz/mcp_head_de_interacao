// Servidor estático embutido no MCP: um por projeto, porta própria e estável,
// sem cache (um frame ausente nunca fica "preso"), Range para vídeos, e um
// registro dos 404 para a verificação apontar frames/imagens faltando.
import http from 'node:http';
import net from 'node:net';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { readJson, portFor } from './util.js';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.xml': 'application/xml', '.map': 'application/json',
};

const ativos = new Map(); // dir → { server, port, url, missing: [] }

function livre(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, host);
  });
}

function handler(root, reg) {
  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let relPath = decodeURIComponent(url.pathname);
      if (relPath.endsWith('/')) relPath += 'index.html';
      const file = path.normalize(path.join(root, relPath));
      if (!file.startsWith(root)) { res.writeHead(403).end('Proibido'); return; }
      let st = null;
      try { st = await fs.stat(file); } catch { /* ausente */ }
      if (st && st.isDirectory()) { res.writeHead(302, { Location: url.pathname + '/' }).end(); return; }
      if (!st) {
        // SPA: rotas sem extensão caem no index.html
        if (!path.extname(relPath)) {
          try { const idx = path.join(root, 'index.html'); const s2 = await fs.stat(idx); res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store', 'Content-Length': s2.size }); createReadStream(idx).pipe(res); return; } catch { /* sem index */ }
        }
        if (!/favicon|\.map$/.test(relPath)) { reg.missing.push(relPath); if (reg.missing.length > 500) reg.missing.shift(); }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end('404 ' + relPath);
        return;
      }
      const headers = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' };
      const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (range) {
        const start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
        if (start >= st.size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
        res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
        if (req.method === 'HEAD') { res.end(); return; }
        createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, { ...headers, 'Content-Length': st.size });
      if (req.method === 'HEAD') { res.end(); return; }
      createReadStream(file).pipe(res);
    } catch (e) {
      try { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(String(e && e.message)); } catch { /* fechado */ }
    }
  };
}

/* Serve a pasta. Reaproveita o servidor já aberto pelo MCP; se a porta estiver
 * ocupada por outro processo servindo o MESMO projeto (abrir-site.bat), usa-o. */
export async function servir(dir, { porta } = {}) {
  const root = path.resolve(dir);
  const cur = ativos.get(root);
  if (cur) return { ...cur, reutilizado: true };
  const cfg = (await readJson(path.join(root, '.imersao', 'config.json'), {})) || {};
  let port = porta || cfg.port || portFor(path.basename(root));
  if (!(await livre(port))) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/.imersao/config.json`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) { const other = await r.json(); if (other && cfg.nome && other.nome === cfg.nome) return { root, port, url: `http://127.0.0.1:${port}/`, externo: true, missing: [] }; }
    } catch { /* outro serviço */ }
    let p = port + 1;
    while (!(await livre(p)) && p < port + 60) p++;
    port = p;
  }
  const reg = { root, port, url: `http://127.0.0.1:${port}/`, missing: [] };
  const server = http.createServer(handler(root, reg));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  reg.server = server;
  ativos.set(root, reg);
  return reg;
}

export function parar(dir) {
  const root = dir ? path.resolve(dir) : null;
  const alvo = root ? [ativos.get(root)].filter(Boolean) : [...ativos.values()];
  for (const r of alvo) { try { r.server.close(); } catch { /* ok */ } ativos.delete(r.root); }
  return alvo.map((r) => r.url);
}

export function listar() {
  return [...ativos.values()].map((r) => ({ root: r.root, url: r.url, faltando: r.missing.length }));
}

export function registro(dir) {
  return ativos.get(path.resolve(dir)) || null;
}
