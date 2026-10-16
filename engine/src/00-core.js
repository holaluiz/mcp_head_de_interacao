/*! HEAD de Interação — motor de imersão v__VERSION__ | MIT
 *  Scroll cinematográfico declarativo: sequências de frames, capítulos fixados,
 *  instrumentos atrelados ao filme, som sintetizado e módulos de negócio.
 *  Documentação dos atributos data-im-*: docs/MOTOR.md
 */
(function () {
'use strict';
if (window.Imersao && window.Imersao.version) return;

const W = window, D = document, R = D.documentElement;
const VERSION = '__VERSION__';
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
