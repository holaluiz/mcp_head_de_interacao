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
