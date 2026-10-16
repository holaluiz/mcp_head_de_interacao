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
