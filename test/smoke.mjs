// Teste de fumaça: sobe o MCP por stdio (como um cliente real) e percorre os
// dois fluxos — site do zero e transformação de um site existente — com
// verificação headless. Uso: npm test   ·   node test/smoke.mjs --rapido (sem navegador)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ListRootsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.SMOKE_OUT || path.join(os.tmpdir(), 'head-de-interacao-smoke');
const RAPIDO = process.argv.includes('--rapido');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const client = new Client({ name: 'smoke', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(ROOT, 'src', 'index.js')], cwd: OUT, stderr: 'inherit' }));

let falhas = 0;
async function passo(nome, fn) {
  const t0 = Date.now();
  try { const info = await fn(); console.log(`✔ ${nome} (${Date.now() - t0} ms)${info ? ' — ' + info : ''}`); }
  catch (e) { falhas++; console.log(`✖ ${nome}: ${String(e.message || e).slice(0, 1500)}`); }
}
async function call(name, args = {}) {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  if (r.isError) throw new Error(`${name}: ${text}`);
  return { text, imagens: r.content.filter((c) => c.type === 'image').length };
}
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

const lamina = path.join(OUT, 'lamina');
const fixture = path.join(ROOT, 'test', 'fixtures', 'site-exemplo');
const brilho = path.join(OUT, 'brilho-imersivo');

await passo('lista de ferramentas', async () => {
  const { tools } = await client.listTools();
  must(tools.length >= 25, `só ${tools.length} ferramentas`);
  const schemas = JSON.stringify(tools.map((t) => t.inputSchema));
  must(!/anyOf|oneOf|"const"|nullable/.test(schemas), 'schema com union/const/nullable (quebra Gemini/Antigravity/Codex)');
  const { resources } = await client.listResources();
  const { prompts } = await client.listPrompts();
  return `${tools.length} ferramentas, ${resources.length} recursos, ${prompts.length} prompts`;
});
await passo('guia_imersao', async () => { const r = await call('guia_imersao', { secao: 'principios' }); must(/visitante/.test(r.text), 'sem princípios'); });
await passo('recomendar (segmento)', async () => { const r = await call('recomendar', { descricao: 'estética automotiva e vitrificação em Curitiba' }); must(/Estética automotiva/.test(r.text), r.text.slice(0, 200)); return r.text.split('\n')[1]; });
await passo('detalhar_momento', async () => { const r = await call('detalhar_momento', { id: 'restauracao', assunto: '1960s-style coupe with no badges' }); must(/coupe/.test(r.text), 'assunto não preenchido'); });
await passo('revisar_prompt_visual', async () => { const r = await call('revisar_prompt_visual', { prompt: 'The car suddenly explodes like a firework, then cut to the interior', tipo: 'movimento' }); must(/Nota/.test(r.text), 'sem nota'); return r.text.split('\n')[0]; });
await passo('criar_briefing (salva no projeto)', async () => {
  const r = await call('criar_briefing', { marca: 'LAMINA', descricao: 'padaria artesanal que lança seu croissant como um celular topo de linha', produto: 'Croissant Pro', tagline: 'Nosso croissant mais folhado.', produto_visual: 'all-butter croissant', visual: { detail: 'laminated layers', setting: 'a glowing deck oven' }, projeto: lamina });
  must(existsSync(path.join(lamina, 'experience.json')), 'experience.json não salvo');
  return (r.text.match(/Momento: \*\*([^*]+)/) || [])[1];
});
await passo('criar_site', async () => { const r = await call('criar_site', { projeto: lamina }); must(existsSync(path.join(lamina, 'imersao', 'imersao.js')), 'motor não instalado'); return r.text.split('\n')[0]; });
await passo('nota_de_direcao (aplicar)', async () => { const r = await call('nota_de_direcao', { projeto: lamina, nota: 'o impacto passa rápido demais e o título cobre o produto', aplicar: true }); must(/Aplicado/.test(r.text), r.text); });
await passo('adicionar_modulo faq', async () => { await call('adicionar_modulo', { projeto: lamina, modulo: 'faq' }); });
await passo('ajustar_capitulo', async () => { await call('ajustar_capitulo', { projeto: lamina, capitulo: 'camadas', alteracoes: { length: 2.5 } }); });
await passo('status_projeto', async () => { const r = await call('status_projeto', { projeto: lamina }); must(/Capítulos/.test(r.text), 'sem capítulos'); });

const ff = spawnSync('ffmpeg', ['-version']).status === 0;
if (ff) {
  await passo('extrair_frames (clipe sintético com início parado)', async () => {
    const bruto = path.join(lamina, 'media', 'brutos', 'impacto.mp4');
    mkdirSync(path.dirname(bruto), { recursive: true });
    const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=1280x720:r=24:d=4', '-vf', 'tpad=start_duration=1.5:start_mode=clone', '-pix_fmt', 'yuv420p', bruto]);
    must(r.status === 0, 'ffmpeg falhou: ' + r.stderr);
    const x = await call('extrair_frames', { projeto: lamina, video: 'media/brutos/impacto.mp4', nome: 'impacto', quadros: 80, largura: 960 });
    must(/Sequência "impacto" pronta/.test(x.text), x.text);
    return x.text.split('\n')[1];
  });
}

await passo('analisar_site (fixture)', async () => {
  const r = await call('analisar_site', { origem: fixture });
  must(/Mapa de imersão/.test(r.text) && /numeros/.test(r.text), r.text.slice(0, 400));
  return (r.text.match(/Paleta: [^\n]+/) || [])[0];
});
await passo('transformar_site (intensidade alta)', async () => {
  const r = await call('transformar_site', { origem: fixture, saida: brilho, intensidade: 'alta' });
  must(existsSync(path.join(brilho, 'IMERSAO.md')), 'sem relatório');
  return r.text.split('\n')[1];
});

const orbita = path.join(OUT, 'orbita-imersivo');
await passo('transformar_site (SPA → plano em tempo de execução)', async () => {
  const r = await call('transformar_site', { origem: path.join(ROOT, 'test', 'fixtures', 'spa-exemplo'), saida: orbita });
  must(/SPA — plano aplicado/.test(r.text), 'SPA não detectada');
});

if (!RAPIDO) {
  await passo('verificar_site (SPA)', async () => {
    const r = await call('verificar_site', { projeto: orbita, max_imagens: 0, dispositivos: ['desktop'] });
    must(/✔ VERIFICADO/.test(r.text), r.text);
  });
  await passo('verificar_site (do zero)', async () => {
    const r = await call('verificar_site', { projeto: lamina, max_imagens: 1 });
    console.log(r.text.split('\n').map((l) => '    ' + l).join('\n'));
    must(/Motor carregado/.test(r.text), 'sem verificação do motor');
    must(!/✖ Motor carregado/.test(r.text), 'motor não ficou pronto');
    if (ff) must(/✔ capítulo impacto \(frames\)/.test(r.text), 'scrub real do impacto falhou');
    return `${r.imagens} imagem(ns)`;
  });
  await passo('verificar_site (transformado)', async () => {
    const r = await call('verificar_site', { projeto: brilho, secoes: true, max_imagens: 0 });
    console.log(r.text.split('\n').map((l) => '    ' + l).join('\n'));
    must(!/✖ Motor carregado/.test(r.text), 'motor não ficou pronto no site transformado');
  });
  await passo('capturar_capitulo (prólogo a 30%)', async () => { const r = await call('capturar_capitulo', { projeto: brilho, capitulo: 'prologo', p: 0.3 }); must(r.imagens === 1, 'sem imagem'); return r.text.split('\n')[0]; });
  await passo('parar_site', async () => { await call('parar_site', {}); });
}

await client.close();

await passo('roots: caminho relativo cai na pasta do projeto do cliente', async () => {
  const ws = path.join(OUT, 'workspace-roots');
  mkdirSync(ws, { recursive: true });
  const c2 = new Client({ name: 'smoke-roots', version: '1.0.0' }, { capabilities: { roots: { listChanged: true } } });
  c2.setRequestHandler(ListRootsRequestSchema, async () => ({ roots: [{ uri: pathToFileURL(ws).href, name: 'ws' }] }));
  await c2.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(ROOT, 'src', 'index.js')], cwd: os.tmpdir(), stderr: 'inherit' }));
  const r = await c2.callTool({ name: 'criar_site', arguments: { projeto: 'relativo', marca: 'Teste', descricao: 'café artesanal' } });
  await c2.close();
  must(!r.isError && existsSync(path.join(ws, 'relativo', 'index.html')), 'o site não foi criado dentro da root do cliente');
});

console.log(falhas ? `\n${falhas} passo(s) falharam.` : `\nTudo certo. Saída em ${OUT}`);
process.exit(falhas ? 1 : 0);
