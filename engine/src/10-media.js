/* =====================================================================
 *  SEQUÊNCIAS DE FRAMES E PRÉ-CARREGAMENTO
 * ===================================================================== */
class Seq {
  constructor(name, def) {
    this.name = name;
    this.def = def;
    this.count = Math.max(0, def.frames ? def.frames.length : def.count | 0);
    this.imgs = new Array(this.count);
    this.state = new Uint8Array(this.count); // 0 nada · 1 carregando · 2 ok · 3 falhou
    this.loaded = 0;
    this.failed = 0;
    this.w = def.width || 0;
    this.h = def.height || 0;
  }
  url(i) {
    const d = this.def;
    if (d.frames) return d.frames[i];
    const n = (d.start == null ? 1 : d.start) + i;
    const pad = d.pad == null ? 4 : d.pad;
    return String(d.path || d.pattern || '').replace(/\{i\}|%0(\d)d/g, (m, p1) => String(n).padStart(p1 ? +p1 : pad, '0'));
  }
  load(i) {
    if (this.state[i]) return Promise.resolve();
    this.state[i] = 1;
    return new Promise((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.state[i] = 2; this.imgs[i] = img; this.loaded++;
        if (!this.w) { this.w = img.naturalWidth; this.h = img.naturalHeight; }
        res();
      };
      img.onerror = () => { this.state[i] = 3; this.failed++; logErr('frame', this.url(i)); res(); };
      img.src = this.url(i);
    });
  }
  /* Nunca deixa o loop sem quadro: devolve o frame carregado mais próximo. */
  nearest(i) {
    if (this.state[i] === 2) return this.imgs[i];
    for (let d = 1; d < this.count; d++) {
      const a = i - d, b = i + d;
      if (a >= 0 && this.state[a] === 2) return this.imgs[a];
      if (b < this.count && this.state[b] === 2) return this.imgs[b];
      if (a < 0 && b >= this.count) break;
    }
    return null;
  }
  /* Ordem grosso→fino: permite scrub aproximado antes do fim do carregamento. */
  order() {
    const seen = new Uint8Array(this.count), out = [];
    const push = (i) => { if (i >= 0 && i < this.count && !seen[i]) { seen[i] = 1; out.push(i); } };
    push(0); push(this.count - 1);
    for (const step of [32, 16, 8, 4, 2, 1]) for (let i = 0; i < this.count; i += step) push(i);
    return out;
  }
}

function getSeq(name, def) {
  let s = S.seqs.get(name);
  if (s) return s;
  def = def || (S.manifest.sequences || {})[name];
  if (!def || !((def.frames && def.frames.length) || def.count > 0)) return null;
  s = new Seq(name, def);
  S.seqs.set(name, s);
  return s;
}
function seqDef(name) { return (S.manifest.sequences || {})[name] || null; }
function seqFor(el) {
  const name = attr(el, 'data-im-seq');
  if (name) return getSeq(name);
  const src = attr(el, 'data-im-src');
  const count = num(attr(el, 'data-im-count'), 0);
  if (src && count) return getSeq(src, { path: src, count, start: num(attr(el, 'data-im-start'), 1), pad: num(attr(el, 'data-im-pad'), 4) });
  return null;
}

const Q = { list: [], active: 0, max: 6, critTotal: 0, critDone: 0, started: 0 };
function enqueue(seq, idx, critical) {
  Q.list.push([seq, idx, critical]);
  if (critical) Q.critTotal++;
}
function pump() {
  while (Q.active < Q.max && Q.list.length) {
    const [seq, i, crit] = Q.list.shift();
    if (seq.state[i] >= 2) { if (crit) Q.critDone++; continue; }
    if (seq.state[i] === 1) { if (crit) { Q.active++; waitFrame(seq, i).then(() => { Q.active--; Q.critDone++; pump(); }); } continue; }
    Q.active++;
    seq.load(i).then(() => { Q.active--; if (crit) Q.critDone++; pump(); });
  }
}
function waitFrame(seq, i) {
  return new Promise((res) => { const t = setInterval(() => { if (seq.state[i] >= 2) { clearInterval(t); res(); } }, 50); });
}
function loadProgress() { return Q.critTotal ? Q.critDone / Q.critTotal : 1; }

/* =====================================================================
 *  MÍDIAS DO PALCO
 *  Interface: resize() · draw(p, force) · contentSize() · animated
 * ===================================================================== */
function coverRect(sw, sh, iw, ih, fit) {
  const s = fit === 'contain' ? Math.min(sw / iw, sh / ih) : Math.max(sw / iw, sh / ih);
  const w = iw * s, hh = ih * s;
  return { x: (sw - w) / 2, y: (sh - hh) / 2, w, h: hh };
}

class FramesMedia {
  constructor(ch, el) {
    this.ch = ch; this.el = el; this.kind = 'frames';
    this.seq = seqFor(el);
    this.ctx = el.getContext('2d');
    this.reverse = has(el, 'data-im-reverse');
    this.range = parseRange(attr(el, 'data-im-range'), [0, 1]);
    this.fit = attr(el, 'data-im-fit', 'cover');
    this.idx = -1; this.exact = false; this.shown = -1;
    this.sample = has(el, 'data-im-sample-accent');
    this.lastSample = 0;
  }
  resize() {
    const w = Math.max(1, Math.round(this.el.clientWidth * S.dpr)), hh = Math.max(1, Math.round(this.el.clientHeight * S.dpr));
    if (w !== this.el.width || hh !== this.el.height) { this.el.width = w; this.el.height = hh; }
    this.idx = -1;
  }
  frameAt(p) {
    let q = this.reverse ? 1 - p : p;
    q = lerp(this.range[0], this.range[1], q);
    return clamp(Math.round(q * (this.seq.count - 1)), 0, this.seq.count - 1);
  }
  draw(p, force) {
    if (!this.seq || !this.seq.count) return;
    const i = this.frameAt(p);
    if (i === this.idx && this.exact && !force) return;
    const img = this.seq.nearest(i);
    if (!img) return;
    const ctx = this.ctx, cw = this.el.width, chh = this.el.height;
    const r = coverRect(cw, chh, img.naturalWidth, img.naturalHeight, this.fit);
    try {
      if (this.fit === 'contain' || r.x > 0 || r.y > 0) { ctx.fillStyle = S.bgColor || '#000'; ctx.fillRect(0, 0, cw, chh); }
      ctx.drawImage(img, r.x, r.y, r.w, r.h);
    } catch (e) { logErr('desenho', e); }
    this.idx = i;
    this.exact = img === this.seq.imgs[i];
    this.shown = this.exact ? i : this.seq.imgs.indexOf(img);
    if (this.sample) sampleAccentFrom(this, img);
  }
  contentSize() { return this.seq && this.seq.w ? [this.seq.w, this.seq.h] : [16, 9]; }
}

class ImageMedia {
  constructor(ch, el) {
    this.ch = ch; this.el = el; this.kind = 'image';
    this.img = el.tagName === 'IMG' ? el : $('img', el);
    this.fit = attr(el, 'data-im-fit', 'cover');
    this.sample = has(el, 'data-im-sample-accent');
    if (this.img && this.sample) this.img.addEventListener('load', () => sampleAccentFrom(this, this.img, true));
  }
  resize() {}
  draw() {}
  contentSize() { const i = this.img; return i && i.naturalWidth ? [i.naturalWidth, i.naturalHeight] : [16, 9]; }
}

class VideoMedia {
  constructor(ch, el) {
    this.ch = ch; this.el = el; this.kind = 'video';
    this.v = el.tagName === 'VIDEO' ? el : $('video', el);
    this.reverse = has(el, 'data-im-reverse');
    this.range = parseRange(attr(el, 'data-im-range'), [0, 1]);
    this.fit = attr(el, 'data-im-fit', 'cover');
    if (this.v) { this.v.muted = true; this.v.playsInline = true; this.v.preload = 'auto'; this.v.pause(); }
  }
  resize() {}
  draw(p) {
    const v = this.v;
    if (!v || !v.duration || v.seeking) return;
    let q = this.reverse ? 1 - p : p;
    q = lerp(this.range[0], this.range[1], q);
    const t = clamp(q * v.duration, 0, v.duration - 0.04);
    if (Math.abs(v.currentTime - t) > 1 / 60) { try { v.currentTime = t; } catch (e) { /* ignora */ } }
  }
  contentSize() { const v = this.v; return v && v.videoWidth ? [v.videoWidth, v.videoHeight] : [16, 9]; }
}

class LoopMedia {
  constructor(ch, el) {
    this.ch = ch; this.el = el; this.kind = 'loop';
    this.v = el;
    el.muted = true; el.loop = true; el.playsInline = true; el.autoplay = true;
    el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
    const play = () => { const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); };
    el.addEventListener('canplay', play, { once: true });
    play();
  }
  resize() {}
  draw() {}
  contentSize() { const v = this.v; return v.videoWidth ? [v.videoWidth, v.videoHeight] : [16, 9]; }
}

/* Várias fotos que avançam e se fundem: a "caminhada" sem vídeo. */
class StillsMedia {
  constructor(ch, el) {
    this.ch = ch; this.el = el; this.kind = 'stills';
    this.imgs = $$('img', el);
    this.overlap = clamp(num(attr(el, 'data-im-overlap'), 0.35), 0.05, 0.9);
    this.zoom = num(attr(el, 'data-im-zoom'), 0.14);
    this.last = -1;
  }
  resize() { this.last = -1; }
  draw(p, force) {
    if (Math.abs(p - this.last) < 1e-4 && !force) return;
    this.last = p;
    const n = this.imgs.length;
    if (!n) return;
    const u = p * n, ov = this.overlap;
    this.imgs.forEach((img, k) => {
      const o = k === 0 ? 1 : clamp((u - (k - ov)) / ov, 0, 1);
      const local = clamp((u - k + ov) / (1 + ov), 0, 1);
      const s = 1.02 + this.zoom * local;
      const dx = (k % 2 ? -1 : 1) * 1.6 * (local - 0.5);
      img.style.opacity = o.toFixed(3);
      img.style.transform = `translate3d(${dx.toFixed(2)}%,0,0) scale(${s.toFixed(4)})`;
      img.style.visibility = o > 0.001 ? 'visible' : 'hidden';
    });
  }
  contentSize() { const i = this.imgs[0]; return i && i.naturalWidth ? [i.naturalWidth, i.naturalHeight] : [16, 9]; }
}

/* Antes → depois com uma linha de restauração que varre a imagem. */
class WipeMedia {
  constructor(ch, el) {
    this.ch = ch; this.el = el; this.kind = 'wipe';
    this.keys = parseKeys(attr(el, 'data-im-keys')) || [[0, 0], [1, 1]];
    this.dir = attr(el, 'data-im-dir', 'ltr');
    el.classList.add('im-wipe', 'im-wipe--' + this.dir);
    if (!$('.im-wipe-line', el)) el.appendChild(h('i', 'im-wipe-line'));
    this.last = -1;
  }
  resize() {}
  draw(p, force) {
    const w = clamp(+sampleKeys(this.keys, p) || 0, 0, 1);
    if (Math.abs(w - this.last) < 1e-4 && !force) return;
    this.last = w;
    this.el.style.setProperty('--im-w', (w * 100).toFixed(2) + '%');
    this.el.style.setProperty('--im-wv', w.toFixed(4));
  }
  contentSize() { const i = $('img', this.el); return i && i.naturalWidth ? [i.naturalWidth, i.naturalHeight] : [16, 9]; }
}

/* Explosão em fragmentos de uma foto: a "explosão e remontagem" sem vídeo. */
class ShatterMedia {
  constructor(ch, el) {
    this.ch = ch; this.el = el; this.kind = 'shatter';
    this.ctx = el.getContext('2d');
    this.keys = parseKeys(attr(el, 'data-im-keys')) || [[0, 0], [1, 1]];
    this.fit = attr(el, 'data-im-fit', 'contain');
    const g = String(attr(el, 'data-im-grid', '12x7')).split('x').map((n) => clamp(parseInt(n, 10) || 8, 2, 40));
    this.cols = g[0]; this.rows = g[1] || g[0];
    this.flare = attr(el, 'data-im-flare', 'accent');
    this.img = new Image();
    this.img.onload = () => { this.ready = true; this.last = -1; };
    this.img.onerror = () => logErr('midia', 'imagem do shatter: ' + this.img.src);
    this.img.src = attr(el, 'data-im-src', '');
    const rnd = rng(hash(this.img.src || 'im'));
    this.tiles = [];
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const cx = (x + 0.5) / this.cols - 0.5, cy = (y + 0.5) / this.rows - 0.5;
      const len = Math.hypot(cx, cy) || 0.001;
      const ang = Math.atan2(cy, cx) + (rnd() - 0.5) * 0.9;
      this.tiles.push({ x, y, ang, dist: 0.25 + rnd() * 0.75 + len * 0.6, rot: (rnd() - 0.5) * 2.4, z: rnd() * 1.1 - 0.35, delay: rnd() * 0.25 });
    }
    this.tiles.sort((a, b) => a.z - b.z);
    this.last = -1;
  }
  resize() {
    const w = Math.max(1, Math.round(this.el.clientWidth * S.dpr)), hh = Math.max(1, Math.round(this.el.clientHeight * S.dpr));
    if (w !== this.el.width || hh !== this.el.height) { this.el.width = w; this.el.height = hh; }
    this.last = -1;
  }
  draw(p, force) {
    if (!this.ready) return;
    const amt = clamp(+sampleKeys(this.keys, p) || 0, 0, 1.5);
    if (Math.abs(amt - this.last) < 1e-4 && !force) return;
    this.last = amt;
    const ctx = this.ctx, cw = this.el.width, chh = this.el.height, img = this.img;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const r = coverRect(cw, chh, iw, ih, this.fit);
    const sc = r.w / iw;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = S.bgColor || '#000';
    ctx.fillRect(0, 0, cw, chh);
    const tw = iw / this.cols, th = ih / this.rows, spread = Math.max(cw, chh) * 0.55;
    for (const t of this.tiles) {
      const a = EASE.inout(clamp((amt - t.delay) / (1 - t.delay), 0, 1));
      const cx = r.x + (t.x + 0.5) * tw * sc, cy = r.y + (t.y + 0.5) * th * sc;
      const k = 1 + t.z * a * 0.9, gap = 1 - 0.1 * Math.min(a, 1);
      ctx.setTransform(k, 0, 0, k, cx + Math.cos(t.ang) * t.dist * spread * a, cy + Math.sin(t.ang) * t.dist * spread * a);
      ctx.rotate(t.rot * a);
      ctx.globalAlpha = clamp(1 - Math.max(0, t.z) * a * 0.35, 0.35, 1);
      ctx.drawImage(img, t.x * tw, t.y * th, tw, th, (-tw * sc * gap) / 2, (-th * sc * gap) / 2, tw * sc * gap + 0.6, th * sc * gap + 0.6);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (this.flare !== 'none' && amt > 0.05) {
      const fx = r.x + r.w / 2, fy = r.y + r.h / 2, rad = Math.max(cw, chh) * 0.45 * Math.min(amt, 1);
      ctx.globalCompositeOperation = 'lighter';
      if (this.flare === 'spectral') {
        for (let i = 0; i < 7; i++) {
          const ang = -0.35 + i * 0.1;
          ctx.strokeStyle = `hsla(${i * 46},90%,60%,${0.16 * Math.min(amt, 1)})`;
          ctx.lineWidth = 10 * S.dpr;
          ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(ang) * rad * 2.2, fy + Math.sin(ang) * rad * 2.2); ctx.stroke();
        }
      }
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, rad);
      g.addColorStop(0, rgba(S.accentNow || '#fff', 0.35 * Math.min(amt, 1)));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, chh);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  contentSize() { return this.img.naturalWidth ? [this.img.naturalWidth, this.img.naturalHeight] : [16, 9]; }
}

class NoneMedia {
  constructor(ch, el) { this.ch = ch; this.el = el; this.kind = 'none'; }
  resize() {} draw() {} contentSize() { return [16, 9]; }
}

/* ---------- amostrador de cor ao vivo ---------- */
let _sampleCanvas = null;
function sampleAccentFrom(media, img, force) {
  const t = now();
  if (!force && t - media.lastSample < 140) return;
  media.lastSample = t;
  try {
    if (!_sampleCanvas) { _sampleCanvas = D.createElement('canvas'); _sampleCanvas.width = 48; _sampleCanvas.height = 27; }
    const c = _sampleCanvas.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0, 48, 27);
    const d = c.getImageData(0, 0, 48, 27).data;
    const px = [];
    for (let i = 0; i < d.length; i += 4) {
      const hsv = rgbToHsv(d[i], d[i + 1], d[i + 2]);
      if (hsv.v > 0.28) px.push([hsv.s * hsv.v, d[i], d[i + 1], d[i + 2]]);
    }
    if (px.length < 8) return;
    px.sort((a, b) => b[0] - a[0]);
    const top = px.slice(0, Math.max(6, Math.round(px.length * 0.08)));
    if (top[0][0] < 0.18) return;
    let r = 0, g = 0, b = 0;
    for (const p of top) { r += p[1]; g += p[2]; b += p[3]; }
    S.sampled = { r: r / top.length, g: g / top.length, b: b / top.length, a: 1 };
    updateAccentTarget();
  } catch (e) {
    media.sample = false;
    logErr('amostra', 'amostrador desativado (imagem de outra origem ou file://)');
  }
}
