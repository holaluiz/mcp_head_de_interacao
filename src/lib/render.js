// Renderizador: spec (experience.json) → HTML/CSS/JS que usam o motor.
import { esc, richText, attrs, slug, tr, isEn } from './util.js';
import { derivePalette } from './palette.js';
import { fontsHref, fontStack } from './fonts.js';

const PROCEDURAIS = ['particles', 'embers', 'dust', 'deep', 'ink', 'rays', 'aurora', 'tunnel', 'fountain', 'bloom', 'bokeh'];
export { PROCEDURAIS };

const CLS = {
  display: 'im-display', 'display-xl': 'im-display im-display--xl', 'display-md': 'im-display im-display--md',
  h2: 'im-h2', h3: 'im-h3', overline: 'im-overline', lead: 'im-lead', line: 'im-line-big', mono: 'im-mono',
  gradient: 'im-gradient-text', italic: 'im-italic', accent: 'im-accent',
};
function classes(cls, extra) {
  const out = String(cls || '').split(/\s+/).filter(Boolean).map((c) => CLS[c] || c);
  if (extra) out.unshift(extra);
  return [...new Set(out.join(' ').split(' '))].filter(Boolean).join(' ');
}
function money(v, ctx) {
  const cur = ctx.currency || (isEn(ctx) ? 'USD' : 'BRL');
  try { return new Intl.NumberFormat(ctx.lang || 'pt-BR', { style: 'currency', currency: cur, maximumFractionDigits: v % 1 ? 2 : 0 }).format(v); }
  catch { return String(v); }
}
function ov(it) {
  if (it.in == null && it.out == null) return {};
  return { 'data-im-in': it.in ?? 0, 'data-im-out': it.out ?? 1, 'data-im-anim': it.anim || null, 'data-im-fade': it.fade ?? null };
}
function procAttrs(p, ctx) {
  if (!p) return {};
  return {
    'data-im-keys': p.keys || null, 'data-im-text': p.text || null, 'data-im-colors': p.colors || null, 'data-im-mode': p.mode || null,
    'data-im-sky': p.sky || null, 'data-im-origin': p.origin ? p.origin.join(',') : null, 'data-im-profile': p.profile || null,
    'data-im-tilt': p.tilt ?? null, 'data-im-rings': p.rings ?? null, 'data-im-text-y': p.textY ?? null,
  };
}
function fallbackChain(m, ctx) {
  const chain = [];
  if (m.wipeFallback) chain.push(`wipe:${m.wipeFallback.before}|${m.wipeFallback.after}|${m.wipeFallback.dir || 'ltr'}`);
  if (m.stillsFallback && m.stillsFallback.length) chain.push(`stills:${m.stillsFallback.join('|')}`);
  if (m.shatterFallback) chain.push(`shatter:${m.shatterFallback}`);
  const fb = String(m.fallback || '');
  if (fb.startsWith('image:')) chain.push(fb);
  let proc = fb.startsWith('procedural:') ? fb : null;
  if (!proc) proc = `procedural:${PROCEDURAIS.includes(ctx.fallbackPreset) ? ctx.fallbackPreset : 'aurora'}`;
  chain.push(proc);
  return chain.join('; ');
}

export function renderMedia(m, ctx) {
  if (!m) return '';
  const cam = m.cam ? { 'data-im-cam': m.cam } : {};
  const fit = m.fit ? { 'data-im-fit': m.fit } : {};
  const alt = m.alt || '';
  switch (m.kind) {
    case 'frames':
      return `<canvas class="im-media" ${attrs({ 'data-im-media': 'frames', 'data-im-seq': m.seq, 'data-im-reverse': !!m.reverse, 'data-im-range': m.range ? m.range.join(',') : null, 'data-im-sample-accent': !!m.sampleAccent, 'data-im-mobile-scrub': !!m.mobileScrub, 'data-im-fallback': fallbackChain(m, ctx), 'data-im-preset-text': null, ...procAttrs(m.preset ? { text: ctx.brand, ...m.preset } : (String(m.fallback || '').includes('particles') ? { text: ctx.brand } : null), ctx), ...cam, ...fit })} aria-hidden="true"></canvas>`;
    case 'procedural':
      return `<canvas class="im-media" ${attrs({ 'data-im-media': 'procedural', 'data-im-preset': m.preset && typeof m.preset === 'string' ? m.preset : m.name || 'aurora', ...procAttrs(typeof m.preset === 'object' ? m.preset : m.options || (m.preset === 'particles' ? { text: ctx.brand } : null), ctx), ...cam })} aria-hidden="true"></canvas>`;
    case 'image':
      return `<img class="im-media" ${attrs({ 'data-im-media': 'image', src: m.src, alt, 'data-im-sample-accent': !!m.sampleAccent, ...cam, ...fit })}>`;
    case 'video':
      return `<video class="im-media" ${attrs({ 'data-im-media': 'video', src: m.src, poster: m.poster || null, muted: true, playsinline: true, preload: 'auto', ...cam, ...fit })}></video>`;
    case 'stills':
      return `<div class="im-media im-stills" ${attrs({ 'data-im-media': 'stills', ...cam })}>${(m.srcs || []).map((s) => `<img src="${esc(s)}" alt="">`).join('')}</div>`;
    case 'wipe':
      return `<div class="im-media" ${attrs({ 'data-im-media': 'wipe', 'data-im-dir': m.dir || 'ltr', 'data-im-keys': m.keys || null, ...cam })}><img class="im-wipe-a" src="${esc(m.before)}" alt=""><img class="im-wipe-b" src="${esc(m.after)}" alt=""></div>`;
    case 'shatter':
      return `<canvas class="im-media" ${attrs({ 'data-im-media': 'shatter', 'data-im-src': m.src, 'data-im-grid': m.grid || null, 'data-im-flare': m.flare || null, 'data-im-keys': m.keys || null, ...cam })} aria-hidden="true"></canvas>`;
    default:
      return '';
  }
}

export function renderItem(it, ctx) {
  const t = tr(ctx);
  const o = ov(it);
  switch (it.type || 'text') {
    case 'text': {
      const tag = /^(h1|h2|h3|p|div|span|strong|blockquote)$/.test(it.tag || '') ? it.tag : 'p';
      return `<${tag} class="${classes(it.cls)}" ${attrs(o)}>${it.html != null ? it.html : richText(it.text)}</${tag}>`;
    }
    case 'meter':
      return `<div class="im-meter" ${attrs({ 'data-im-meter': true, 'data-im-name': it.label || '', 'data-im-unit': it.unit || '', 'data-im-keys': it.keys, 'data-im-decimals': it.decimals ?? 0, 'data-im-prefix': it.prefix || null, 'data-im-suffix': it.suffix || null, 'data-im-bar': it.bar !== false, 'data-im-ease': it.ease || null, ...o })}></div>`;
    case 'status': {
      const first = it.keys && it.keys[0] ? it.keys[0][1] : '';
      return `<p class="${classes(it.cls, 'im-status')}" ${attrs({ 'data-im-texts': it.keys, ...o })}>${esc(first)}</p>`;
    }
    case 'steps':
      return `<ol class="im-steps" ${attrs({ 'data-im-steps': true, 'data-im-keys': it.keys || null, 'data-im-from': it.from ?? null, 'data-im-to': it.to ?? null, ...o })}>${(it.items || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
    case 'palette':
      return `<div class="im-palette im-interactive" ${attrs({ 'data-im-palette': true, role: 'group', 'aria-label': t('Paleta', 'Palette'), ...o })}></div>`;
    case 'button':
      return `<a class="im-btn" ${attrs({ href: it.href || '#', 'data-im-magnetic': '0.25', ...o })}>${esc(it.text)}</a>`;
    case 'scrollcue':
      return `<span class="im-scrollcue" ${attrs(o)}>${esc(it.text || t('Role', 'Scroll'))}<i></i></span>`;
    case 'glass':
      return `<div class="im-glass" ${attrs(o)}><strong class="im-h3">${richText(it.title)}</strong>${it.text ? `<p>${richText(it.text)}</p>` : ''}</div>`;
    case 'countdown':
      return renderCountdown(it, ctx, o);
    case 'lines': {
      const mode = it.mode === 'single' ? 'single' : 'stack';
      return `<div class="im-lines" ${attrs({ 'data-im-lines': mode, 'data-im-from': it.from ?? null, 'data-im-to': it.to ?? null })}>${(it.lines || []).map((l) => `<p class="${classes(it.cls || 'line')}">${richText(l)}</p>`).join('')}</div>`;
    }
    case 'html':
      return it.html || '';
    default:
      return '';
  }
}

function renderCountdown(it, ctx, o = {}) {
  const t = tr(ctx);
  const a = it.every ? { 'data-im-countdown-every': it.every } : { 'data-im-countdown': it.to || '' };
  return `<div class="im-countdown" ${attrs({ ...a, ...o, 'aria-label': it.label || t('Contagem regressiva', 'Countdown') })}>${it.days === false ? '' : `<span><b data-d>0</b>${t('dias', 'days')}</span>`}<span><b data-h>00</b>${t('horas', 'hours')}</span><span><b data-m>00</b>min</span><span><b data-s>00</b>s</span></div>`;
}

function head(ch, ctx, { reveal = true } = {}) {
  if (!ch.title && !ch.text && !ch.overline) return '';
  return `<header class="im-sec-head">${ch.overline !== false && (ch.overline || ch.label) ? `<p class="im-overline">${esc(ch.overline || ch.label)}</p>` : ''}${ch.title ? `<h2 class="im-h2"${reveal ? ' data-im-reveal="rise"' : ''}>${richText(ch.title)}</h2>` : ''}${ch.text ? `<p class="im-lead"${reveal ? ' data-im-reveal="rise"' : ''}>${richText(ch.text)}</p>` : ''}</header>`;
}
function secOpen(ch, extra = '') {
  return `<section class="im-sec${extra ? ' ' + extra : ''}" ${attrs({ id: ch.id, 'data-im-label': ch.label || null, 'data-im-bg-section': ch.bgSection || null })}>`;
}

/* ---------- campos de formulário ---------- */
function field(name, ctx) {
  const t = tr(ctx);
  const F = {
    name: `<label class="im-field"><span>${t('Nome', 'Name')}</span><input type="text" name="nome" autocomplete="name" required></label>`,
    email: `<label class="im-field"><span>E-mail</span><input type="email" name="email" autocomplete="email" required></label>`,
    phone: `<label class="im-field"><span>${t('Telefone', 'Phone')}</span><input type="tel" name="telefone" autocomplete="tel"></label>`,
    party: `<label class="im-field"><span>${t('Pessoas', 'Guests')}</span><select name="pessoas">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<option${n === 2 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`,
    date: `<label class="im-field"><span>${t('Data', 'Date')}</span><input type="date" name="data" required></label>`,
    notes: `<label class="im-field"><span>${t('Observações', 'Notes')}</span><textarea name="observacoes" rows="2"></textarea></label>`,
  };
  return F[name] || '';
}
function optionAttrs(o) {
  return { 'data-price': o.price ?? null, 'data-mult': o.mult ?? null, 'data-days': o.days ?? null, 'data-label': o.label, 'data-swap-target': o.swap ? o.swap.target : null, 'data-swap-src': o.swap && o.swap.src ? o.swap.src : null, 'data-swap-filter': o.swap && o.swap.filter ? o.swap.filter : null };
}
function renderGroup(g, ctx, i, step) {
  const t = tr(ctx);
  const stepA = step ? ' data-im-step' : '';
  const name = g.name || slug(g.label) || `opcao-${i}`;
  const priceTag = (o) => (o.price ? ` <small>+${money(o.price, ctx)}</small>` : '');
  if (g.kind === 'radio' || g.kind === 'checkbox') {
    return `<fieldset class="im-field"${stepA}><legend>${esc(g.label)}</legend><div class="im-choices">${(g.options || []).map((o, k) => `<label class="im-choice${o.color ? ' im-swatch' : ''}"${o.color ? ` style="--sw:${esc(o.color)}"` : ''}><input ${attrs({ type: g.kind, name, value: o.label, checked: g.kind === 'radio' && k === 0, required: g.kind === 'radio', ...optionAttrs(o) })}><span>${esc(o.label)}${priceTag(o)}</span></label>`).join('')}</div></fieldset>`;
  }
  if (g.kind === 'select') {
    return `<label class="im-field"${stepA}><span>${esc(g.label)}</span><select name="${esc(name)}">${(g.options || []).map((o) => `<option ${attrs(optionAttrs(o))}>${esc(o.label)}</option>`).join('')}</select></label>`;
  }
  if (g.kind === 'range' || g.kind === 'number') {
    const showId = `${name}-valor`;
    return `<label class="im-field"${stepA}><span>${esc(g.label)} · <output id="${esc(showId)}">${esc(g.value ?? g.min ?? 0)}${g.unit ? ' ' + esc(g.unit) : ''}</output></span><input ${attrs({ type: g.kind, name, min: g.min ?? 0, max: g.max ?? 10, step: g.step ?? 1, value: g.value ?? g.min ?? 0, 'data-price-per': g.pricePer ?? null, 'data-days-per': g.daysPer ?? null, 'data-unit': g.unit || null, 'data-im-show': `#${showId}` })}></label>`;
  }
  if (g.kind === 'text') {
    return `<label class="im-field"${stepA}><span>${esc(g.label)}</span><input ${attrs({ type: 'text', name, placeholder: g.placeholder || '', maxlength: g.maxlength || 28, 'data-im-bind': g.bind || null })}></label>`;
  }
  return '';
}
function slotsBlock(slots, ctx, step) {
  if (!slots) return '';
  const t = tr(ctx);
  return `<fieldset class="im-field"${step ? ' data-im-step' : ''}><legend>${esc(slots.label || t('Horários disponíveis', 'Available times'))}</legend><div ${attrs({ 'data-im-slots': slots })}></div></fieldset>`;
}

/* ---------- capítulos ---------- */
const R = {
  cinema(ch, ctx) {
    const hits = (ch.hits || []).map((h) => `${h.preset}@${h.at}`).join(',');
    const a = {
      class: 'im-chapter', id: ch.id, 'data-im-chapter': true, 'data-im-label': ch.label || null, 'data-im-length': ch.length ?? 3,
      'data-im-lerp': ch.lerp ?? null, 'data-im-warp': ch.warp || null, 'data-im-bg': ch.bg || null,
      'data-im-shake': ch.shake ? ch.shake.join(',') : null, 'data-im-sound': ch.sound || null,
      'data-im-sound-range': ch.soundRange ? ch.soundRange.join(',') : null, 'data-im-hit': hits || null, 'data-im-hook': ch.hooks ? ch.id : null,
    };
    const groups = (ch.groups || []).map((g) => `<div class="im-pos im-pos-${esc(g.pos || 'center')}">${(g.items || []).map((it) => renderItem(it, ctx)).join('')}</div>`).join('\n        ');
    const callouts = (ch.callouts || []).map((c) => `<div ${attrs({ 'data-im-callout': true, 'data-im-x': c.x, 'data-im-y': c.y, 'data-im-lx': c.lx, 'data-im-ly': c.ly, 'data-im-in': c.in ?? 0, 'data-im-out': c.out ?? 1 })}>${richText(c.text)}</div>`).join('\n        ');
    return `<section ${attrs(a)}>
    <div class="im-stage">
      ${renderMedia(ch.media, ctx)}
      ${ch.shade === false ? '' : '<div class="im-shade"></div>'}
      <div class="im-layer">
        ${ch.hud ? '<div class="im-hud"></div>' : ''}
        ${groups}
        ${callouts}
      </div>
      ${ch.hint ? `<p class="im-hint" data-im-hint>${esc(ch.hint)}</p>` : ''}
    </div>
  </section>`;
  },

  lines(ch, ctx) {
    const mode = ch.mode === 'single' ? 'single' : 'stack';
    return `<section ${attrs({ class: 'im-chapter im-chapter--lines', id: ch.id, 'data-im-chapter': true, 'data-im-label': ch.label || null, 'data-im-length': ch.length ?? 3, 'data-im-hit': (ch.hits || []).map((h) => `${h.preset}@${h.at}`).join(',') || null })}>
    <div class="im-stage">
      ${renderMedia(ch.media, ctx)}
      <div class="im-layer">
        <div class="im-pos im-pos-${esc(ch.pos || 'center')}">
          ${ch.overline ? `<p class="im-overline">${esc(ch.overline)}</p>` : ''}
          <div class="im-lines" data-im-lines="${mode}">${(ch.lines || []).map((l) => `<p class="${classes(ch.cls || (mode === 'single' ? 'display' : 'line'))}">${richText(l)}</p>`).join('')}</div>
        </div>
      </div>
    </div>
  </section>`;
  },

  lens(ch, ctx) {
    const layers = (ch.layers || []).map((L) => `<img class="im-lens-layer" ${attrs({ src: L.src, alt: '', 'data-name': L.name || '', 'data-legend': L.legend || null, 'data-thermal': L.thermal ? L.thermal.join(',') : null, 'data-unit': L.unit || null })}>`).join('');
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}
      <div class="im-lens" ${attrs({ 'data-im-lens': true, 'data-im-radius': ch.radius || 140, 'data-im-offset': ch.offset ? ch.offset.join(',') : null })}>
        <img class="im-lens-base" src="${esc(ch.base)}" alt="${esc(ch.alt || ch.title || '')}">${layers}
      </div></div></section>`;
  },

  compare(ch, ctx) {
    const [la, lb] = ch.labels || ['', ''];
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}
      <div class="im-compare" data-im-compare data-im-start="${ch.start ?? 0.5}">
        <img class="im-compare-after" src="${esc(ch.after)}" alt="${esc(lb)}"><img class="im-compare-before" src="${esc(ch.before)}" alt="${esc(la)}">
        ${la ? `<span class="im-compare-tag im-compare-tag--a">${esc(la)}</span>` : ''}${lb ? `<span class="im-compare-tag im-compare-tag--b">${esc(lb)}</span>` : ''}
        <button class="im-compare-handle" type="button"></button>
      </div></div></section>`;
  },

  spin(ch, ctx) {
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}
      <div class="im-spin" ${attrs({ 'data-im-spin': true, 'data-im-seq': ch.seq, 'data-im-autorotate': ch.autorotate ?? 0.25, 'data-im-cursor-label': tr(ctx)('Arraste', 'Drag') })}><canvas></canvas>${ch.hint ? `<span class="im-spin-hint">${esc(ch.hint)}</span>` : ''}</div>
      </div></section>`;
  },

  model(ch, ctx) {
    const hs = (ch.hotspots || []).map((h, i) => `<button class="im-chip" slot="hotspot-${i + 1}" ${attrs({ 'data-position': h.position, 'data-normal': h.normal || '0 1 0' })}>${esc(h.label)}</button>`).join('');
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}
      <model-viewer ${attrs({ src: ch.src, poster: ch.poster || null, alt: ch.alt || ch.title || '3D', 'camera-controls': true, 'auto-rotate': true, 'shadow-intensity': '1', exposure: '1', 'touch-action': 'pan-y', style: 'width:100%;aspect-ratio:16/9;background:transparent' })}>${hs}</model-viewer>
      </div></section>`;
  },

  specs(ch, ctx) {
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}<dl class="im-specs" data-im-stagger="60">${(ch.items || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${richText(v)}</dd></div>`).join('')}</dl></div></section>`;
  },

  stats(ch, ctx) {
    return `${secOpen(ch, 'im-sec--tight')}<div class="im-wrap">${head(ch, ctx)}<div class="im-stats" data-im-stagger="90">${(ch.items || []).map((s) => `<div class="im-stat"><span class="im-stat-v" ${attrs({ 'data-im-count': s.value ?? 0, 'data-im-prefix': s.prefix || null, 'data-im-suffix': s.suffix || null, 'data-im-decimals': s.decimals ?? null })}>0</span><span class="im-stat-l">${esc(s.label)}</span></div>`).join('')}</div></div></section>`;
  },

  cards(ch, ctx) {
    const card = (c) => `<article class="im-card" data-im-tilt="4" data-im-hover-card>${c.img || c.video ? `<div class="im-card-media">${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.alt || c.title || '')}" loading="lazy">` : ''}${c.video ? `<video data-im-hoverplay src="${esc(c.video)}" muted loop playsinline preload="none"></video>` : ''}</div>` : ''}${c.tag ? `<p class="im-card-tag">${esc(c.tag)}</p>` : ''}<h3>${richText(c.title)}</h3>${c.text ? `<p>${richText(c.text)}</p>` : ''}${c.price != null || c.href ? `<div class="im-card-foot">${c.price != null ? `<span class="im-card-price">${typeof c.price === 'number' ? money(c.price, ctx) : esc(c.price)}</span>` : ''}${c.href ? `<a class="im-btn im-btn--ghost" href="${esc(c.href)}">${esc(c.cta || tr(ctx)('Ver', 'View'))}</a>` : ''}</div>` : ''}</article>`;
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}<div class="im-cards" data-im-stagger="90">${(ch.items || []).map(card).join('')}</div></div></section>`;
  },

  index(ch, ctx) {
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}<ol class="im-worklist">${(ch.items || []).map((it, i) => `<li data-im-reveal="rise"><a href="${esc(it.href || '#')}"><span class="im-w-n">${String(i + 1).padStart(2, '0')}</span><span class="im-w-t">${esc(it.name)}<span class="im-w-r">${esc(it.result || '')}</span></span><span class="im-w-y">${esc(it.year || '')}</span></a></li>`).join('')}</ol></div></section>`;
  },

  pricing(ch, ctx) {
    const t = tr(ctx);
    const f = ch.toggle && ch.toggle.yearlyFactor ? ch.toggle.yearlyFactor : null;
    const tier = (x) => {
      const p = typeof x.price === 'number' ? money(x.price, ctx) : esc(x.price);
      const y = f && typeof x.price === 'number' ? money(Math.round(x.price * f), ctx) : null;
      return `<div class="im-tier${x.featured ? ' is-featured' : ''}" data-im-reveal="rise"><span class="im-tier-name">${esc(x.name)}</span><span class="im-tier-price"><span ${attrs(y ? { 'data-monthly': p, 'data-yearly': y } : {})}>${p}</span> <small>${esc(x.period || '')}</small></span><ul>${(x.features || []).map((ft) => `<li>${esc(ft)}</li>`).join('')}</ul><a class="im-btn${x.featured ? '' : ' im-btn--ghost'}" href="${esc(x.href || '#contato')}" data-im-magnetic="0.2">${esc(x.cta || t('Escolher', 'Choose'))}</a></div>`;
    };
    return `${secOpen(ch)}<div class="im-wrap"${f ? ' data-im-billing="monthly"' : ''}>${head(ch, ctx)}${f ? `<div class="im-billing" role="group"><button type="button" data-im-billing-set="monthly">${t('Mensal', 'Monthly')}</button><button type="button" data-im-billing-set="yearly">${t('Anual', 'Yearly')} −${Math.round((1 - f) * 100)}%</button></div>` : ''}<div class="im-pricing">${(ch.tiers || []).map(tier).join('')}</div></div></section>`;
  },

  menu(ch, ctx) {
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}<div class="im-menu">${(ch.columns || []).map((c) => `<div><h3>${esc(c.title)}</h3>${(c.items || []).map((it) => `<div class="im-menu-item" data-im-reveal="rise"><strong>${esc(it.name)}</strong><span>${it.price ? money(it.price, ctx) : '[[preço]]'}</span>${it.desc ? `<p>${esc(it.desc)}</p>` : ''}</div>`).join('')}</div>`).join('')}</div></div></section>`;
  },

  schedule(ch, ctx) {
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}<div class="im-table-wrap"><table class="im-table"><thead><tr>${(ch.head || []).map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${(ch.rows || []).map((r) => `<tr>${r.map((x, i) => (i ? `<td>${esc(x)}</td>` : `<th scope="row">${esc(x)}</th>`)).join('')}</tr>`).join('')}</tbody></table></div></div></section>`;
  },

  faq(ch, ctx) {
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}<div class="im-faq">${(ch.items || []).map((q) => `<details><summary>${esc(q.q)}</summary><p>${richText(q.a)}</p></details>`).join('')}</div></div></section>`;
  },

  reviews(ch, ctx) {
    const t = tr(ctx);
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}${ch.example ? `<p class="im-example-tag">${t('Exemplos — substitua por avaliações reais', 'Examples — replace with real reviews')}</p>` : ''}<div class="im-reviews" data-im-stagger="90">${(ch.items || []).map((r) => `<figure class="im-review"><span class="im-review-stars" aria-label="${r.stars || 5}/5">${'★'.repeat(Math.max(1, Math.min(5, r.stars || 5)))}</span><blockquote>${esc(r.text)}</blockquote><cite>${esc(r.name)}</cite></figure>`).join('')}</div></div></section>`;
  },

  cta(ch, ctx) {
    const t = tr(ctx);
    const form = ch.email !== false && !ch.href
      ? `<form class="im-inline-form" data-im-honest><input type="email" name="email" required autocomplete="email" placeholder="${t('seu@email.com', 'you@email.com')}" aria-label="E-mail"><button class="im-btn" type="submit" data-im-magnetic="0.25">${esc(ch.button || t('Enviar', 'Send'))}</button></form>`
      : `<a class="im-btn" href="${esc(ch.href || '#')}" data-im-magnetic="0.25">${esc(ch.button || t('Fale conosco', 'Contact us'))}</a>`;
    return `${secOpen(ch, 'im-cta')}<p class="im-overline">${esc(ch.overline || ch.label || '')}</p><h2 class="im-display im-display--md" data-im-reveal="rise">${richText(ch.title)}</h2>${ch.text ? `<p class="im-lead" data-im-reveal="rise">${richText(ch.text)}</p>` : ''}${form}${ch.small ? `<p class="im-small">${esc(ch.small)}</p>` : ''}</section>`;
  },

  configurator(ch, ctx) {
    const t = tr(ctx);
    const step = !!ch.wizard;
    const groups = (ch.groups || []).map((g, i) => renderGroup(g, ctx, i, step)).join('');
    const outs = (ch.outputs || [{ key: 'total', label: 'Total' }]).map((o) => `<div class="im-estimate-row"><span class="im-label">${esc(o.label)}</span><output class="im-out-big" ${attrs({ 'data-im-out': o.key, 'data-im-out-label': o.label })}>—</output></div>`).join('');
    const contact = ch.contact ? `<div class="im-form-grid"${step ? ' data-im-step' : ''}>${field('name', ctx)}${field('email', ctx)}</div>` : '';
    const pv = ch.preview && ch.preview.img ? `<figure class="im-preview"><img id="${esc(ch.preview.id || 'previa')}" src="${esc(ch.preview.img)}" alt="${esc(ch.title || '')}">${ch.preview.engraving ? `<figcaption class="im-preview-band" id="gravacao-previa">${esc(t('Para sempre', 'Forever'))}</figcaption>` : ''}</figure>` : '';
    return `${secOpen(ch)}<div class="im-wrap im-grid-2"><div>${head(ch, ctx)}${pv}</div>
      <form class="im-form" ${attrs({ 'data-im-calc': true, 'data-im-honest': true, 'data-im-wizard': step, 'data-im-base': ch.base ?? 0, 'data-im-base-days': ch.baseDays ?? null, 'data-im-spread': ch.spread ?? null, 'data-im-months': ch.months || null, 'data-im-rate': ch.rate || null, 'data-im-currency': ctx.currency || null })}>
        ${groups}${slotsBlock(ch.slots, ctx, step)}${contact}
        <div class="im-estimate"${step ? ' data-im-estimate' : ''}>${outs}</div>
        <button class="im-btn" type="submit" data-im-magnetic="0.2">${esc(ch.cta || t('Enviar', 'Send'))}</button>
      </form></div></section>`;
  },

  booking(ch, ctx) {
    const t = tr(ctx);
    const agent = ch.agent ? `<div class="im-agent"><strong class="im-h3">${esc(ch.agent.name)}</strong><span class="im-mono">${esc(ch.agent.role || '')}</span>${ch.agent.phone ? `<a href="tel:${esc(ch.agent.phone)}">${esc(ch.agent.phone)}</a>` : ''}</div>` : '';
    return `${secOpen(ch)}<div class="im-wrap im-grid-2"><div>${head(ch, ctx)}${agent}</div>
      <form class="im-form" data-im-honest>
        <div class="im-form-grid">${(ch.fields || ['name', 'email']).map((f) => field(f, ctx)).join('')}</div>
        ${slotsBlock(ch.slots, ctx, false)}
        <button class="im-btn" type="submit" data-im-magnetic="0.2">${esc(ch.cta || t('Confirmar', 'Confirm'))}</button>
      </form></div></section>`;
  },

  order(ch, ctx) {
    const t = tr(ctx);
    const rows = (ch.items || []).map((it, i) => `<div class="im-order-row"><div><strong>${esc(it.name)}</strong><span class="im-mono">${money(it.price, ctx)}</span></div><div data-im-stepper><input ${attrs({ type: 'number', name: slug(it.name) || `item-${i}`, min: 0, max: 24, value: 0, 'data-price-per': it.price, 'data-label-name': it.name, 'aria-label': it.name })}></div></div>`).join('');
    const cd = ch.countdown ? `<p class="im-mono im-order-cd">${esc(ch.countdown.label || '')} <span ${attrs(ch.countdown.every ? { 'data-im-countdown-every': ch.countdown.every } : { 'data-im-countdown': ch.countdown.to })}></span></p>` : '';
    return `${secOpen(ch)}<div class="im-wrap im-grid-2"><div>${head(ch, ctx)}${cd}</div>
      <form class="im-form" ${attrs({ 'data-im-calc': true, 'data-im-honest': true, 'data-im-base': 0, 'data-im-currency': ctx.currency || null })}>
        <div class="im-order">${rows}</div>
        ${slotsBlock(ch.slots ? { ...ch.slots, label: ch.slots.label || t('Horário de retirada', 'Pickup time') } : null, ctx, false)}
        <div class="im-estimate"><span class="im-label">Total</span><output class="im-out-big" data-im-out="total" data-im-out-label="Total">—</output></div>
        <button class="im-btn" type="submit" data-im-magnetic="0.2">${esc(ch.cta || t('Reservar', 'Reserve'))}</button>
      </form></div></section>`;
  },

  shop(ch, ctx) {
    const t = tr(ctx);
    const prod = (p) => `<article class="im-card" data-im-product data-im-hover-card data-im-tilt="4"><div class="im-card-media">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">` : ''}${p.video ? `<video data-im-hoverplay src="${esc(p.video)}" muted loop playsinline preload="none"></video>` : ''}</div><h3>${esc(p.name)}</h3><p class="im-card-price">${money(p.price, ctx)}</p>${p.sizes && p.sizes.length ? `<div class="im-choices" role="radiogroup" aria-label="${t('Tamanho', 'Size')}">${p.sizes.map((s, i) => `<label class="im-choice"><input type="radio" name="size" value="${esc(s)}"${i === 1 ? ' checked' : ''}><span>${esc(s)}</span></label>`).join('')}</div>` : ''}<div class="im-card-foot"><button type="button" class="im-btn" data-im-click-sound="tick" ${attrs({ 'data-im-add': { id: p.id || slug(p.name), name: p.name, price: p.price, img: p.img || '' } })}>${t('Adicionar à sacola', 'Add to bag')}</button></div></article>`;
    const cd = ch.countdown && (ch.countdown.to || ch.countdown.every) ? renderCountdown(ch.countdown, ctx) : '';
    return `${secOpen(ch)}<div class="im-wrap">${head(ch, ctx)}${cd}<div class="im-cards" data-im-stagger="90">${(ch.products || []).map(prod).join('')}</div>${ch.notify ? `<form class="im-inline-form im-notify" data-im-honest><input type="email" name="email" required placeholder="${t('Avise-me quando voltar ao estoque', 'Notify me when back in stock')}" aria-label="E-mail"><button class="im-btn im-btn--ghost" type="submit">${t('Avisar', 'Notify me')}</button></form>` : ''}</div></section>`;
  },

  location(ch, ctx) {
    const t = tr(ctx);
    const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ch.address || '')}`;
    return `${secOpen(ch)}<div class="im-wrap im-grid-2">${head(ch, ctx)}<div class="im-location"><p class="im-h3">${esc(ch.address)}</p><dl class="im-specs">${(ch.hours || []).map(([d, hh]) => `<div><dt>${esc(d)}</dt><dd>${esc(hh)}</dd></div>`).join('')}</dl><a class="im-btn im-btn--ghost" href="${esc(map)}" target="_blank" rel="noopener">${t('Abrir no mapa', 'Open in maps')}</a></div></div></section>`;
  },

  emergency() { return ''; },

  html(ch) { return ch.html || ''; },
};

export const TIPOS = Object.keys(R);

export function renderChapter(ch, ctx) {
  const fn = R[ch.type];
  if (!fn) return `<!-- tipo de capítulo desconhecido: ${esc(ch.type)} -->`;
  return fn(ch, ctx);
}

/* ---------- página completa ---------- */
export function pageCtx(spec) {
  return { lang: spec.lang || 'pt-BR', brand: spec.brand, currency: spec.currency || (String(spec.lang || '').startsWith('en') ? 'USD' : 'BRL'), fallbackPreset: spec.fallbackPreset };
}

export function renderPage(spec) {
  const ctx = pageCtx(spec);
  const t = tr(ctx);
  const chapters = spec.chapters || [];
  const hasShop = chapters.some((c) => c.type === 'shop');
  const emergency = chapters.find((c) => c.type === 'emergency');
  const usesModel = chapters.some((c) => c.type === 'model');
  const fonts = fontsHref(spec.fonts || {});
  const navTargets = chapters.filter((c) => c.label && c.type !== 'emergency').slice(0, 6);
  const ctaTarget = [...chapters].reverse().find((c) => ['cta', 'booking', 'configurator', 'order', 'shop', 'pricing'].includes(c.type));
  const loader = spec.loader === false ? '' : `<div class="im-loader" data-im-loader data-style="${esc(spec.loader?.style || spec.loader || 'line')}" role="status" aria-live="polite">
    <div class="im-loader-inner">
      <p class="im-loader-brand">${esc(spec.brand)}</p>
      <div class="im-loader-bar"><i></i></div>
      <span class="im-loader-pct" data-im-loader-pct>0%</span>
      ${spec.gate ? `<div class="im-loader-gate"><button class="im-btn" type="button" data-im-gate="sound">${esc(spec.gate.label || t('Entrar com som', 'Enter with sound'))}</button><button class="im-link" type="button" data-im-gate="silent">${t('Entrar sem som', 'Enter without sound')}</button></div>` : ''}
    </div>
  </div>`;
  const body = {
    'data-im-root': true, 'data-im-brand': spec.brand, 'data-im-cursor': spec.cursor || null, 'data-im-grain': spec.grain !== false,
    'data-im-vignette': !!spec.vignette, 'data-im-smooth': spec.smooth === false ? 'off' : String(spec.smooth || 0.1),
    'data-im-ambient': spec.sound && spec.sound.ambient ? spec.sound.ambient : null, 'data-im-preload': spec.preload || null,
    class: emergency ? 'im-has-emergency' : null,
  };
  const nav = `<header class="site-nav">
    <a class="site-brand" href="#topo">${esc(spec.brand)}</a>
    <nav aria-label="${t('Seções', 'Sections')}"><ul class="site-links">${navTargets.map((c) => `<li><a href="#${esc(c.id)}">${esc(c.label)}</a></li>`).join('')}</ul></nav>
    <div class="site-actions">${hasShop ? `<button class="site-cart" type="button" data-im-cart-open>${t('Sacola', 'Bag')} <span class="im-cart-badge is-empty" data-im-cart-count>0</span></button>` : ''}${ctaTarget ? `<a class="site-cta" href="#${esc(ctaTarget.id)}">${esc(spec.navCta || ctaTarget.label || t('Contato', 'Contact'))}</a>` : ''}</div>
  </header>`;
  const year = new Date().getFullYear();
  const footer = `<footer class="site-footer">
    <span>${esc(spec.brand)} · ${year}</span>
    ${spec.fictional ? `<span>${t('Marca fictícia · site de demonstração', 'Fictional brand · demo site')}</span>` : ''}
    ${(spec.footer && spec.footer.links ? spec.footer.links : []).map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}
    <a href="#topo">${t('Voltar ao topo', 'Back to top')} ↑</a>
  </footer>`;
  return `<!doctype html>
<html lang="${esc(ctx.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(spec.title || spec.brand)}</title>
  <meta name="description" content="${esc(spec.description || spec.tagline || '')}">
  <meta name="theme-color" content="${esc((spec.palette && spec.palette.bg) || '#050505')}">
  ${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${esc(fonts)}">` : ''}
  <link rel="stylesheet" href="imersao/imersao.css">
  <link rel="stylesheet" href="css/site.css">
  ${usesModel ? '<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"></script>' : ''}
</head>
<body ${attrs(body)}>
  <a class="skip-link" href="#conteudo">${t('Pular para o conteúdo', 'Skip to content')}</a>
  ${loader}
  <div class="im-progress" aria-hidden="true"><i></i></div>
  ${nav}
  ${spec.index === false ? '' : `<nav class="im-index" data-im-index aria-label="${t('Capítulos', 'Chapters')}"></nav>`}
  <main id="conteudo">
  <span id="topo"></span>
  ${chapters.map((c) => renderChapter(c, ctx)).filter(Boolean).join('\n\n  ')}
  </main>
  ${footer}
  ${spec.sound === false ? '' : '<button class="im-sound" type="button" data-im-sound-toggle></button>'}
  ${hasShop ? `<aside data-im-cart data-im-currency="${esc(ctx.currency)}"></aside>` : ''}
  ${emergency ? `<div class="im-emergency" role="region" aria-label="${esc(emergency.text)}"><span>${esc(emergency.text)}</span><a href="tel:${esc(String(emergency.phone).replace(/[^\d+]/g, ''))}">${esc(emergency.phone)}</a></div>` : ''}
  <script src="imersao/vendor/lenis.min.js" defer></script>
  <script src="imersao/imersao.js" defer></script>
  <script src="js/site.js" defer></script>
</body>
</html>
`;
}

export function renderSiteCss(spec) {
  const p = derivePalette(spec.palette || {});
  const f = spec.fonts || {};
  const stretch = f.displayStretch ? `\n  --im-display-stretch: ${f.displayStretch}%;` : '';
  return `/* Estilos da página — gerado pelo HEAD de Interação. Edite à vontade. */
:root {
  --im-bg: ${p.bg};
  --im-surface: ${p.surface};
  --im-text: ${p.text};
  --im-muted: ${p.muted};
  --im-accent: ${p.accent};
  --im-accent-2: ${p.accent2};
  --im-line: ${p.line};
  --im-alert: ${p.alert};
  --im-font-display: ${fontStack(f.display || 'Cormorant Garamond', 'display')};
  --im-font-body: ${fontStack(f.body || 'Inter', 'body')};
  --im-font-mono: ${fontStack(f.mono || 'JetBrains Mono', 'mono')};${stretch}
  --im-page-bg: var(--im-bg);
  color-scheme: ${p.theme};
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--im-page-bg); color: var(--im-text); font-family: var(--im-font-body);
  font-size: 16px; line-height: 1.5; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  transition: background-color 0.6s ease;
}
img, video, canvas, svg { max-width: 100%; }
a { color: inherit; }
::selection { background: var(--im-accent); color: var(--im-bg); }
.im-display, .im-h2, .im-h3 { font-stretch: var(--im-display-stretch, 100%); }
.skip-link { position: absolute; left: -9999px; top: 0; }
.skip-link:focus { left: 16px; top: 16px; z-index: 99999; padding: 0.6rem 1rem; background: var(--im-text); color: var(--im-bg); }

.site-nav {
  position: fixed; inset: 0 0 auto 0; z-index: 850; display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 20px var(--im-gutter); color: #fff; mix-blend-mode: difference; pointer-events: none;
}
.site-nav a, .site-nav button { pointer-events: auto; }
.site-brand { font-family: var(--im-font-display); font-size: 1rem; letter-spacing: 0.28em; text-transform: uppercase; text-decoration: none; }
.site-links { display: flex; gap: 1.6rem; margin: 0; padding: 0; list-style: none; font-family: var(--im-font-mono); font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; }
.site-links a { text-decoration: none; opacity: 0.72; transition: opacity 0.3s; }
.site-links a:hover, .site-links a:focus-visible { opacity: 1; }
.site-actions { display: flex; align-items: center; gap: 0.8rem; }
.site-cta, .site-cart { font-family: var(--im-font-mono); font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; text-decoration: none; color: #fff; background: none; border: 1px solid rgba(255, 255, 255, 0.55); border-radius: 99px; padding: 0.55rem 0.9rem; cursor: pointer; }
.site-footer {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem 2rem; padding: 64px var(--im-gutter) 44px;
  border-top: 1px solid var(--im-line); font-family: var(--im-font-mono); font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--im-muted);
}
.site-footer a { text-decoration: none; }
.im-preview { margin: 2rem 0 0; display: flex; flex-direction: column; gap: 1rem; }
.im-preview img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; transition: filter 0.6s ease; background: #000; }
.im-agent { margin-top: 2rem; display: flex; flex-direction: column; gap: 0.4rem; }
@media (max-width: 767px) {
  .site-links { display: none; }
}
`;
}

export function renderSiteJs(spec) {
  const hooks = (spec.chapters || []).filter((c) => c.hooks).map((c) => c.id);
  return `// Código próprio do site. O motor expõe window.Imersao (veja docs/MOTOR.md).
// Exemplo: amarrar uma cena Three.js / GSAP ao progresso de um capítulo:
//
//   Imersao.onProgress('${hooks[0] || (spec.chapters && spec.chapters[0] ? spec.chapters[0].id : 'capitulo')}', (p) => {
//     // p vai de 0 a 1 enquanto o capítulo está fixado (rolar para trás devolve p)
//     // camera.position.z = 10 - p * 8; renderer.render(scene, camera);
//   });
//
// Auto-teste no console:  await Imersao.selfTest()   ·   Imersao.status()
document.addEventListener('imersao:ready', () => {
  // site pronto (frames críticos carregados)
});
`;
}
