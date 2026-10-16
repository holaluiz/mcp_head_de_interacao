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
