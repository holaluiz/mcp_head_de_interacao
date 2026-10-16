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
