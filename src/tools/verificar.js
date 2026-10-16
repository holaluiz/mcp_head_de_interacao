import { z } from 'zod';
import path from 'node:path';
import { servir, parar, listar } from '../lib/serve.js';
import { verificar, capturar, lerImagem } from '../lib/verify.js';
import { findBrowser } from '../lib/browser.js';
import { result, fail, exists } from '../lib/util.js';

export function register(server) {
  server.registerTool('servir_site', {
    title: 'Servir o site localmente',
    description: 'Sobe um servidor local para a pasta do projeto (ou da cópia transformada) na porta própria do projeto, sem cache e com suporte a vídeo. O servidor vive enquanto o MCP estiver aberto; para abrir fora dele use abrir-site.bat/.command. Devolve a URL e os atalhos de teste (?solo=capitulo:0.5, ?mute=1, ?debug=1, ?reduced).',
    inputSchema: { projeto: z.string(), porta: z.number().int().min(1024).max(65535).optional() },
  }, async ({ projeto, porta }) => {
    try {
      const dir = path.resolve(projeto);
      if (!exists(path.join(dir, 'index.html'))) return fail(`Não há index.html em ${dir}.`);
      const r = await servir(dir, { porta });
      return result(`${r.reutilizado ? 'Já estava no ar' : r.externo ? 'Já aberto por outro processo (abrir-site)' : 'No ar'}: ${r.url}\nAtalhos: ${r.url}?debug=1 (HUD com frames e fps) · ?solo=<capitulo>:0.5 (fixa um capítulo para screenshot) · ?mute=1 · ?reduced (movimento reduzido)`);
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('parar_site', {
    title: 'Parar servidor local',
    description: 'Para o servidor de um projeto (ou todos, sem "projeto") e lista os que continuam no ar.',
    inputSchema: { projeto: z.string().optional() },
  }, async ({ projeto }) => {
    const parados = parar(projeto);
    const vivos = listar();
    return result(`Parados: ${parados.join(', ') || 'nenhum'}\nNo ar: ${vivos.map((v) => v.url + ' ← ' + v.root).join(', ') || 'nenhum'}`);
  });

  server.registerTool('verificar_site', {
    title: 'Verificar site (VERIFY)',
    description: 'Abre o site num Chrome/Edge headless e confere, como manda o bloco VERIFY dos prompts validados: loader libera; cada capítulo em 10/50/90% e de volta (scrub e rebobinar); palco nunca em branco; console sem erros; nenhum 404 (frames!); marcadores [[…]] sobrando; cálculo ao vivo dos módulos de negócio; formulários honestos; som desligado até o clique; celular 390 px sem rolagem horizontal; movimento reduzido com tudo visível. Devolve o relatório e screenshots de cada capítulo no meio do scroll.',
    inputSchema: {
      projeto: z.string().optional().describe('Pasta do projeto (sobe o servidor sozinho)'),
      url: z.string().optional().describe('Ou uma URL já no ar'),
      pagina: z.string().optional(),
      capitulos: z.array(z.string()).optional().describe('Só estes capítulos'),
      pontos: z.array(z.number().min(0).max(1)).optional().describe('Pontos de progresso (padrão 0.1, 0.5, 0.9)'),
      dispositivos: z.array(z.enum(['desktop', 'celular', 'reduzido'])).optional(),
      screenshots: z.boolean().optional(),
      secoes: z.boolean().optional().describe('Também fotografa seções rotuladas que não são capítulos (sites transformados)'),
      max_imagens: z.number().int().min(0).max(16).optional().describe('Quantas imagens devolver na resposta (padrão 6; todas ficam salvas em .imersao/verificacao)'),
    },
  }, async (o) => {
    if (!o.projeto && !o.url) return fail('Informe projeto ou url.');
    if (!findBrowser()) return fail('Nenhum Chrome/Edge encontrado para a verificação headless. Instale o Chrome ou defina CHROME_PATH.');
    try {
      const r = await verificar(o);
      const icon = (c) => (c.ok === true ? '✔' : c.ok === false ? '✖' : '⚠');
      const grupos = [...new Set(r.checks.map((c) => c.grupo))];
      const txt = [
        `${r.ok ? '✔ VERIFICADO' : '✖ PROBLEMAS ENCONTRADOS'} — ${r.resumo}`,
        r.url,
        ...grupos.flatMap((g) => [`\n**${g}**`, ...r.checks.filter((c) => c.grupo === g).map((c) => `${icon(c)} ${c.item}${c.detalhe ? ` — ${c.detalhe}` : ''}`)]),
        `\nCapturas e relatório: ${r.outDir}`,
        r.ok ? '' : '\nCorrija e rode de novo. Para ajustes de sensação use nota_de_direcao; para um capítulo, capturar_capitulo.',
      ].filter(Boolean).join('\n');
      const content = [{ type: 'text', text: txt }];
      const n = o.max_imagens ?? 6;
      for (const s of r.shots.slice(0, n)) { content.push({ type: 'text', text: `▸ ${s.rotulo}` }); content.push(await lerImagem(s.arquivo)); }
      return { content };
    } catch (e) { return fail(String(e.stack || e)); }
  });

  server.registerTool('capturar_capitulo', {
    title: 'Capturar capítulo',
    description: 'Fotografa um capítulo fixado em qualquer ponto do scroll (modo solo ?solo=id:p), ou uma seção pelo id, no desktop, celular ou movimento reduzido. Use para dirigir: veja, descreva o que sente, aplique nota_de_direcao, capture de novo.',
    inputSchema: {
      projeto: z.string().optional(), url: z.string().optional(), pagina: z.string().optional(),
      capitulo: z.string().optional().describe('id do capítulo ou da seção (vazio = topo da página)'),
      p: z.number().min(0).max(1).optional().describe('Progresso 0–1 (padrão 0.5)'),
      dispositivo: z.enum(['desktop', 'celular', 'reduzido']).optional(),
      largura: z.number().int().optional(), altura: z.number().int().optional(),
    },
  }, async (o) => {
    if (!o.projeto && !o.url) return fail('Informe projeto ou url.');
    try {
      const r = await capturar(o);
      const info = r.info ? ` · mídia ${r.info.media}${r.info.fallback ? ` (fallback ${r.info.fallback})` : ''}${r.info.frame != null ? ` · frame ${r.info.frame}/${r.info.count}` : ''}` : '';
      return { content: [{ type: 'text', text: `${o.capitulo || 'topo'} @ ${o.p ?? 0.5} (${o.dispositivo || 'desktop'})${info}${r.pronto ? '' : ' · ⚠ motor não ficou pronto'}${r.erros.length ? `\nErros: ${r.erros.join(' · ')}` : ''}\n${r.arquivo}` }, await lerImagem(r.arquivo)] };
    } catch (e) { return fail(String(e.message || e)); }
  });
}
