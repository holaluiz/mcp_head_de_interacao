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
