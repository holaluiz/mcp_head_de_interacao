// Escreve um projeto completo a partir do spec: página, estilos, motor,
// manifesto, servidor local com porta própria e launchers de duplo clique.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { renderPage, renderSiteCss, renderSiteJs } from './render.js';
import { ENGINE_DIR, TEMPLATES_DIR, ensureDir, exists, readJson, writeJson, writeText, portFor, slug, hashStr } from './util.js';

export async function instalarMotor(dir) {
  const dest = path.join(dir, 'imersao');
  await ensureDir(path.join(dest, 'vendor'));
  await fs.copyFile(path.join(ENGINE_DIR, 'imersao.js'), path.join(dest, 'imersao.js'));
  await fs.copyFile(path.join(ENGINE_DIR, 'imersao.css'), path.join(dest, 'imersao.css'));
  await fs.copyFile(path.join(ENGINE_DIR, 'vendor', 'lenis.min.js'), path.join(dest, 'vendor', 'lenis.min.js'));
  return dest;
}

export async function instalarServidor(dir, nome) {
  await fs.copyFile(path.join(TEMPLATES_DIR, 'server.mjs'), path.join(dir, 'server.mjs'));
  const cfgPath = path.join(dir, '.imersao', 'config.json');
  const cfg = (await readJson(cfgPath, {})) || {};
  if (!cfg.port) cfg.port = portFor(nome || path.basename(dir));
  cfg.nome = cfg.nome || nome || path.basename(dir);
  await writeJson(cfgPath, cfg);
  await writeText(path.join(dir, 'abrir-site.bat'), '@echo off\r\ncd /d "%~dp0"\r\nwhere node >nul 2>nul || (echo Instale o Node.js em https://nodejs.org && pause && exit /b 1)\r\nnode server.mjs --open\r\npause\r\n');
  const sh = '#!/bin/sh\ncd "$(dirname "$0")"\ncommand -v node >/dev/null 2>&1 || { echo "Instale o Node.js em https://nodejs.org"; exit 1; }\nnode server.mjs --open\n';
  await writeText(path.join(dir, 'abrir-site.command'), sh);
  await writeText(path.join(dir, 'abrir-site.sh'), sh);
  try { await fs.chmod(path.join(dir, 'abrir-site.command'), 0o755); await fs.chmod(path.join(dir, 'abrir-site.sh'), 0o755); } catch { /* Windows */ }
  return cfg;
}

export function ativosEsperados(spec) {
  const imgs = new Set(), seqs = new Set(), vids = new Set();
  const walk = (v, key) => {
    if (typeof v === 'string') {
      if (/^(img|media|models)\//.test(v) && /\.(jpe?g|png|webp|avif|gif|mp4|webm|glb|gltf)$/i.test(v)) (/\.(mp4|webm)$/i.test(v) ? vids : imgs).add(v);
      if (/^(wipe|stills|shatter|image):/.test(v)) for (const part of v.split(/[:|;]/)) if (/^(img|media)\//.test(part.trim())) imgs.add(part.trim());
      if (key === 'seq') seqs.add(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(spec.chapters);
  return { imagens: [...imgs], sequencias: [...seqs], videos: [...vids] };
}

export async function criarProjeto(spec, dir, { sobrescrever = false } = {}) {
  await ensureDir(dir);
  const idx = path.join(dir, 'index.html');
  if (exists(idx) && !sobrescrever) {
    throw new Error(`Já existe ${idx}. Use sobrescrever: true para regerar a página (css/site.css e js/site.js são preservados).`);
  }
  await instalarMotor(dir);
  const cfg = await instalarServidor(dir, slug(spec.brand));
  let backup = null, editadoAMao = false;
  if (exists(idx)) {
    const cur = await fs.readFile(idx, 'utf8');
    editadoAMao = !!cfg.indexHash && cfg.indexHash !== hashStr(cur);
    backup = path.join(dir, '.imersao', 'backup', `index-${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
    await writeText(backup, cur);
  }
  const html = renderPage(spec);
  await writeText(idx, html);
  cfg.indexHash = hashStr(html);
  await writeJson(path.join(dir, '.imersao', 'config.json'), cfg);
  const css = path.join(dir, 'css', 'site.css');
  if (!exists(css) || sobrescrever === 'tudo') await writeText(css, renderSiteCss(spec));
  else {
    // mantém personalizações, mas atualiza o bloco de tokens
    const cur = await fs.readFile(css, 'utf8');
    const fresh = renderSiteCss(spec);
    const tokRe = /:root\s*\{[\s\S]*?\n\}/;
    const tok = fresh.match(tokRe);
    await writeText(css, tok && tokRe.test(cur) ? cur.replace(tokRe, tok[0]) : fresh);
  }
  const js = path.join(dir, 'js', 'site.js');
  if (!exists(js)) await writeText(js, renderSiteJs(spec));
  await writeJson(path.join(dir, 'experience.json'), spec);
  const manPath = path.join(dir, 'imersao.manifest.json');
  const man = (await readJson(manPath, null)) || { version: 1, sequences: {} };
  man.sequences = man.sequences || {};
  await writeJson(manPath, man);
  for (const d of ['frames', 'media/brutos', 'img', 'models']) await ensureDir(path.join(dir, d));
  const at = ativosEsperados(spec);
  const faltando = at.imagens.filter((p) => !exists(path.join(dir, p)));
  const seqFaltando = at.sequencias.filter((s) => !man.sequences[s]);
  await writeText(path.join(dir, 'LEIA-ME.md'), leiaMe(spec, cfg, at, faltando, seqFaltando));
  return { dir, porta: cfg.port, ativos: at, imagensFaltando: faltando, sequenciasFaltando: seqFaltando, backup, editadoAMao };
}

function leiaMe(spec, cfg, at, faltando, seqFaltando) {
  return `# ${spec.brand}

Site imersivo gerado pelo **HEAD de Interação** (momento: \`${spec.moment || 'custom'}\`).

## Abrir
- Dê duplo clique em \`abrir-site.bat\` (Windows) ou \`abrir-site.command\` (macOS), ou rode \`node server.mjs --open\`.
- Endereço próprio: http://127.0.0.1:${cfg.port}/
- Modo solo para screenshots: \`?solo=<capitulo>:0.5\` · sem som: \`?mute=1\` · depuração: \`?debug=1\` · movimento reduzido: \`?reduced\`

## Estrutura
- \`index.html\` — capítulos com atributos \`data-im-*\` (edite à vontade)
- \`css/site.css\` — tokens e estilos da página · \`js/site.js\` — seu código (ganchos \`Imersao.onProgress\`)
- \`imersao/\` — motor (não edite; é reinstalado pelo MCP)
- \`imersao.manifest.json\` — sequências de frames registradas por \`extrair_frames\`
- \`experience.json\` — o spec que gerou a página

## Ativos esperados
Sequências (frames): ${at.sequencias.map((s) => `\`${s}\`${seqFaltando.includes(s) ? ' (pendente)' : ''}`).join(', ') || '—'}
Imagens: ${at.imagens.map((s) => `\`${s}\`${faltando.includes(s) ? ' (pendente)' : ''}`).join(', ') || '—'}

Enquanto um ativo não existe, o capítulo usa o fallback (fotos → procedural) e o site continua funcionando.
`;
}
