// Verificação automática (bloco VERIFY dos prompts validados): abre o site num
// Chrome headless e confere cada capítulo no meio do scroll, nos dois sentidos,
// no desktop, no celular e com movimento reduzido — console, 404, marcadores,
// módulos de negócio e screenshots.
import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import { abrirNavegador } from './browser.js';
import { servir, registro } from './serve.js';
import { ensureDir, writeJson, readJson, exists } from './util.js';
import { ativosEsperados } from './scaffold.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function comParams(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, String(v));
  return u.href;
}

function coletar(page) {
  const c = { console: [], pageErrors: [], http: [], failed: [] };
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) c.console.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => c.pageErrors.push(String((e && e.message) || e).slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) c.http.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => { const f = r.failure(); if (!/favicon/.test(r.url()) && !(f && /ERR_ABORTED/.test(f.errorText))) c.failed.push(`${r.url()} (${f ? f.errorText : 'falhou'})`); });
  return c;
}

async function esperarMotor(page, timeout) {
  return page.waitForFunction(() => window.Imersao && window.Imersao.status && window.Imersao.status().ready, { timeout, polling: 200 }).then(() => true).catch(() => false);
}

async function irPara(page, id, p) {
  return page.evaluate(async (id, p) => {
    const I = window.Imersao;
    const ch = I.chapters.find((c) => c.id === id);
    if (ch) { I.goTo(id, p, { instant: true }); return 'capitulo'; }
    const el = document.getElementById(id) || document.querySelector(id);
    if (!el) return null;
    const y = el.getBoundingClientRect().top + window.scrollY - 40;
    const L = I.state.lenis;
    if (L) L.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    return 'secao';
  }, id, p);
}

async function esperarFrames(page, id, ms = 15000) {
  await page.waitForFunction((id) => {
    const c = window.Imersao.status().chapters.find((x) => x.id === id);
    return !c || c.count == null || (c.loaded + c.failed) >= Math.min(c.count, Math.ceil(c.count * 0.95));
  }, { timeout: ms, polling: 250 }, id).catch(() => {});
}

async function screenshot(page, file) {
  await page.screenshot({ path: file, type: 'jpeg', quality: 62 });
  return file;
}

async function testarModulos(page) {
  return page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const fire = (el, ...types) => types.forEach((t) => el.dispatchEvent(new Event(t, { bubbles: true })));
    const out = { calc: [], honest: [], slots: 0 };
    out.slots = document.querySelectorAll('.im-slots input, .im-slots button').length;
    for (const f of document.querySelectorAll('form[data-im-calc]')) {
      const outs = [...f.querySelectorAll('output[data-im-out], [data-im-out-label]')];
      const read = () => outs.map((o) => o.textContent.trim()).join(' | ');
      const before = read();
      const groups = {};
      f.querySelectorAll('input[type=radio]').forEach((r) => { if (!r.closest('.im-slots')) (groups[r.name] = groups[r.name] || []).push(r); });
      Object.values(groups).forEach((g) => { const r = g[Math.min(1, g.length - 1)]; r.checked = true; fire(r, 'input', 'change'); });
      f.querySelectorAll('input[type=range]').forEach((r) => { r.value = r.max; fire(r, 'input', 'change'); });
      f.querySelectorAll('input[type=number]').forEach((n) => { n.value = 2; fire(n, 'input', 'change'); });
      const cb = f.querySelector('input[type=checkbox]'); if (cb) { cb.checked = true; fire(cb, 'input', 'change'); }
      await wait(300);
      const after = read();
      out.calc.push({ secao: (f.closest('section') || {}).id || null, antes: before, depois: after, ok: !!outs.length && after !== before && !/^[—\-\s|]*$/.test(after) });
    }
    for (const f of [...document.querySelectorAll('form[data-im-honest]')].filter((x) => !x.hasAttribute('data-im-wizard')).slice(0, 3)) {
      for (const i of f.querySelectorAll('input[required],textarea[required],select[required]')) {
        if (i.type === 'radio') { const first = f.querySelector(`input[type=radio][name="${CSS.escape(i.name)}"]:not(:disabled)`); if (first) first.checked = true; continue; }
        if (i.type === 'checkbox') { i.checked = true; continue; }
        if (i.value) continue;
        i.value = i.type === 'email' ? 'teste@exemplo.com' : i.type === 'date' ? new Date(Date.now() + 864e5 * 3).toISOString().slice(0, 10) : i.type === 'tel' ? '11999999999' : i.type === 'number' ? (i.min || '1') : 'Teste';
        fire(i, 'input', 'change');
      }
      const slot = f.querySelector('.im-slots input[type=radio]:not(:disabled)'); if (slot) { slot.checked = true; fire(slot, 'change'); }
      try { f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); } catch (e) { /* inválido */ }
      await wait(250);
      const dlg = document.querySelector('.im-dialog[open]');
      out.honest.push({ secao: (f.closest('section') || {}).id || null, ok: !!dlg, texto: dlg ? (dlg.querySelector('.im-dialog-b') || dlg).textContent.trim().slice(0, 120) : null });
      if (dlg) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
    }
    return out;
  });
}

async function overflowHorizontal(page) {
  return page.evaluate(() => {
    const y = window.scrollY;
    window.scrollTo(200, y);
    const can = window.scrollX > 0;
    window.scrollTo(0, y);
    const iw = window.innerWidth;
    const culprits = [];
    if (can) {
      for (const el of document.querySelectorAll('body *')) {
        if (culprits.length >= 6) break;
        if (el.closest('.im-stage,[data-im-marquee],.im-marquee')) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > iw + 2 && getComputedStyle(el).position !== 'fixed') culprits.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''} (${Math.round(r.right)}px)`);
      }
    }
    return { rola: can, largura: iw, scrollWidth: document.documentElement.scrollWidth, culprits };
  });
}

export async function verificar(o = {}) {
  const pontos = o.pontos && o.pontos.length ? o.pontos : [0.1, 0.5, 0.9];
  const disp = o.dispositivos && o.dispositivos.length ? o.dispositivos : ['desktop', 'celular', 'reduzido'];
  const timeout = o.timeout || 60000;
  let url = o.url, dir = null;
  if (o.projeto) {
    dir = path.resolve(o.projeto);
    const reg = await servir(dir);
    url = reg.url + (o.pagina ? String(o.pagina).replace(/^\//, '') : '');
    if (reg.missing) reg.missing.length = 0;
  }
  if (!url) throw new Error('Informe projeto ou url.');
  // Ativos que o plano espera mas que ainda não existem: aviso, não falha.
  const pend = { imagens: [], sequencias: [] };
  if (dir) {
    const spec = await readJson(path.join(dir, 'experience.json'), null);
    const man = (await readJson(path.join(dir, 'imersao.manifest.json'), {})) || {};
    if (spec && Array.isArray(spec.chapters)) {
      const at = ativosEsperados(spec);
      pend.imagens = at.imagens.filter((p) => !exists(path.join(dir, p)));
      pend.sequencias = at.sequencias.filter((s) => !(man.sequences || {})[s]);
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = dir ? path.join(dir, '.imersao', 'verificacao', stamp) : path.join(os.tmpdir(), 'head-de-interacao', 'verificacao', stamp);
  await ensureDir(outDir);
  const checks = [];
  const add = (grupo, item, ok, detalhe) => checks.push({ grupo, item, ok, detalhe: detalhe || '' });
  const shots = [];
  const dados = { url };
  const browser = await abrirNavegador();
  try {
    /* ---------------- desktop ---------------- */
    if (disp.includes('desktop')) {
      const page = await browser.newPage();
      await page.setViewport({ width: o.largura || 1366, height: o.altura || 820, deviceScaleFactor: 1 });
      const errs = coletar(page);
      const t0 = Date.now();
      await page.goto(comParams(url, { mute: 1 }), { waitUntil: 'load', timeout });
      const pronto = await esperarMotor(page, timeout);
      const temMotor = await page.evaluate(() => !!(window.Imersao && window.Imersao.version));
      add('desktop', 'Motor carregado e pronto (loader liberou o scroll)', pronto, pronto ? `${Date.now() - t0} ms` : temMotor ? 'o motor carregou mas não ficou pronto (frames travados?)' : 'window.Imersao não existe — confira as tags <script> do motor');
      if (pronto) {
        const st = await page.evaluate(() => window.Imersao.status());
        dados.status = st;
        const teste = await page.evaluate((pts) => window.Imersao.selfTest(pts), pontos);
        dados.selfTest = teste;
        for (const c of teste.chapters) {
          const sc = st.chapters.find((x) => x.id === c.id) || {};
          if (o.capitulos && o.capitulos.length && !o.capitulos.includes(c.id)) continue;
          const nome = `capítulo ${c.id} (${sc.fallback ? `fallback ${sc.fallback}` : c.media})`;
          if (c.media === 'frames' && sc.count) add('capítulos', `${nome}: scrub em ${pontos.join('/')} e rebobina`, !!(c.scrubs && c.reverse), `frames ${c.frames.join(' → ')} · volta ${c.reverse ? 'ok' : 'NÃO rebobinou'}${sc.failed ? ` · ${sc.failed} frames falharam` : ''}`);
          else add('capítulos', `${nome}: palco desenhado no meio`, c.blank !== true, c.blank === true ? 'palco em branco em 50%' : `progresso ${c.frames.join(' → ')}${sc.fallback ? ' · sequência ainda não extraída (normal antes de extrair_frames)' : ''}`);
        }
        const aguardando = (e) => pend.sequencias.some((s) => String(e.msg).includes(s)) || pend.imagens.some((s) => String(e.msg).includes(s)) || (pend.sequencias.length && /sequ[eê]ncia (ausente|não encontrada)/.test(e.msg));
        const motorErr = (st.errors || []).filter((e) => !['sticky', 'solo'].includes(e.kind) && !aguardando(e));
        const motorPend = (st.errors || []).filter((e) => aguardando(e));
        const sticky = (st.errors || []).filter((e) => e.kind === 'sticky');
        add('desktop', 'Sem erros do motor', motorErr.length === 0, motorErr.slice(0, 5).map((e) => `${e.kind}: ${e.msg}`).join(' · '));
        if (motorPend.length) add('desktop', 'Componentes aguardando ativos', null, motorPend.slice(0, 4).map((e) => `${e.kind}: ${e.msg}`).join(' · '));
        if (sticky.length) add('desktop', 'Fixação (sticky)', null, sticky.map((e) => e.msg).join(' · '));
        const marc = await page.evaluate(() => [...new Set((document.body.innerText.match(/\[\[[^\]]{1,60}\]\]/g) || []))]);
        add('conteúdo', 'Nenhum marcador [[…]] sobrando', marc.length === 0, marc.slice(0, 12).join(', '));
        const mods = await testarModulos(page);
        dados.modulos = mods;
        for (const c of mods.calc) add('negócio', `Cálculo ao vivo${c.secao ? ' em #' + c.secao : ''}`, c.ok, `${c.antes || '—'} → ${c.depois || '—'}`);
        for (const h of mods.honest) add('negócio', `Formulário honesto${h.secao ? ' em #' + h.secao : ''} avisa que nada foi enviado`, h.ok, h.texto || 'o diálogo não apareceu (campos obrigatórios?)');
        const som = st.sound || {};
        add('sensorial', 'Som desligado até o clique', !som.on, som.available ? (som.on ? 'som ligou sozinho' : 'ok') : 'Web Audio indisponível');
        const ov = await overflowHorizontal(page);
        add('desktop', 'Sem rolagem horizontal', !ov.rola, ov.culprits.join(', '));
        // screenshots
        if (o.screenshots !== false) {
          const alvos = teste.chapters.map((c) => c.id).filter((id) => !o.capitulos || !o.capitulos.length || o.capitulos.includes(id));
          if (alvos.length < 4 || o.secoes) {
            const extra = await page.evaluate(() => [...document.querySelectorAll('[data-im-label]:not([data-im-chapter])')].map((e) => e.id).filter(Boolean));
            alvos.push(...extra.slice(0, Math.max(0, 8 - alvos.length)));
          }
          for (const id of alvos.slice(0, o.max_capturas || 12)) {
            const kind = await irPara(page, id, 0.5);
            if (!kind) continue;
            await sleep(kind === 'capitulo' ? 650 : 1000);
            const file = path.join(outDir, `desktop-${id}.jpg`);
            await screenshot(page, file);
            shots.push({ arquivo: file, rotulo: `desktop · ${id}${kind === 'capitulo' ? ' @50%' : ''}` });
          }
        }
      } else {
        const file = path.join(outDir, 'desktop-topo.jpg');
        await screenshot(page, file).catch(() => {});
        shots.push({ arquivo: file, rotulo: 'desktop · topo (motor não ficou pronto)' });
      }
      const http = [...new Set([...errs.http, ...errs.failed])];
      const ehPendente = (linha) => pend.imagens.some((p) => linha.includes('/' + p)) || pend.sequencias.some((s) => linha.includes(`/frames/${s}/`));
      const reais = http.filter((l) => !ehPendente(l)), pendentes = http.filter(ehPendente);
      add('desktop', 'Nenhum recurso 404/falho', reais.length === 0, reais.slice(0, 8).join(' · '));
      if (pendentes.length) add('desktop', 'Ativos do plano ainda não gerados (o motor mostra fallback/aviso)', null, pendentes.slice(0, 6).map((l) => l.replace(/^\d+ https?:\/\/[^/]+\//, '')).join(', '));
      add('desktop', 'Console sem erros', errs.console.length + errs.pageErrors.length === 0, [...errs.pageErrors, ...errs.console].slice(0, 6).join(' · '));
      await page.close();
    }

    /* ---------------- celular ---------------- */
    if (disp.includes('celular')) {
      const m = await browser.newPage();
      await m.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, userAgent: IPHONE_UA });
      const errs = coletar(m);
      await m.goto(comParams(url, { mute: 1 }), { waitUntil: 'load', timeout });
      const pronto = await esperarMotor(m, timeout);
      add('celular', 'Motor pronto no celular (390 px)', pronto, '');
      if (pronto) {
        const ov = await overflowHorizontal(m);
        add('celular', 'Sem rolagem horizontal', !ov.rola, ov.rola ? `scrollWidth ${ov.scrollWidth}px: ${ov.culprits.join(', ')}` : '');
        const st = await m.evaluate(() => window.Imersao.status());
        dados.celular = st.chapters.map((c) => ({ id: c.id, media: c.media, fallback: c.fallback }));
        // Só texto corrido: rótulos em caixa alta espaçada são pequenos de propósito.
        const pequenos = await m.evaluate(() => [...document.querySelectorAll('p, li, dd, blockquote')].filter((e) => {
          if (!e.offsetParent) return false;
          const cs = getComputedStyle(e);
          return parseFloat(cs.fontSize) < 12 && e.textContent.trim().length > 30 && cs.textTransform !== 'uppercase';
        }).map((e) => e.textContent.trim().slice(0, 30)));
        add('celular', 'Texto corrido legível (≥ 12 px)', pequenos.length === 0, pequenos.length ? `${pequenos.length} trechos abaixo de 12 px: ${pequenos.slice(0, 3).join(' | ')}` : '');
        if (o.screenshots !== false) {
          const file = path.join(outDir, 'celular-topo.jpg');
          await sleep(500);
          await screenshot(m, file);
          shots.push({ arquivo: file, rotulo: 'celular · topo' });
          const first = st.chapters[Math.min(1, st.chapters.length - 1)];
          if (first) {
            await irPara(m, first.id, 0.5); await sleep(800);
            const f2 = path.join(outDir, `celular-${first.id}.jpg`);
            await screenshot(m, f2);
            shots.push({ arquivo: f2, rotulo: `celular · ${first.id} @50%` });
          }
        }
      }
      add('celular', 'Console sem erros no celular', errs.console.length + errs.pageErrors.length === 0, [...errs.pageErrors, ...errs.console].slice(0, 4).join(' · '));
      await m.close();
    }

    /* ---------------- movimento reduzido ---------------- */
    if (disp.includes('reduzido')) {
      const r = await browser.newPage();
      await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await r.setViewport({ width: 1366, height: 820, deviceScaleFactor: 1 });
      await r.goto(comParams(url, { mute: 1 }), { waitUntil: 'load', timeout });
      const pronto = await esperarMotor(r, timeout);
      if (pronto) {
        const red = await r.evaluate(() => {
          const hidden = [...document.querySelectorAll('.im-o, [data-im-reveal]')].filter((e) => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05; });
          return { reduced: window.Imersao.status().reduced, escondidos: hidden.length, exemplos: hidden.slice(0, 4).map((e) => e.textContent.trim().slice(0, 40)) };
        });
        add('acessibilidade', 'Movimento reduzido: tudo visível e estático', red.reduced && red.escondidos === 0, red.reduced ? (red.escondidos ? `${red.escondidos} elementos invisíveis: ${red.exemplos.join(' | ')}` : '') : 'o motor não detectou prefers-reduced-motion');
        if (o.screenshots !== false) {
          const file = path.join(outDir, 'reduzido-topo.jpg');
          await screenshot(r, file);
          shots.push({ arquivo: file, rotulo: 'movimento reduzido · topo' });
        }
      } else add('acessibilidade', 'Movimento reduzido: motor pronto', false, '');
      await r.close();
    }
  } finally {
    await browser.close().catch(() => {});
  }
  if (dir) {
    const reg = registro(dir);
    const faltando = reg && reg.missing ? [...new Set(reg.missing)].filter((f) => !pend.imagens.some((p) => f === '/' + p) && !pend.sequencias.some((s) => f.startsWith(`/frames/${s}/`))) : [];
    if (faltando.length) add('servidor', 'Arquivos pedidos e inexistentes', false, faltando.slice(0, 10).join(', '));
  }
  const falhas = checks.filter((c) => c.ok === false);
  const avisos = checks.filter((c) => c.ok === null);
  const ok = falhas.length === 0;
  const resumo = `${checks.length - falhas.length - avisos.length}/${checks.length} ok${falhas.length ? ` · ${falhas.length} falha(s): ${falhas.slice(0, 3).map((f) => f.item).join('; ')}` : ''}${avisos.length ? ` · ${avisos.length} aviso(s)` : ''}`;
  if (dir) await writeJson(path.join(dir, '.imersao', 'ultima-verificacao.json'), { quando: new Date().toISOString(), url, ok, resumo, checks, capturas: shots.map((s) => s.arquivo) });
  await writeJson(path.join(outDir, 'relatorio.json'), { url, ok, resumo, checks, dados });
  return { ok, url, resumo, checks, shots, outDir, dados };
}

export async function capturar(o = {}) {
  let url = o.url, dir = null;
  if (o.projeto) { dir = path.resolve(o.projeto); url = (await servir(dir)).url + (o.pagina ? String(o.pagina).replace(/^\//, '') : ''); }
  if (!url) throw new Error('Informe projeto ou url.');
  const p = o.p == null ? 0.5 : o.p;
  const browser = await abrirNavegador();
  try {
    const page = await browser.newPage();
    if (o.dispositivo === 'celular') await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, userAgent: IPHONE_UA });
    else await page.setViewport({ width: o.largura || 1366, height: o.altura || 820, deviceScaleFactor: 1 });
    if (o.dispositivo === 'reduzido') await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const errs = coletar(page);
    const params = { mute: 1 };
    if (o.capitulo) params.solo = `${o.capitulo}:${p}`;
    await page.goto(comParams(url, params), { waitUntil: 'load', timeout: o.timeout || 60000 });
    const pronto = await esperarMotor(page, o.timeout || 60000);
    let info = null;
    if (pronto && o.capitulo) {
      await esperarFrames(page, o.capitulo);
      const kind = await page.evaluate((id) => (window.Imersao.chapters.find((c) => c.id === id) ? 'capitulo' : null), o.capitulo);
      if (!kind) await irPara(page, o.capitulo, p);
      await sleep(kind ? 700 : 1100);
      info = await page.evaluate((id) => window.Imersao.status().chapters.find((c) => c.id === id) || null, o.capitulo);
    } else await sleep(800);
    const outDir = dir ? path.join(dir, '.imersao', 'capturas') : path.join(os.tmpdir(), 'head-de-interacao', 'capturas');
    await ensureDir(outDir);
    const file = path.join(outDir, `${o.capitulo || 'topo'}-${String(p).replace('.', '_')}-${o.dispositivo || 'desktop'}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 70 });
    return { arquivo: file, url, pronto, info, erros: [...errs.pageErrors, ...errs.console, ...errs.http].slice(0, 6) };
  } finally { await browser.close().catch(() => {}); }
}

export async function lerImagem(file) {
  const buf = await fs.readFile(file);
  return { type: 'image', data: buf.toString('base64'), mimeType: 'image/jpeg' };
}
