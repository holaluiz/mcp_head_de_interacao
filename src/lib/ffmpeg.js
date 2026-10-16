// Pipeline de vídeo com ffmpeg: análise, corte de frames parados, detecção de
// cortes secos, fatiamento em frames, fallback MP4, pôster, folha de contato,
// interpolação de fps, concatenação de clipes encadeados e alinhamento de placas.
import { spawn, spawnSync } from 'node:child_process';
import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';
import { ensureDir } from './util.js';

let _bins = null;
export function findFfmpeg() {
  if (_bins) return _bins;
  const cands = [process.env.FFMPEG_PATH, 'ffmpeg'].filter(Boolean);
  for (const c of cands) {
    try {
      const r = spawnSync(c, ['-hide_banner', '-version'], { encoding: 'utf8', windowsHide: true });
      if (r.status === 0) {
        let probe = null;
        const guess = c === 'ffmpeg' ? 'ffprobe' : path.join(path.dirname(c), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
        const pr = spawnSync(guess, ['-version'], { encoding: 'utf8', windowsHide: true });
        if (pr.status === 0) probe = guess;
        _bins = { ffmpeg: c, ffprobe: probe, version: (r.stdout.split('\n')[0] || '').trim() };
        return _bins;
      }
    } catch { /* tenta o próximo */ }
  }
  return null;
}

export function comoInstalar() {
  if (process.platform === 'win32') return 'Instale com: winget install Gyan.FFmpeg  (ou choco install ffmpeg). Depois reinicie o cliente MCP, ou defina FFMPEG_PATH com o caminho do ffmpeg.exe.';
  if (process.platform === 'darwin') return 'Instale com: brew install ffmpeg. Ou defina FFMPEG_PATH.';
  return 'Instale com: sudo apt install ffmpeg (ou o gerenciador da sua distro). Ou defina FFMPEG_PATH.';
}

export function run(bin, args, { timeout = 15 * 60 * 1000 } = {}) {
  return new Promise((resolve) => {
    const p = spawn(bin, args, { windowsHide: true });
    let out = '', err = '';
    const t = setTimeout(() => { p.kill('SIGKILL'); err += '\n[tempo esgotado]'; }, timeout);
    p.stdout.on('data', (d) => { out += d; if (out.length > 4e6) out = out.slice(-2e6); });
    p.stderr.on('data', (d) => { err += d; if (err.length > 4e6) err = err.slice(-2e6); });
    p.on('error', (e) => { clearTimeout(t); resolve({ code: -1, stdout: out, stderr: String(e.message) }); });
    p.on('close', (code) => { clearTimeout(t); resolve({ code, stdout: out, stderr: err }); });
  });
}
function runBuf(bin, args) {
  return new Promise((resolve) => {
    const p = spawn(bin, args, { windowsHide: true });
    const chunks = [];
    let err = '';
    p.stdout.on('data', (d) => chunks.push(d));
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => resolve({ code: -1, buf: null, stderr: String(e.message) }));
    p.on('close', (code) => resolve({ code, buf: Buffer.concat(chunks), stderr: err }));
  });
}
function need() {
  const b = findFfmpeg();
  if (!b) throw new Error('ffmpeg não encontrado. ' + comoInstalar());
  return b;
}
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };

export async function probe(file) {
  const b = need();
  if (!existsSync(file)) throw new Error('Arquivo não encontrado: ' + file);
  if (b.ffprobe) {
    const r = await run(b.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,codec_name:format=duration,size', '-of', 'json', file]);
    try {
      const j = JSON.parse(r.stdout);
      const s = (j.streams || [])[0] || {};
      const fr = String(s.avg_frame_rate && s.avg_frame_rate !== '0/0' ? s.avg_frame_rate : s.r_frame_rate || '0/1').split('/');
      return { duration: num(j.format && j.format.duration), width: s.width || 0, height: s.height || 0, fps: num(fr[0]) / (num(fr[1], 1) || 1), frames: num(s.nb_frames, 0) || null, codec: s.codec_name || '', size: num(j.format && j.format.size) };
    } catch { /* cai para o parse do ffmpeg */ }
  }
  const r = await run(b.ffmpeg, ['-hide_banner', '-i', file]);
  const d = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(r.stderr);
  const v = /Video:\s*([^,\s]+).*?,\s*(\d{2,5})x(\d{2,5})/.exec(r.stderr);
  const f = /([\d.]+)\s*fps/.exec(r.stderr);
  return { duration: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0, width: v ? +v[2] : 0, height: v ? +v[3] : 0, fps: f ? +f[1] : 0, frames: null, codec: v ? v[1] : '' };
}

/* Trechos parados (o Kling segura o primeiro frame; o Seedance termina rápido e segura o último). */
export async function detectFreezes(file, { noise = 0.003, minDur = 0.3 } = {}) {
  const b = need();
  const r = await run(b.ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-map', '0:v:0', '-vf', `freezedetect=n=${noise}:d=${minDur}`, '-f', 'null', '-']);
  const out = [];
  let cur = null;
  for (const line of r.stderr.split('\n')) {
    let m;
    if ((m = /freeze_start:\s*([\d.]+)/.exec(line))) cur = { start: +m[1], end: null };
    else if ((m = /freeze_end:\s*([\d.]+)/.exec(line)) && cur) { cur.end = +m[1]; out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

/* Cortes secos: parecem quebrados quando o visitante rola para trás. */
export async function detectCuts(file, { threshold = 0.38 } = {}) {
  const b = need();
  const r = await run(b.ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-map', '0:v:0', '-vf', `select='gt(scene,${threshold})',showinfo`, '-f', 'null', '-']);
  const out = [];
  for (const line of r.stderr.split('\n')) {
    const m = /pts_time:([\d.]+)/.exec(line);
    if (m && +m[1] > 0.15) out.push(+(+m[1]).toFixed(2));
  }
  return out;
}

/* Quanto o quadro muda ao longo do clipe: mostra se a mudança se espalha ou acontece num instante. */
export async function motionProfile(file, { buckets = 10 } = {}) {
  const b = need();
  const r = await run(b.ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-map', '0:v:0', '-vf', "scale=160:-2,select='gte(scene,0)',metadata=print:key=lavfi.scene_score", '-f', 'null', '-']);
  const scores = [];
  const times = [];
  let t = null;
  for (const line of r.stderr.split('\n')) {
    let m;
    if ((m = /pts_time:([\d.]+)/.exec(line))) t = +m[1];
    else if ((m = /lavfi\.scene_score=([\d.]+)/.exec(line))) { scores.push(+m[1]); times.push(t); }
  }
  if (!scores.length) return null;
  const dur = times[times.length - 1] || 1;
  const sums = new Array(buckets).fill(0);
  scores.forEach((s, i) => { sums[Math.min(buckets - 1, Math.floor(((times[i] || 0) / dur) * buckets))] += s; });
  const total = sums.reduce((a, x) => a + x, 0) || 1;
  const share = sums.map((x) => +(x / total).toFixed(3));
  const sorted = [...share].sort((a, b2) => b2 - a);
  return { porTrecho: share, concentracao: +(sorted[0] + sorted[1]).toFixed(3) };
}

export async function analyze(file) {
  const info = await probe(file);
  const [freezes, cuts, motion] = await Promise.all([detectFreezes(file), detectCuts(file), motionProfile(file)]);
  const dur = info.duration;
  let trimStart = 0, trimEnd = dur;
  const head = freezes.find((f) => f.start <= 0.08);
  if (head && head.end) trimStart = Math.min(head.end, dur * 0.6);
  const tail = freezes.find((f) => f.end === null || Math.abs(f.end - dur) < 0.15);
  if (tail && tail.start > trimStart + 0.5) trimEnd = tail.start;
  const alerts = [];
  if (trimStart > 0.2) alerts.push(`O clipe fica parado nos primeiros ${trimStart.toFixed(2)} s; esse trecho será cortado para a mudança se espalhar pelo scroll.`);
  if (trimEnd < dur - 0.2) alerts.push(`O clipe congela nos últimos ${(dur - trimEnd).toFixed(2)} s; esse trecho será cortado.`);
  const effCuts = cuts.filter((c) => c > trimStart + 0.1 && c < trimEnd - 0.1);
  if (effCuts.length) alerts.push(`Corte(s) seco(s) em ${effCuts.join(', ')} s: rolar para trás vai parecer quebrado. Prefira um take contínuo ("one continuous shot, no cuts").`);
  if (motion && motion.concentracao > 0.55) alerts.push(`${Math.round(motion.concentracao * 100)}% da mudança acontece em 20% do clipe: o momento vai passar rápido demais no scroll. Escolha um take em que a mudança se constrói, ou dê mais scroll a esse trecho com data-im-warp.`);
  if (info.width && info.width < 1280) alerts.push(`Resolução baixa (${info.width}px de largura); frames vão parecer moles em telas grandes.`);
  return { ...info, freezes, cuts, motion, trimStart: +trimStart.toFixed(3), trimEnd: +trimEnd.toFixed(3), alerts };
}

async function cleanFrames(dir) {
  await ensureDir(dir);
  for (const f of await fs.readdir(dir)) if (/^frame_\d+\.(jpe?g|webp|png)$/i.test(f)) await fs.unlink(path.join(dir, f));
}

export async function extractFrames({ input, outDir, count = 200, width = 1920, quality = 3, start = 0, end = null, format = 'jpg' }) {
  const b = need();
  const info = await probe(input);
  const e = end && end > start ? end : info.duration;
  const dur = Math.max(0.1, e - start);
  const fps = (count + 1.5) / dur;
  await cleanFrames(outDir);
  const ext = format === 'webp' ? 'webp' : 'jpg';
  const codec = ext === 'webp' ? ['-c:v', 'libwebp', '-quality', String(Math.max(40, 100 - quality * 6))] : ['-q:v', String(quality)];
  const args = ['-hide_banner', '-y', '-ss', String(start), '-t', String(dur), '-i', input, '-an', '-vf', `fps=${fps.toFixed(6)},scale=${width}:-2:flags=lanczos`, ...codec, '-frames:v', String(count), '-start_number', '1', path.join(outDir, `frame_%04d.${ext}`)];
  const r = await run(b.ffmpeg, args);
  if (r.code !== 0) throw new Error('ffmpeg falhou ao extrair frames:\n' + r.stderr.slice(-1500));
  const files = (await fs.readdir(outDir)).filter((f) => new RegExp(`^frame_\\d{4}\\.${ext}$`).test(f)).sort();
  let bytes = 0;
  for (const f of files) bytes += (await fs.stat(path.join(outDir, f))).size;
  const firstDims = await probe(path.join(outDir, files[0] || ''))
    .catch(() => ({ width, height: 0 }));
  return { count: files.length, ext, bytes, width: firstDims.width || width, height: firstDims.height || 0, fps: +fps.toFixed(3), duration: +dur.toFixed(3) };
}

export async function fallbackMp4({ input, out, start = 0, end = null, width = 1280, crf = 26, allIntra = false }) {
  const b = need();
  const info = await probe(input);
  const e = end && end > start ? end : info.duration;
  await ensureDir(path.dirname(out));
  const x = allIntra ? ['-g', '1', '-keyint_min', '1', '-sc_threshold', '0'] : [];
  const r = await run(b.ffmpeg, ['-hide_banner', '-y', '-ss', String(start), '-t', String(Math.max(0.1, e - start)), '-i', input, '-an', '-vf', `scale=${width}:-2:flags=lanczos`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p', ...x, '-movflags', '+faststart', out]);
  if (r.code !== 0) throw new Error('ffmpeg falhou ao gerar o MP4:\n' + r.stderr.slice(-1200));
  return (await fs.stat(out)).size;
}

export async function grabFrame({ input, out, at = null, last = false, width = 1920 }) {
  const b = need();
  await ensureDir(path.dirname(out));
  const pre = last ? ['-sseof', '-0.25'] : at != null ? ['-ss', String(at)] : [];
  const r = await run(b.ffmpeg, ['-hide_banner', '-y', ...pre, '-i', input, '-frames:v', '1', ...(last ? ['-update', '1'] : []), '-vf', `scale=${width}:-2:flags=lanczos`, '-q:v', '2', out]);
  if (r.code !== 0 || !existsSync(out)) throw new Error('ffmpeg falhou ao capturar o quadro:\n' + r.stderr.slice(-1200));
  return out;
}

export async function contactSheet({ input, out, cols = 6, rows = 4, width = 320, start = 0, end = null }) {
  const b = need();
  const info = await probe(input);
  const e = end && end > start ? end : info.duration;
  const n = cols * rows;
  const fps = n / Math.max(0.1, e - start);
  await ensureDir(path.dirname(out));
  const r = await run(b.ffmpeg, ['-hide_banner', '-y', '-ss', String(start), '-t', String(e - start), '-i', input, '-vf', `fps=${fps.toFixed(5)},scale=${width}:-2,tile=${cols}x${rows}:padding=4:margin=4:color=black`, '-frames:v', '1', '-q:v', '3', out]);
  if (r.code !== 0) throw new Error('ffmpeg falhou na folha de contato:\n' + r.stderr.slice(-1200));
  return out;
}

export async function interpolate({ input, out, fps = 48 }) {
  const b = need();
  await ensureDir(path.dirname(out));
  const r = await run(b.ffmpeg, ['-hide_banner', '-y', '-i', input, '-an', '-vf', `minterpolate=fps=${fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out], { timeout: 60 * 60 * 1000 });
  if (r.code !== 0) throw new Error('ffmpeg falhou ao interpolar:\n' + r.stderr.slice(-1200));
  return out;
}

/* Une clipes encadeados (último frame = primeiro do próximo) num só. */
export async function concat({ inputs, out, trims = [] }) {
  const b = need();
  const first = await probe(inputs[0]);
  const W = first.width || 1920, H = first.height || 1080;
  const args = ['-hide_banner', '-y'];
  inputs.forEach((f, i) => {
    const t = trims[i] || {};
    if (t.start) args.push('-ss', String(t.start));
    if (t.end && t.end > (t.start || 0)) args.push('-t', String(t.end - (t.start || 0)));
    args.push('-i', f);
  });
  const chains = inputs.map((_, i) => `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[v${i}]`).join(';');
  const cat = inputs.map((_, i) => `[v${i}]`).join('') + `concat=n=${inputs.length}:v=1:a=0[v]`;
  await ensureDir(path.dirname(out));
  args.push('-filter_complex', `${chains};${cat}`, '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out);
  const r = await run(b.ffmpeg, args);
  if (r.code !== 0) throw new Error('ffmpeg falhou ao concatenar:\n' + r.stderr.slice(-1500));
  return out;
}

/* Alinhamento entre duas placas (para a lente raio-X): busca o deslocamento
 * que minimiza a diferença entre os gradientes das duas imagens. */
async function gray(file, w, h) {
  const b = need();
  const r = await runBuf(b.ffmpeg, ['-hide_banner', '-v', 'error', '-i', file, '-vf', `scale=${w}:${h}:flags=area,format=gray`, '-frames:v', '1', '-f', 'rawvideo', '-']);
  if (r.code !== 0 || !r.buf || r.buf.length < w * h) throw new Error('Não consegui ler a imagem ' + file + ': ' + r.stderr.slice(-400));
  return r.buf.subarray(0, w * h);
}
function edges(px, w, h) {
  const e = new Float32Array(w * h);
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    const i = y * w + x;
    e[i] = Math.abs(px[i + 1] - px[i]) + Math.abs(px[i + w] - px[i]);
  }
  return e;
}
export async function measureAlignment(a, b, { width = 320, range = 18 } = {}) {
  const info = await probe(a);
  const ratio = info.width && info.height ? info.height / info.width : 9 / 16;
  const w = width, h = Math.max(8, Math.round(width * ratio));
  const A = edges(await gray(a, w, h), w, h), B = edges(await gray(b, w, h), w, h);
  let best = { dx: 0, dy: 0, err: Infinity };
  const scores = [];
  for (let dy = -range; dy <= range; dy++) for (let dx = -range; dx <= range; dx++) {
    let s = 0, n = 0;
    for (let y = range; y < h - range - 1; y += 1) for (let x = range; x < w - range - 1; x += 1) {
      s += Math.abs(A[y * w + x] - B[(y + dy) * w + (x + dx)]);
      n++;
    }
    const err = s / n;
    scores.push(err);
    if (err < best.err) best = { dx, dy, err };
  }
  const zeroErr = scores[range * (2 * range + 1) + range];
  const sorted = [...scores].sort((x, y) => x - y);
  const conf = sorted[Math.floor(sorted.length / 2)] ? 1 - best.err / sorted[Math.floor(sorted.length / 2)] : 0;
  return {
    deslocamentoPx: { x: best.dx * (info.width || w) / w, y: best.dy * (info.height || h) / h },
    deslocamentoPct: { x: +((best.dx / w) * 100).toFixed(3), y: +((best.dy / h) * 100).toFixed(3) },
    correcaoOffset: `${+(-(best.dx / w) * 100).toFixed(3)},${+(-(best.dy / h) * 100).toFixed(3)}`,
    melhoraSobreZero: zeroErr ? +(1 - best.err / zeroErr).toFixed(3) : 0,
    confianca: +Math.max(0, conf).toFixed(3),
  };
}
