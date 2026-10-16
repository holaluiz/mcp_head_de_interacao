// Transformação de sites existentes: lê o HTML (pasta, arquivo ou URL), mapeia
// seções, cores e fontes, e injeta o motor numa CÓPIA — revelações, contadores,
// botões magnéticos, galerias em cascata, índice, rolagem suave e um prólogo
// cinematográfico fixado — sem tocar no original. SPAs recebem um plano aplicado
// em tempo de execução (#im-plan) porque o DOM só existe depois do JavaScript.
import * as cheerio from 'cheerio';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderChapter } from './render.js';
import { derivePalette, parseHex, mix, contrast } from './palette.js';
import { fontStack, fontsHref, FONTES } from './fonts.js';
import { instalarMotor, instalarServidor } from './scaffold.js';
import { slug, esc, exists, isDir, listFiles, copyDir, rel, readJson, writeJson, writeText, ensureDir } from './util.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 HEAD-de-Interacao';
const ANIM_LIBS = '[data-aos],[data-scroll],[data-sal],[data-animate],.wow,.aos-init,.reveal,.gsap-reveal,[data-im-reveal]';
const SKIP_IN = 'nav,form,footer,button,select,label,.im-chapter,[data-im-chapter],script,style,noscript,svg,template';
const BUILD_DIRS = ['dist', 'build', 'out', path.join('.output', 'public'), 'public_html', '_site'];

/* ---------------------------------------------------------------- origem */
async function fetchText(url, ms = 15000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/css,*/*' }, redirect: 'follow', signal: ac.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
    return { text: await r.text(), url: r.url || url };
  } finally { clearTimeout(t); }
}

function detectarFramework(pkg) {
  const d = { ...(pkg && pkg.dependencies), ...(pkg && pkg.devDependencies) };
  if (d.next) return 'next';
  if (d.nuxt) return 'nuxt';
  if (d['@angular/core']) return 'angular';
  if (d['@sveltejs/kit']) return 'sveltekit';
  if (d.astro) return 'astro';
  if (d.gatsby) return 'gatsby';
  if (d['react-scripts']) return 'cra';
  if (d.vite) return d.react ? 'vite-react' : d.vue ? 'vite-vue' : d.svelte ? 'vite-svelte' : 'vite';
  if (d.react) return 'react';
  if (d.vue) return 'vue';
  return null;
}

/* Descobre o que transformar: site estático, build de SPA, fonte Vite/CRA ou URL. */
export async function resolverOrigem(origem, { pagina } = {}) {
  if (/^https?:\/\//i.test(origem)) {
    const { text, url } = await fetchText(origem);
    return { tipo: 'url', url, dir: null, pagina: 'index.html', html: text, notas: [] };
  }
  const abs = path.resolve(origem);
  if (!exists(abs)) throw new Error(`Origem não encontrada: ${abs}`);
  if (!isDir(abs)) {
    if (!/\.html?$/i.test(abs)) throw new Error('Informe uma pasta, um arquivo .html ou uma URL.');
    return { tipo: 'estatico', dir: path.dirname(abs), pagina: path.basename(abs), notas: [] };
  }
  const notas = [];
  const pkg = await readJson(path.join(abs, 'package.json'), null);
  const fw = detectarFramework(pkg);
  if (fw) {
    for (const b of BUILD_DIRS) {
      const bd = path.join(abs, b);
      if (exists(path.join(bd, 'index.html'))) {
        notas.push(`Projeto ${fw} detectado: transformando o build em ${b}/ (rode o build de novo antes, se estiver desatualizado).`);
        return { tipo: 'estatico', dir: bd, raiz: abs, framework: fw, pagina: pagina || 'index.html', notas };
      }
    }
    if (['vite', 'vite-react', 'vite-vue', 'vite-svelte'].includes(fw) && exists(path.join(abs, 'index.html'))) {
      notas.push(`Código-fonte ${fw} sem build: o motor vai para public/imersao/ e o index.html recebe um plano aplicado em tempo de execução.`);
      return { tipo: 'fonte', dir: abs, framework: fw, pagina: 'index.html', publicDir: 'public', notas };
    }
    if (fw === 'cra' && exists(path.join(abs, 'public', 'index.html'))) {
      notas.push('Código-fonte Create React App: o motor vai para public/imersao/ e public/index.html recebe o plano em tempo de execução.');
      return { tipo: 'fonte', dir: abs, framework: fw, pagina: path.join('public', 'index.html'), publicDir: 'public', notas };
    }
    return { tipo: 'sem-html', dir: abs, framework: fw, notas: [`Projeto ${fw} sem index.html estático nem build. Rode o build (npm run build) e transforme a pasta gerada, ou use o trecho de instalação manual devolvido.`] };
  }
  const htmls = (await listFiles(abs, { exts: ['.html', '.htm'], max: 400 })).filter((f) => !f.includes(`${path.sep}imersao${path.sep}`));
  if (!htmls.length) throw new Error(`Nenhum .html em ${abs}.`);
  let main = pagina ? path.join(abs, pagina) : htmls.find((f) => path.dirname(f) === abs && /^index\.html?$/i.test(path.basename(f))) || htmls.find((f) => /index\.html?$/i.test(f)) || htmls[0];
  if (!exists(main)) throw new Error(`Página não encontrada: ${main}`);
  return { tipo: 'estatico', dir: abs, pagina: rel(abs, main), notas, total: htmls.length };
}

async function lerCssLocal(dir, pageFile, $) {
  const parts = [];
  $('style').each((_, el) => parts.push($(el).text()));
  const hrefs = $('link[rel~="stylesheet"]').map((_, el) => $(el).attr('href')).get().filter(Boolean);
  for (const h of hrefs.slice(0, 8)) {
    if (/^(https?:)?\/\//i.test(h)) continue;
    const clean = h.split(/[?#]/)[0];
    const f = clean.startsWith('/') ? path.join(dir, clean) : path.join(path.dirname(pageFile), clean);
    try { const s = await fs.stat(f); if (s.size < 3e6) parts.push(await fs.readFile(f, 'utf8')); } catch { /* ausente */ }
  }
  return parts.join('\n');
}

async function lerCssRemoto(baseUrl, $) {
  const parts = [];
  $('style').each((_, el) => parts.push($(el).text()));
  const hrefs = $('link[rel~="stylesheet"]').map((_, el) => $(el).attr('href')).get().filter(Boolean).filter((h) => !/fonts\.googleapis/.test(h));
  for (const h of hrefs.slice(0, 4)) {
    try { parts.push((await fetchText(new URL(h, baseUrl).href, 8000)).text.slice(0, 2e6)); } catch { /* ignora */ }
  }
  return parts.join('\n');
}

/* ---------------------------------------------------------------- análise */
function hsl(hex) {
  const c = parseHex(hex);
  if (!c) return null;
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  return { s: d ? (l > 0.5 ? d / (2 - max - min) : d / (max + min)) : 0, l };
}
function normColor(v) {
  const s = String(v || '').trim();
  let m = s.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (m) { const x = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]; return '#' + x.toLowerCase(); }
  m = s.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)/i);
  if (m) {
    if (m[4] != null && parseFloat(m[4]) < (m[4].endsWith('%') ? 50 : 0.5)) return null;
    return '#' + [m[1], m[2], m[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('');
  }
  if (/^white$/i.test(s)) return '#ffffff';
  if (/^black$/i.test(s)) return '#000000';
  return null;
}
function declsFor(css, selRe) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) if (selRe.test(m[1])) out.push(m[2]);
  return out.join(';');
}
function prop(decls, name) {
  const re = new RegExp(`(?:^|;|\\s)${name}\\s*:\\s*([^;]+)`, 'gi');
  let m, last = null;
  while ((m = re.exec(decls))) last = m[1].trim();
  return last;
}

export function extrairEstilo(css, $) {
  const vars = {};
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;}{]+)/g)) { const c = normColor(m[2]); if (c) vars[m[1].toLowerCase()] = c; }
  const resolve = (v) => {
    if (!v) return null;
    const vm = String(v).match(/var\(\s*--([\w-]+)/);
    if (vm && vars[vm[1].toLowerCase()]) return vars[vm[1].toLowerCase()];
    return normColor(v);
  };
  const bodyD = declsFor(css, /(^|[\s,}])(html|body|:root)\s*(,|$)/i);
  const inlineBody = $('body').attr('style') || '';
  let bg = resolve(prop(inlineBody, 'background(?:-color)?')) || resolve(prop(bodyD, 'background-color')) || resolve(prop(bodyD, 'background'));
  let text = resolve(prop(inlineBody, 'color')) || resolve(prop(bodyD, 'color'));
  const freq = new Map();
  for (const m of css.matchAll(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)]+\)/gi)) { const c = normColor(m[0]); if (c) freq.set(c, (freq.get(c) || 0) + 1); }
  for (const el of $('[style]').toArray().slice(0, 400)) for (const m of String($(el).attr('style')).matchAll(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi)) { const c = normColor(m[0]); if (c) freq.set(c, (freq.get(c) || 0) + 1); }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  let accent = null;
  for (const [k, v] of Object.entries(vars)) if (/(accent|primary|primaria|brand|marca|destaque|highlight|main)/.test(k)) { const h = hsl(v); if (h && h.s > 0.3 && h.l > 0.2 && h.l < 0.82) { accent = v; break; } }
  if (!accent) accent = ranked.find((c) => { const h = hsl(c); return h && h.s > 0.38 && h.l > 0.22 && h.l < 0.78; }) || null;
  if (!bg) bg = ranked.find((c) => { const h = hsl(c); return h && h.s < 0.2 && (h.l > 0.93 || h.l < 0.1); }) || null;
  if (!text && bg) text = contrast(bg, '#000000') > contrast(bg, '#ffffff') ? '#111111' : '#f2f2f2';
  const theme = bg ? (hsl(bg).l > 0.5 ? 'light' : 'dark') : 'light';
  const darks = ranked.filter((c) => { const h = hsl(c); return h && h.l < 0.14; });

  const fam = (d) => { const v = prop(d, 'font-family'); const n = v ? v.split(',')[0].replace(/["']/g, '').trim() : null; return n && !/^(var\(|inherit|initial|unset|-apple-system|system-ui|sans-serif|serif|monospace)/i.test(n) ? n : null; };
  const gf = $('link[href*="fonts.googleapis"]').map((_, el) => $(el).attr('href')).get().join('&');
  const google = [...gf.matchAll(/family=([^:&]+)/g)].map((m) => decodeURIComponent(m[1].replace(/\+/g, ' ')));
  const body = fam(bodyD) || google[0] || null;
  const display = fam(declsFor(css, /(^|[\s,}])h1\b/i)) || fam(declsFor(css, /(^|[\s,}])h2\b/i)) || google[1] || body;
  return { bg, text, accent, theme, escuro: darks[0] || null, frequentes: ranked.slice(0, 10), vars: Object.keys(vars).length, fontes: { display, body, google } };
}

function textoDe($, el) { return $(el).clone().find('script,style,noscript,svg').remove().end().text().replace(/\s+/g, ' ').trim(); }

export function cssPath($, el) {
  const parts = [];
  let cur = el;
  while (cur && cur.type === 'tag' && cur.tagName !== 'html') {
    const $c = $(cur);
    const id = $c.attr('id');
    if (id && /^[A-Za-z][\w-]*$/.test(id) && $(`[id="${id}"]`).length === 1) { parts.unshift(`#${id}`); break; }
    if (cur.tagName === 'body') { parts.unshift('body'); break; }
    const sibs = $c.parent().children(cur.tagName);
    parts.unshift(sibs.length > 1 ? `${cur.tagName}:nth-of-type(${sibs.index(cur) + 1})` : cur.tagName);
    cur = cur.parent;
  }
  return parts.join(' > ');
}

function secoesCandidatas($) {
  const isContent = (el) => !['script', 'style', 'noscript', 'link', 'template', 'meta', 'svg', 'br', 'hr'].includes(el.tagName) && (textoDe($, el).length > 8 || $(el).find('img,picture,video,canvas,iframe').length > 0);
  let secs = $('section, [role="region"]').toArray().filter((el) => !$(el).parents('section,[role="region"]').length && !$(el).closest('nav,footer').length);
  if (secs.length < 2) {
    let box = $('main').first();
    if (!box.length) {
      box = $('body');
      for (let i = 0; i < 6; i++) {
        const kids = box.children().toArray().filter(isContent);
        if (kids.length === 1 && ['div', 'main', 'article'].includes(kids[0].tagName)) box = $(kids[0]); else break;
      }
    }
    secs = box.children().toArray().filter((el) => isContent(el) && !['nav', 'footer', 'header'].includes(el.tagName) || (el.tagName === 'header' && $(el).find('h1').length));
  }
  return secs;
}

const NUM_RE = /^([^\d\s]{0,4}\s?)([\d]{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(\s?[^\d\s]{0,12}(?:\s\w{1,10})?)$/;
export function lerNumero(txt) {
  const t = String(txt || '').replace(/\u00a0/g, ' ').trim();
  if (t.length > 22) return null;
  const m = t.match(NUM_RE);
  if (!m) return null;
  let raw = m[2], dec = 0;
  if (/^(19|20)\d{2}$/.test(raw) && !m[1] && !m[3].trim()) return null;
  if (/^0\d/.test(raw)) return null;
  const decM = raw.match(/[.,](\d{1,2})$/);
  if (decM && !/[.,]\d{3}$/.test(raw)) { dec = decM[1].length; raw = raw.slice(0, -decM[0].length).replace(/[.,\s]/g, '') + '.' + decM[1]; }
  else raw = raw.replace(/[.,\s]/g, '');
  const v = parseFloat(raw);
  if (!Number.isFinite(v) || v === 0) return null;
  return { valor: v, prefixo: m[1], sufixo: m[3], decimais: dec };
}

function classificar($, el, i) {
  const $s = $(el);
  const cls = `${$s.attr('class') || ''} ${$s.attr('id') || ''}`.toLowerCase();
  const txt = textoDe($, el);
  const imgs = $s.find('img,picture,video').length;
  const nums = $s.find('h2,h3,h4,strong,b,span,dt,dd,p,div').toArray().filter((n) => !$(n).children().length && lerNumero($(n).text())).length;
  if (el.tagName === 'footer' || /footer|rodape|rodapé/.test(cls)) return 'rodape';
  if (i === 0 || $s.find('h1').length || /hero|banner|capa|intro|jumbotron|masthead/.test(cls)) return 'hero';
  if ($s.find('form').length) return 'formulario';
  if ($s.find('details').length >= 2 || /faq|duvidas|dúvidas|perguntas/.test(cls)) return 'faq';
  if ($s.find('blockquote').length || /testimonial|depoimento|review|avalia/.test(cls)) return 'depoimentos';
  if (/pric|preco|preço|plano|plans|pacote/.test(cls) || (txt.match(/(R\$|US\$|\$|€|£)\s?\d/g) || []).length >= 2) return 'precos';
  if (nums >= 2 && txt.length < 600) return 'numeros';
  if (imgs >= 5 && txt.length < 200 || /logo|client|parceir|partner|marcas/.test(cls) && imgs >= 3) return 'logos';
  if (imgs >= 3) return 'galeria';
  return 'texto';
}

function detectarSpa($, html) {
  const txt = textoDe($, $('body').get(0) || $.root().get(0));
  const root = $('#root,#app,#__next,#__nuxt,#svelte,app-root,[data-reactroot]').first();
  const motivos = [];
  if (/__NEXT_DATA__|\/_next\//.test(html)) motivos.push('Next.js');
  if (/\/_nuxt\//.test(html)) motivos.push('Nuxt');
  if (root.length && textoDe($, root.get(0)).length < 60) motivos.push(`contêiner ${root.attr('id') ? '#' + root.attr('id') : root.get(0).tagName} vazio`);
  if (txt.length < 140 && $('script[type="module"],script[src]').length) motivos.push('quase sem texto no HTML (renderizado por JavaScript)');
  const spa = motivos.length > 0 && txt.length < 400;
  return { spa, motivos, raiz: root.length ? (root.attr('id') ? `#${root.attr('id')}` : root.get(0).tagName) : null };
}

function detectarScroll(html) {
  const libs = [];
  if (/lenis/i.test(html)) libs.push('Lenis');
  if (/locomotive-scroll|LocomotiveScroll/i.test(html)) libs.push('Locomotive Scroll');
  if (/ScrollSmoother/i.test(html)) libs.push('GSAP ScrollSmoother');
  if (/smooth-scrollbar|Scrollbar\.init/i.test(html)) libs.push('smooth-scrollbar');
  const anim = [];
  if (/gsap|ScrollTrigger/i.test(html)) anim.push('GSAP');
  if (/\baos(\.js|\.css|\.init)|data-aos/i.test(html)) anim.push('AOS');
  if (/wow(\.min)?\.js|class="[^"]*\bwow\b/i.test(html)) anim.push('WOW.js');
  if (/framer-motion|data-framer/i.test(html)) anim.push('Framer Motion');
  return { suave: libs, animacao: anim };
}

export function analisarDocumento($, html, { css = '' } = {}) {
  const estilo = extrairEstilo(css, $);
  const titulo = $('title').first().text().trim();
  const og = $('meta[property="og:site_name"]').attr('content');
  const logoAlt = $('header img[alt], nav img[alt], [class*="logo"] img[alt]').first().attr('alt');
  const doTitulo = titulo.split(/\s[|–—-]\s/)[0].trim();
  const curto = logoAlt && logoAlt.length >= 2 && logoAlt.length < doTitulo.length && doTitulo.toLowerCase().includes(logoAlt.toLowerCase()) ? logoAlt : null;
  const marca = (og || curto || doTitulo || logoAlt || $('h1').first().text() || 'Site').trim().slice(0, 40);
  const descricao = ($('meta[name="description"]').attr('content') || '').trim();
  const spa = detectarSpa($, html);
  const scroll = detectarScroll(html);
  const secs = secoesCandidatas($);
  const secoes = secs.map((el, i) => {
    const $s = $(el);
    const h = $s.find('h1,h2,h3').first();
    const tipo = classificar($, el, i);
    const img = $s.find('img[src]').toArray().map((x) => $(x).attr('src')).find((s) => s && !/\.svg(\?|$)/i.test(s) && !/^data:/.test(s)) || null;
    const bgM = String($s.attr('style') || '').match(/url\(["']?([^"')]+)["']?\)/);
    return {
      seletor: cssPath($, el), tag: el.tagName, tipo,
      titulo: h.length ? textoDe($, h.get(0)).slice(0, 90) : null,
      imagens: $s.find('img,picture,video').length, paragrafos: $s.find('p').length, formularios: $s.find('form').length,
      imagemPrincipal: img || (bgM ? bgM[1] : null),
    };
  });
  const heroIdx = secoes.findIndex((s) => s.tipo === 'hero');
  const heroEl = heroIdx >= 0 ? secs[heroIdx] : secs[0];
  const $h = heroEl ? $(heroEl) : null;
  const hero = $h ? {
    seletor: cssPath($, heroEl),
    titulo: $h.find('h1,h2').first().length ? textoDe($, $h.find('h1,h2').first().get(0)).slice(0, 110) : null,
    subtitulo: $h.find('p').first().length ? textoDe($, $h.find('p').first().get(0)).slice(0, 160) : null,
    imagem: secoes[heroIdx >= 0 ? heroIdx : 0] ? secoes[heroIdx >= 0 ? heroIdx : 0].imagemPrincipal : null,
    video: $h.find('video[src], video source[src]').first().attr('src') || null,
  } : null;
  return {
    titulo, marca, descricao, idioma: $('html').attr('lang') || 'pt-BR',
    spa, scroll, estilo, hero, secoes,
    totais: { secoes: secoes.length, titulos: $('h1,h2,h3').length, paragrafos: $('p').length, imagens: $('img').length, formularios: $('form').length, botoes: $('a[class*="btn"],a[class*="button"],button').length },
  };
}

/* Mapa de imersão: o que cada seção recebe, legível para o usuário. */
export function mapaDeImersao(an, intensidade = 'media') {
  const alta = intensidade === 'alta', sutil = intensidade === 'sutil';
  const T = {
    hero: 'Entrada: título e texto sobem ao carregar; antes dele, um prólogo fixado (partículas formando a marca ou a imagem do herói se montando em fragmentos).',
    texto: sutil ? 'Títulos revelam ao entrar.' : `Títulos revelam ${alta ? 'com máscara' : 'subindo'}; parágrafos sobem em sequência.`,
    galeria: `Imagens entram em cascata${alta ? ', cards inclinam com o cursor, imagens grandes ganham parallax' : ''}.`,
    numeros: 'Números sobem de zero quando aparecem (prefixo/sufixo preservados).',
    depoimentos: 'Depoimentos entram em cascata.',
    precos: 'Planos entram em cascata; botões magnéticos.',
    formulario: 'Formulário intocado (é real): só o botão fica magnético.',
    faq: 'Perguntas revelam em sequência.',
    logos: alta ? 'Logos viram uma faixa em movimento contínuo que acelera com o scroll.' : 'Logos entram em cascata.',
    rodape: 'Sem alterações.',
  };
  return an.secoes.map((s) => ({ seletor: s.seletor, tipo: s.tipo, titulo: s.titulo, tratamento: T[s.tipo] || T.texto }));
}

/* ---------------------------------------------------------------- aplicação */
function marcar($, el, attrs, motivo, log) {
  const $e = $(el);
  const set = {};
  for (const [k, v] of Object.entries(attrs)) if ($e.attr(k) == null) { $e.attr(k, String(v)); set[k] = v; }
  if (Object.keys(set).length) log.push({ seletor: cssPath($, el), attrs: set, motivo });
}

function containersDeGrade($, root) {
  const found = [];
  $(root).find('div,ul,ol,section,article').each((_, el) => {
    const kids = $(el).children().toArray().filter((k) => !['script', 'style', 'br'].includes(k.tagName));
    if (kids.length < 3 || kids.length > 24) return;
    const sig = (k) => `${k.tagName}.${($(k).attr('class') || '').split(/\s+/).filter(Boolean).sort().slice(0, 2).join('.')}`;
    const counts = new Map();
    for (const k of kids) counts.set(sig(k), (counts.get(sig(k)) || 0) + 1);
    const best = Math.max(...counts.values());
    if (best >= 3 && best / kids.length >= 0.6 && kids.every((k) => textoDe($, k).length > 2 || $(k).find('img,picture,video').length)) found.push(el);
  });
  return found.filter((el) => !found.some((o) => o !== el && $(el).parents().toArray().includes(o)));
}

export function aplicarTratamentos($, an, { intensidade = 'media', principal = true } = {}) {
  const log = [];
  const alta = intensidade === 'alta', sutil = intensidade === 'sutil';
  const secs = secoesCandidatas($);
  const skip = (el) => $(el).closest(SKIP_IN).length > 0 || $(el).is(ANIM_LIBS) || $(el).closest(ANIM_LIBS).length > 0;
  const emGrupo = (el) => $(el).closest('[data-im-stagger],[data-im-marquee]').length > 0;
  let rotulos = 0, paras = 0;
  secs.forEach((el, i) => {
    const tipo = classificar($, el, i);
    if (tipo === 'rodape') return;
    const h = $(el).find('h1,h2,h3').first();
    if (!sutil && h.length && !$(el).attr('data-im-label')) {
      const full = textoDe($, h.get(0));
      const label = full.length > 28 ? full.slice(0, 28).replace(/\s+\S*$/, '') + '…' : full;
      if (label) { marcar($, el, { 'data-im-label': i === 0 && tipo === 'hero' ? (an.idioma.startsWith('en') ? 'Home' : 'Início') : label }, 'rótulo para o índice de capítulos', log); rotulos++; }
    }
    // grades primeiro: os filhos entram em cascata, então não recebem revelação própria
    let marquee = false;
    if (tipo === 'logos' && alta) {
      const box = containersDeGrade($, el)[0];
      if (box && !skip(box)) { marcar($, box, { 'data-im-marquee': '30' }, 'faixa de logos em movimento', log); marquee = true; }
    }
    if (!marquee) {
      for (const box of containersDeGrade($, el).slice(0, 6)) {
        if (skip(box) || emGrupo(box)) continue;
        marcar($, box, { 'data-im-stagger': '90' }, 'itens entram em cascata', log);
        if (alta) $(box).children().each((_, k) => { if ($(k).find('img,picture').length && textoDe($, k).length > 2) marcar($, k, { 'data-im-tilt': '4', 'data-im-hover-card': '' }, 'card inclina com o cursor', log); });
      }
    }
    $(el).find('h1,h2,h3').each((_, hd) => {
      if (skip(hd) || emGrupo(hd)) return;
      marcar($, hd, { 'data-im-reveal': alta && hd.tagName !== 'h1' ? 'mask' : 'rise' }, 'título revela ao entrar', log);
    });
    if (!sutil) {
      $(el).find('p').each((_, p) => {
        if (paras >= 90 || skip(p) || emGrupo(p) || textoDe($, p).length < 24) return;
        marcar($, p, { 'data-im-reveal': 'rise' }, 'parágrafo sobe ao entrar', log); paras++;
      });
    }
    $(el).find('h2,h3,h4,strong,b,span,dt,dd,p,div').each((_, n) => {
      if ($(n).children().length || skip(n) || tipo === 'precos' || $(n).closest('table,form,nav,footer').length) return;
      const num = lerNumero($(n).text());
      if (!num || /^[(]?\d{2}[)]?\s?\d{4,5}/.test($(n).text().trim())) return;
      marcar($, n, { 'data-im-count': num.valor, ...(num.prefixo ? { 'data-im-prefix': num.prefixo } : {}), ...(num.sufixo ? { 'data-im-suffix': num.sufixo } : {}), ...(num.decimais ? { 'data-im-decimals': num.decimais } : {}) }, 'número sobe ao aparecer', log);
    });
    if (alta && tipo !== 'hero') {
      $(el).find('img').each((_, im) => {
        const box = $(im).parent();
        const wide = Number($(im).attr('width')) >= 900 || /hero|cover|banner|full|wide/i.test(`${$(im).attr('class') || ''} ${box.attr('class') || ''}`);
        if (wide && !skip(im) && !$(im).closest('[data-im-stagger],[data-im-marquee]').length) marcar($, im, { 'data-im-parallax': '0.08' }, 'parallax suave em imagem larga', log);
      });
    }
  });
  if (!sutil) {
    $('a[class*="btn"],a[class*="button"],a[class*="cta"],button[class*="btn"],button[type="submit"],[role="button"]').slice(0, 24).each((_, b) => {
      if ($(b).closest('nav,.im-chapter').length && !/btn|cta/i.test($(b).attr('class') || '')) return;
      marcar($, b, { 'data-im-magnetic': '0.22' }, 'botão magnético', log);
    });
  }
  return { log, rotulos, principal };
}

/* Plano genérico aplicado em tempo de execução (SPA/código-fonte). */
export function planoRuntime(intensidade = 'media') {
  const alta = intensidade === 'alta', sutil = intensidade === 'sutil';
  const notAnim = ':not([data-aos]):not([data-scroll]):not(.wow)';
  const rules = [
    { sel: `main h2${notAnim}, section h2${notAnim}`, attrs: { 'data-im-reveal': alta ? 'mask' : 'rise' } },
    { sel: `main h3${notAnim}, section h3${notAnim}`, attrs: { 'data-im-reveal': 'rise' } },
  ];
  if (!sutil) {
    rules.push({ sel: `main p${notAnim}, section p${notAnim}`, attrs: { 'data-im-reveal': 'rise' } });
    rules.push({ sel: 'a[class*="btn"], a[class*="button"], button[class*="btn"], button[type="submit"]', attrs: { 'data-im-magnetic': '0.22' } });
  }
  if (alta) rules.push({ sel: '[class*="card"]:has(img)', attrs: { 'data-im-tilt': '4' } });
  return { rules };
}

function tokensPonte(an, opts) {
  const e = an.estilo;
  const accent = opts.acento || e.accent || '#C9A24B';
  const dark = opts.fundo_capitulos || (e.theme === 'dark' && e.bg ? e.bg : e.escuro && hsl(e.escuro).l < 0.1 ? e.escuro : '#07070a');
  const pal = derivePalette({ bg: dark, text: '#F2EFEA', accent });
  const fDisp = opts.fonte_display || e.fontes.display;
  const fBody = opts.fonte_texto || e.fontes.body;
  return { pal, fDisp, fBody, accent };
}

export function cssPonte(an, opts = {}) {
  const { pal, fDisp, fBody } = tokensPonte(an, opts);
  return `/* Ponte entre o site original e o motor de imersão — gerado pelo HEAD de Interação.
   Os capítulos inseridos (prólogo, manifesto) usam um palco escuro próprio;
   o resto do site mantém o visual original. Ajuste à vontade. */
:root {
  --im-accent: ${pal.accent};
  --im-accent-2: ${pal.accent2};
  --im-bg: ${pal.bg};
${fDisp ? `  --im-font-display: ${fontStack(fDisp, 'display')};\n` : ''}${fBody ? `  --im-font-body: ${fontStack(fBody, 'body')};\n` : ''}}
.im-chapter {
  --im-bg: ${pal.bg}; --im-stage-bg: ${pal.bg}; --im-surface: ${pal.surface};
  --im-text: ${pal.text}; --im-muted: ${pal.muted}; --im-line: ${pal.line};
  color: var(--im-text); font-family: var(--im-font-body); line-height: 1.5; text-align: left;
}
/* Blindagem: regras genéricas do site (section { padding }, p { color }…) não entram no palco. */
.im-chapter.im-chapter { display: block !important; padding: 0 !important; margin-top: 0 !important; margin-bottom: 0 !important; max-width: none !important; min-height: 0 !important; border: 0 !important; border-radius: 0 !important; background: none !important; box-shadow: none !important; overflow: visible !important; }
.im-chapter.im-chapter:not(.im-chapter--bleed) { margin-left: 0 !important; margin-right: 0 !important; width: auto !important; }
.im-chapter--bleed.im-chapter--bleed { width: 100vw !important; margin-left: calc(50% - 50vw) !important; margin-right: 0 !important; }
.im-chapter .im-stage { padding: 0; margin: 0; }
.im-chapter p, .im-chapter h1, .im-chapter h2, .im-chapter h3 { margin: 0; }
.im-chapter .im-display, .im-chapter .im-h2 { font-family: var(--im-font-display); }
`;
}

function prologoSpec(an, opts, ctx) {
  const en = String(an.idioma).toLowerCase().startsWith('en');
  const p = opts.prologo || {};
  const tipo = p.tipo || (opts.intensidade === 'alta' && an.hero && an.hero.imagem ? 'estilhacos' : 'particulas');
  if (tipo === 'nenhum') return null;
  let media;
  const img = p.imagem || (an.hero && an.hero.imagem);
  if (tipo === 'frames') media = { kind: 'frames', seq: p.seq || 'prologo', fallback: 'procedural:particles', ...(img ? { shatterFallback: img } : {}) };
  else if (tipo === 'estilhacos' && img) media = { kind: 'shatter', src: img, keys: [[0, 1.05], [0.62, 0], [1, 0]], grid: '14x8', cam: [[0, { s: 1.12 }], [1, { s: 1 }]] };
  else if (tipo === 'imagem' && img) media = { kind: 'image', src: img, cam: [[0, { s: 1.25, b: 6 }], [0.5, { s: 1.08, b: 0 }], [1, { s: 1 }]] };
  else if (tipo === 'video' && p.video) media = { kind: 'video', src: p.video };
  else media = { kind: 'procedural', preset: 'particles', options: { text: p.texto_particulas || ctx.brand } };
  const titulo = p.titulo || ctx.brand;
  const sub = p.subtitulo || an.descricao || (an.hero && an.hero.titulo !== titulo ? an.hero.titulo : '') || '';
  const T = (cls, text, a, b, anim = 'fade', tag = 'p') => ({ type: 'text', tag, cls, text, in: a, out: b, anim });
  // As partículas já escrevem a marca; nas outras mídias o nome entra como tipografia.
  // Nunca h1: o site original já tem o seu.
  const centro = media.kind === 'procedural'
    ? [T('overline', p.sobretitulo || (en ? 'Welcome' : 'Bem-vindo'), 0.04, 0.36)]
    : [T('overline', p.sobretitulo || (en ? 'Welcome' : 'Bem-vindo'), 0.04, 0.5), T('display', titulo, 0, 0.55, 'track')];
  return {
    id: 'prologo', type: 'cinema', label: p.rotulo || (en ? 'Prologue' : 'Prólogo'), length: p.telas || 2.6, lerp: 0.12,
    media,
    sound: opts.som === false ? null : 'air',
    hits: opts.som === false ? null : [{ preset: 'whoosh', at: 0.58 }],
    groups: [
      { pos: media.kind === 'procedural' ? 'top-center' : 'center', items: centro },
      ...(sub ? [{ pos: 'bottom-left', items: [T('lead', sub.length > 140 ? sub.slice(0, 137).replace(/\s+\S*$/, '') + '…' : sub, 0.58, 1, 'rise')] }] : []),
      { pos: 'bottom-center', items: [{ type: 'scrollcue', text: en ? 'Scroll' : 'Role', in: 0, out: 0.14 }] },
    ],
  };
}

function manifestoSpec(linhas, an) {
  if (!linhas || !linhas.length) return null;
  return { id: 'manifesto', type: 'lines', label: String(an.idioma).startsWith('en') ? 'Manifesto' : 'Manifesto', length: Math.max(2.5, linhas.length * 0.8), mode: 'stack', lines: linhas, media: { kind: 'procedural', preset: 'dust' } };
}

function absolutizar($, base) {
  const fix = (v) => { try { return v && !/^(data:|mailto:|tel:|javascript:|#)/i.test(v) ? new URL(v, base).href : v; } catch { return v; } };
  for (const [sel, at] of [['[src]', 'src'], ['link[href]', 'href'], ['a[href]', 'href'], ['[poster]', 'poster'], ['form[action]', 'action'], ['[data-src]', 'data-src'], ['source[src]', 'src']]) $(sel).each((_, el) => { $(el).attr(at, fix($(el).attr(at))); });
  for (const at of ['srcset', 'data-srcset']) $(`[${at}]`).each((_, el) => { $(el).attr(at, String($(el).attr(at)).split(',').map((part) => { const [u, ...rest] = part.trim().split(/\s+/); return [fix(u), ...rest].join(' '); }).join(', ')); });
  const fixCss = (css) => css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => `url(${q}${fix(u)}${q})`);
  $('[style]').each((_, el) => { $(el).attr('style', fixCss($(el).attr('style'))); });
  $('style').each((_, el) => { $(el).text(fixCss($(el).text())); });
  $('base').remove();
}

function injetarCabeca($, prefixo, comFontes) {
  const head = $('head');
  if (comFontes) head.append(`\n<link rel="stylesheet" href="${esc(comFontes)}">`);
  head.append(`\n<link rel="stylesheet" href="${prefixo}imersao/imersao.css" data-im-injetado>\n<link rel="stylesheet" href="${prefixo}imersao/ponte.css" data-im-injetado>\n`);
}

function injetarCorpo($, prefixo, { indice, progresso, botaoSom, plano }) {
  const body = $('body');
  const add = [];
  if (progresso) add.push('<div class="im-progress" aria-hidden="true" data-im-injetado><i></i></div>');
  if (indice) add.push(`<nav class="im-index" data-im-index aria-label="Seções" data-im-injetado></nav>`);
  if (botaoSom) add.push('<button class="im-sound" type="button" data-im-sound-toggle data-im-injetado></button>');
  if (plano) add.push(`<script type="application/json" id="im-plan">${JSON.stringify(plano).replace(/</g, '\\u003c')}</script>`);
  add.push(`<script src="${prefixo}imersao/vendor/lenis.min.js" defer data-im-injetado></script>`, `<script src="${prefixo}imersao/imersao.js" defer data-im-injetado></script>`);
  body.append('\n' + add.join('\n') + '\n');
}

function atributosCorpo($, an, opts) {
  const alta = opts.intensidade === 'alta', sutil = opts.intensidade === 'sutil';
  const body = $('body');
  const suave = opts.suave === false || opts.suave === 0 || an.scroll.suave.length ? 'off' : String(opts.suave || 0.1);
  const at = { 'data-im-root': '', 'data-im-brand': opts.marca || an.marca, 'data-im-smooth': suave, 'data-im-manifest': 'imersao.manifest.json' };
  const cursor = opts.cursor || (sutil ? null : 'ring');
  if (cursor && cursor !== 'none') at['data-im-cursor'] = cursor;
  if (opts.grao ?? alta) at['data-im-grain'] = '';
  if (opts.vinheta) at['data-im-vignette'] = '';
  for (const [k, v] of Object.entries(at)) if (body.attr(k) == null) body.attr(k, v);
}

/* Transforma uma página carregada no cheerio. Devolve o HTML e o registro. */
export function transformarPagina(html, an, opts) {
  const $ = cheerio.load(html);
  const notas = [];
  if ($('[data-im-root]').length || $('script[src*="imersao/imersao.js"]').length) notas.push('A página já tinha o motor; atributos existentes foram mantidos.');
  if (opts.baseUrl) absolutizar($, opts.baseUrl);
  const prefixo = opts.prefixo;
  const ctx = { lang: an.idioma, brand: opts.marca || an.marca, currency: an.idioma.startsWith('en') ? 'USD' : 'BRL', fallbackPreset: 'particles' };
  const usaRuntime = opts.modo === 'runtime';
  let resultado = { log: [], rotulos: 0 };
  if (!usaRuntime) resultado = aplicarTratamentos($, an, { intensidade: opts.intensidade, principal: opts.principal });
  const capitulos = [];
  if (opts.principal) {
    const pro = prologoSpec(an, opts, ctx);
    if (pro) capitulos.push({ ch: pro, onde: 'antes-hero' });
    const man = manifestoSpec(opts.manifesto, an);
    if (man) capitulos.push({ ch: man, onde: 'depois-hero' });
    for (const extra of opts.capitulos || []) capitulos.push({ ch: extra.capitulo || extra, onde: extra.antes_de ? `antes:${extra.antes_de}` : extra.depois_de ? `depois:${extra.depois_de}` : 'fim-main' });
  }
  const plano = usaRuntime ? planoRuntime(opts.intensidade) : null;
  let anterior = null;
  for (const { ch, onde } of capitulos) {
    const htmlCh = renderChapter(ch, ctx);
    if (usaRuntime) {
      // Fora da raiz do framework: o React/Vue não remove irmãos do #root.
      const alvo = an.spa.raiz && an.spa.raiz.startsWith('#') ? an.spa.raiz : null;
      plano.insert = plano.insert || [];
      plano.insert.push(alvo ? { id: ch.id, before: alvo, html: htmlCh } : anterior ? { id: ch.id, after: `#${anterior}`, html: htmlCh } : { id: ch.id, prepend: 'body', html: htmlCh });
      anterior = ch.id;
      continue;
    }
    // O prólogo vai como filho direto do <body> (antes do bloco que contém o
    // herói): fora de contêineres com largura limitada ou overflow próprio.
    const heroSel = an.hero && an.hero.seletor;
    const hero = heroSel ? $(heroSel).first() : null;
    const topo = (el) => { const anc = el.parentsUntil('body'); return anc.length ? anc.last() : el; };
    let target = null, metodo = 'before';
    if (onde.startsWith('antes:') || onde.startsWith('depois:')) { target = $(onde.slice(onde.indexOf(':') + 1)).first(); metodo = onde.startsWith('antes:') ? 'before' : 'after'; }
    else if (onde === 'antes-hero' && hero && hero.length) {
      target = anterior && $(`#${anterior}`).length ? $(`#${anterior}`) : topo(hero);
      metodo = anterior && $(`#${anterior}`).length ? 'after' : 'before';
    } else if (onde === 'depois-hero' && hero && hero.length) { target = hero; metodo = 'after'; }
    else if (onde === 'fim-main') { const f = $('body > footer').last(); if (f.length) { target = f; metodo = 'before'; } }
    if (!target || !target.length) { target = $('body'); metodo = onde === 'antes-hero' ? 'prepend' : 'append'; }
    const bleed = metodo === 'prepend' || metodo === 'append' ? !target.is('body') : !target.parent().is('body');
    target[metodo](`\n${bleed ? htmlCh.replace('class="im-chapter', 'class="im-chapter im-chapter--bleed') : htmlCh}\n`);
    anterior = ch.id;
    resultado.log.push({ seletor: `#${ch.id}`, attrs: { capitulo: ch.type }, motivo: `capítulo "${ch.label || ch.id}" inserido (${metodo} ${target.is('body') ? 'body' : cssPath($, target.get(0))})` });
  }
  atributosCorpo($, an, opts);
  const fontes = opts.fontes_google ? fontsHref(opts.fontes_google) : null;
  injetarCabeca($, prefixo, fontes);
  const temSom = opts.som !== false && capitulos.some(({ ch }) => ch.sound || (ch.hits && ch.hits.length));
  injetarCorpo($, prefixo, { indice: opts.intensidade !== 'sutil' && (usaRuntime ? capitulos.length >= 3 : resultado.rotulos + capitulos.length >= 3), progresso: opts.intensidade !== 'sutil', botaoSom: temSom, plano });
  return { html: $.html(), log: resultado.log, notas, capitulos: capitulos.map((c) => c.ch), plano };
}

/* ---------------------------------------------------------------- orquestração */
export async function analisarOrigem(origem, { pagina } = {}) {
  const o = await resolverOrigem(origem, { pagina });
  if (o.tipo === 'sem-html') return { origem: o, analise: null };
  let html, css = '';
  if (o.tipo === 'url') {
    html = o.html;
    const $ = cheerio.load(html);
    css = await lerCssRemoto(o.url, $);
    return { origem: o, analise: analisarDocumento($, html, { css }), html };
  }
  const file = path.join(o.dir, o.pagina);
  html = await fs.readFile(file, 'utf8');
  const $ = cheerio.load(html);
  css = await lerCssLocal(o.publicDir ? path.join(o.dir, o.publicDir) : o.dir, file, $);
  return { origem: o, analise: analisarDocumento($, html, { css }), html };
}

export function trechoManual(intensidade = 'media', marca = 'Site') {
  return `<!-- No <head> -->
<link rel="stylesheet" href="/imersao/imersao.css">
<!-- Antes de </body> (copie a pasta imersao/ para public/) -->
<script type="application/json" id="im-plan">${JSON.stringify(planoRuntime(intensidade))}</script>
<script src="/imersao/vendor/lenis.min.js" defer></script>
<script src="/imersao/imersao.js" defer></script>
<!-- No <body>: data-im-root data-im-brand="${marca}" data-im-cursor="ring" data-im-smooth="0.1" -->`;
}

export async function transformarSite(o) {
  const { origem, analise: an, html: htmlPrincipal } = await analisarOrigem(o.origem, { pagina: o.pagina });
  if (!an) return { ok: false, origem, mensagem: origem.notas.join(' ') + '\n\n' + trechoManual(o.intensidade, path.basename(origem.dir)) };
  const intensidade = o.intensidade || 'media';
  let saida = o.saida ? path.resolve(o.saida) : null;
  if (!saida) {
    if (origem.tipo === 'url') saida = path.join(os.homedir(), 'HEAD-de-Interacao', `${slug(new URL(origem.url).hostname)}-imersivo`);
    else { const base = origem.raiz || origem.dir; saida = path.join(path.dirname(base), `${path.basename(base)}-imersivo`); }
  }
  const src = origem.dir;
  if (src && (saida === src || saida.startsWith(src + path.sep))) throw new Error('A saída não pode ficar dentro da origem (a transformação é sempre numa cópia).');
  if (exists(path.join(saida, '.imersao', 'transformacao.json')) && !o.sobrescrever) throw new Error(`Já existe uma transformação em ${saida}. Use sobrescrever: true para refazer a partir do original (frames/, media/ e o manifesto são mantidos).`);
  if (exists(saida) && !exists(path.join(saida, '.imersao')) && (await fs.readdir(saida)).length) throw new Error(`${saida} já existe e não é uma transformação. Escolha outra "saida".`);
  await ensureDir(saida);
  let copiados = 0;
  if (origem.tipo !== 'url') copiados = await copyDir(src, saida);
  const raizServida = origem.tipo === 'fonte' ? path.join(saida, origem.publicDir) : saida;
  await instalarMotor(raizServida);
  const opts = { ...o, intensidade, marca: o.marca || an.marca };
  const tokens = tokensPonte(an, o);
  await writeText(path.join(raizServida, 'imersao', 'ponte.css'), cssPonte(an, o));
  const manPath = path.join(raizServida, 'imersao.manifest.json');
  if (!exists(manPath)) await writeJson(manPath, { version: 1, sequences: {} });
  for (const d of ['frames', 'media/brutos']) await ensureDir(path.join(raizServida, d));

  const paginas = [];
  if (origem.tipo === 'url') paginas.push({ arquivo: path.join(saida, 'index.html'), html: htmlPrincipal, principal: true, baseUrl: origem.url });
  else {
    const todas = origem.tipo === 'fonte' ? [path.join(saida, origem.pagina)] : (await listFiles(saida, { exts: ['.html', '.htm'], max: o.max_paginas || 60 })).filter((f) => !f.includes(`${path.sep}imersao${path.sep}`) && !f.includes(`${path.sep}.imersao${path.sep}`));
    const mainFile = path.join(saida, origem.pagina);
    for (const f of todas) paginas.push({ arquivo: f, html: await fs.readFile(f, 'utf8'), principal: path.resolve(f) === path.resolve(mainFile) });
  }

  const relatorio = [];
  const capitulosInseridos = [];
  for (const pg of paginas) {
    let anP = an;
    if (!pg.principal) { const $p = cheerio.load(pg.html); anP = { ...analisarDocumento($p, pg.html, { css: '' }), estilo: an.estilo, marca: an.marca }; }
    const modo = origem.tipo === 'fonte' || anP.spa.spa ? 'runtime' : 'estatico';
    const prefixo = origem.tipo === 'fonte' ? '/' : (() => { const r = rel(path.dirname(pg.arquivo), raizServida); return r ? r + '/' : ''; })();
    const r = transformarPagina(pg.html, anP, { ...opts, prefixo, principal: pg.principal, modo, baseUrl: pg.baseUrl });
    await writeText(pg.arquivo, r.html);
    relatorio.push({ pagina: rel(saida, pg.arquivo), modo, alteracoes: r.log.length, log: r.log, notas: r.notas });
    if (pg.principal) capitulosInseridos.push(...r.capitulos);
  }
  const cfg = await instalarServidor(raizServida, slug(opts.marca));
  const registro = { quando: new Date().toISOString(), origem: origem.tipo === 'url' ? origem.url : (origem.raiz || origem.dir), tipo: origem.tipo, framework: origem.framework || null, intensidade, opcoes: { ...o, origem: undefined }, analise: { marca: an.marca, spa: an.spa, scroll: an.scroll, estilo: an.estilo, hero: an.hero }, paginas: relatorio.map(({ log, ...x }) => x), capitulos: capitulosInseridos };
  await writeJson(path.join(raizServida, '.imersao', 'transformacao.json'), registro);
  const md = relatorioMarkdown({ saida, raizServida, origem, an, intensidade, relatorio, capitulosInseridos, cfg, copiados, tokens });
  await writeText(path.join(raizServida, 'IMERSAO.md'), md);
  return { ok: true, saida, raizServida, porta: cfg.port, origem, analise: an, relatorio, capitulos: capitulosInseridos, markdown: md };
}

function relatorioMarkdown({ saida, raizServida, origem, an, intensidade, relatorio, capitulosInseridos, cfg, copiados, tokens }) {
  const L = [];
  L.push(`# Transformação imersiva — ${an.marca}`, '');
  L.push(`- Origem: \`${origem.tipo === 'url' ? origem.url : origem.raiz || origem.dir}\` (${origem.tipo}${origem.framework ? ', ' + origem.framework : ''}) — **intocada**`);
  L.push(`- Cópia transformada: \`${saida}\`${copiados ? ` (${copiados} arquivos copiados)` : ''}`);
  L.push(`- Intensidade: **${intensidade}** · rolagem suave: ${an.scroll.suave.length ? `mantida a do site (${an.scroll.suave.join(', ')})` : 'Lenis'} · acento: \`${tokens.accent}\` · fontes: ${tokens.fDisp || '—'} / ${tokens.fBody || '—'}`);
  if (an.scroll.animacao.length) L.push(`- O site já usa ${an.scroll.animacao.join(', ')}: elementos já animados por essas bibliotecas foram pulados.`);
  if (origem.tipo === 'url') L.push('- ⚠ Página baixada de uma URL: imagens, CSS e scripts continuam vindo do domínio original. Para publicar, aplique a transformação ao código do site.');
  for (const n of origem.notas || []) L.push(`- ${n}`);
  L.push('', '## Abrir', `\`servir_site\` com projeto \`${raizServida}\`, ou duplo clique em \`abrir-site.bat\` — http://127.0.0.1:${cfg.port}/`, '');
  if (capitulosInseridos.length) {
    L.push('## Capítulos inseridos');
    for (const c of capitulosInseridos) L.push(`- \`#${c.id}\` (${c.type}${c.media ? ', mídia ' + c.media.kind : ''}) — ${c.label}${c.media && c.media.kind === 'frames' ? ` · para o scrub real rode \`extrair_frames\` com projeto \`${raizServida}\` e nome \`${c.media.seq}\`` : ''}`);
    L.push('');
  }
  L.push('## Alterações por página');
  for (const r of relatorio) {
    L.push(`### ${r.pagina} — ${r.modo === 'runtime' ? 'plano em tempo de execução (#im-plan)' : `${r.alteracoes} alterações`}`);
    for (const n of r.notas) L.push(`- ${n}`);
    const byMotivo = new Map();
    for (const x of r.log) byMotivo.set(x.motivo, [...(byMotivo.get(x.motivo) || []), x.seletor]);
    for (const [m, sels] of byMotivo) L.push(`- **${m}** (${sels.length}): ${sels.slice(0, 6).map((s) => `\`${s}\``).join(', ')}${sels.length > 6 ? ' …' : ''}`);
    L.push('');
  }
  L.push('## Ajuste fino (edite os atributos no HTML)');
  L.push('- `data-im-reveal="rise|mask|left|right|scale|blur"` — entrada ao aparecer · remova o atributo para desligar.');
  L.push('- `data-im-count` (+ `data-im-prefix`, `data-im-suffix`, `data-im-decimals`) — contadores.');
  L.push('- `data-im-stagger="90"` — filhos entram em cascata · `data-im-tilt="4"` — inclinação · `data-im-magnetic="0.22"` — botão magnético · `data-im-parallax="0.08"`.');
  L.push('- `<body data-im-cursor="ring|dot|paint" data-im-smooth="0.1|off" data-im-grain>` — comportamento global.');
  L.push('- `imersao/ponte.css` — cores e fontes dos capítulos inseridos.');
  L.push('- Desfazer: apague esta pasta; o original não foi alterado.');
  return L.join('\n');
}
