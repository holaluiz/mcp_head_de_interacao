/*! HEAD de Interação — motor de imersão v1.0.0 | MIT
 *  Scroll cinematográfico declarativo: sequências de frames, capítulos fixados,
 *  instrumentos atrelados ao filme, som sintetizado e módulos de negócio.
 *  Documentação dos atributos data-im-*: docs/MOTOR.md
 */
(function () {
'use strict';
if (window.Imersao && window.Imersao.version) return;

const W = window, D = document, R = D.documentElement;
const VERSION = '1.0.0';
const QS = new URLSearchParams(location.search);
const MQ = (q) => (W.matchMedia ? W.matchMedia(q).matches : false);

const PARAMS = {
  debug: QS.has('debug'),
  mute: QS.get('mute') === '1',
  reduced: QS.has('reduced') || MQ('(prefers-reduced-motion: reduce)'),
  solo: parseSolo(QS.get('solo')),
  noLoader: QS.has('noloader'),
};

R.classList.add('im-js');
if (PARAMS.reduced) R.classList.add('im-reduced');

function parseSolo(v) {
  if (!v) return null;
  const i = v.lastIndexOf(':');
  const id = i > 0 ? v.slice(0, i) : v;
  const p = i > 0 ? parseFloat(v.slice(i + 1)) : 0.5;
  return { id, p: clamp(Number.isFinite(p) ? p : 0.5, 0, 1) };
}

/* ---------- utilitários ---------- */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function inv(a, b, v) { return b === a ? 0 : (v - a) / (b - a); }
function smoothstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
const EASE = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inout: smoothstep,
  expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};
function num(v, d) { const n = parseFloat(v); return Number.isFinite(n) ? n : d; }
function attr(el, name, d) { const v = el.getAttribute(name); return v === null ? d : v; }
function has(el, name) { const v = el.getAttribute(name); return v !== null && v !== 'false' && v !== '0'; }
function json(v, d) { if (v == null || v === '') return d; try { return JSON.parse(v); } catch (e) { return d; } }
function $(sel, root) { return (root || D).querySelector(sel); }
function $$(sel, root) { return Array.from((root || D).querySelectorAll(sel)); }
function h(tag, cls, html) { const e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function rand(a, b) { return a + Math.random() * (b - a); }
function hash(str) { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function now() { return performance.now(); }
function onIdle(fn) { (W.requestIdleCallback || ((f) => setTimeout(f, 60)))(fn); }

/* ---------- keyframes ----------
 * Aceita JSON  [[0,0],[0.5,94],[1,94]]   ou compacto  "0:0,0.5:94,1:94"
 * Valores podem ser números, cores ("#0E3A5C") ou objetos ({"s":1.2,"x":-10}). */
function parseKeys(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) return normKeys(raw);
  const s = String(raw).trim();
  if (!s) return null;
  if (s[0] === '[') { const j = json(s, null); return j ? normKeys(j) : null; }
  const sep = s.includes('|') ? '|' : ',';
  const out = [];
  for (const part of s.split(sep)) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const p = parseFloat(part.slice(0, i));
    const v = part.slice(i + 1).trim();
    const n = Number(v);
    out.push([p, v !== '' && !isNaN(n) ? n : v]);
  }
  return normKeys(out);
}
function normKeys(arr) {
  const k = arr.filter((e) => Array.isArray(e) && e.length >= 2 && Number.isFinite(+e[0])).map((e) => e.slice(0, 3).map((v, i) => (i === 0 ? +v : v)));
  k.sort((a, b) => a[0] - b[0]);
  return k.length ? k : null;
}
function sampleKeys(keys, p, ease) {
  if (!keys) return undefined;
  if (p <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (p >= last[0]) return last[1];
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (p <= b[0]) {
      const a = keys[i - 1];
      let t = inv(a[0], b[0], p);
      if (ease) t = ease(t);
      return mixValue(a[1], b[1], t);
    }
  }
  return last[1];
}
function stepKeys(keys, p) {
  if (!keys) return undefined;
  let cur = keys[0];
  for (const k of keys) { if (p >= k[0]) cur = k; else break; }
  return cur;
}
function mixValue(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (typeof a === 'string' && typeof b === 'string') {
    const ca = parseColor(a), cb = parseColor(b);
    if (ca && cb) return rgbStr(mixRgb(ca, cb, t));
    return t < 1 ? a : b;
  }
  if (a && b && typeof a === 'object') {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = mixValue(k in a ? a[k] : b[k], k in b ? b[k] : a[k], t);
    return o;
  }
  return t < 0.5 ? a : b;
}
/* Câmera: completa propriedades ausentes com o quadro anterior. */
const CAM0 = { s: 1, x: 0, y: 0, r: 0, o: 1, b: 0 };
function normCam(keys) {
  if (!keys) return null;
  let prev = Object.assign({}, CAM0);
  return keys.map(([p, v]) => { prev = Object.assign({}, prev, typeof v === 'object' ? v : { s: +v || 1 }); return [p, prev]; });
}
function parseRange(v, d) {
  if (v == null || v === '') return d;
  const a = String(v).split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n));
  return a.length >= 2 ? a : d;
}

/* ---------- cor ---------- */
const _colorCache = new Map();
function parseColor(s) {
  if (!s || typeof s !== 'string') return null;
  if (_colorCache.has(s)) return _colorCache.get(s);
  let c = null;
  const t = s.trim();
  let m;
  if ((m = t.match(/^#([0-9a-f]{3,8})$/i))) {
    let x = m[1];
    if (x.length === 3 || x.length === 4) x = x.split('').map((ch) => ch + ch).join('');
    if (x.length === 6 || x.length === 8) {
      c = { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16), a: x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1 };
    }
  } else if ((m = t.match(/^rgba?\(([^)]+)\)$/i))) {
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    if (p.length >= 3) c = { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  if (_colorCache.size > 500) _colorCache.clear();
  _colorCache.set(s, c);
  return c;
}
function mixRgb(a, b, t) { return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t), a: lerp(a.a, b.a, t) }; }
function rgbStr(c) {
  const r = Math.round(clamp(c.r, 0, 255)), g = Math.round(clamp(c.g, 0, 255)), b = Math.round(clamp(c.b, 0, 255));
  return c.a < 0.999 ? `rgba(${r},${g},${b},${+c.a.toFixed(3)})` : '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function rgba(color, a) { const c = parseColor(color) || { r: 255, g: 255, b: 255, a: 1 }; return `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`; }
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let hh = 0;
  if (d) {
    if (max === r) hh = ((g - b) / d) % 6; else if (max === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4;
    hh *= 60; if (hh < 0) hh += 360;
  }
  return { h: hh, s: max ? d / max : 0, v: max };
}
function cssVar(name, fallback, el) {
  const v = getComputedStyle(el || R).getPropertyValue(name).trim();
  return v || fallback;
}

/* Matemática de filtros CSS (Filter Effects Level 1) aplicada a uma cor,
 * para que o acento da interface acompanhe a paleta aplicada aos filmes. */
function parseFilter(str) {
  const out = [];
  if (!str || str === 'none') return out;
  const re = /([a-z-]+)\(([^)]*)\)/gi;
  let m;
  while ((m = re.exec(str))) {
    const fn = m[1].toLowerCase();
    let v = m[2].trim();
    let n = parseFloat(v);
    if (/%$/.test(v)) n /= 100;
    if (fn === 'hue-rotate') { if (/rad$/.test(v)) n = n * 180 / Math.PI; else if (/turn$/.test(v)) n *= 360; }
    out.push([fn, Number.isFinite(n) ? n : 1]);
  }
  return out;
}
function filterColor(c, filterStr) {
  let r = c.r / 255, g = c.g / 255, b = c.b / 255;
  for (const [fn, v] of parseFilter(filterStr)) {
    let m = null;
    if (fn === 'hue-rotate') {
      const a = v * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
      m = [0.213 + cs * 0.787 - sn * 0.213, 0.715 - cs * 0.715 - sn * 0.715, 0.072 - cs * 0.072 + sn * 0.928,
        0.213 - cs * 0.213 + sn * 0.143, 0.715 + cs * 0.285 + sn * 0.14, 0.072 - cs * 0.072 - sn * 0.283,
        0.213 - cs * 0.213 - sn * 0.787, 0.715 - cs * 0.715 + sn * 0.715, 0.072 + cs * 0.928 + sn * 0.072];
    } else if (fn === 'saturate') {
      const s = v;
      m = [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
    } else if (fn === 'grayscale') {
      const s = 1 - clamp(v, 0, 1);
      m = [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s];
    } else if (fn === 'sepia') {
      const s = 1 - clamp(v, 0, 1);
      m = [0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s, 0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s, 0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s];
    } else if (fn === 'brightness') { r *= v; g *= v; b *= v; }
    else if (fn === 'contrast') { r = (r - 0.5) * v + 0.5; g = (g - 0.5) * v + 0.5; b = (b - 0.5) * v + 0.5; }
    else if (fn === 'invert') { r = lerp(r, 1 - r, v); g = lerp(g, 1 - g, v); b = lerp(b, 1 - b, v); }
    if (m) { const nr = m[0] * r + m[1] * g + m[2] * b, ng = m[3] * r + m[4] * g + m[5] * b, nb = m[6] * r + m[7] * g + m[8] * b; r = nr; g = ng; b = nb; }
    r = clamp(r, 0, 1); g = clamp(g, 0, 1); b = clamp(b, 0, 1);
  }
  return { r: r * 255, g: g * 255, b: b * 255, a: c.a };
}

/* ---------- idioma e formatação ---------- */
const LANG = (R.getAttribute('lang') || navigator.language || 'pt-BR');
const PT = /^pt/i.test(LANG);
const TXT = PT ? {
  soundOn: 'Som ligado', soundOff: 'Som desligado', loading: 'Carregando', enter: 'Entrar', enterSilent: 'Entrar sem som',
  sentTitle: 'Tudo certo nesta demonstração', sentBody: 'Nada foi enviado. Este formulário é uma demonstração e não transmite dados a ninguém.',
  close: 'Fechar', cart: 'Sacola', cartEmpty: 'Sua sacola está vazia.', subtotal: 'Subtotal', checkout: 'Finalizar pedido', remove: 'Remover',
  next: 'Próximo', back: 'Voltar', days: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], busy: 'ocupado', today: 'hoje', tomorrow: 'amanhã', summary: 'Resumo do que seria enviado',
} : {
  soundOn: 'Sound on', soundOff: 'Sound off', loading: 'Loading', enter: 'Enter', enterSilent: 'Enter without sound',
  sentTitle: 'All set in this demo', sentBody: 'Nothing was sent. This form is a demonstration and does not transmit any data.',
  close: 'Close', cart: 'Bag', cartEmpty: 'Your bag is empty.', subtotal: 'Subtotal', checkout: 'Checkout', remove: 'Remove',
  next: 'Next', back: 'Back', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], busy: 'taken', today: 'today', tomorrow: 'tomorrow', summary: 'Summary of what would be sent',
};
const _nf = new Map();
function fmtNum(v, decimals, locale) {
  const d = decimals | 0, key = (locale || LANG) + d;
  let f = _nf.get(key);
  if (!f) { try { f = new Intl.NumberFormat(locale || LANG, { minimumFractionDigits: d, maximumFractionDigits: d }); } catch (e) { f = new Intl.NumberFormat('en', { minimumFractionDigits: d, maximumFractionDigits: d }); } _nf.set(key, f); }
  return f.format(v);
}
function fmtMoney(v, currency, locale) {
  try { return new Intl.NumberFormat(locale || LANG, { style: 'currency', currency: currency || (PT ? 'BRL' : 'USD'), maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v); }
  catch (e) { return fmtNum(v, 0, locale); }
}

/* ---------- estado global ---------- */
const S = {
  ready: false, booted: false, chapters: [], seqs: new Map(), errors: [], components: [],
  fps: 60, y: 0, vy: 0, vw: W.innerWidth, vh: W.innerHeight, dpr: Math.min(W.devicePixelRatio || 1, 2),
  manifest: { sequences: {} }, lenis: null, root: null, mobile: false, filter: 'none', accent: null,
  hooks: new Map(), lastFrame: now(), loaderDone: false, pageP: 0,
};

function logErr(kind, msg) {
  S.errors.push({ kind, msg: String(msg && msg.message ? msg.message : msg).slice(0, 300), t: Math.round(now()) });
  if (S.errors.length > 100) S.errors.shift();
  if (PARAMS.debug) console.warn('[imersao]', kind, msg);
}
W.addEventListener('error', (e) => {
  const t = e.target;
  if (t && t !== W && (t.src || t.href)) logErr('recurso', t.src || t.href);
  else logErr('erro', e.message);
}, true);
W.addEventListener('unhandledrejection', (e) => logErr('promise', e.reason));

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

/* =====================================================================
 *  MÍDIAS PROCEDURAIS — imersão sem nenhum vídeo gerado.
 *  Presets acoplados ao scroll (reversíveis) ou ambientes com intensidade
 *  controlada pelo progresso do capítulo. Cores vêm das variáveis --im-*.
 * ===================================================================== */
const _sprites = new Map();
function sprite(color, soft) {
  const key = color + (soft ? 's' : '');
  let c = _sprites.get(key);
  if (c) return c;
  c = D.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(color, 1));
  gr.addColorStop(soft ? 0.15 : 0.22, rgba(color, soft ? 0.55 : 0.8));
  gr.addColorStop(soft ? 0.6 : 0.5, rgba(color, soft ? 0.12 : 0.18));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  _sprites.set(key, c);
  return c;
}
function areaScale(m) { return clamp((m.w * m.h) / (1440 * 900 * m.dpr * m.dpr), 0.35, 1.6); }
function fillBg(m, alpha) {
  const ctx = m.ctx;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = alpha == null ? m.c.bg : rgba(m.c.bg, alpha);
  ctx.fillRect(0, 0, m.w, m.h);
}
function lowRes(m, div) {
  if (!m.off || m.offDiv !== div) { m.off = D.createElement('canvas'); m.offDiv = div; }
  const w = Math.max(2, Math.round(m.w / div)), hh = Math.max(2, Math.round(m.h / div));
  if (m.off.width !== w || m.off.height !== hh) { m.off.width = w; m.off.height = hh; }
  return m.off.getContext('2d');
}

const PRESETS = {};

/* Partículas que se montam no nome da marca (ou em data-im-text). */
PRESETS.particles = {
  init(m) {
    const text = attr(m.el, 'data-im-text', S.brand || (D.title || '•').split(/[|—–·-]/)[0].trim() || '•');
    const off = D.createElement('canvas');
    off.width = m.w; off.height = m.h;
    const g = off.getContext('2d');
    const font = cssVar('--im-font-display', 'serif', m.el);
    let size = m.h * 0.34;
    g.font = `500 ${size}px ${font}`;
    const tw = g.measureText(text).width || 1;
    size = Math.min(size, (m.w * 0.84 * size) / tw);
    g.font = `500 ${size}px ${font}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    const ty = num(attr(m.el, 'data-im-text-y'), 0.5);
    g.fillText(text, m.w / 2, m.h * ty);
    const data = g.getImageData(0, 0, m.w, m.h).data;
    let gap = Math.max(3, Math.round(3 * m.dpr)), pts = [];
    const max = Math.round(2600 * areaScale(m));
    for (let tries = 0; tries < 12; tries++) {
      pts = [];
      for (let y = 0; y < m.h; y += gap) for (let x = 0; x < m.w; x += gap) if (data[(y * m.w + x) * 4 + 3] > 140) pts.push([x, y]);
      if (pts.length <= max) break;
      gap++;
    }
    const rnd = rng(hash(text));
    const cx = m.w / 2, cy = m.h / 2, R0 = Math.max(m.w, m.h) * 0.62;
    m.parts = pts.map(([x, y]) => {
      const a = rnd() * Math.PI * 2, r = R0 * (0.25 + rnd() * 0.85);
      return { tx: x, ty: y, a, r, sp: 0.4 + rnd(), d: rnd(), s: (0.8 + rnd() * 1.3) * m.dpr, ph: rnd() * 6.28, acc: rnd() < 0.12 };
    });
    m.cx = cx; m.cy = cy;
  },
  frame(m, p, t) {
    const a = +sampleKeys(m.keys || [[0, 0], [0.62, 1], [1, 1]], p) || 0;
    fillBg(m, 0.3);
    const ctx = m.ctx;
    ctx.globalCompositeOperation = 'lighter';
    for (const pass of [0, 1]) {
      ctx.fillStyle = pass ? m.c.accent : m.c.text;
      ctx.globalAlpha = pass ? 0.95 : 0.78;
      for (const q of m.parts) {
        if (q.acc !== !!pass) continue;
        const k = EASE.inout(clamp((a - q.d * 0.35) / 0.65, 0, 1));
        const ang = q.a + t * 0.00011 * q.sp * (1 - k) + p * 2.4 * (1 - k);
        const sx = m.cx + Math.cos(ang) * q.r, sy = m.cy + Math.sin(ang) * q.r * 0.62;
        const br = Math.sin(t * 0.0018 + q.ph) * 0.7 * m.dpr * k;
        ctx.fillRect(lerp(sx, q.tx, k) + br, lerp(sy, q.ty, k) - br, q.s, q.s);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },
};

/* Brasas e faíscas subindo da escuridão (fogo, metal fundido, forja). */
PRESETS.embers = {
  init(m) {
    const n = Math.round(260 * areaScale(m));
    const rnd = rng(7);
    m.rnd = rnd;
    m.parts = Array.from({ length: n }, () => this.spawn(m, rnd, true));
    const ember = (m.c.list && m.c.list[0]) || rgbStr(mixRgb(parseColor(m.c.accent) || { r: 255, g: 140, b: 60, a: 1 }, { r: 255, g: 110, b: 40, a: 1 }, 0.55));
    m.hot = sprite('#fff3cf'); m.mid = sprite(ember); m.cool = sprite('#8a2208');
    m.ember = ember;
  },
  spawn(m, rnd, any) {
    const g = (rnd() + rnd() + rnd()) / 3;
    return { x: m.w * (0.08 + g * 0.84), y: any ? m.h * (0.35 + rnd() * 0.75) : m.h + rnd() * 40 * m.dpr, vy: -(55 + rnd() * 120) * m.dpr, vx: (rnd() - 0.5) * 22 * m.dpr, life: any ? rnd() * 2 : 0, max: 1.6 + rnd() * 3.2, s: (0.7 + rnd() * rnd() * 2.6) * m.dpr, ph: rnd() * 6.28 };
  },
  frame(m, p, t, dt) {
    const I = clamp(+sampleKeys(m.keys || [[0, 0.5], [1, 1]], p) || 0, 0, 1.5);
    fillBg(m, 0.55);
    const ctx = m.ctx;
    const g = ctx.createRadialGradient(m.w / 2, m.h * 1.18, 0, m.w / 2, m.h * 1.18, m.h * 0.95);
    g.addColorStop(0, rgba(m.ember, 0.34 * Math.min(I, 1.2)));
    g.addColorStop(0.5, rgba(m.ember, 0.08 * Math.min(I, 1.2)));
    g.addColorStop(1, rgba(m.ember, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, m.w, m.h);
    ctx.globalCompositeOperation = 'lighter';
    const active = Math.round(m.parts.length * clamp(0.35 + 0.65 * I, 0, 1));
    for (let i = 0; i < m.parts.length; i++) {
      let q = m.parts[i];
      q.life += dt;
      q.y += q.vy * dt * (0.7 + I * 0.6);
      q.x += q.vx * dt + Math.sin(t * 0.0021 + q.ph) * 0.6 * m.dpr;
      if (q.y < -20 || q.life > q.max) { q = m.parts[i] = this.spawn(m, m.rnd, false); }
      if (i >= active) continue;
      const f = q.life / q.max;
      const spr = f < 0.18 ? m.hot : f < 0.65 ? m.mid : m.cool;
      const a = clamp((1 - f) * (0.65 + 0.35 * Math.sin(t * 0.025 + q.ph * 3)), 0, 1) * (0.5 + 0.5 * Math.min(I, 1));
      const s = q.s * 8;
      ctx.globalAlpha = a;
      ctx.drawImage(spr, q.x - s / 2, q.y - s / 2, s, s);
      ctx.globalAlpha = a * 0.45;
      ctx.drawImage(spr, q.x - q.vx * 0.02 - s / 3, q.y - q.vy * 0.035 - s / 3, s / 1.5, s / 1.5);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },
};

/* Poeira suspensa num feixe de luz que varre a cena (museu, piano, giz). */
PRESETS.dust = {
  init(m) {
    const n = Math.round(280 * areaScale(m));
    const rnd = rng(11);
    m.parts = Array.from({ length: n }, () => ({ x: rnd() * m.w, y: rnd() * m.h, z: 0.25 + rnd() * 0.75, ph: rnd() * 6.28 }));
    m.light = m.c.accent2 || m.c.text;
    m.spr = sprite(m.light, true);
  },
  frame(m, p, t) {
    const bx = (+sampleKeys(m.keys || [[0, 0.22], [1, 0.78]], p) || 0.5) * m.w;
    const tilt = num(attr(m.el, 'data-im-tilt'), 0.18);
    fillBg(m);
    const ctx = m.ctx;
    ctx.globalCompositeOperation = 'lighter';
    const top = m.w * 0.05, bot = m.w * 0.24;
    const gr = ctx.createLinearGradient(0, 0, 0, m.h);
    gr.addColorStop(0, rgba(m.light, 0.2));
    gr.addColorStop(0.7, rgba(m.light, 0.05));
    gr.addColorStop(1, rgba(m.light, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(bx - top, 0); ctx.lineTo(bx + top, 0);
    ctx.lineTo(bx + tilt * m.h + bot, m.h); ctx.lineTo(bx + tilt * m.h - bot, m.h);
    ctx.closePath(); ctx.fill();
    for (const q of m.parts) {
      q.x += Math.sin(t * 0.0003 * q.z + q.ph) * 0.12 * m.dpr;
      q.y += (Math.cos(t * 0.00027 + q.ph) * 0.08 - 0.04) * m.dpr * q.z;
      if (q.y < -5) q.y = m.h + 5; if (q.x < -5) q.x = m.w + 5; if (q.x > m.w + 5) q.x = -5;
      const ax = bx + tilt * q.y, sig = top + (bot - top) * (q.y / m.h);
      const inBeam = Math.exp(-((q.x - ax) ** 2) / (2 * sig * sig));
      ctx.globalAlpha = clamp(0.06 + 0.9 * inBeam, 0, 1) * q.z;
      const s = (1.2 + q.z * 3.2) * m.dpr * 2.2;
      ctx.drawImage(m.spr, q.x - s / 2, q.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },
};

/* Profundidade: mergulho (neve marinha + bioluminescência), subida ou dobra. */
PRESETS.deep = {
  init(m) {
    m.mode = attr(m.el, 'data-im-mode', 'dive');
    const defSky = m.mode === 'rise' ? [[0, '#2b1c2f'], [0.45, '#151229'], [1, '#02030a']] : m.mode === 'warp' ? [[0, m.c.bg], [1, m.c.bg]] : [[0, '#0E3A5C'], [0.5, '#071B30'], [1, '#000000']];
    m.sky = parseKeys(attr(m.el, 'data-im-sky')) || defSky;
    const n = Math.round(340 * areaScale(m));
    const rnd = rng(23);
    m.parts = Array.from({ length: n }, () => ({ x: rnd() * 2 - 1, y: rnd(), z: 0.12 + rnd() * 0.88, ph: rnd() * 6.28, spark: rnd() < 0.2 }));
    const list = m.c.list || [m.c.accent];
    m.sparks = list.map((c) => sprite(c));
    m.snow = sprite(m.c.text, true);
  },
  frame(m, p, t) {
    const ctx = m.ctx, sky = sampleKeys(m.sky, p) || m.c.bg;
    const g = ctx.createLinearGradient(0, 0, 0, m.h);
    const skyC = parseColor(sky) || { r: 0, g: 0, b: 0, a: 1 };
    g.addColorStop(0, rgbStr(mixRgb(skyC, { r: 255, g: 255, b: 255, a: 1 }, m.mode === 'dive' ? 0.07 * (1 - p) : 0.04)));
    g.addColorStop(1, rgbStr(mixRgb(skyC, { r: 0, g: 0, b: 0, a: 1 }, 0.35)));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, m.w, m.h);
    if (m.mode === 'dive') {
      const I = clamp(1 - p * 1.7, 0, 1);
      if (I > 0) {
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 6; k++) {
          const x0 = m.w * (0.15 + k * 0.15) + Math.sin(t * 0.0002 + k) * m.w * 0.03;
          const gr = ctx.createLinearGradient(0, 0, 0, m.h * 0.9);
          gr.addColorStop(0, rgba('#bfe8ff', 0.09 * I)); gr.addColorStop(1, rgba('#bfe8ff', 0));
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.moveTo(x0 - 18 * m.dpr, 0); ctx.lineTo(x0 + 18 * m.dpr, 0);
          ctx.lineTo(x0 + m.w * 0.12, m.h * 0.9); ctx.lineTo(x0 + m.w * 0.04, m.h * 0.9); ctx.fill();
        }
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    const cx = m.w / 2, cy = m.h / 2, travel = 3.2;
    const glow = m.mode === 'rise' ? clamp((p - 0.3) * 1.6, 0, 1) : clamp((p - 0.3) * 1.8, 0, 1);
    for (const q of m.parts) {
      let x, y, s, a;
      if (m.mode === 'warp') {
        const z = (((q.z - p * travel * 0.5) % 1) + 1) % 1 || 1;
        if (z < 0.03) continue;
        x = cx + (q.x * m.w * 0.5) / (z * 3); y = cy + ((q.y - 0.5) * m.h) / (z * 3);
        s = (1.4 / z) * m.dpr; a = clamp(1.1 - z, 0, 1);
      } else {
        const dir = m.mode === 'rise' ? 1 : -1;
        y = ((((q.y + dir * p * travel * q.z) % 1) + 1) % 1) * m.h;
        x = (q.x * 0.5 + 0.5) * m.w + Math.sin(t * 0.0004 + q.ph) * 6 * m.dpr * q.z;
        s = (0.7 + 2.6 * q.z) * m.dpr; a = 0.12 + 0.45 * q.z;
      }
      if (q.spark && m.sparks.length) {
        ctx.globalAlpha = clamp(glow * (0.55 + 0.45 * Math.sin(t * 0.003 + q.ph)), 0, 1);
        const ss = s * 9;
        ctx.drawImage(m.sparks[(q.ph * 10 | 0) % m.sparks.length], x - ss / 2, y - ss / 2, ss, ss);
      } else if (m.mode !== 'rise' || glow > 0) {
        ctx.globalAlpha = m.mode === 'rise' ? a * glow : a * (m.mode === 'dive' ? 0.6 : 1);
        const ss = s * 3;
        ctx.drawImage(m.snow, x - ss / 2, y - ss / 2, ss, ss);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },
};

/* Tinta florescendo na água (fumaça cor de osso com lampejos de acento). */
PRESETS.ink = {
  init(m) {
    const rnd = rng(31);
    m.blobs = Array.from({ length: 10 }, (_, i) => ({ sx: 0.0002 + rnd() * 0.0004, sy: 0.0002 + rnd() * 0.0004, ph: rnd() * 6.28, ph2: rnd() * 6.28, r: 0.1 + rnd() * 0.16, acc: i < 2 }));
    m.cleared = false;
  },
  frame(m, p, t) {
    const bloom = clamp(+sampleKeys(m.keys || [[0, 0.25], [1, 1]], p) || 0, 0, 1.4);
    const g = lowRes(m, 4), w = m.off.width, hh = m.off.height;
    if (!m.cleared) { g.fillStyle = m.c.bg; g.fillRect(0, 0, w, hh); m.cleared = true; }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = rgba(m.c.bg, 0.06);
    g.fillRect(0, 0, w, hh);
    g.globalCompositeOperation = 'lighter';
    for (const b of m.blobs) {
      const x = (0.5 + 0.3 * Math.sin(t * b.sx + b.ph) + (p - 0.5) * 0.08) * w;
      const y = (0.5 + 0.26 * Math.cos(t * b.sy + b.ph2)) * hh;
      const r = (b.r + 0.24 * bloom) * Math.min(w, hh) * (0.75 + 0.25 * Math.sin(t * 0.0007 + b.ph));
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const col = b.acc ? m.c.accent : m.c.text;
      const al = b.acc ? 0.05 * (0.5 + 0.5 * Math.sin(t * 0.0009 + b.ph)) : 0.032;
      gr.addColorStop(0, rgba(col, al)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const ctx = m.ctx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(m.off, 0, 0, m.w, m.h);
  },
};

/* Raios de luz (god rays) ou explosão espectral de fogo de diamante. */
PRESETS.rays = {
  init(m) {
    m.spectral = attr(m.el, 'data-im-mode', '') === 'spectral';
    const o = String(attr(m.el, 'data-im-origin', m.spectral ? '0.5,0.5' : '0.5,-0.05')).split(',').map(Number);
    m.ox = (o[0] || 0.5) * m.w; m.oy = (o[1] || 0) * m.h;
    const rnd = rng(41);
    m.stars = Array.from({ length: 70 }, () => ({ x: rnd(), y: rnd(), ph: rnd() * 6.28, s: 0.5 + rnd() }));
    m.light = m.c.accent2 || m.c.text;
  },
  frame(m, p, t) {
    const I = clamp(+sampleKeys(m.keys || [[0, 0.3], [1, 1]], p) || 0, 0, 1.5);
    fillBg(m);
    const ctx = m.ctx, n = m.spectral ? 24 : 9, L = Math.max(m.w, m.h) * 1.6;
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < n; k++) {
      const base = m.spectral ? (k / n) * Math.PI * 2 + t * 0.00004 : Math.PI / 2 + (k / (n - 1) - 0.5) * 1.1;
      const ang = base + Math.sin(t * 0.00021 + k * 1.7) * 0.04;
      const wd = (m.spectral ? 0.025 : 0.035) * (0.6 + 0.4 * Math.sin(k * 3.1));
      const col = m.spectral ? `hsl(${(k * 360) / n},95%,62%)` : m.light;
      const al = (m.spectral ? 0.2 : 0.11) * Math.min(I, 1) * (0.55 + 0.45 * Math.sin(t * 0.0005 * (k + 1) + k));
      const gr = ctx.createRadialGradient(m.ox, m.oy, 0, m.ox, m.oy, L * (m.spectral ? 0.55 * I + 0.1 : 1));
      gr.addColorStop(0, m.spectral ? `hsla(${(k * 360) / n},95%,70%,${al})` : rgba(col, al));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(m.ox, m.oy);
      ctx.lineTo(m.ox + Math.cos(ang - wd) * L, m.oy + Math.sin(ang - wd) * L);
      ctx.lineTo(m.ox + Math.cos(ang + wd) * L, m.oy + Math.sin(ang + wd) * L);
      ctx.closePath(); ctx.fill();
    }
    if (m.spectral) {
      for (const s of m.stars) {
        const a = clamp((I - 0.3) * 1.5, 0, 1) * Math.max(0, Math.sin(t * 0.004 * s.s + s.ph));
        if (a < 0.02) continue;
        const x = s.x * m.w, y = s.y * m.h, r = (3 + 6 * s.s) * m.dpr;
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`;
        ctx.lineWidth = m.dpr;
        ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  },
};

/* Campos de cor lentos e elegantes (SaaS, agência, fundos de seção). */
PRESETS.aurora = {
  init(m) {
    const rnd = rng(53);
    const cols = m.c.list || [m.c.accent, m.c.accent2 || m.c.accent, m.c.text, m.c.accent];
    m.blobs = cols.slice(0, 5).map((c, i) => ({ c, sx: 0.00007 + rnd() * 0.00012, sy: 0.00006 + rnd() * 0.0001, ph: rnd() * 6.28, r: 0.35 + rnd() * 0.25, a: i === 2 ? 0.12 : 0.32 }));
  },
  frame(m, p, t) {
    const g = lowRes(m, 6), w = m.off.width, hh = m.off.height;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = m.c.bg; g.fillRect(0, 0, w, hh);
    g.globalCompositeOperation = 'lighter';
    const I = clamp(+sampleKeys(m.keys || [[0, 0.7], [1, 1]], p) || 0, 0, 1.5);
    for (const b of m.blobs) {
      const x = (0.5 + 0.35 * Math.sin(t * b.sx + b.ph)) * w;
      const y = (0.5 + 0.3 * Math.cos(t * b.sy + b.ph) + (p - 0.5) * 0.35) * hh;
      const r = b.r * Math.max(w, hh);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgba(b.c, b.a * I)); gr.addColorStop(1, rgba(b.c, 0));
      g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    }
    m.ctx.imageSmoothingEnabled = true;
    m.ctx.drawImage(m.off, 0, 0, m.w, m.h);
  },
};

/* Túnel de arcos: o scroll atravessa o portal (reversível). */
PRESETS.tunnel = {
  init(m) { m.line = m.c.text; m.deep = m.c.accent; m.circ = m.c.accent2 || m.c.text; },
  frame(m, p, t) {
    const ctx = m.ctx, cx = m.w / 2, cy = m.h / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(m.w, m.h) * 0.75);
    bg.addColorStop(0, rgba(m.deep, 0.62)); bg.addColorStop(0.55, rgba(m.deep, 0.16)); bg.addColorStop(1, m.c.bg);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, m.w, m.h);
    const L = num(attr(m.el, 'data-im-rings'), 26), off = p * L, M = 16;
    const tumble = Math.sin(p * Math.PI * 2) * 0.06 + Math.sin(t * 0.0006) * 0.01;
    ctx.translate(cx, cy); ctx.rotate(tumble); ctx.translate(-cx, -cy);
    const base = Math.min(m.w, m.h) * 0.9;
    for (let j = M; j >= 0; j--) {
      const z = j + 1 - (off - Math.floor(off));
      if (z <= 0.15) continue;
      const n = Math.floor(off) + j, sc = 1 / z;
      const w = base * 0.62 * sc, hh = base * 0.9 * sc;
      const a = clamp(1.15 - z / M, 0, 1);
      ctx.lineWidth = Math.max(0.6, 7 * sc) * m.dpr;
      ctx.strokeStyle = rgba(m.line, a * 0.85);
      const x0 = cx - w / 2, y0 = cy + hh / 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0); ctx.lineTo(x0, cy - hh / 2 + w / 2);
      ctx.arc(cx, cy - hh / 2 + w / 2, w / 2, Math.PI, 0);
      ctx.lineTo(x0 + w, y0);
      ctx.stroke();
      if (n % 4 === 0) {
        ctx.fillStyle = rgba(m.circ, a * 0.18);
        ctx.beginPath(); ctx.arc(cx + w * 0.9, cy - hh * 0.1, w * 0.18, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const exit = clamp((p - 0.82) / 0.18, 0, 1);
    if (exit > 0) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(m.w, m.h) * (0.2 + exit));
      g.addColorStop(0, `rgba(255,255,255,${0.9 * exit})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, m.w, m.h);
    }
  },
};

/* Erupção de cor saindo do produto — determinística: rolar para trás "des-explode". */
PRESETS.fountain = {
  init(m) {
    const prof = parseKeys(attr(m.el, 'data-im-profile')) || [[0, 0], [0.3, 0], [0.36, 1], [0.7, 0.55], [1, 0.12]];
    const bins = 200, cdf = new Float32Array(bins + 1);
    for (let i = 1; i <= bins; i++) cdf[i] = cdf[i - 1] + Math.max(0, +sampleKeys(prof, i / bins) || 0);
    const total = cdf[bins] || 1;
    const rnd = rng(61);
    const pig = m.c.list || ['#ff2d95', '#00d1ff', '#ffd400', '#ff7a00', '#8a4dff', '#9dff00', '#2747ff', '#e0002b'];
    const o = String(attr(m.el, 'data-im-origin', '0.5,0.82')).split(',').map(Number);
    m.ox = o[0] * m.w; m.oy = o[1] * m.h;
    const n = Math.round(1100 * areaScale(m));
    m.parts = Array.from({ length: n }, () => {
      const u = rnd() * total;
      let lo = 0, hi = bins;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid + 1; else hi = mid; }
      return { tau: lo / bins, ang: -Math.PI / 2 + (rnd() - 0.5) * 0.95, v: (0.55 + rnd() * 0.8) * m.h * 1.5, T: 1.4 + rnd() * 1.6, s: (1.5 + rnd() * rnd() * 9) * m.dpr, c: pig[(rnd() * pig.length) | 0] };
    });
  },
  frame(m, p) {
    fillBg(m);
    const ctx = m.ctx, gr = m.h * 1.05, scale = 6;
    ctx.strokeStyle = rgba(m.c.text, 0.12);
    ctx.lineWidth = 1.2 * m.dpr;
    ctx.beginPath(); ctx.ellipse(m.ox, m.oy + 6 * m.dpr, m.w * 0.14, m.h * 0.035, 0, 0, Math.PI * 2); ctx.stroke();
    for (const q of m.parts) {
      const age = (p - q.tau) * scale;
      if (age <= 0 || age > q.T) continue;
      const vx = Math.cos(q.ang) * q.v * 0.38, vy = Math.sin(q.ang) * q.v;
      const x = m.ox + vx * age, y = m.oy + vy * age + 0.5 * gr * age * age;
      const vyy = vy + gr * age, sp = Math.hypot(vx, vyy) || 1;
      ctx.globalAlpha = 1 - Math.pow(age / q.T, 3);
      ctx.fillStyle = q.c;
      ctx.beginPath();
      ctx.ellipse(x, y, q.s * (1 + Math.min(sp / m.h, 1.6)), q.s, Math.atan2(vyy, vx), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};

/* Flor que se abre no ritmo exato do scroll. */
PRESETS.bloom = {
  init(m) { m.petal = m.c.accent; m.rim = m.c.text; },
  frame(m, p, t) {
    const open = EASE.inout(clamp(+sampleKeys(m.keys || [[0, 0], [0.8, 1], [1, 1]], p) || 0, 0, 1));
    const ctx = m.ctx, cx = m.w / 2, cy = m.h * 0.56, R0 = Math.min(m.w, m.h) * 0.36;
    fillBg(m);
    const moon = ctx.createRadialGradient(m.w * 0.25, -m.h * 0.1, 0, m.w * 0.25, -m.h * 0.1, m.h * 1.1);
    moon.addColorStop(0, rgba(m.rim, 0.14)); moon.addColorStop(1, rgba(m.rim, 0));
    ctx.fillStyle = moon; ctx.fillRect(0, 0, m.w, m.h);
    ctx.strokeStyle = 'rgba(28,52,38,0.9)'; ctx.lineWidth = 6 * m.dpr;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + 20 * m.dpr, cy + m.h * 0.25, cx - 10 * m.dpr, m.h + 10); ctx.stroke();
    const layers = [[6, 1, 0], [5, 0.78, 0.5], [4, 0.55, 0.2]];
    layers.forEach(([n, lenK, rot], L) => {
      for (let k = 0; k < n; k++) {
        const closed = -Math.PI / 2 + (k / (n - 1) - 0.5) * 0.32 * (1 + L * 0.3);
        const final = -Math.PI / 2 + (k / n) * Math.PI * 2 + rot;
        const ang = lerp(closed, final, open * (1 - L * 0.14));
        const len = R0 * lenK * (0.5 + 0.5 * open) * (1 + 0.02 * Math.sin(t * 0.001 + k));
        const wd = len * (0.2 + 0.26 * open);
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(ang + Math.PI / 2);
        const g = ctx.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, rgba(m.c.bg, 1));
        g.addColorStop(0.35, rgba(m.petal, 0.65 + L * 0.1));
        g.addColorStop(1, rgba(m.rim, 0.55));
        ctx.fillStyle = g;
        ctx.strokeStyle = rgba(m.rim, 0.28);
        ctx.lineWidth = m.dpr;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(wd, -len * 0.3, wd * 0.85, -len * 0.92, 0, -len);
        ctx.bezierCurveTo(-wd * 0.85, -len * 0.92, -wd, -len * 0.3, 0, 0);
        ctx.fill(); ctx.stroke();
        if ((k + L) % 3 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath(); ctx.arc(wd * 0.2, -len * 0.62, 2.2 * m.dpr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    });
    const drop = clamp((p - 0.82) / 0.18, 0, 1);
    const core = ctx.createRadialGradient(cx, cy - drop * R0 * 0.7, 0, cx, cy - drop * R0 * 0.7, R0 * (0.12 + 0.1 * drop));
    core.addColorStop(0, rgba(m.rim, 0.25 + 0.6 * open)); core.addColorStop(1, rgba(m.petal, 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = core; ctx.fillRect(0, 0, m.w, m.h);
    ctx.globalCompositeOperation = 'source-over';
  },
};

/* Tempo congelado: gotas suspensas e a câmera orbitando o instante. */
PRESETS.bokeh = {
  init(m) {
    const rnd = rng(71), n = Math.round(300 * areaScale(m));
    m.parts = Array.from({ length: n }, () => {
      const th = rnd() * Math.PI * 2, r = 0.45 + rnd() * 0.55;
      return { x: Math.cos(th) * r, z: Math.sin(th) * r, y: Math.sin(th * 2) * 0.22 + (rnd() - 0.5) * 0.5, s: 0.4 + rnd(), ph: rnd() * 6.28, w: rnd() < 0.15 };
    });
    m.amber = sprite(m.c.accent, true); m.white = sprite('#ffffff', true);
  },
  frame(m, p, t) {
    const rot = +sampleKeys(m.keys || [[0, 0], [1, Math.PI * 2]], p) || 0;
    fillBg(m);
    const ctx = m.ctx, cx = m.w / 2, cy = m.h / 2, f = Math.min(m.w, m.h) * 0.9;
    const col = ctx.createLinearGradient(cx - f * 0.08, 0, cx + f * 0.08, 0);
    col.addColorStop(0, rgba(m.c.accent, 0)); col.addColorStop(0.5, rgba(m.c.accent, 0.22)); col.addColorStop(1, rgba(m.c.accent, 0));
    ctx.fillStyle = col; ctx.fillRect(cx - f * 0.08, cy - f * 0.42, f * 0.16, f * 0.84);
    ctx.globalCompositeOperation = 'lighter';
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const pts = m.parts.map((q) => { const x = q.x * cs - q.z * sn, z = q.x * sn + q.z * cs; return [x, q.y, z, q]; }).sort((a, b) => b[2] - a[2]);
    for (const [x, y, z, q] of pts) {
      const k = 2.6 / (z + 3);
      const sx = cx + x * f * k, sy = cy + y * f * k;
      const blur = Math.abs(z) * 1.6;
      const s = (q.s * 7 + blur * 22) * m.dpr * k;
      ctx.globalAlpha = clamp(0.85 - blur * 0.45, 0.08, 0.9) * (0.85 + 0.15 * Math.sin(t * 0.002 + q.ph));
      ctx.drawImage(q.w ? m.white : m.amber, sx - s / 2, sy - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },
};

class ProceduralMedia {
  constructor(ch, el) {
    this.ch = ch; this.el = el; this.kind = 'procedural'; this.animated = !PARAMS.reduced;
    this.name = attr(el, 'data-im-preset', 'aurora');
    this.preset = PRESETS[this.name] || PRESETS.aurora;
    if (!PRESETS[this.name]) logErr('midia', 'preset procedural desconhecido: ' + this.name);
    this.ctx = el.getContext('2d');
    this.keys = parseKeys(attr(el, 'data-im-keys'));
    this.inited = false;
  }
  colors() {
    const cs = getComputedStyle(this.el), g = (n, d) => cs.getPropertyValue(n).trim() || d;
    this.c = { bg: g('--im-bg', '#050505'), text: g('--im-text', '#EDEAE4'), accent: g('--im-accent', '#B08D57'), accent2: g('--im-accent-2', '') };
    const list = json(attr(this.el, 'data-im-colors'), null);
    if (Array.isArray(list) && list.length) this.c.list = list;
  }
  resize() {
    this.dpr = Math.min(S.dpr, 1.5);
    const w = Math.max(2, Math.round(this.el.clientWidth * this.dpr)), hh = Math.max(2, Math.round(this.el.clientHeight * this.dpr));
    this.el.width = this.w = w; this.el.height = this.h = hh;
    this.colors();
    try { this.preset.init(this); this.inited = true; } catch (e) { logErr('procedural', e); }
  }
  draw(p, force, t, dt) {
    if (this.broken > 2) return;
    if (!this.inited) this.resize();
    if (!this.inited) { this.broken = (this.broken || 0) + 1; return; }
    try { this.preset.frame(this, p, t || now(), Math.min(dt || 0.016, 0.05)); } catch (e) { logErr('procedural', e); this.inited = false; this.broken = (this.broken || 0) + 1; }
  }
  contentSize() { return [this.w || 16, this.h || 9]; }
}

/* =====================================================================
 *  CAPÍTULOS — seções fixadas cujo progresso de scroll dirige tudo:
 *  mídia, tipografia, instrumentos, callouts, fundo, tremor e som.
 * ===================================================================== */
function makeMedia(ch, el) {
  let kind = attr(el, 'data-im-media', '');
  if (!kind) kind = el.tagName === 'VIDEO' ? 'video' : el.tagName === 'IMG' ? 'image' : 'none';

  if (kind === 'frames') {
    const seq = seqFor(el);
    const def = seq ? seq.def : null;
    if (PARAMS.reduced || (S.mobile && def && def.video && !has(el, 'data-im-mobile-scrub'))) {
      const fb = replaceWithFallback(el, def, PARAMS.reduced);
      if (fb) return fb.tagName === 'VIDEO' ? new LoopMedia(ch, fb) : new ImageMedia(ch, fb);
    }
    if (!seq) {
      // Sem frames ainda: cadeia de fallback "wipe:a|b|ltr; stills:a|b; image:x; procedural:aurora".
      const chain = String(attr(el, 'data-im-fallback', '')).split(';').map((x) => x.trim()).filter(Boolean);
      const name = attr(el, 'data-im-seq', attr(el, 'data-im-src', '?'));
      if (!chain.length) { logErr('midia', 'sequência não encontrada: ' + name); return new NoneMedia(ch, el); }
      const proc = chain.find((o) => o.startsWith('procedural:'));
      const imgs = chain.filter((o) => !o.startsWith('procedural:'));
      let media;
      if (proc) {
        el.setAttribute('data-im-media', 'procedural');
        el.setAttribute('data-im-preset', proc.slice(11));
        media = new ProceduralMedia(ch, el);
        ch.fallbackKind = proc;
      } else media = new NoneMedia(ch, el);
      if (imgs.length) tryImageFallbacks(ch, el, imgs);
      return media;
    }
    return new FramesMedia(ch, el);
  }
  if (kind === 'video') return PARAMS.reduced ? new ImageMedia(ch, el) : new VideoMedia(ch, el);
  if (kind === 'image') return new ImageMedia(ch, el);
  if (kind === 'stills') return new StillsMedia(ch, el);
  if (kind === 'wipe') return new WipeMedia(ch, el);
  if (kind === 'shatter') return new ShatterMedia(ch, el);
  if (kind === 'procedural') return new ProceduralMedia(ch, el);
  return new NoneMedia(ch, el);
}
function copyCam(from, to) { for (const a of ['data-im-cam', 'data-im-sample-accent', 'data-im-fit']) if (from.hasAttribute(a)) to.setAttribute(a, from.getAttribute(a)); }
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = src; }); }
async function tryImageFallbacks(ch, el, opts) {
  for (const opt of opts) {
    const i = opt.indexOf(':');
    if (i < 0) continue;
    const kind = opt.slice(0, i), parts = opt.slice(i + 1).split('|').map((x) => x.trim()).filter(Boolean);
    let srcs = parts, dir = 'ltr';
    if (kind === 'wipe') { dir = /^(ltr|rtl|ttb|btt)$/.test(parts[2] || '') ? parts[2] : 'ltr'; srcs = parts.slice(0, 2); }
    if (!srcs.length || !(await Promise.all(srcs.map(loadImg))).every(Boolean)) continue;
    let node;
    if (kind === 'image') { node = h('img', 'im-media'); node.alt = ''; node.src = srcs[0]; node.setAttribute('data-im-media', 'image'); }
    else if (kind === 'wipe' && srcs.length === 2) {
      node = h('div', 'im-media'); node.setAttribute('data-im-media', 'wipe'); node.setAttribute('data-im-dir', dir);
      for (const [k, src] of [['im-wipe-a', srcs[0]], ['im-wipe-b', srcs[1]]]) { const im = h('img', k); im.alt = ''; im.src = src; node.appendChild(im); }
    } else if (kind === 'stills') {
      node = h('div', 'im-media im-stills'); node.setAttribute('data-im-media', 'stills');
      for (const src of srcs) { const im = h('img'); im.alt = ''; im.src = src; node.appendChild(im); }
    } else if (kind === 'shatter') { node = h('canvas', 'im-media'); node.setAttribute('data-im-media', 'shatter'); node.setAttribute('data-im-src', srcs[0]); }
    else continue;
    copyCam(el, node);
    const cur = ch.mediaEl && ch.mediaEl.parentNode ? ch.mediaEl : el;
    if (!cur.parentNode) return;
    cur.replaceWith(node);
    ch.media = makeMedia(ch, node);
    ch.mediaEl = node;
    ch.cam = normCam(parseKeys(attr(node, 'data-im-cam')));
    ch.camLast = '';
    ch.fallbackKind = kind;
    if (ch.media.resize) ch.media.resize();
    ch.force = true;
    return;
  }
}
function replaceWithFallback(el, def, still) {
  if (!def) return null;
  let node = null;
  if (!still && def.video) {
    node = h('video', el.className);
    node.src = def.video;
    if (def.poster) node.poster = def.poster;
  } else if (def.poster || def.video || def.count) {
    node = h('img', el.className);
    node.alt = '';
    node.src = def.poster || (def.count ? new Seq('tmp', def).url(Math.floor((def.count - 1) / 2)) : '');
  }
  if (!node) return null;
  node.setAttribute('data-im-media', node.tagName === 'VIDEO' ? 'loop' : 'image');
  copyCam(el, node);
  el.replaceWith(node);
  return node;
}

function visWindow(p, a, b, fade) {
  if (p < a || p > b) return 0;
  const tin = a <= 0 ? 1 : clamp((p - a) / fade, 0, 1);
  const tout = b >= 1 ? 1 : clamp((b - p) / fade, 0, 1);
  return Math.min(tin, tout);
}
function splitLetters(el) {
  if (el.dataset.imSplit) return;
  el.dataset.imSplit = '1';
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  let i = 0;
  for (const ch of text) {
    const s = h('span', 'im-ch');
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ch === ' ' ? ' ' : ch;
    s.style.setProperty('--i', i++);
    el.appendChild(s);
  }
  el.style.setProperty('--im-n', i);
}

class Chapter {
  constructor(el, index) {
    this.el = el; this.index = index;
    this.id = el.id || (el.id = 'capitulo-' + (index + 1));
    this.label = attr(el, 'data-im-label', '');
    this.length = Math.max(1, num(attr(el, 'data-im-length'), 3));
    this.lerpK = clamp(num(attr(el, 'data-im-lerp'), 0.14), 0.01, 1);
    this.warp = parseKeys(attr(el, 'data-im-warp'));
    this.stage = $('.im-stage', el) || el;
    this.p = 0; this.dp = 0; this.prevDp = -1; this.top = 0; this.height = 0; this.visible = false; this.force = true;
    el.classList.add('im-chapter');
    el.style.setProperty('--im-length', this.length);

    const mEl = $('[data-im-media]', this.stage) || $('.im-media', this.stage);
    this.media = mEl ? makeMedia(this, mEl) : new NoneMedia(this, null);
    this.mediaEl = this.media.el;
    this.cam = this.mediaEl ? normCam(parseKeys(attr(this.mediaEl, 'data-im-cam'))) : null;
    this.camLast = '';

    // linhas em sequência (manifesto, uma por passo)
    for (const box of $$('[data-im-lines]', this.stage)) {
      const kids = Array.from(box.children);
      const single = attr(box, 'data-im-lines', 'stack') === 'single';
      const a = num(attr(box, 'data-im-from'), 0.06), b = num(attr(box, 'data-im-to'), 0.94), span = (b - a) / Math.max(1, kids.length);
      kids.forEach((k, i) => {
        if (!k.hasAttribute('data-im-in')) k.setAttribute('data-im-in', (a + i * span).toFixed(4));
        if (!k.hasAttribute('data-im-out')) k.setAttribute('data-im-out', single ? (a + (i + 1) * span).toFixed(4) : (i === kids.length - 1 ? 1 : b + 0.04).toFixed(4));
        if (!k.hasAttribute('data-im-anim')) k.setAttribute('data-im-anim', single ? 'slam' : 'rise');
      });
    }
    this.overlays = $$('[data-im-in],[data-im-out]', this.stage).map((o) => {
      const anim = attr(o, 'data-im-anim', 'fade');
      o.classList.add('im-o', 'im-anim-' + anim);
      if (anim === 'letters') splitLetters(o);
      return { el: o, a: num(attr(o, 'data-im-in'), 0), b: num(attr(o, 'data-im-out'), 1), fade: num(attr(o, 'data-im-fade'), 0.07), t: -1 };
    });
    this.meters = $$('[data-im-meter]', this.stage).map((m) => this.makeMeter(m));
    this.texts = $$('[data-im-texts]', this.stage).map((t) => ({ el: t, keys: parseKeys(attr(t, 'data-im-texts')), cur: null }));
    this.steps = $$('[data-im-steps]', this.stage).map((s) => ({ el: s, items: Array.from(s.children), keys: parseKeys(attr(s, 'data-im-keys')), a: num(attr(s, 'data-im-from'), 0), b: num(attr(s, 'data-im-to'), 1), cur: -2 }));
    this.callouts = $$('[data-im-callout]', this.stage);
    if (this.callouts.length) this.buildLeaders();
    this.bg = parseKeys(attr(el, 'data-im-bg'));
    const sh = parseRange(attr(el, 'data-im-shake'), null);
    this.shake = sh ? { a: sh[0], b: sh[1], amt: sh[2] == null ? 8 : sh[2] } : null;
    this.texture = attr(el, 'data-im-sound', '');
    this.texRange = parseRange(attr(el, 'data-im-sound-range'), [0, 1]);
    this.hits = String(attr(el, 'data-im-hit', '')).split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [name, at] = s.split('@'); return { name: name.trim(), at: num(at, 0.5), fired: false }; });
    this.hint = $('[data-im-hint]', this.stage);
  }

  makeMeter(m) {
    const keys = parseKeys(attr(m, 'data-im-keys')) || [[0, num(attr(m, 'data-im-from'), 0)], [1, num(attr(m, 'data-im-to'), 100)]];
    const vals = keys.map((k) => +k[1]).filter(Number.isFinite);
    let val = $('.im-meter-v', m);
    if (!val) {
      const label = attr(m, 'data-im-name', attr(m, 'data-im-label', ''));
      const unit = attr(m, 'data-im-unit', '');
      m.classList.add('im-meter');
      m.innerHTML = (label ? `<span class="im-meter-l">${label}</span>` : '') + `<span class="im-meter-row"><span class="im-meter-v">0</span>${unit ? `<span class="im-meter-u">${unit}</span>` : ''}</span>` + (has(m, 'data-im-bar') ? '<span class="im-meter-bar"><i></i></span>' : '');
      val = $('.im-meter-v', m);
    }
    return { el: m, val, keys, dec: num(attr(m, 'data-im-decimals'), 0), pre: attr(m, 'data-im-prefix', ''), suf: attr(m, 'data-im-suffix', ''), min: Math.min(...vals), max: Math.max(...vals), ease: EASE[attr(m, 'data-im-ease', 'linear')] || null, last: null };
  }

  buildLeaders() {
    const svg = D.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'im-leaders');
    svg.setAttribute('aria-hidden', 'true');
    this.stage.appendChild(svg);
    this.svg = svg;
    this.leaders = this.callouts.map((c) => {
      c.classList.add('im-callout');
      const line = D.createElementNS('http://www.w3.org/2000/svg', 'line');
      const dot = D.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '2.5');
      svg.appendChild(line); svg.appendChild(dot);
      return { el: c, line, dot, x: num(attr(c, 'data-im-x'), 0.5), y: num(attr(c, 'data-im-y'), 0.5), lx: num(attr(c, 'data-im-lx'), 0.75), ly: num(attr(c, 'data-im-ly'), 0.25) };
    });
  }

  measure() {
    const r = this.el.getBoundingClientRect();
    this.top = r.top + S.y;
    if (!PARAMS.reduced) {
      const hh = Math.round(this.length * S.vh);
      if (Math.abs(this.el.offsetHeight - hh) > 1) this.el.style.height = hh + 'px';
      this.height = hh;
    } else this.height = this.el.offsetHeight;
    this.media.resize && this.media.resize();
    this.force = true;
  }

  progressAt(y) {
    if (PARAMS.reduced) return 0.5;
    const range = this.height - S.vh;
    let p = range > 1 ? (y - this.top) / range : (y + S.vh - this.top) / (this.height + S.vh);
    p = clamp(p, 0, 1);
    if (this.warp) p = clamp(+sampleKeys(this.warp, p), 0, 1);
    return p;
  }

  update(y) {
    this.visible = y + S.vh > this.top - S.vh * 0.25 && y < this.top + this.height + S.vh * 0.25;
    this.onScreen = y + S.vh > this.top && y < this.top + this.height;
    this.p = this.progressAt(y);
  }

  render(t, dt) {
    if (!this.visible && !this.force) return;
    if (this.solo != null) this.dp = this.p = this.solo;
    else if (this.force && this.prevDp < 0) this.dp = this.p;
    else {
      const k = 1 - Math.pow(1 - this.lerpK, dt * 60);
      this.dp += (this.p - this.dp) * k;
      if (Math.abs(this.p - this.dp) < 0.0004 || !Number.isFinite(this.dp)) this.dp = this.p;
    }
    const p = this.dp;
    const changed = Math.abs(p - this.prevDp) > 1e-5 || this.force;
    try {
      if (this.media.animated) { if (this.visible) this.media.draw(p, this.force, t, dt); }
      else if (changed) this.media.draw(p, this.force);
      else if (this.media.kind === 'frames' && !this.media.exact) this.media.draw(p, false);
    } catch (e) { logErr('midia', e); }
    if (changed) {
      this.applyCam(p);
      for (const o of this.overlays) {
        const v = visWindow(p, o.a, o.b, o.fade);
        if (Math.abs(v - o.t) > 0.002 || this.force) {
          o.t = v;
          o.el.style.setProperty('--im-t', v.toFixed(3));
          o.el.classList.toggle('is-on', v > 0.01);
          o.el.style.visibility = v > 0.001 ? '' : 'hidden';
        }
      }
      for (const m of this.meters) this.renderMeter(m, p);
      for (const tx of this.texts) {
        const k = stepKeys(tx.keys, p);
        if (k && k !== tx.cur) {
          if (tx.cur && tx.cur[2]) tx.el.classList.remove(tx.cur[2]);
          tx.cur = k; tx.el.textContent = k[1];
          if (k[2]) tx.el.classList.add(k[2]);
        }
      }
      for (const s of this.steps) this.renderSteps(s, p);
      if (this.leaders) this.renderLeaders(p);
      if (this.bg && this.onScreen) setPageBg(sampleKeys(this.bg, p));
      if (this.hint) this.hint.classList.toggle('is-on', p > 0.86 && this.p >= this.dp - 0.01);
      this.el.style.setProperty('--im-p', p.toFixed(4));
      this.fireHits(p);
      const fns = S.hooks.get(this.id);
      if (fns) for (const fn of fns) { try { fn(p, this); } catch (e) { logErr('hook', e); } }
      this.prevDp = p;
    }
    if (this.shake) this.renderShake(p);
    this.force = false;
  }

  applyCam(p) {
    if (!this.cam || !this.mediaEl) return;
    const c = sampleKeys(this.cam, p);
    const tr = `translate3d(${c.x.toFixed(3)}%,${c.y.toFixed(3)}%,0) scale(${c.s.toFixed(4)})${c.r ? ` rotate(${c.r.toFixed(3)}deg)` : ''}`;
    if (tr !== this.camLast) { this.mediaEl.style.transform = tr; this.camLast = tr; }
    this.mediaEl.style.opacity = c.o < 0.999 ? c.o.toFixed(3) : '';
    const blur = c.b > 0.05 ? `blur(${c.b.toFixed(2)}px)` : '';
    const f = [S.filter !== 'none' ? S.filter : '', blur].filter(Boolean).join(' ');
    this.mediaEl.style.filter = f;
    this.camNow = c;
  }

  mediaRect() {
    const sw = this.stage.clientWidth, sh = this.stage.clientHeight;
    const [iw, ih] = this.media.contentSize();
    const r = this.media.kind === 'procedural' || this.media.kind === 'none' ? { x: 0, y: 0, w: sw, h: sh } : coverRect(sw, sh, iw, ih, this.media.fit || 'cover');
    const c = this.camNow || CAM0;
    const cx = sw / 2 + (c.x / 100) * sw, cy = sh / 2 + (c.y / 100) * sh;
    const off = { x: (r.x + r.w / 2 - sw / 2) * c.s, y: (r.y + r.h / 2 - sh / 2) * c.s };
    return { x: cx + off.x - (r.w * c.s) / 2, y: cy + off.y - (r.h * c.s) / 2, w: r.w * c.s, h: r.h * c.s, sw, sh };
  }

  renderMeter(m, p) {
    const v = +sampleKeys(m.keys, p, m.ease);
    if (!Number.isFinite(v)) return;
    const txt = m.pre + fmtNum(v, m.dec) + m.suf;
    if (txt !== m.last) { m.val.textContent = txt; m.last = txt; }
    m.el.style.setProperty('--im-v', (m.max > m.min ? (v - m.min) / (m.max - m.min) : 0).toFixed(4));
  }

  renderSteps(s, p) {
    const n = s.items.length;
    let idx;
    if (s.keys) idx = Math.floor(+sampleKeys(s.keys, p));
    else idx = p < s.a ? -1 : Math.min(n - 1, Math.floor(inv(s.a, s.b, p) * n));
    s.el.style.setProperty('--im-step-p', clamp(inv(s.a, s.b, p), 0, 1).toFixed(4));
    if (idx === s.cur) return;
    s.cur = idx;
    s.items.forEach((it, i) => { it.classList.toggle('is-done', i < idx); it.classList.toggle('is-active', i === idx); });
  }

  renderLeaders(p) {
    const r = this.mediaRect();
    this.svg.setAttribute('viewBox', `0 0 ${r.sw} ${r.sh}`);
    for (const L of this.leaders) {
      const ov = this.overlays.find((o) => o.el === L.el);
      const t = ov ? ov.t : 1;
      const ax = r.x + L.x * r.w, ay = r.y + L.y * r.h;
      const lx = L.lx * r.sw, ly = L.ly * r.sh;
      const right = lx >= ax;
      L.el.style.left = lx + 'px';
      L.el.style.top = ly + 'px';
      L.el.classList.toggle('im-callout--left', !right);
      const ex = lx + (right ? -8 : 8);
      L.line.setAttribute('x1', ax); L.line.setAttribute('y1', ay);
      L.line.setAttribute('x2', lerp(ax, ex, EASE.out(t))); L.line.setAttribute('y2', lerp(ay, ly, EASE.out(t)));
      L.line.style.opacity = t;
      L.dot.setAttribute('cx', ax); L.dot.setAttribute('cy', ay);
      L.dot.style.opacity = t;
    }
  }

  fireHits(p) {
    if (!this.hits.length) return;
    const prev = this.prevDp < 0 ? p : this.prevDp;
    for (const hit of this.hits) {
      if (prev < hit.at && p >= hit.at) Sound.hit(hit.name);
      if (p < hit.at - 0.05) hit.fired = false;
    }
  }

  renderShake(p) {
    const s = this.shake, inR = p >= s.a && p <= s.b;
    const k = inR ? clamp(Math.abs(S.vy) / 1400, 0, 1) * Math.sin(Math.PI * inv(s.a, s.b, p)) : 0;
    this.shakeK = lerp(this.shakeK || 0, k, 0.25);
    if (this.shakeK < 0.01) { if (this.shaking) { this.stage.style.translate = ''; this.shaking = false; } return; }
    const a = s.amt * this.shakeK;
    this.stage.style.translate = `${rand(-a, a).toFixed(2)}px ${rand(-a, a).toFixed(2)}px`;
    this.shaking = true;
  }

  textureLevel() {
    if (!this.texture || !this.onScreen) return 0;
    const p = this.dp;
    if (p < this.texRange[0] || p > this.texRange[1]) return 0;
    const moving = Math.abs(this.p - this.dp) * 40 + Math.abs(S.vy) / 1600;
    return clamp(moving, 0, 1);
  }
}

let _bgLast = '';
function setPageBg(c) {
  if (!c || c === _bgLast) return;
  _bgLast = c;
  R.style.setProperty('--im-page-bg', c);
  S.bgColor = c;
}

/* =====================================================================
 *  SOM — tudo sintetizado com Web Audio, nenhum arquivo.
 *  Desligado por padrão; ?mute=1 força silêncio para testes.
 *  Texturas tocam só enquanto o filme se move e silenciam quando o scroll para.
 * ===================================================================== */
const Sound = {
  ctx: null, master: null, on: false, textures: new Map(), ambient: null, buffers: {},

  available() { return !!(W.AudioContext || W.webkitAudioContext); },

  ensure() {
    if (this.ctx || !this.available()) return this.ctx;
    const AC = W.AudioContext || W.webkitAudioContext;
    this.ctx = new AC();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    return this.ctx;
  },

  noise(kind, seconds) {
    const key = kind + seconds;
    if (this.buffers[key]) return this.buffers[key];
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; }
      else if (kind === 'crackle') { d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : d[i - 1] ? d[i - 1] * 0.55 : 0; }
      else d[i] = w;
    }
    this.buffers[key] = buf;
    return buf;
  },
  src(kind, seconds) { const s = this.ctx.createBufferSource(); s.buffer = this.noise(kind, seconds || 3); s.loop = true; s.start(); return s; },
  filt(type, f, q) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; },
  osc(type, f) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; },
  gain(v) { const g = this.ctx.createGain(); g.gain.value = v; return g; },
  chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; },

  /* Texturas contínuas (volume controlado pelo movimento). */
  makeTexture(name) {
    const out = this.gain(0);
    out.connect(this.master);
    const add = (node, g) => { const gg = this.gain(g); node.connect(gg); gg.connect(out); };
    switch (name) {
      case 'rumble': // ruído marrom + sub de 36 Hz + estalos
        add(this.chain(this.src('brown', 4), this.filt('lowpass', 180)), 0.9);
        add(this.osc('sine', 36), 0.55);
        add(this.chain(this.src('crackle', 3), this.filt('highpass', 1800)), 0.35);
        break;
      case 'fire':
        add(this.chain(this.src('brown', 4), this.filt('lowpass', 520)), 0.6);
        add(this.chain(this.src('crackle', 3), this.filt('bandpass', 2600, 0.8)), 0.6);
        break;
      case 'air': case 'wind': {
        const bp = this.filt('bandpass', 700, 0.7);
        const lfo = this.osc('sine', 0.09), lg = this.gain(380);
        lfo.connect(lg); lg.connect(bp.frequency);
        add(this.chain(this.src('pink', 4), bp), 0.9);
        break;
      }
      case 'water':
        add(this.chain(this.src('brown', 4), this.filt('lowpass', 650)), 0.55);
        add(this.chain(this.src('crackle', 3), this.filt('bandpass', 1200, 3)), 0.25);
        break;
      case 'shimmer':
        for (const f of [1760, 2637, 3520, 4186]) {
          const o = this.osc('sine', f), g = this.gain(0.05), lfo = this.osc('sine', 0.2 + Math.random() * 0.5), lg = this.gain(0.04);
          lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(out);
        }
        break;
      case 'hum': // zumbido de forno / máquina
        for (const [f, g] of [[50, 0.4], [100, 0.22], [150, 0.08]]) add(this.osc('sine', f), g);
        add(this.chain(this.src('brown', 4), this.filt('lowpass', 120)), 0.4);
        break;
      default:
        add(this.chain(this.src('pink', 4), this.filt('lowpass', 900)), 0.5);
    }
    return { out, level: 0 };
  },

  /* Golpes pontuais no grande momento do capítulo. */
  hit(name) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime, out = this.gain(1);
    out.connect(this.master);
    const env = (g, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const once = (kind, secs) => { const s = c.createBufferSource(); s.buffer = this.noise(kind, secs); s.start(t); s.stop(t + secs); return s; };
    switch (name) {
      case 'drop808': case 'drop': {
        const o = c.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.28);
        const g = this.gain(0); env(g, 0.005, 1.0, 1.9);
        const ws = c.createWaveShaper(); const k = new Float32Array(512);
        for (let i = 0; i < 512; i++) { const x = i / 256 - 1; k[i] = Math.tanh(x * 2.2); }
        ws.curve = k;
        o.connect(g); g.connect(ws); ws.connect(out); o.start(t); o.stop(t + 2.2);
        const ck = this.gain(0); env(ck, 0.001, 0.4, 0.04); this.chain(once('white', 0.1), this.filt('highpass', 3000), ck, out);
        break;
      }
      case 'crunch': {
        for (let i = 0; i < 7; i++) {
          const g = this.gain(0), st = t + i * 0.028 + Math.random() * 0.02;
          g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.5 + Math.random() * 0.4, st + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.07);
          const s = c.createBufferSource(); s.buffer = this.noise('white', 0.2); s.start(st); s.stop(st + 0.12);
          this.chain(s, this.filt('bandpass', 1800 + Math.random() * 2400, 1.2), g, out);
        }
        break;
      }
      case 'whoosh': {
        const bp = this.filt('bandpass', 300, 1.4);
        bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(3200, t + 0.55);
        const g = this.gain(0); env(g, 0.25, 0.6, 0.45);
        this.chain(once('pink', 1), bp, g, out);
        break;
      }
      case 'impact': {
        const o = c.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
        const g = this.gain(0); env(g, 0.004, 0.9, 0.7); o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.2);
        const n = this.gain(0); env(n, 0.002, 0.5, 0.25); this.chain(once('brown', 0.5), this.filt('lowpass', 400), n, out);
        break;
      }
      case 'chime': {
        for (const [f, d] of [[880, 2.4], [1318, 1.8], [2213, 1.2], [3021, 0.8]]) {
          const o = c.createOscillator(); o.frequency.value = f;
          const g = this.gain(0); env(g, 0.004, 0.18, d); o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.1);
        }
        break;
      }
      case 'ignition': {
        const lp = this.filt('lowpass', 200);
        lp.frequency.setValueAtTime(200, t); lp.frequency.exponentialRampToValueAtTime(2400, t + 1.4);
        const g = this.gain(0); env(g, 1.2, 0.9, 1.6);
        this.chain(once('brown', 3.2), lp, g, out);
        const o = c.createOscillator(); o.frequency.value = 36; const og = this.gain(0); env(og, 1.0, 0.7, 1.8); o.connect(og); og.connect(out); o.start(t); o.stop(t + 3);
        break;
      }
      case 'tick': default: {
        const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 1800;
        const g = this.gain(0); env(g, 0.001, 0.08, 0.03); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.06);
      }
    }
  },

  async setOn(v) {
    if (PARAMS.mute) v = false;
    if (v) {
      if (!this.ensure()) return;
      if (this.ctx.state === 'suspended') { try { await this.ctx.resume(); } catch (e) { /* bloqueado pelo navegador */ } }
      const amb = S.root && attr(S.root, 'data-im-ambient', '');
      if (amb && !this.ambient) { this.ambient = this.makeTexture(amb); this.ambient.out.gain.value = 0.12; }
    }
    this.on = !!v;
    if (this.master) this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ctx.currentTime, 0.08);
    for (const b of $$('[data-im-sound-toggle]')) {
      b.setAttribute('aria-pressed', String(this.on));
      b.classList.toggle('is-on', this.on);
      const label = $('.im-sound-label', b);
      if (label) label.textContent = this.on ? attr(b, 'data-on', TXT.soundOn) : attr(b, 'data-off', TXT.soundOff);
    }
  },

  /* Chamado a cada frame: volume de cada textura segue o movimento do scroll. */
  tick() {
    if (!this.on || !this.ctx) return;
    const want = new Map();
    for (const ch of S.chapters) {
      if (!ch.texture) continue;
      want.set(ch.texture, Math.max(want.get(ch.texture) || 0, ch.textureLevel()));
    }
    for (const [name, lvl] of want) {
      let tx = this.textures.get(name);
      if (!tx && lvl > 0.01) { tx = this.makeTexture(name); this.textures.set(name, tx); }
      if (!tx) continue;
      tx.level = lerp(tx.level, lvl, lvl > tx.level ? 0.25 : 0.12);
      tx.out.gain.setTargetAtTime(tx.level * 0.7, this.ctx.currentTime, 0.05);
    }
  },
};

function initSound() {
  for (const b of $$('[data-im-sound-toggle]')) {
    if (PARAMS.mute || !Sound.available()) { b.hidden = true; continue; }
    if (!$('.im-sound-label', b) && !b.textContent.trim()) b.innerHTML = '<span class="im-sound-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="im-sound-label"></span>';
    b.setAttribute('aria-pressed', 'false');
    const label = $('.im-sound-label', b);
    if (label) label.textContent = attr(b, 'data-off', TXT.soundOff);
    b.addEventListener('click', () => Sound.setOn(!Sound.on));
  }
  // Som de interface opcional em botões
  D.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-im-click-sound]'); if (t) Sound.hit(attr(t, 'data-im-click-sound', 'tick')); });
}

/* =====================================================================
 *  COMPONENTES INTERATIVOS
 *  lente raio-X/térmica · antes/depois · girar · paleta · cursor ·
 *  magnético · tilt · marquee · hover-play · revelar · contadores ·
 *  parallax · fundo por seção · índice de capítulos
 * ===================================================================== */
const POINTER_FINE = MQ('(hover: hover) and (pointer: fine)');

/* ---------- Lente de raio-X / térmica ---------- */
const THERMAL_RAMP = [[0, '#14062e'], [0.22, '#2b3bd1'], [0.45, '#b4248f'], [0.65, '#f0531a'], [0.85, '#ffc21a'], [1, '#ffffff']].map(([p, c]) => [p, parseColor(c)]);
function thermalU(c) {
  let best = 0, bd = Infinity;
  for (let i = 0; i <= 64; i++) {
    const u = i / 64;
    let a = THERMAL_RAMP[0], b = THERMAL_RAMP[THERMAL_RAMP.length - 1];
    for (let k = 1; k < THERMAL_RAMP.length; k++) if (u <= THERMAL_RAMP[k][0]) { a = THERMAL_RAMP[k - 1]; b = THERMAL_RAMP[k]; break; }
    const m = mixRgb(a[1], b[1], inv(a[0], b[0], u));
    const d = (m.r - c.r) ** 2 + (m.g - c.g) ** 2 + (m.b - c.b) ** 2;
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}
class Lens {
  constructor(el) {
    this.el = el;
    this.base = $('.im-lens-base', el) || $('img', el);
    this.layers = $$('.im-lens-layer', el).map((img) => ({
      img, name: attr(img, 'data-name', ''), legend: (json(attr(img, 'data-legend'), []) || []).map(([c, l]) => [parseColor(c), l]).filter((x) => x[0]),
      thermal: parseRange(attr(img, 'data-thermal'), null), unit: attr(img, 'data-unit', '°C'), canvas: null,
    }));
    this.r = num(attr(el, 'data-im-radius'), 130);
    this.off = parseRange(attr(el, 'data-im-offset'), [0, 0]);
    this.active = 0; this.mx = 0.5; this.my = 0.5; this.tx = 0.5; this.ty = 0.5; this.last = -1e9;
    el.tabIndex = 0;
    el.setAttribute('role', 'group');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', PT ? 'Lente interativa: mova o cursor ou use as setas' : 'Interactive lens: move the cursor or use arrow keys');
    this.ring = $('.im-lens-ring', el) || el.appendChild(h('div', 'im-lens-ring'));
    this.readout = $('.im-lens-readout', el) || el.appendChild(h('div', 'im-lens-readout'));
    this.readout.setAttribute('aria-live', 'polite');
    for (const L of this.layers) {
      L.img.style.translate = `${this.off[0]}% ${this.off[1]}%`;
      const prep = () => this.prepare(L);
      if (L.img.complete && L.img.naturalWidth) prep(); else L.img.addEventListener('load', prep, { once: true });
    }
    if (this.layers.length > 1) {
      const bar = h('div', 'im-lens-toggle');
      this.layers.forEach((L, i) => {
        const b = h('button', '', L.name || String(i + 1));
        b.type = 'button';
        b.addEventListener('click', () => this.setLayer(i));
        bar.appendChild(b);
        L.btn = b;
      });
      el.appendChild(bar);
    }
    this.setLayer(0);
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); this.tx = (e.clientX - r.left) / r.width; this.ty = (e.clientY - r.top) / r.height; this.last = now(); });
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') el.setPointerCapture && el.setPointerCapture(e.pointerId); });
    el.addEventListener('keydown', (e) => {
      const k = { ArrowLeft: [-0.03, 0], ArrowRight: [0.03, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] }[e.key];
      if (k) { e.preventDefault(); this.tx = clamp(this.tx + k[0], 0, 1); this.ty = clamp(this.ty + k[1], 0, 1); this.last = now(); }
    });
  }
  setLayer(i) {
    this.active = i;
    this.layers.forEach((L, k) => { L.img.classList.toggle('is-active', k === i); if (L.btn) L.btn.setAttribute('aria-pressed', String(k === i)); });
    this.sampled = -1;
  }
  prepare(L) {
    try {
      const w = Math.min(720, L.img.naturalWidth), hh = Math.round((w * L.img.naturalHeight) / L.img.naturalWidth);
      const c = D.createElement('canvas');
      c.width = w; c.height = hh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(L.img, 0, 0, w, hh);
      g.getImageData(0, 0, 1, 1);
      L.canvas = c; L.g = g;
    } catch (e) { logErr('lente', 'leitura de pixel indisponível (imagem de outra origem)'); }
  }
  measure() { const r = this.el.getBoundingClientRect(); this.box = { top: r.top + S.y, w: r.width, h: r.height }; }
  tick(t) {
    const idle = now() - this.last > 2600;
    if (idle && !PARAMS.reduced) {
      const s = t * 0.001;
      this.tx = 0.5 + 0.28 * Math.sin(s * 0.42); this.ty = 0.5 + 0.2 * Math.sin(s * 0.57 + 1.3);
    }
    this.mx = lerp(this.mx, this.tx, idle ? 0.04 : 0.28); this.my = lerp(this.my, this.ty, idle ? 0.04 : 0.28);
    if (!this.box) this.measure();
    const top = this.box.top - S.y, r = { width: this.box.w, height: this.box.h };
    if (top + r.height < 0 || top > S.vh) return;
    const x = this.mx * r.width, y = this.my * r.height;
    this.el.style.setProperty('--im-mx', x.toFixed(1) + 'px');
    this.el.style.setProperty('--im-my', y.toFixed(1) + 'px');
    this.el.style.setProperty('--im-r', this.r + 'px');
    this.ring.style.transform = `translate3d(${x - this.r}px,${y - this.r}px,0)`;
    const flip = x > r.width * 0.7;
    this.readout.style.transform = `translate3d(${flip ? x - this.r * 0.75 : x + this.r * 0.75}px,${y - this.r * 0.75}px,0) translateX(${flip ? '-100%' : '0'})`;
    const key = Math.round(x / 3) * 10000 + Math.round(y / 3) + this.active * 1e8;
    if (key !== this.sampled) { this.sampled = key; this.read(x, y, r); }
  }
  read(x, y, r) {
    const L = this.layers[this.active];
    if (!L) return;
    let text = L.name;
    if (L.g) {
      const cr = coverRect(r.width, r.height, L.canvas.width, L.canvas.height, 'cover');
      const ix = Math.round(((x - (this.off[0] / 100) * r.width - cr.x) / cr.w) * L.canvas.width);
      const iy = Math.round(((y - (this.off[1] / 100) * r.height - cr.y) / cr.h) * L.canvas.height);
      if (ix >= 0 && iy >= 0 && ix < L.canvas.width && iy < L.canvas.height) {
        const d = L.g.getImageData(clamp(ix - 1, 0, L.canvas.width - 3), clamp(iy - 1, 0, L.canvas.height - 3), 3, 3).data;
        let cr2 = 0, cg = 0, cb = 0;
        for (let i = 0; i < d.length; i += 4) { cr2 += d[i]; cg += d[i + 1]; cb += d[i + 2]; }
        const c = { r: cr2 / 9, g: cg / 9, b: cb / 9, a: 1 };
        if (L.thermal) {
          const tv = lerp(L.thermal[0], L.thermal[1], thermalU(c));
          text = `${L.name ? L.name + ' · ' : ''}${fmtNum(tv, 1)} ${L.unit}`;
        } else if (L.legend.length) {
          let best = null, bd = Infinity;
          for (const [lc, label] of L.legend) { const dd = (lc.r - c.r) ** 2 + (lc.g - c.g) ** 2 + (lc.b - c.b) ** 2; if (dd < bd) { bd = dd; best = label; } }
          text = `${L.name ? L.name + ' · ' : ''}${bd < 95 * 95 ? best : attr(this.el, 'data-im-none', PT ? 'estrutura' : 'structure')}`;
        }
      }
    }
    if (text !== this.readout.textContent) this.readout.textContent = text;
  }
}

/* ---------- Antes / depois arrastável ---------- */
class Compare {
  constructor(el) {
    this.el = el;
    this.pos = clamp(num(attr(el, 'data-im-start'), 0.5), 0, 1);
    this.handle = $('.im-compare-handle', el) || el.appendChild(h('button', 'im-compare-handle'));
    this.handle.type = 'button';
    this.handle.setAttribute('role', 'slider');
    this.handle.setAttribute('aria-valuemin', '0');
    this.handle.setAttribute('aria-valuemax', '100');
    if (!this.handle.getAttribute('aria-label')) this.handle.setAttribute('aria-label', PT ? 'Comparar antes e depois' : 'Compare before and after');
    const set = (e) => { const r = el.getBoundingClientRect(); this.set((e.clientX - r.left) / r.width); };
    let drag = false;
    el.addEventListener('pointerdown', (e) => { drag = true; el.setPointerCapture && el.setPointerCapture(e.pointerId); set(e); });
    el.addEventListener('pointermove', (e) => { if (drag) set(e); });
    el.addEventListener('pointerup', () => { drag = false; });
    el.addEventListener('pointercancel', () => { drag = false; });
    this.handle.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: -0.03, ArrowRight: 0.03, Home: -1, End: 1 }[e.key];
      if (d != null) { e.preventDefault(); this.set(this.pos + d); }
    });
    this.set(this.pos);
  }
  set(v) {
    this.pos = clamp(v, 0, 1);
    this.el.style.setProperty('--im-pos', (this.pos * 100).toFixed(2) + '%');
    this.handle.setAttribute('aria-valuenow', String(Math.round(this.pos * 100)));
  }
}

/* ---------- Arraste para girar (reaproveita os frames da órbita) ---------- */
class Spin {
  constructor(el) {
    this.el = el;
    this.canvas = $('canvas', el) || el.appendChild(h('canvas'));
    this.ctx = this.canvas.getContext('2d');
    this.seq = seqFor(el);
    this.f = 0; this.v = 0; this.drawn = -1; this.last = now();
    this.auto = num(attr(el, 'data-im-autorotate'), 0);
    el.tabIndex = 0;
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', attr(el, 'aria-label', PT ? 'Arraste para girar' : 'Drag to rotate'));
    if (!this.seq) {
      logErr('girar', 'sequência ausente para o visualizador');
      el.classList.add('im-missing');
      el.setAttribute('data-im-missing', (PT ? 'frames pendentes: ' : 'missing frames: ') + attr(el, 'data-im-seq', ''));
      return;
    }
    let drag = null;
    el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, f: this.f, t: now() }; this.v = 0; el.setPointerCapture && el.setPointerCapture(e.pointerId); el.classList.add('is-drag'); this.last = now(); });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const per = el.clientWidth / this.seq.count / 1.2;
      const nf = drag.f - (e.clientX - drag.x) / per;
      const dt = Math.max(1, now() - drag.t);
      this.v = ((nf - this.f) / dt) * 16;
      this.f = nf; drag.t = now(); this.last = now();
    });
    const end = () => { drag = null; el.classList.remove('is-drag'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', (e) => { const d = { ArrowLeft: -2, ArrowRight: 2 }[e.key]; if (d) { e.preventDefault(); this.f += d; this.last = now(); } });
    for (const i of this.seq.order()) enqueue(this.seq, i, false);
  }
  measure() { const r = this.el.getBoundingClientRect(); this.box = { top: r.top + S.y, h: r.height }; this.drawn = -1; }
  tick() {
    if (!this.seq) return;
    if (!this.box) this.measure();
    const top = this.box.top - S.y;
    if (top + this.box.h < 0 || top > S.vh) return;
    if (Math.abs(this.v) > 0.01) { this.f += this.v; this.v *= 0.94; }
    else if (this.auto && !PARAMS.reduced && now() - this.last > 2000) this.f += this.auto;
    const n = this.seq.count;
    const i = ((Math.round(this.f) % n) + n) % n;
    const w = Math.round(this.canvas.clientWidth * S.dpr), hh = Math.round(this.canvas.clientHeight * S.dpr);
    if (this.canvas.width !== w || this.canvas.height !== hh) { this.canvas.width = w; this.canvas.height = hh; this.drawn = -1; }
    if (i === this.drawn) return;
    const img = this.seq.nearest(i);
    if (!img) return;
    const cr = coverRect(w, hh, img.naturalWidth, img.naturalHeight, attr(this.el, 'data-im-fit', 'cover'));
    this.ctx.clearRect(0, 0, w, hh);
    this.ctx.drawImage(img, cr.x, cr.y, cr.w, cr.h);
    this.drawn = img === this.seq.imgs[i] ? i : -1;
    this.el.setAttribute('aria-valuenow', String(i));
  }
}

/* ---------- Seletor de paleta (filtros em todos os filmes + acento junto) ---------- */
const PALETTES = [
  ['Original', 'none'],
  ['Neon', 'hue-rotate(-28deg) saturate(1.9) contrast(1.12) brightness(1.05)'],
  [PT ? 'Pôr do sol' : 'Sunset', 'sepia(0.35) hue-rotate(-22deg) saturate(1.7)'],
  [PT ? 'Oceano' : 'Ocean', 'hue-rotate(165deg) saturate(1.3)'],
  ['Mono', 'grayscale(1) contrast(1.2)'],
];
function initPalette(el) {
  if (!$('button', el)) for (const [label, f] of PALETTES) { const b = h('button', '', label); b.type = 'button'; b.setAttribute('data-filter', f); el.appendChild(b); }
  el.setAttribute('role', 'group');
  const btns = $$('button[data-filter]', el);
  const set = (b) => {
    S.filter = attr(b, 'data-filter', 'none') || 'none';
    R.style.setProperty('--im-media-filter', S.filter);
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    for (const ch of S.chapters) ch.force = true;
    updateAccentTarget();
  };
  btns.forEach((b) => b.addEventListener('click', () => set(b)));
  if (btns[0]) btns[0].setAttribute('aria-pressed', 'true');
}
function updateAccentTarget() {
  const base = S.sampled || S.baseAccent;
  if (!base) return;
  S.accentTarget = filterColor(base, S.filter);
}
function tickAccent() {
  if (!S.accentTarget) return;
  const cur = S.accentCur || S.accentTarget;
  const next = mixRgb(cur, S.accentTarget, 0.12);
  S.accentCur = next;
  const hex = rgbStr(next);
  if (hex !== S.accentNow) { S.accentNow = hex; R.style.setProperty('--im-accent', hex); R.style.setProperty('--im-accent-rgb', `${next.r | 0},${next.g | 0},${next.b | 0}`); }
}

/* ---------- Cursor: anel, ponto ou spray de tinta ---------- */
const Cursor = {
  init(mode) {
    if (!POINTER_FINE || mode === 'none' || !mode) return;
    this.mode = mode;
    this.x = this.y = this.rx = this.ry = -100;
    if (mode === 'paint') this.initPaint();
    else {
      this.dot = D.body.appendChild(h('div', 'im-cursor'));
      this.ring = D.body.appendChild(h('div', 'im-cursor-ring'));
      this.label = this.ring.appendChild(h('span', 'im-cursor-label'));
      if (mode === 'dot') this.ring.classList.add('im-cursor-ring--dot');
      if (has(S.root, 'data-im-cursor-hide')) R.classList.add('im-cursor-hide');
    }
    W.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; this.vx = e.clientX - this.x; this.vy2 = e.clientY - this.y; this.x = e.clientX; this.y = e.clientY; this.moved = true; }, { passive: true });
    D.addEventListener('pointerover', (e) => {
      if (!this.ring) return;
      const t = e.target.closest && e.target.closest('a,button,[data-im-hover],input,select,textarea,label,summary,[data-im-spin],[data-im-compare]');
      this.ring.classList.toggle('is-hover', !!t);
      this.label.textContent = t ? attr(t, 'data-im-cursor-label', '') : '';
    });
    D.addEventListener('pointerdown', (e) => { if (this.ring) this.ring.classList.add('is-down'); if (this.mode === 'paint') this.splat(e.clientX, e.clientY); });
    D.addEventListener('pointerup', () => this.ring && this.ring.classList.remove('is-down'));
  },
  initPaint() {
    this.cv = D.body.appendChild(h('canvas', 'im-paint'));
    this.pctx = this.cv.getContext('2d');
    this.drops = []; this.splats = [];
    const fit = () => { this.cv.width = Math.round(S.vw * S.dpr); this.cv.height = Math.round(S.vh * S.dpr); };
    fit(); W.addEventListener('resize', fit);
  },
  colors() {
    const list = json(attr(S.root, 'data-im-paint-colors'), null);
    return list || [S.accentNow || cssVar('--im-accent', '#ff2d95'), '#ff2d95', '#00d1ff', '#ffd400', '#ff7a00', '#8a4dff', '#9dff00'];
  },
  splat(x, y) {
    if (!this.cv) return;
    const cols = this.colors(), c = cols[(Math.random() * cols.length) | 0];
    this.splats.push({ x, y, c, life: 0, r: 14 + Math.random() * 18, bits: Array.from({ length: 9 }, () => [rand(0, 6.28), rand(0.6, 1.9), rand(2, 7)]) });
    for (let i = 0; i < 18; i++) this.drops.push({ x, y, vx: rand(-6, 6), vy: rand(-7, 2), s: rand(1.5, 4.5), c, life: 0 });
    if (this.splats.length > 40) this.splats.shift();
  },
  tick(dt) {
    if (!this.mode) return;
    if (this.ring) {
      this.rx = lerp(this.rx, this.x, 0.18); this.ry = lerp(this.ry, this.y, 0.18);
      this.dot.style.transform = `translate3d(${this.x}px,${this.y}px,0)`;
      this.ring.style.transform = `translate3d(${this.rx}px,${this.ry}px,0)`;
      return;
    }
    if (!this.cv) return;
    if (this.moved && !PARAMS.reduced) {
      this.moved = false;
      const sp = Math.hypot(this.vx || 0, this.vy2 || 0), n = Math.min(5, sp / 9) | 0, cols = this.colors();
      for (let i = 0; i < n; i++) this.drops.push({ x: this.x, y: this.y, vx: (this.vx || 0) * 0.15 + rand(-1.2, 1.2), vy: (this.vy2 || 0) * 0.15 + rand(-1.5, 0.5), s: rand(1, 3.2), c: cols[(Math.random() * cols.length) | 0], life: 0 });
      if (this.drops.length > 400) this.drops.splice(0, this.drops.length - 400);
    }
    const g = this.pctx, d = S.dpr;
    if (!this.drops.length && !this.splats.length) { if (this.dirty) { g.clearRect(0, 0, this.cv.width, this.cv.height); this.dirty = false; } return; }
    this.dirty = true;
    g.clearRect(0, 0, this.cv.width, this.cv.height);
    for (const s of this.splats) {
      s.life += dt;
      const a = clamp(1 - s.life / 3.2, 0, 1);
      g.globalAlpha = a * 0.85; g.fillStyle = s.c;
      g.beginPath(); g.arc(s.x * d, s.y * d, s.r * d * Math.min(1, s.life * 9), 0, 6.283); g.fill();
      for (const [ang, dist, r] of s.bits) { g.beginPath(); g.arc((s.x + Math.cos(ang) * s.r * dist) * d, (s.y + Math.sin(ang) * s.r * dist) * d, r * d, 0, 6.283); g.fill(); }
    }
    this.splats = this.splats.filter((s) => s.life < 3.2);
    for (const p of this.drops) {
      p.life += dt; p.vy += 0.25; p.x += p.vx; p.y += p.vy;
      g.globalAlpha = clamp(1 - p.life / 1.1, 0, 1); g.fillStyle = p.c;
      g.beginPath(); g.arc(p.x * d, p.y * d, p.s * d, 0, 6.283); g.fill();
    }
    this.drops = this.drops.filter((p) => p.life < 1.1 && p.y < S.vh + 20);
    g.globalAlpha = 1;
  },
};

/* ---------- Pequenas interações ---------- */
function initMagnetic(el) {
  if (!POINTER_FINE || PARAMS.reduced) return;
  const k = num(attr(el, 'data-im-magnetic'), 0.3) || 0.3;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.translate = `${((e.clientX - r.left - r.width / 2) * k).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * k).toFixed(1)}px`;
  });
  el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  el.classList.add('im-magnetic');
}
function initTilt(el) {
  if (!POINTER_FINE || PARAMS.reduced) return;
  const max = num(attr(el, 'data-im-tilt'), 6) || 6;
  el.classList.add('im-tilt');
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
    el.style.setProperty('--im-gx', ((x + 0.5) * 100).toFixed(1) + '%');
    el.style.setProperty('--im-gy', ((y + 0.5) * 100).toFixed(1) + '%');
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}
function initMarquee(el) {
  if (el.dataset.imMarqueeReady) return;
  el.dataset.imMarqueeReady = '1';
  const track = h('div', 'im-marquee-track');
  const kids = Array.from(el.childNodes);
  const a = h('div', 'im-marquee-group'), b = h('div', 'im-marquee-group');
  kids.forEach((k) => a.appendChild(k));
  b.innerHTML = a.innerHTML; b.setAttribute('aria-hidden', 'true');
  track.appendChild(a); track.appendChild(b);
  el.appendChild(track);
  el.classList.add('im-marquee');
  el.style.setProperty('--im-marquee-dur', num(attr(el, 'data-im-marquee'), 28) + 's');
  S.marquees = S.marquees || [];
  S.marquees.push(track);
}
function initHoverPlay(v) {
  const card = v.closest('[data-im-hover-card]') || v.parentElement;
  v.muted = true; v.playsInline = true; v.loop = true; v.preload = v.preload || 'metadata';
  const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const stop = () => { v.pause(); try { v.currentTime = 0; } catch (e) { /* ok */ } };
  card.addEventListener('pointerenter', play); card.addEventListener('pointerleave', stop);
  card.addEventListener('focusin', play); card.addEventListener('focusout', stop);
}

/* ---------- Revelar ao entrar, contadores ---------- */
let _io = null, _ioMask = null;
function onReveal(entries, io) {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    if (e.target.hasAttribute('data-im-count')) runCount(e.target);
    io.unobserve(e.target);
  }
}
function revealObserver(mask) {
  if (!('IntersectionObserver' in W)) return null;
  // O Chrome desconta o clip-path do próprio alvo: o "mask" deixa 1 px visível
  // (ver CSS) e usa limiar 0, senão nunca cruzaria o limiar de 15%.
  if (mask) return _ioMask || (_ioMask = new IntersectionObserver((en) => onReveal(en, _ioMask), { threshold: 0, rootMargin: '0px 0px -10% 0px' }));
  return _io || (_io = new IntersectionObserver((en) => onReveal(en, _io), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }));
}
function initReveal(el) {
  const io = revealObserver(attr(el, 'data-im-reveal', '') === 'mask');
  if (!io || PARAMS.reduced) { el.classList.add('is-in'); if (el.hasAttribute('data-im-count')) runCount(el, true); return; }
  io.observe(el);
}
function initStagger(el) {
  const ms = num(attr(el, 'data-im-stagger'), 90);
  Array.from(el.children).forEach((k, i) => { k.style.setProperty('--im-delay', i * ms + 'ms'); if (!k.hasAttribute('data-im-reveal')) k.setAttribute('data-im-reveal', attr(el, 'data-im-stagger-anim', 'rise')); });
}
function runCount(el, instant) {
  if (el.dataset.imCounted) return;
  el.dataset.imCounted = '1';
  const raw = attr(el, 'data-im-count', '');
  const target = raw !== '' ? num(raw, 0) : num(String(el.textContent).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'), 0);
  const dec = num(attr(el, 'data-im-decimals'), 0), pre = attr(el, 'data-im-prefix', ''), suf = attr(el, 'data-im-suffix', '');
  const dur = num(attr(el, 'data-im-duration'), 1600);
  const out = $('.im-count-v', el) || el;
  if (instant || PARAMS.reduced) { out.textContent = pre + fmtNum(target, dec) + suf; return; }
  const t0 = now();
  const step = () => {
    const k = clamp((now() - t0) / dur, 0, 1);
    out.textContent = pre + fmtNum(target * EASE.expo(k), dec) + suf;
    if (k < 1) requestAnimationFrame(step);
  };
  step();
}

/* ---------- Parallax e fundo por seção ---------- */
const Para = {
  items: [],
  add(el) { this.items.push({ el, k: num(attr(el, 'data-im-parallax'), 0.15), top: 0, h: 0 }); },
  measure() { for (const it of this.items) { it.el.style.translate = ''; const r = it.el.getBoundingClientRect(); it.top = r.top + S.y; it.h = r.height; } },
  tick() {
    if (PARAMS.reduced) return;
    for (const it of this.items) {
      const c = it.top + it.h / 2 - (S.y + S.vh / 2);
      if (Math.abs(c) > S.vh * 1.5) continue;
      it.el.style.translate = `0 ${(-c * it.k).toFixed(1)}px`;
    }
  },
};
const BgSections = {
  items: [],
  add(el) { this.items.push(el); R.classList.add('im-bg-sync'); this.boxes = null; },
  measure() { this.boxes = this.items.map((el) => { const r = el.getBoundingClientRect(); return { el, top: r.top + S.y, h: r.height }; }); },
  tick() {
    if (!this.items.length) return;
    if (!this.boxes) this.measure();
    const mid = S.y + S.vh / 2;
    for (const { el, top, h: hh } of this.boxes) {
      if (top <= mid && top + hh >= mid) {
        setPageBg(attr(el, 'data-im-bg-section', ''));
        const fg = attr(el, 'data-im-fg-section', '');
        if (fg && fg !== S.fg) { S.fg = fg; R.classList.add('im-fg-sync'); R.style.setProperty('--im-page-fg', fg); }
        break;
      }
    }
  },
};

/* ---------- Índice de capítulos ---------- */
const Index = {
  init(el) {
    this.el = el;
    this.targets = $$('[data-im-label]').filter((t) => !t.closest('[data-im-index]') && !t.hasAttribute('data-im-meter'));
    if (!this.targets.length) { el.hidden = true; return; }
    const ol = h('ol', 'im-index-list');
    this.items = this.targets.map((t, i) => {
      if (!t.id) t.id = 'secao-' + (i + 1);
      const li = h('li');
      const a = h('a', '', `<span class="im-index-n">${String(i + 1).padStart(2, '0')}</span><span class="im-index-l"></span><i class="im-index-p"></i>`);
      a.href = '#' + t.id;
      $('.im-index-l', a).textContent = attr(t, 'data-im-label', '');
      a.addEventListener('click', (e) => { e.preventDefault(); scrollToEl(t); });
      li.appendChild(a); ol.appendChild(li);
      return { t, li, a };
    });
    el.appendChild(ol);
  },
  measure() {
    if (!this.items) return;
    for (const it of this.items) { const r = it.t.getBoundingClientRect(); it.top = r.top + S.y; it.h = r.height; it.ch = S.chapters.find((c) => c.el === it.t) || null; }
  },
  tick() {
    if (!this.items) return;
    if (this.items[0].top == null) this.measure();
    const mid = S.y + S.vh * 0.5;
    let active = -1;
    this.items.forEach((it, i) => {
      const p = it.ch ? it.ch.dp : clamp((mid - it.top) / Math.max(1, it.h), 0, 1);
      if (mid >= it.top && mid <= it.top + it.h) active = i;
      if (Math.abs((it.p == null ? -1 : it.p) - p) > 0.002) { it.p = p; it.a.style.setProperty('--im-p', p.toFixed(3)); }
    });
    if (active !== this.active) {
      this.active = active;
      this.items.forEach((it, i) => { it.li.classList.toggle('is-active', i === active); if (i === active) it.a.setAttribute('aria-current', 'true'); else it.a.removeAttribute('aria-current'); });
      this.el.classList.toggle('is-visible', active >= 0);
      const cur = $('[data-im-index-current]');
      if (cur && active >= 0) cur.textContent = attr(this.items[active].t, 'data-im-label', '');
    }
  },
};
function scrollToEl(el, p) {
  const ch = S.chapters.find((c) => c.el === el);
  let y = el.getBoundingClientRect().top + S.y;
  if (ch && p) y = ch.top + p * Math.max(0, ch.height - S.vh);
  if (S.lenis) S.lenis.scrollTo(y, { duration: 1.4 });
  else W.scrollTo({ top: y, behavior: PARAMS.reduced ? 'auto' : 'smooth' });
}

/* =====================================================================
 *  MÓDULOS DE NEGÓCIO — o que transforma espetáculo em site que o
 *  cliente paga: orçamento, configurador, assistente, horários,
 *  contagem regressiva, pôr do sol, sacola e formulários honestos.
 * ===================================================================== */

/* ---------- Diálogo honesto ("nada foi enviado") ---------- */
function honestDialog(title, rows, body) {
  let dlg = $('.im-dialog');
  if (!dlg) {
    dlg = h('dialog', 'im-dialog');
    dlg.innerHTML = '<div class="im-dialog-box" role="document"><p class="im-dialog-k"></p><h3 class="im-dialog-t"></h3><dl class="im-dialog-rows"></dl><p class="im-dialog-b"></p><button type="button" class="im-dialog-close"></button></div>';
    D.body.appendChild(dlg);
    $('.im-dialog-close', dlg).addEventListener('click', () => (dlg.close ? dlg.close() : dlg.removeAttribute('open')));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
  }
  $('.im-dialog-k', dlg).textContent = rows && rows.length ? TXT.summary : '';
  $('.im-dialog-t', dlg).textContent = title || TXT.sentTitle;
  const dl = $('.im-dialog-rows', dlg);
  dl.innerHTML = '';
  for (const [k, v] of rows || []) { const dt = h('dt'); dt.textContent = k; const dd = h('dd'); dd.textContent = v; dl.appendChild(dt); dl.appendChild(dd); }
  $('.im-dialog-b', dlg).textContent = body || TXT.sentBody;
  $('.im-dialog-close', dlg).textContent = TXT.close;
  if (dlg.showModal) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } } else dlg.setAttribute('open', '');
  $('.im-dialog-close', dlg).focus();
}
function formRows(form) {
  const rows = [];
  const seen = new Set();
  for (const el of $$('input,select,textarea', form)) {
    if (!el.name || el.type === 'submit' || el.type === 'button' || el.type === 'hidden') continue;
    if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) continue;
    let v = el.tagName === 'SELECT' ? (el.selectedOptions[0] ? el.selectedOptions[0].textContent : '') : el.value;
    if (el.type === 'radio' || el.type === 'checkbox') { const lb = el.closest('label'); v = attr(el, 'data-label', lb ? lb.textContent.trim() : el.value); }
    if (!String(v).trim()) continue;
    const lab = attr(el, 'data-label-name', '') || (el.labels && el.labels[0] && el.labels[0].textContent.trim()) || attr(el, 'aria-label', '') || attr(el, 'placeholder', '') || el.name;
    const key = lab + '|' + v;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([lab.replace(/\s+/g, ' ').slice(0, 60), String(v).replace(/\s+/g, ' ').slice(0, 120)]);
  }
  for (const o of $$('[data-im-out]', form)) { const name = attr(o, 'data-im-out-label', ''); if (name && o.textContent.trim()) rows.push([name, o.textContent.trim()]); }
  return rows;
}
function initHonest(form) {
  form.setAttribute('novalidate', '');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.removeAttribute('novalidate');
    const ok = form.reportValidity();
    form.setAttribute('novalidate', '');
    if (!ok) return;
    const msg = attr(form, 'data-im-honest', '');
    honestDialog(attr(form, 'data-im-honest-title', ''), formRows(form), msg && msg !== 'true' && msg !== '' ? msg : '');
    form.dispatchEvent(new CustomEvent('imersao:demo-submit', { bubbles: true }));
  });
}

/* ---------- Calculadora: orçamento, configurador, montador de anel ---------- */
function initCalc(form) {
  const base = num(attr(form, 'data-im-base'), 0), baseDays = num(attr(form, 'data-im-base-days'), 0);
  const cur = attr(form, 'data-im-currency', PT ? 'BRL' : 'USD'), spread = num(attr(form, 'data-im-spread'), 0);
  const months = num(attr(form, 'data-im-months'), 0), rate = num(attr(form, 'data-im-rate'), 0);
  const compute = () => {
    let add = 0, mult = 1, days = baseDays;
    const labels = {};
    for (const el of $$('input,select', form)) {
      let src = null;
      if (el.tagName === 'SELECT') src = el.selectedOptions[0];
      else if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked) src = el; }
      else if (el.type === 'range' || el.type === 'number') {
        const v = num(el.value, 0);
        add += v * num(attr(el, 'data-price-per'), 0);
        if (el.hasAttribute('data-mult-per')) mult *= 1 + v * num(attr(el, 'data-mult-per'), 0);
        days += v * num(attr(el, 'data-days-per'), 0);
        if (el.name) labels[el.name] = fmtNum(v, num(attr(el, 'data-decimals'), (el.step || '1').includes('.') ? 2 : 0)) + (attr(el, 'data-unit', '') ? ' ' + attr(el, 'data-unit', '') : '');
        const show = attr(el, 'data-im-show', '');
        if (show) for (const t of $$(show)) t.textContent = labels[el.name] || el.value;
      }
      if (src) {
        add += num(attr(src, 'data-price'), 0);
        mult *= num(attr(src, 'data-mult'), 1);
        days += num(attr(src, 'data-days'), 0);
        if (el.name) {
          const lb = src.tagName === 'OPTION' ? src.textContent : attr(src, 'data-label', (src.closest('label') || src).textContent);
          labels[el.name] = (labels[el.name] && el.type === 'checkbox' ? labels[el.name] + ', ' : '') + String(lb).trim();
        }
        const tgt = attr(src, 'data-swap-target', '');
        if (tgt) for (const t of $$(tgt)) {
          if (src.hasAttribute('data-swap-src') && t.getAttribute('src') !== attr(src, 'data-swap-src')) t.setAttribute('src', attr(src, 'data-swap-src'));
          if (src.hasAttribute('data-swap-filter')) t.style.filter = attr(src, 'data-swap-filter');
        }
      }
      if (el.type === 'text' || el.tagName === 'TEXTAREA') {
        const b = attr(el, 'data-im-bind', '');
        if (b) for (const t of $$(b)) t.textContent = el.value || attr(el, 'placeholder', '');
      }
    }
    const total = (base + add) * mult;
    const mo = months && rate ? (total * rate) / (1 - Math.pow(1 + rate, -months)) : months ? total / months : 0;
    for (const o of $$('[data-im-out]', form.closest('[data-im-calc-scope]') || form)) {
      const k = attr(o, 'data-im-out', 'total');
      let v = '';
      if (k === 'total') v = fmtMoney(total, cur);
      else if (k === 'min') v = fmtMoney(total * (1 - spread), cur);
      else if (k === 'max') v = fmtMoney(total * (1 + spread), cur);
      else if (k === 'range') v = spread ? `${fmtMoney(total * (1 - spread), cur)} – ${fmtMoney(total * (1 + spread), cur)}` : fmtMoney(total, cur);
      else if (k === 'days') v = fmtNum(Math.round(days), 0);
      else if (k === 'weeks') v = fmtNum(Math.max(1, Math.round(days / 7)), 0);
      else if (k === 'monthly') v = fmtMoney(mo, cur);
      else if (k.startsWith('label:')) v = labels[k.slice(6)] || '—';
      if (o.textContent !== v) { o.textContent = v; o.classList.remove('is-tick'); void o.offsetWidth; o.classList.add('is-tick'); }
    }
    form.dispatchEvent(new CustomEvent('imersao:calc', { bubbles: true, detail: { total, days, monthly: mo, labels } }));
  };
  form.addEventListener('input', compute);
  form.addEventListener('change', compute);
  compute();
}

/* ---------- Assistente em etapas (orçamento em 90 segundos) ---------- */
function initWizard(form) {
  const steps = $$('[data-im-step]', form);
  if (steps.length < 2) return;
  let i = 0;
  const nav = h('div', 'im-wizard-nav');
  const back = h('button', 'im-btn im-btn--ghost', TXT.back); back.type = 'button';
  const next = h('button', 'im-btn', TXT.next); next.type = 'button';
  const bar = h('div', 'im-wizard-bar', '<i></i>');
  nav.appendChild(back); nav.appendChild(next);
  form.insertBefore(bar, steps[0]);
  steps[steps.length - 1].after(nav);
  const submit = $('[type=submit]', form);
  const show = () => {
    steps.forEach((s, k) => { s.hidden = k !== i; s.classList.toggle('is-current', k === i); });
    back.hidden = i === 0;
    next.hidden = i === steps.length - 1;
    if (submit) submit.hidden = i !== steps.length - 1;
    bar.style.setProperty('--im-v', ((i + 1) / steps.length).toFixed(3));
    form.setAttribute('data-step', String(i + 1));
  };
  next.addEventListener('click', () => {
    const fields = $$('input,select,textarea', steps[i]);
    for (const f of fields) if (!f.checkValidity()) { f.reportValidity(); return; }
    i = Math.min(steps.length - 1, i + 1); show();
    const first = $('input,select,textarea,button', steps[i]); if (first) first.focus({ preventScroll: true });
  });
  back.addEventListener('click', () => { i = Math.max(0, i - 1); show(); });
  show();
}

/* ---------- Stepper de quantidade ---------- */
function initStepper(box) {
  const input = $('input', box);
  if (!input || $('.im-step-btn', box)) return;
  const mk = (txt, d, label) => {
    const b = h('button', 'im-step-btn', txt); b.type = 'button'; b.setAttribute('aria-label', label);
    b.addEventListener('click', () => {
      const min = num(input.min, 0), max = num(input.max, 999), st = num(input.step, 1) || 1;
      input.value = String(clamp(num(input.value, 0) + d * st, min, max));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return b;
  };
  box.insertBefore(mk('−', -1, PT ? 'Diminuir' : 'Decrease'), input);
  box.appendChild(mk('+', 1, PT ? 'Aumentar' : 'Increase'));
  box.classList.add('im-stepper');
}

/* ---------- Horários disponíveis (retirada, vagas, visitas) ---------- */
function initSlots(box) {
  const cfg = Object.assign({ days: 5, hours: ['09:00', '10:30', '14:00', '16:30'], skip: [0], name: 'horario', busy: 0.3, start: 0, required: true }, json(attr(box, 'data-im-slots'), {}) || {});
  const fmtDay = new Intl.DateTimeFormat(LANG, { weekday: 'short', day: '2-digit', month: 'short' });
  box.classList.add('im-slots');
  box.innerHTML = '';
  const today = new Date();
  let made = 0;
  for (let off = cfg.start; made < cfg.days && off < cfg.days + 21; off++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + off);
    if (cfg.skip.includes(d.getDay())) continue;
    made++;
    const day = h('div', 'im-slot-day');
    const lab = off === 0 ? TXT.today : off === 1 ? TXT.tomorrow : fmtDay.format(d);
    day.appendChild(h('span', 'im-slot-dow', lab));
    const row = h('div', 'im-slot-hours');
    for (const hr of cfg.hours) {
      const [hh, mm] = hr.split(':').map(Number);
      const when = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm || 0);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hr}`;
      const busy = when < today || hash(iso + (cfg.seed || '')) / 4294967296 < cfg.busy;
      const l = h('label', 'im-slot' + (busy ? ' is-busy' : ''));
      const inp = h('input'); inp.type = 'radio'; inp.name = cfg.name; inp.value = iso; inp.disabled = busy;
      inp.setAttribute('data-label', `${lab} ${hr}`);
      if (cfg.required) inp.required = true;
      l.appendChild(inp);
      l.appendChild(h('span', '', hr + (busy ? `<small>${TXT.busy}</small>` : '')));
      row.appendChild(l);
    }
    day.appendChild(row);
    box.appendChild(day);
  }
}

/* ---------- Contagem regressiva (drop, próxima fornada, lançamento) ---------- */
const Countdowns = {
  items: [],
  add(el) { this.items.push(el); this.tick(true); },
  target(el) {
    const every = num(attr(el, 'data-im-countdown-every'), 0);
    if (every > 0) { const ms = every * 60000, t = Date.now(); return Math.ceil((t + 1) / ms) * ms; }
    const t = Date.parse(attr(el, 'data-im-countdown', ''));
    return Number.isFinite(t) ? t : Date.now();
  },
  tick(force) {
    const t = Date.now();
    if (!force && t - (this.last || 0) < 250) return;
    this.last = t;
    for (const el of this.items) {
      let ms = Math.max(0, this.target(el) - t);
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const hh = Math.floor(ms / 36e5); ms -= hh * 36e5;
      const m = Math.floor(ms / 6e4); ms -= m * 6e4;
      const s = Math.floor(ms / 1e3);
      const parts = { d, h: hh, m, s };
      let any = false;
      for (const k of ['d', 'h', 'm', 's']) { const n = $(`[data-${k}]`, el); if (n) { any = true; const v = k === 'd' ? String(d) : String(parts[k]).padStart(2, '0'); if (n.textContent !== v) n.textContent = v; } }
      if (!any) {
        const v = (d ? d + 'd ' : '') + [hh, m, s].map((x) => String(x).padStart(2, '0')).join(':');
        if (el.textContent !== v) el.textContent = v;
      }
      el.classList.toggle('is-done', d + hh + m + s === 0);
    }
  },
};

/* ---------- Pôr do sol real (janela de lançamento ao entardecer) ---------- */
function sunsetUTC(date, lat, lng) {
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009, e = rad * 23.4397;
  const d = date.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const lw = rad * -lng, phi = rad * lat;
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const cosw = (Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosw < -1 || cosw > 1) return null;
  const w = Math.acos(cosw);
  const a = J0 + (w + lw) / (2 * Math.PI) + n;
  const Jset = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  return new Date((Jset + 0.5 - J1970) * dayMs);
}
function initSunset(el) {
  const [lat, lng] = parseRange(attr(el, 'data-im-sunset'), [-23.55, -46.63]);
  const win = num(attr(el, 'data-im-window'), 20);
  let t = new Date(), set = null;
  for (let i = 0; i < 3 && !set; i++) { const s = sunsetUTC(new Date(t.getFullYear(), t.getMonth(), t.getDate() + i, 12), lat, lng); if (s && s > t) set = s; }
  if (!set) { el.textContent = '—'; return; }
  const fd = new Intl.DateTimeFormat(LANG, { weekday: 'long', day: '2-digit', month: 'long' });
  const ft = new Intl.DateTimeFormat(LANG, { hour: '2-digit', minute: '2-digit' });
  const a = new Date(set.getTime() - win * 30000), b = new Date(set.getTime() + win * 30000);
  el.textContent = `${fd.format(set)} · ${ft.format(a)}–${ft.format(b)}`;
  el.setAttribute('datetime', set.toISOString());
}

/* ---------- Sacola (gaveta com totais persistentes) ---------- */
const Cart = {
  key: 'im-cart:' + location.pathname,
  items: [],
  load() { try { this.items = JSON.parse(localStorage.getItem(this.key) || '[]') || []; } catch (e) { this.items = []; } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.items)); } catch (e) { /* armazenamento indisponível */ } },
  init(drawer) {
    this.drawer = drawer;
    this.cur = attr(drawer, 'data-im-currency', PT ? 'BRL' : 'USD');
    this.load();
    drawer.classList.add('im-cart');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `<div class="im-cart-panel" role="dialog" aria-label="${TXT.cart}"><header class="im-cart-head"><strong>${TXT.cart}</strong><button type="button" class="im-cart-x" aria-label="${TXT.close}">×</button></header><ul class="im-cart-list"></ul><footer class="im-cart-foot"><div class="im-cart-sub"><span>${TXT.subtotal}</span><strong class="im-cart-total"></strong></div><button type="button" class="im-btn im-cart-go">${TXT.checkout}</button></footer></div>`;
    drawer.addEventListener('click', (e) => { if (e.target === drawer) this.toggle(false); });
    $('.im-cart-x', drawer).addEventListener('click', () => this.toggle(false));
    $('.im-cart-go', drawer).addEventListener('click', () => {
      if (!this.items.length) return;
      honestDialog(PT ? 'Pedido de demonstração' : 'Demo order', this.items.map((i) => [`${i.qty}× ${i.name}${i.size ? ' · ' + i.size : ''}`, fmtMoney(i.price * i.qty, this.cur)]).concat([[TXT.subtotal, fmtMoney(this.total(), this.cur)]]));
    });
    D.addEventListener('click', (e) => {
      const add = e.target.closest && e.target.closest('[data-im-add]');
      if (add) {
        e.preventDefault();
        const it = json(attr(add, 'data-im-add'), null);
        if (!it) return;
        const scope = add.closest('[data-im-product]') || add.parentElement;
        const sz = scope && ($('input[name="size"]:checked', scope) || $('select[name="size"]', scope));
        this.add(Object.assign({}, it, { size: sz ? sz.value : '' }));
        this.toggle(true);
        return;
      }
      const op = e.target.closest && e.target.closest('[data-im-cart-open]');
      if (op) { e.preventDefault(); this.toggle(); }
    });
    D.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open) this.toggle(false); });
    this.render();
  },
  total() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); },
  add(it) {
    const key = it.id + '|' + (it.size || '');
    const ex = this.items.find((i) => i.key === key);
    if (ex) ex.qty++; else this.items.push({ key, id: it.id, name: it.name, price: +it.price || 0, size: it.size || '', img: it.img || '', qty: 1 });
    this.save(); this.render();
  },
  toggle(v) {
    this.open = v == null ? !this.open : v;
    this.drawer.classList.toggle('is-open', this.open);
    this.drawer.setAttribute('aria-hidden', String(!this.open));
    if (this.open) { const x = $('.im-cart-x', this.drawer); if (x) x.focus({ preventScroll: true }); }
  },
  render() {
    const list = $('.im-cart-list', this.drawer);
    list.innerHTML = '';
    if (!this.items.length) list.appendChild(h('li', 'im-cart-empty', TXT.cartEmpty));
    this.items.forEach((it, idx) => {
      const li = h('li', 'im-cart-item');
      li.innerHTML = `<span class="im-cart-ph"></span><div class="im-cart-info"><span class="im-cart-name"></span><small></small></div><div class="im-cart-qty"><button type="button" aria-label="−">−</button><span>${it.qty}</span><button type="button" aria-label="+">+</button></div><strong>${fmtMoney(it.price * it.qty, this.cur)}</strong>`;
      if (it.img) { const im = h('img'); im.src = it.img; im.alt = ''; li.replaceChild(im, $('.im-cart-ph', li)); }
      $('.im-cart-name', li).textContent = it.name;
      $('small', li).textContent = it.size || '';
      const [minus, plus] = $$('.im-cart-qty button', li);
      minus.addEventListener('click', () => { it.qty--; if (it.qty <= 0) this.items.splice(idx, 1); this.save(); this.render(); });
      plus.addEventListener('click', () => { it.qty++; this.save(); this.render(); });
      list.appendChild(li);
    });
    $('.im-cart-total', this.drawer).textContent = fmtMoney(this.total(), this.cur);
    const n = this.items.reduce((s, i) => s + i.qty, 0);
    for (const b of $$('[data-im-cart-count]')) { b.textContent = String(n); b.classList.toggle('is-empty', !n); }
  },
};

/* ---------- Cobrança mensal / anual ---------- */
function initBilling(box) {
  const btns = $$('[data-im-billing-set]', box);
  const set = (mode) => {
    btns.forEach((b) => b.setAttribute('aria-pressed', String(attr(b, 'data-im-billing-set') === mode)));
    for (const p of $$('[data-monthly]', box)) p.textContent = attr(p, mode === 'yearly' ? 'data-yearly' : 'data-monthly', p.textContent);
    box.setAttribute('data-billing', mode);
  };
  btns.forEach((b) => b.addEventListener('click', () => set(attr(b, 'data-im-billing-set'))));
  set(attr(box, 'data-im-billing', 'monthly'));
}

/* =====================================================================
 *  INICIALIZAÇÃO, LOADER, LOOP E API PÚBLICA (window.Imersao)
 * ===================================================================== */
/* Ativo ausente: marca o contêiner de forma honesta em vez de mostrar imagem quebrada. */
function watchMissing() {
  D.addEventListener('error', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG' || t.closest('.im-stage')) return;
    const box = t.closest('[data-im-lens],[data-im-compare],.im-card-media,.im-preview,figure') || t;
    box.classList.add('im-missing');
    box.setAttribute('data-im-missing', (PT ? 'ativo pendente: ' : 'missing asset: ') + (t.getAttribute('src') || ''));
  }, true);
}

async function loadManifest() {
  const inline = $('#im-manifest');
  if (W.IMERSAO_MANIFEST) S.manifest = W.IMERSAO_MANIFEST;
  else if (inline) S.manifest = json(inline.textContent, {}) || {};
  else {
    const url = attr(S.root, 'data-im-manifest', 'imersao.manifest.json');
    if (url !== 'none') {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (r.ok) S.manifest = await r.json();
        else if (r.status !== 404) logErr('manifesto', `HTTP ${r.status} em ${url}`);
      } catch (e) { logErr('manifesto', location.protocol === 'file:' ? 'abra o site por um servidor local (file:// bloqueia o manifesto)' : e); }
    }
  }
  if (!S.manifest || typeof S.manifest !== 'object') S.manifest = {};
  S.manifest.sequences = S.manifest.sequences || {};
}

/* Plano de transformação aplicado em tempo de execução (sites SPA). */
function applyPlan() {
  const el = $('#im-plan');
  if (!el) return false;
  const plan = json(el.textContent, null);
  if (!plan) return false;
  let changed = false;
  for (const ins of plan.insert || []) {
    if (ins.id && D.getElementById(ins.id)) continue;
    const t = $(ins.before || ins.after || ins.prepend || ins.append || 'body');
    if (!t) continue;
    const tmp = h('div', '', ins.html);
    const node = tmp.firstElementChild;
    if (!node) continue;
    if (ins.before) t.before(node); else if (ins.after) t.after(node); else if (ins.prepend) t.prepend(node); else t.append(node);
    changed = true;
  }
  for (const r of plan.rules || []) {
    let list = [];
    try { list = $$(r.sel); } catch (e) { logErr('plano', 'seletor inválido: ' + r.sel); continue; }
    for (const t of list) {
      if (t.__imPlan && t.__imPlan.includes(r.sel)) continue;
      (t.__imPlan = t.__imPlan || []).push(r.sel);
      for (const [k, v] of Object.entries(r.attrs || {})) if (!t.hasAttribute(k)) t.setAttribute(k, v);
      if (r.addClass) t.classList.add(...String(r.addClass).split(/\s+/).filter(Boolean));
      changed = true;
    }
  }
  return changed;
}

function scan(root) {
  root = root || D;
  for (const el of $$('[data-im-chapter]', root)) {
    if (el.__im) continue;
    try { const ch = new Chapter(el, S.chapters.length); el.__im = ch; S.chapters.push(ch); } catch (e) { logErr('capitulo', e); }
  }
  const once = (sel, fn) => {
    for (const el of $$(sel, root)) {
      el.__imc = el.__imc || {};
      if (el.__imc[sel]) continue;
      el.__imc[sel] = 1;
      try { fn(el); } catch (e) { logErr('componente', `${sel}: ${e && e.message}`); }
    }
  };
  once('[data-im-lens]', (el) => S.components.push(new Lens(el)));
  once('[data-im-compare]', (el) => new Compare(el));
  once('[data-im-spin]', (el) => S.components.push(new Spin(el)));
  once('[data-im-palette]', initPalette);
  once('[data-im-magnetic]', initMagnetic);
  once('[data-im-tilt]', initTilt);
  once('[data-im-marquee]', initMarquee);
  once('video[data-im-hoverplay]', initHoverPlay);
  once('[data-im-stagger]', initStagger);
  once('[data-im-reveal]', initReveal);
  once('[data-im-count]', (el) => { if (!el.hasAttribute('data-im-reveal')) initReveal(el); });
  once('[data-im-parallax]', (el) => Para.add(el));
  once('[data-im-bg-section]', (el) => BgSections.add(el));
  once('[data-im-slots]', initSlots);
  once('[data-im-stepper]', initStepper);
  once('form[data-im-calc]', initCalc);
  once('[data-im-wizard]', initWizard);
  once('[data-im-countdown],[data-im-countdown-every]', (el) => Countdowns.add(el));
  once('[data-im-sunset]', initSunset);
  once('form[data-im-honest]', initHonest);
  once('[data-im-billing]', initBilling);
  once('[data-im-cart]', (el) => Cart.init(el));
  once('[data-im-index]', (el) => Index.init(el));
}

/* position: sticky quebra se um ancestral rolar sozinho (overflow hidden/auto).
 * overflow:hidden vira clip (mesmo visual, sem criar contêiner de rolagem). */
function fixSticky(ch) {
  let p = ch.stage.parentElement;
  const htmlVisible = () => { const c = getComputedStyle(R); return c.overflowX === 'visible' && c.overflowY === 'visible'; };
  while (p && p !== R) {
    const cs = getComputedStyle(p), ox = cs.overflowX, oy = cs.overflowY;
    const bad = (v) => v !== 'visible' && v !== 'clip';
    if ((bad(ox) || bad(oy)) && !(p === D.body && htmlVisible())) {
      const tag = `<${p.tagName.toLowerCase()}${p.id ? '#' + p.id : ''}>`;
      const scrollsX = p.scrollWidth > p.clientWidth + 2, scrollsY = p.scrollHeight > p.clientHeight + 2;
      const fix = (v, scrolls) => (v === 'hidden' ? 'clip' : (v === 'auto' || v === 'scroll') && !scrolls ? 'visible' : null);
      const fx = bad(ox) ? fix(ox, scrollsX) : ox, fy = bad(oy) ? fix(oy, scrollsY) : oy;
      if (fx && fy) {
        p.style.overflowX = fx; p.style.overflowY = fy;
        logErr('sticky', `${tag} tinha overflow ${ox}/${oy}; ajustado para ${fx}/${fy} para o capítulo ${ch.id} fixar`);
      } else logErr('sticky', `${tag} rola sozinho (overflow ${ox}/${oy}); o capítulo ${ch.id} pode não fixar`);
    }
    p = p.parentElement;
  }
}

function measureAll() {
  S.y = W.scrollY || 0;
  for (const ch of S.chapters) {
    if (PARAMS.reduced) { ch.el.style.height = ''; continue; }
    const hh = Math.round(ch.length * S.vh);
    if (Math.abs(ch.el.offsetHeight - hh) > 1) ch.el.style.height = hh + 'px';
  }
  for (const ch of S.chapters) { try { ch.measure(); } catch (e) { logErr('medida', e); } }
  Para.measure();
  Index.measure();
  BgSections.measure();
  for (const c of S.components) if (c.measure) { try { c.measure(); } catch (e) { logErr('medida', e); } }
  if (S.lenis && S.lenis.resize) { try { S.lenis.resize(); } catch (e) { /* ok */ } }
}

/* ---------- Loader: pré-carrega frames, trava o scroll até 100% ---------- */
const Loader = {
  init() {
    this.el = $('[data-im-loader]');
    const seqs = [];
    for (const ch of S.chapters) if (ch.media.kind === 'frames' && ch.media.seq && !seqs.includes(ch.media.seq)) seqs.push(ch.media.seq);
    if (PARAMS.solo) {
      const sc = S.chapters.find((c) => c.id === PARAMS.solo.id);
      if (sc && sc.media.seq) { seqs.splice(seqs.indexOf(sc.media.seq), 1); seqs.unshift(sc.media.seq); }
    }
    const total = seqs.reduce((s, q) => s + q.count, 0);
    const mode = attr(S.root, 'data-im-preload', total <= 900 ? 'all' : 'progressive');
    const later = [];
    seqs.forEach((s, i) => {
      const ord = s.order();
      if (mode === 'all' || i === 0) ord.forEach((k) => enqueue(s, k, true));
      else ord.forEach((k, j) => (j < Math.ceil(s.count / 8) ? enqueue(s, k, true) : later.push([s, k])));
    });
    for (const [s, k] of later) enqueue(s, k, false);
    Q.started = now();
    pump();
    this.pctEl = this.el && $('[data-im-loader-pct]', this.el);
    this.gates = this.el ? $$('[data-im-gate]', this.el) : [];
    if (!this.el || PARAMS.noLoader) {
      if (this.el) this.el.classList.add('is-done', 'is-instant');
      this.finish(true);
      return;
    }
    if (PARAMS.solo) this.el.classList.add('is-instant');
    R.classList.add('im-loading');
    if (S.lenis) S.lenis.stop();
    for (const g of this.gates) g.addEventListener('click', () => {
      if (attr(g, 'data-im-gate', '') === 'sound') Sound.setOn(true);
      this.finish();
    });
  },
  tick() {
    if (S.loaderDone || !this.el) return;
    const p = loadProgress();
    this.shown = lerp(this.shown || 0, p, 0.18);
    if (p >= 1 && this.shown > 0.995) this.shown = 1;
    this.el.style.setProperty('--im-load', this.shown.toFixed(4));
    if (this.pctEl) this.pctEl.textContent = Math.round(this.shown * 100) + '%';
    const stalled = now() - Q.started > num(attr(this.el, 'data-im-timeout'), 25000);
    if ((this.shown >= 1 || stalled) && !this.readyAt) {
      this.readyAt = now();
      if (stalled && p < 1) logErr('loader', `tempo esgotado com ${Math.round(p * 100)}% dos frames; liberando o scroll`);
      if (this.gates.length && !PARAMS.solo) this.el.classList.add('is-ready');
      else setTimeout(() => this.finish(), 260);
    }
  },
  finish(silent) {
    if (S.loaderDone) return;
    S.loaderDone = true;
    R.classList.remove('im-loading');
    if (this.el) {
      this.el.classList.add('is-done');
      setTimeout(() => { if (this.el) this.el.setAttribute('hidden', ''); }, silent ? 0 : 1100);
    }
    if (S.lenis) S.lenis.start();
    measureAll();
    if (PARAMS.solo) {
      const ch = S.chapters.find((c) => c.id === PARAMS.solo.id);
      if (ch) { API.goTo(ch.id, PARAMS.solo.p, { instant: true }); ch.solo = PARAMS.solo.p; ch.force = true; }
      else logErr('solo', 'capítulo não encontrado: ' + PARAMS.solo.id);
      R.classList.add('im-solo');
    }
    S.ready = true;
    D.dispatchEvent(new CustomEvent('imersao:ready', { detail: API.status() }));
  },
};

function initSmooth() {
  const v = attr(S.root, 'data-im-smooth', '0.1');
  if (PARAMS.reduced || v === 'off' || !W.Lenis) return;
  try { S.lenis = new W.Lenis({ lerp: clamp(num(v, 0.1), 0.02, 1), smoothWheel: true, anchors: true, autoRaf: false }); R.classList.add('im-smooth'); }
  catch (e) { logErr('lenis', e); }
}

/* ---------- loop único de animação ---------- */
let _hud = null, _hudT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = clamp((t - S.lastFrame) / 1000, 0.001, 0.1);
  S.lastFrame = t;
  S.fps = lerp(S.fps, 1 / dt, 0.05);
  if (S.lenis) { try { S.lenis.raf(t); } catch (e) { logErr('lenis', e); } }
  const y = W.scrollY || W.pageYOffset || 0;
  S.vy = lerp(S.vy, (y - S.y) / dt, 0.25);
  if (Math.abs(S.vy) < 0.5) S.vy = 0;
  S.y = y;
  for (const ch of S.chapters) { try { ch.update(y); ch.render(t, dt); } catch (e) { logErr('capitulo', e); } }
  try {
    Loader.tick(); tickAccent(); Para.tick(); BgSections.tick(); Index.tick(); Countdowns.tick(); Cursor.tick(dt); Sound.tick();
    for (const c of S.components) c.tick(t, dt);
    if (S.marquees) for (const tr of S.marquees) { const a = tr.getAnimations && tr.getAnimations()[0]; if (a) a.playbackRate = lerp(a.playbackRate || 1, 1 + Math.min(Math.abs(S.vy) / 700, 4), 0.1); }
  } catch (e) { logErr('loop', e); }
  const docH = Math.max(1, D.documentElement.scrollHeight - S.vh);
  const pp = clamp(y / docH, 0, 1);
  if (Math.abs(pp - S.pageP) > 0.0008) { S.pageP = pp; R.style.setProperty('--im-page-p', pp.toFixed(4)); }
  if (_hud && t - _hudT > 250) { _hudT = t; renderHud(); }
}
function renderHud() {
  const act = S.chapters.filter((c) => c.onScreen).map((c) => `${c.id} p=${c.dp.toFixed(3)}${c.media.seq ? ` f=${c.media.shown}/${c.media.seq.count}` : ''} [${c.media.kind}]`);
  _hud.textContent = [`imersao ${VERSION} · ${Math.round(S.fps)} fps · frames ${Math.round(loadProgress() * 100)}%`, ...act, S.errors.length ? `erros: ${S.errors.length} (Imersao.status())` : ''].filter(Boolean).join('\n');
}

function isBlank(ch) {
  const el = ch.mediaEl;
  if (!el) return null;
  try {
    if (el.tagName === 'CANVAS') {
      const c = D.createElement('canvas'); c.width = 24; c.height = 14;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(el, 0, 0, 24, 14);
      const d = g.getImageData(0, 0, 24, 14).data;
      let mn = 255, mx = 0;
      for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; if (l < mn) mn = l; if (l > mx) mx = l; }
      return mx - mn < 3;
    }
    if (el.tagName === 'IMG') return !(el.naturalWidth > 0);
    if (el.tagName === 'VIDEO') return el.readyState < 2;
    const img = $('img', el);
    return img ? !(img.naturalWidth > 0) : null;
  } catch (e) { return null; }
}

const API = {
  version: VERSION,
  state: S,
  get chapters() { return S.chapters; },
  status() {
    return {
      version: VERSION, ready: S.ready, framesLoaded: +loadProgress().toFixed(3), reduced: PARAMS.reduced, mobile: S.mobile, lenis: !!S.lenis,
      fps: Math.round(S.fps), scroll: Math.round(S.y), viewport: [S.vw, S.vh],
      chapters: S.chapters.map((c) => ({
        id: c.id, label: c.label, length: c.length, media: c.media.kind, preset: c.media.name || null, fallback: c.fallbackKind || null,
        progress: +c.p.toFixed(3), displayed: +c.dp.toFixed(3), onScreen: !!c.onScreen,
        frame: c.media.shown != null ? c.media.shown : null, count: c.media.seq ? c.media.seq.count : null,
        loaded: c.media.seq ? c.media.seq.loaded : null, failed: c.media.seq ? c.media.seq.failed : null,
      })),
      sequences: Object.fromEntries([...S.seqs].map(([k, s]) => [k, { count: s.count, loaded: s.loaded, failed: s.failed, width: s.w, height: s.h }])),
      sound: { available: Sound.available(), on: Sound.on, muted: PARAMS.mute },
      errors: S.errors.slice(-30),
    };
  },
  goTo(id, p, opts) {
    opts = opts || {};
    const ch = S.chapters.find((c) => c.id === id);
    if (!ch) { const el = D.getElementById(id); if (el) scrollToEl(el); return !!el; }
    const y = Math.round(ch.top + clamp(p || 0, 0, 1) * Math.max(0, ch.height - S.vh));
    if (S.lenis) S.lenis.scrollTo(y, { immediate: !!opts.instant, force: true, duration: opts.instant ? 0 : 1.4 });
    else W.scrollTo({ top: y, behavior: opts.instant || PARAMS.reduced ? 'auto' : 'smooth' });
    if (opts.instant) { if (!S.lenis) W.scrollTo(0, y); ch.update(W.scrollY); ch.dp = ch.p; ch.force = true; }
    return true;
  },
  async selfTest(points) {
    points = points || [0.1, 0.5, 0.9];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const y0 = S.y, out = [];
    for (const ch of S.chapters) {
      const r = { id: ch.id, media: ch.media.kind, frames: [], overlaysAtMid: 0, blank: null, scrubs: null, reverse: null };
      for (const p of points) {
        API.goTo(ch.id, p, { instant: true });
        await wait(120);
        ch.update(W.scrollY); ch.dp = ch.p; ch.force = true; ch.render(now(), 0.016);
        await wait(40);
        r.frames.push(ch.media.shown != null ? ch.media.shown : +ch.dp.toFixed(3));
        if (Math.abs(p - 0.5) < 0.01) { r.overlaysAtMid = ch.overlays.filter((o) => o.t > 0.5).length; r.blank = isBlank(ch); }
      }
      API.goTo(ch.id, points[0], { instant: true }); await wait(80); ch.update(W.scrollY); ch.dp = ch.p; ch.force = true; ch.render(now(), 0.016);
      const back = ch.media.shown != null ? ch.media.shown : +ch.dp.toFixed(3);
      if (ch.media.kind === 'frames') { r.scrubs = r.frames[0] !== r.frames[r.frames.length - 1]; r.reverse = back === r.frames[0]; }
      out.push(r);
    }
    if (S.lenis) S.lenis.scrollTo(y0, { immediate: true, force: true }); else W.scrollTo(0, y0);
    return { ok: out.every((r) => r.scrubs !== false && r.blank !== true && r.reverse !== false), chapters: out, errors: S.errors.slice(-20) };
  },
  onProgress(id, fn) { if (!S.hooks.has(id)) S.hooks.set(id, []); S.hooks.get(id).push(fn); },
  refresh() { applyPlan(); scan(); for (const ch of S.chapters) fixSticky(ch); measureAll(); },
  sound: { on: () => Sound.setOn(true), off: () => Sound.setOn(false), hit: (n) => Sound.hit(n) },
  honest: honestDialog,
  sunset: sunsetUTC,
  filterColor: (hex, f) => rgbStr(filterColor(parseColor(hex), f)),
  presets: Object.keys(PRESETS),
};
W.Imersao = API;

async function boot() {
  if (S.booted) return;
  S.booted = true;
  S.root = $('[data-im-root]') || D.body;
  S.brand = attr(S.root, 'data-im-brand', '');
  S.mobile = MQ('(max-width: 767px)');
  S.vw = W.innerWidth; S.vh = W.innerHeight;
  S.baseAccent = parseColor(cssVar('--im-accent', '#B08D57'));
  S.bgColor = cssVar('--im-bg', '#050505');
  if (S.mobile) R.classList.add('im-mobile');
  if (PARAMS.debug) R.classList.add('im-debug-on');
  watchMissing();
  await loadManifest();
  applyPlan();
  initSmooth();
  scan();
  for (const ch of S.chapters) fixSticky(ch);
  initSound();
  Cursor.init(attr(S.root, 'data-im-cursor', ''));
  if (has(S.root, 'data-im-grain') && !$('.im-grain')) D.body.appendChild(h('div', 'im-grain')).setAttribute('aria-hidden', 'true');
  if (has(S.root, 'data-im-vignette') && !$('.im-vignette')) D.body.appendChild(h('div', 'im-vignette')).setAttribute('aria-hidden', 'true');
  if (PARAMS.debug) _hud = D.body.appendChild(h('pre', 'im-debug'));
  measureAll();
  Loader.init();
  requestAnimationFrame((t) => { S.lastFrame = t; frame(t); });

  let rz = 0;
  W.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      const w = W.innerWidth, hh = W.innerHeight;
      if (w === S.vw && Math.abs(hh - S.vh) < 120 && S.mobile) return;
      S.vw = w; S.vh = hh; S.dpr = Math.min(W.devicePixelRatio || 1, 2);
      S.mobile = MQ('(max-width: 767px)');
      R.classList.toggle('im-mobile', S.mobile);
      measureAll();
    }, 140);
  });
  if ('ResizeObserver' in W) {
    let lastH = D.body.scrollHeight, ro = 0;
    new ResizeObserver(() => {
      if (Math.abs(D.body.scrollHeight - lastH) < 4) return;
      lastH = D.body.scrollHeight;
      clearTimeout(ro); ro = setTimeout(measureAll, 160);
    }).observe(D.body);
  }
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(() => { for (const ch of S.chapters) if (ch.media.kind === 'procedural' && ch.media.name === 'particles') ch.media.inited = false; measureAll(); });
  if ($('#im-plan')) {
    const mo = new MutationObserver(() => { if (applyPlan()) API.refresh(); });
    mo.observe(D.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 12000);
  }
}

if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
else boot();
})();
