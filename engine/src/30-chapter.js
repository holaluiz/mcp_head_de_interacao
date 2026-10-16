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
