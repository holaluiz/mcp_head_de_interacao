#!/usr/bin/env node
// HEAD de Interação — MCP de criação e transformação de sites imersivos.
// Engenharia reversa de 31 prompts validados: um sujeito + um momento
// impossível, scrub de frames em capítulos fixados, instrumentos atrelados ao
// filme, módulo de negócio, som sintetizado e verificação no meio do scroll.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ROOT } from './lib/util.js';
import { MOMENTOS, getMomento } from './knowledge/momentos.js';
import { guiaTexto, register as regConhecimento } from './tools/conhecimento.js';
import { register as regBriefing } from './tools/briefing.js';
import { register as regSite } from './tools/site.js';
import { register as regTransformar } from './tools/transformar.js';
import { register as regFrames } from './tools/frames.js';
import { register as regVerificar } from './tools/verificar.js';
import { parar } from './lib/serve.js';
import { pastaInicial, usarRoots } from './lib/workspace.js';

// "head-de-interacao configurar <cliente>" → configurador em vez do servidor
if (process.argv[2] === 'configurar') {
  await import(pathToFileURL(path.join(ROOT, 'scripts', 'configurar.mjs')).href);
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
pastaInicial();

const INSTRUCOES = `HEAD de Interação cria sites imersivos (scroll cinematográfico) do zero ou transforma sites existentes.
Regra de ouro: um sujeito + UM momento impossível; o scroll move o visitante (câmera, tempo, profundidade, luz); instrumentos atrelados ao que está na tela; um módulo de negócio útil; verificar no meio do scroll antes de dizer que terminou.
Do zero: recomendar → criar_briefing (projeto) → criar_site → [placas/filmes no gerador → extrair_frames] → servir_site → verificar_site → nota_de_direcao (aplicar) → verificar_site.
Site existente: analisar_site → transformar_site (cópia, nunca o original) → servir_site → verificar_site (secoes: true) → ajustes.
Prompts visuais sempre em inglês, descrevendo luz e matéria fisicamente. Nunca invente prêmios, clientes, depoimentos ou números: deixe [[marcadores]] e peça os fatos.
Caminhos: prefira absolutos. Relativos são resolvidos na pasta do projeto aberto no cliente (roots) ou em HEAD_DE_INTERACAO_PASTA.`;

const server = new McpServer({ name: 'head-de-interacao', version: pkg.version }, { instructions: INSTRUCOES });
usarRoots(server);

regConhecimento(server);
regBriefing(server);
regSite(server);
regTransformar(server);
regFrames(server);
regVerificar(server);

/* ---------------- recursos ---------------- */
const md = (uri, text) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text }] });
const lerDoc = (f) => { try { return readFileSync(path.join(ROOT, 'docs', f), 'utf8'); } catch { return `(${f} não encontrado)`; } };

server.registerResource('principios', 'imersao://principios', { title: 'Princípios de imersão', description: 'Os 14 princípios extraídos dos prompts validados', mimeType: 'text/markdown' }, async (uri) => md(uri, guiaTexto('principios')));
server.registerResource('anatomia', 'imersao://anatomia', { title: 'Anatomia do prompt validado', description: 'Os 10 blocos, sempre nesta ordem', mimeType: 'text/markdown' }, async (uri) => md(uri, guiaTexto('anatomia')));
server.registerResource('guia', 'imersao://guia', { title: 'Guia completo', description: 'Princípios, anatomia, lições, modelos, power-ups, checklist e fluxo', mimeType: 'text/markdown' }, async (uri) => md(uri, guiaTexto('tudo')));
server.registerResource('motor', 'imersao://motor', { title: 'Referência do motor (data-im-*)', description: 'Todos os atributos declarativos do motor de imersão e a API window.Imersao', mimeType: 'text/markdown' }, async (uri) => md(uri, lerDoc('MOTOR.md')));
server.registerResource('engenharia-reversa', 'imersao://engenharia-reversa', { title: 'Engenharia reversa dos 31 prompts', mimeType: 'text/markdown' }, async (uri) => md(uri, lerDoc('ENGENHARIA-REVERSA.md')));
server.registerResource('momento', new ResourceTemplate('imersao://momento/{id}', {
  list: async () => ({ resources: MOMENTOS.map((m) => ({ uri: `imersao://momento/${m.id}`, name: m.nome, description: m.resumo, mimeType: 'application/json' })) }),
}), { title: 'Momento impossível', description: 'Placas, filmes, instrumentos, som e capítulos de um momento', mimeType: 'application/json' }, async (uri, { id }) => {
  const m = getMomento(String(id));
  const { capitulos, ...rest } = m || {};
  return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(m ? { ...rest, capitulos: capitulos({ lang: 'pt-BR', brand: '[[MARCA]]' }) } : { erro: 'momento não encontrado' }, null, 2) }] };
});

/* ---------------- prompts (atalhos de fluxo) ---------------- */
server.registerPrompt('site-imersivo', {
  title: 'Criar site imersivo do zero',
  description: 'Conduz o fluxo completo: recomendação, briefing, site, assets, frames e verificação.',
  argsSchema: { negocio: z.string().describe('Descreva o negócio/produto'), marca: z.string().optional(), pasta: z.string().optional() },
}, ({ negocio, marca, pasta }) => ({
  messages: [{ role: 'user', content: { type: 'text', text: `Quero um site imersivo, nível Awwwards, para: ${negocio}${marca ? ` (marca ${marca})` : ''}.
Use o MCP HEAD de Interação nesta ordem:
1. recomendar → escolha UM momento impossível e os módulos de negócio; me diga por quê em duas frases.
2. criar_briefing com projeto="${pasta || './' + (marca || 'site-imersivo').toLowerCase().replace(/\s+/g, '-')}" (produto_visual em inglês, descrição física).
3. criar_site no mesmo projeto. 4. servir_site e verificar_site; corrija até passar.
5. Mostre o plano de placas/filmes (custo estimado) e pergunte se gero os assets. Depois de baixar os MP4 em media/brutos/, rode extrair_frames para cada clipe e verifique de novo.
Nunca invente fatos: deixe [[marcadores]] e me pergunte.` } }],
}));

server.registerPrompt('transformar-site', {
  title: 'Transformar um site existente',
  description: 'Analisa um site pronto e cria uma cópia imersiva verificada.',
  argsSchema: { origem: z.string().describe('Pasta, arquivo .html ou URL'), intensidade: z.string().optional() },
}, ({ origem, intensidade }) => ({
  messages: [{ role: 'user', content: { type: 'text', text: `Transforme o site em ${origem} numa experiência imersiva sem perder o que ele já é.
1. analisar_site e me mostre o mapa de imersão (o que cada seção recebe) e o prólogo sugerido.
2. transformar_site (intensidade ${intensidade || 'media'}) — sempre numa cópia.
3. servir_site e verificar_site com secoes=true; corrija até passar.
4. Sugira o próximo nível: um prólogo com filme real (criar_briefing/planejar_assets + extrair_frames com nome "prologo") e um módulo de negócio, se fizer sentido.` } }],
}));

server.registerPrompt('dirigir', {
  title: 'Dirigir com sentimentos',
  description: 'Rodada de direção: captura, sente, ajusta, verifica.',
  argsSchema: { projeto: z.string(), nota: z.string().describe('O que você sente olhando o site') },
}, ({ projeto, nota }) => ({
  messages: [{ role: 'user', content: { type: 'text', text: `No projeto ${projeto}: “${nota}”. Rode nota_de_direcao com aplicar=true, depois capturar_capitulo no capítulo afetado e verificar_site. Mostre antes/depois e diga o que mudou.` } }],
}));

const transport = new StdioServerTransport();
await server.connect(transport);
const sair = () => { parar(); process.exit(0); };
process.on('SIGINT', sair);
process.on('SIGTERM', sair);
process.stdin.on('end', sair);
