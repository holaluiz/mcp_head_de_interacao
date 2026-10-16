#!/usr/bin/env node
// Servidor local do site (sem dependências). Cada site tem sua própria porta,
// nunca guarda em cache um arquivo ausente e suporta Range para vídeos.
//   node server.mjs            → serve na porta do projeto
//   node server.mjs --open     → e abre o navegador
//   node server.mjs --port 5200
import http from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
let port = Number(flag('--port')) || 0;
if (!port) { try { port = Number(JSON.parse(await fs.readFile(path.join(ROOT, '.imersao', 'config.json'), 'utf8')).port) || 0; } catch { /* sem config */ } }
if (!port) port = 5173;
const host = flag('--host') || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('Proibido'); return; }
    let st;
    try { st = await fs.stat(file); } catch { st = null; }
    if (st && st.isDirectory()) { res.writeHead(302, { Location: url.pathname + '/' }).end(); return; }
    if (!st) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end('404 ' + rel);
      if (!/favicon/.test(rel)) console.warn('[404]', rel);
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' };
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
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(String(e && e.message));
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`A porta ${port} já está em uso. Rode com --port <outra>.`);
  else console.error(e);
  process.exit(1);
});

server.listen(port, host, () => {
  const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`;
  console.log(`Site no ar: ${url}`);
  console.log('Modo solo para screenshots: ?solo=<capitulo>:0.5  ·  sem som: ?mute=1  ·  depuração: ?debug=1');
  if (args.includes('--open')) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd);
  }
});
