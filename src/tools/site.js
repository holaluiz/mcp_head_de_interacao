import { z } from 'zod';
import path from 'node:path';
import { montarSpec, planejarAssets, briefingMarkdown, pendencias, montarContexto } from '../lib/briefing.js';
import { criarProjeto, instalarMotor, ativosEsperados } from '../lib/scaffold.js';
import { buildModulo, MODULOS } from '../knowledge/modulos.js';
import { REGRAS, diagnosticar, escolherAlvos } from '../knowledge/direcao.js';
import { TIPOS, PROCEDURAIS } from '../lib/render.js';
import { briefingInput } from './briefing.js';
import { result, fail, readJson, writeJson, writeText, exists, fmtBytes } from '../lib/util.js';

export async function carregarSpec(projeto) {
  const dir = path.resolve(projeto);
  const spec = await readJson(path.join(dir, 'experience.json'), null);
  if (!spec || !Array.isArray(spec.chapters)) throw new Error(`Não encontrei ${path.join(dir, 'experience.json')}. Rode criar_briefing (com projeto) ou criar_site primeiro.`);
  return { dir, spec };
}

function uniqueId(spec, base) {
  const ids = new Set((spec.chapters || []).map((c) => c.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/* Merge profundo; null apaga a chave; arrays são substituídos. */
function mergePatch(target, patch) {
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === null) delete target[k];
    else if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) mergePatch(target[k], v);
    else target[k] = v;
  }
  return target;
}

function inserir(spec, ch, { antes_de, depois_de, posicao } = {}) {
  const list = spec.chapters;
  let i = list.length;
  if (antes_de) { const k = list.findIndex((c) => c.id === antes_de); if (k >= 0) i = k; }
  else if (depois_de) { const k = list.findIndex((c) => c.id === depois_de); if (k >= 0) i = k + 1; }
  else if (posicao === 'inicio') i = 0;
  else if (typeof posicao === 'number') i = Math.max(0, Math.min(list.length, posicao));
  list.splice(i, 0, ch);
  return i;
}

function resumoCapitulos(spec) {
  return spec.chapters.map((c, i) => {
    const m = c.media ? ` · ${c.media.kind}${c.media.seq ? ':' + c.media.seq : ''}` : '';
    return `${String(i + 1).padStart(2, '0')}. ${c.id} \`${c.type}\`${c.length ? ` ${c.length} telas` : ''}${m}${c.label ? ` — ${c.label}` : ''}`;
  }).join('\n');
}

export async function regerar(dir, spec) {
  const r = await criarProjeto(spec, dir, { sobrescrever: true });
  const avisos = [];
  if (r.editadoAMao) avisos.push(`index.html tinha edições manuais; a versão anterior foi salva em ${r.backup}. Prefira ajustar o spec (ajustar_capitulo) ou editar css/site.css e js/site.js, que são preservados.`);
  return { r, avisos };
}

function relatorioProjeto(r, spec) {
  const pend = pendencias(spec);
  return [
    `Projeto: ${r.dir}`,
    `Endereço próprio: http://127.0.0.1:${r.porta}/ (servir_site para abrir)`,
    '', '**Capítulos:**', resumoCapitulos(spec), '',
    r.sequenciasFaltando.length ? `Sequências aguardando frames (fallback ativo até lá): ${r.sequenciasFaltando.join(', ')}` : 'Todas as sequências têm frames registrados.',
    r.imagensFaltando.length ? `Imagens pendentes (o motor mostra um aviso honesto no lugar): ${r.imagensFaltando.join(', ')}` : '',
    pend.length ? `Marcadores [[…]] para preencher com fatos reais: ${pend.join(', ')}` : '',
  ].filter((x) => x !== '').join('\n');
}

export function register(server) {
  server.registerTool('criar_site', {
    title: 'Criar site imersivo (do zero)',
    description: 'Gera o projeto completo: index.html com capítulos fixados (data-im-*), css/site.css com tokens, js/site.js para ganchos, o motor de imersão (imersao/), servidor local com porta própria, launchers de duplo clique e LEIA-ME. Fonte do spec, nesta ordem: "spec" informado → campos de briefing (marca, descricao…) → experience.json já salvo na pasta. O site nasce funcionando com fallbacks (fotos/procedural) e troca sozinho para o scrub real quando extrair_frames registra os frames.',
    inputSchema: {
      projeto: z.string().describe('Pasta do projeto (criada se não existir)'),
      spec: z.record(z.any()).optional().describe('experience.json completo (objeto). Opcional.'),
      ...Object.fromEntries(Object.entries(briefingInput).map(([k, v]) => [k, k === 'marca' || k === 'descricao' ? v.optional() : v])),
      sobrescrever: z.boolean().optional().describe('Regera index.html (backup automático; css/site.css e js/site.js preservados)'),
      regerar_css: z.boolean().optional().describe('Com sobrescrever, regera também css/site.css do zero'),
    },
  }, async (input) => {
    try {
      const dir = path.resolve(input.projeto);
      let spec = input.spec && typeof input.spec === 'object' ? input.spec : null;
      const extra = [];
      if (!spec && (input.marca || input.descricao)) {
        const built = montarSpec(input);
        spec = built.spec;
        const plan = planejarAssets({ moment: built.moment, ctx: built.ctx, segment: built.segment, input, palette: built.palette });
        await writeText(path.join(dir, 'BRIEFING.md'), briefingMarkdown({ spec, ctx: built.ctx, moment: built.moment, segment: built.segment, plan, input }));
        await writeJson(path.join(dir, 'plano-de-assets.json'), plan);
        extra.push(`Momento: **${built.moment.nome}** · segmento: ${built.segment ? built.segment.nome : 'geral'} · BRIEFING.md e plano-de-assets.json salvos.`);
        if (plan.custoEstimado) extra.push(`Geração estimada: ~${plan.custoEstimado.creditos} créditos (${plan.imagens.length} placas, ${plan.videos.length} filmes).`);
      }
      if (!spec) spec = (await readJson(path.join(dir, 'experience.json'), null));
      if (!spec || !Array.isArray(spec.chapters)) return fail('Sem spec: informe "spec", ou marca + descricao, ou rode criar_briefing com "projeto" antes.');
      const r = await criarProjeto(spec, dir, { sobrescrever: input.sobrescrever ? (input.regerar_css ? 'tudo' : true) : false });
      const txt = [
        `Site gerado em ${dir}.`, ...extra, '', relatorioProjeto(r, spec),
        r.editadoAMao ? `\n⚠ index.html tinha edições manuais; backup em ${r.backup}.` : '',
        '', '**Próximos passos:** servir_site → verificar_site. Para o scrub real: gere placas/filmes do plano, salve os MP4 em media/brutos/ e rode extrair_frames (nome = data-im-seq do capítulo).',
      ].filter((x) => x !== '').join('\n');
      return result(txt);
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('status_projeto', {
    title: 'Status do projeto',
    description: 'Mostra o estado de um projeto: capítulos, sequências de frames registradas × esperadas (com tamanho), imagens pendentes, marcadores [[…]] sem preencher, porta e a última verificação.',
    inputSchema: { projeto: z.string() },
    annotations: { readOnlyHint: true },
  }, async ({ projeto }) => {
    try {
      const { dir, spec } = await carregarSpec(projeto);
      const man = (await readJson(path.join(dir, 'imersao.manifest.json'), {})) || {};
      const cfg = (await readJson(path.join(dir, '.imersao', 'config.json'), {})) || {};
      const last = await readJson(path.join(dir, '.imersao', 'ultima-verificacao.json'), null);
      const at = ativosEsperados(spec);
      const seqs = man.sequences || {};
      const linhas = at.sequencias.map((s) => (seqs[s] ? `- ✔ ${s}: ${seqs[s].count} frames ${seqs[s].width}x${seqs[s].height} (${fmtBytes(seqs[s].bytesFrames || 0)})` : `- … ${s}: sem frames (fallback ativo)`));
      const imgs = at.imagens.map((p) => `- ${exists(path.join(dir, p)) ? '✔' : '…'} ${p}`);
      const pend = pendencias(spec);
      return result([
        `**${spec.brand}** · momento \`${spec.moment || 'custom'}\` · porta ${cfg.port || '?'}`,
        '', '**Capítulos**', resumoCapitulos(spec),
        '', '**Sequências**', linhas.join('\n') || '- nenhuma',
        '', '**Imagens**', imgs.join('\n') || '- nenhuma',
        '', pend.length ? `**Marcadores sem preencher:** ${pend.join(', ')}` : 'Nenhum marcador [[…]] pendente.',
        last ? `\n**Última verificação** (${last.quando}): ${last.ok ? 'OK' : 'com problemas'} — ${last.resumo}` : '\nAinda não verificado (verificar_site).',
      ].join('\n'));
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('ajustar_capitulo', {
    title: 'Ajustar, mover ou remover capítulo',
    description: 'Edita um capítulo do experience.json e regera a página (backup automático do index.html). "alteracoes" é um merge profundo (null apaga a chave; listas são substituídas). Ex.: {"length":5,"warp":[[0,0],[0.3,0.4],[1,1]]}, {"media":{"seq":"giro","cam":[[0,{"s":1.1}],[1,{"s":1}]]}}, {"groups":[…]}, {"hits":[{"preset":"impact","at":0.45}]}, {"sound":"rumble","shake":[0.3,0.6,8]}.',
    inputSchema: {
      projeto: z.string(),
      capitulo: z.string().describe('id do capítulo'),
      alteracoes: z.record(z.any()).optional(),
      remover: z.boolean().optional(),
      mover_antes_de: z.string().optional(),
      mover_depois_de: z.string().optional(),
      duplicar_como: z.string().optional().describe('Cria uma cópia com este id (depois do original), aplicando as alterações na cópia'),
    },
  }, async (o) => {
    try {
      const { dir, spec } = await carregarSpec(o.projeto);
      const i = spec.chapters.findIndex((c) => c.id === o.capitulo);
      if (i < 0) return fail(`Capítulo "${o.capitulo}" não existe. Capítulos: ${spec.chapters.map((c) => c.id).join(', ')}`);
      const feito = [];
      if (o.remover) { spec.chapters.splice(i, 1); feito.push(`removido ${o.capitulo}`); }
      else {
        let ch = spec.chapters[i];
        if (o.duplicar_como) {
          ch = JSON.parse(JSON.stringify(ch));
          ch.id = uniqueId(spec, o.duplicar_como);
          spec.chapters.splice(i + 1, 0, ch);
          feito.push(`duplicado como ${ch.id}`);
        }
        if (o.alteracoes) { mergePatch(ch, o.alteracoes); feito.push(`alterado ${ch.id}: ${Object.keys(o.alteracoes).join(', ')}`); }
        if (o.mover_antes_de || o.mover_depois_de) {
          spec.chapters.splice(spec.chapters.indexOf(ch), 1);
          inserir(spec, ch, { antes_de: o.mover_antes_de, depois_de: o.mover_depois_de });
          feito.push(`movido ${ch.id}`);
        }
        if (!TIPOS.includes(ch.type)) return fail(`Tipo "${ch.type}" inválido. Tipos: ${TIPOS.join(', ')}`);
      }
      await writeJson(path.join(dir, 'experience.json'), spec);
      const { avisos } = await regerar(dir, spec);
      return result([feito.join('\n'), '', resumoCapitulos(spec), ...avisos.map((a) => '⚠ ' + a), '', 'Recarregue o site (ou capturar_capitulo) para ver.'].join('\n'));
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('adicionar_capitulo', {
    title: 'Adicionar capítulo',
    description: `Insere um capítulo no spec e regera a página. Tipos: ${TIPOS.join(', ')}. Mídias de cinema: frames (seq + fallback), procedural (${PROCEDURAIS.join(', ')}), image, video, stills, wipe, shatter. Use um momento (detalhar_momento) como referência da estrutura de groups/meters/callouts.`,
    inputSchema: {
      projeto: z.string(),
      capitulo: z.record(z.any()).describe('Objeto do capítulo (id, type, label, length, media, groups, callouts…)'),
      antes_de: z.string().optional(), depois_de: z.string().optional(),
    },
  }, async (o) => {
    try {
      const { dir, spec } = await carregarSpec(o.projeto);
      const ch = { ...o.capitulo };
      if (!TIPOS.includes(ch.type)) return fail(`Tipo "${ch.type}" inválido. Tipos: ${TIPOS.join(', ')}`);
      ch.id = uniqueId(spec, ch.id || ch.type);
      const pos = inserir(spec, ch, { antes_de: o.antes_de, depois_de: o.depois_de });
      await writeJson(path.join(dir, 'experience.json'), spec);
      const { avisos } = await regerar(dir, spec);
      return result([`Capítulo ${ch.id} inserido na posição ${pos + 1}.`, '', resumoCapitulos(spec), ...avisos.map((a) => '⚠ ' + a)].join('\n'));
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('adicionar_modulo', {
    title: 'Adicionar módulo de negócio',
    description: `Acrescenta um módulo que o cliente paga — ${Object.entries(MODULOS).map(([id, m]) => `${id} (${m.nome})`).join(', ')} — com opções (title, groups, slots, items, tiers, products…). Formulários de demonstração dizem honestamente que nada foi enviado.`,
    inputSchema: {
      projeto: z.string(),
      modulo: z.string(),
      opcoes: z.record(z.any()).optional(),
      antes_de: z.string().optional(), depois_de: z.string().optional(),
    },
  }, async (o) => {
    try {
      if (!MODULOS[o.modulo]) return fail(`Módulo "${o.modulo}" não existe. Opções: ${Object.keys(MODULOS).join(', ')}`);
      const { dir, spec } = await carregarSpec(o.projeto);
      const ctx = { ...montarContexto({ marca: spec.brand, idioma: spec.lang, moeda: spec.currency }), product: spec.product || '' };
      const ch = buildModulo(o.modulo, ctx, o.opcoes || {});
      ch.id = uniqueId(spec, ch.id);
      let antes = o.antes_de;
      if (!antes && !o.depois_de) { const last = spec.chapters[spec.chapters.length - 1]; if (last && last.type === 'cta' && ch.type !== 'cta') antes = last.id; }
      inserir(spec, ch, { antes_de: antes, depois_de: o.depois_de });
      await writeJson(path.join(dir, 'experience.json'), spec);
      const { avisos } = await regerar(dir, spec);
      const pend = pendencias({ chapters: [ch], brand: spec.brand });
      return result([`Módulo ${MODULOS[o.modulo].nome} adicionado como ${ch.id}.`, pend.length ? `Preencha: ${pend.join(', ')}` : '', '', resumoCapitulos(spec), ...avisos.map((a) => '⚠ ' + a)].filter((x) => x !== '').join('\n'));
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('ajustar_site', {
    title: 'Ajustar identidade e comportamento global',
    description: 'Muda paleta, tipografia, cursor, grão, vinheta, suavidade do scroll, som, loader, portão de som, índice e pré-carregamento, e regera (css/site.css mantém suas personalizações; só o bloco de tokens é atualizado).',
    inputSchema: {
      projeto: z.string(),
      paleta: z.object({ bg: z.string().optional(), text: z.string().optional(), accent: z.string().optional(), accent2: z.string().optional(), theme: z.enum(['dark', 'light']).optional() }).optional(),
      tipografia: z.object({ display: z.string().optional(), body: z.string().optional(), mono: z.string().optional(), displayStretch: z.number().optional() }).optional(),
      cursor: z.enum(['ring', 'dot', 'paint', 'none']).optional(),
      grao: z.boolean().optional(), vinheta: z.boolean().optional(),
      suavidade: z.number().min(0).max(1).optional().describe('lerp do Lenis: 0.07 pesado … 0.2 ágil; 0 desliga a rolagem suave'),
      som: z.boolean().optional().describe('false remove o botão de som e as texturas'),
      som_ambiente: z.string().optional().describe('Textura ambiente (hum, air, wind, water, fire, rumble, shimmer); "" remove'),
      loader: z.enum(['line', 'bar', 'ember', 'stem', 'propellant', 'nenhum']).optional(),
      portao_som: z.string().optional().describe('Texto do botão "entrar com som" no loader; "" remove o portão'),
      indice: z.boolean().optional(),
      preload: z.enum(['all', 'progressive']).optional(),
      titulo: z.string().optional(), descricao: z.string().optional(),
    },
  }, async (o) => {
    try {
      const { dir, spec } = await carregarSpec(o.projeto);
      const feito = [];
      if (o.paleta) { spec.palette = { ...spec.palette, ...o.paleta }; for (const k of ['surface', 'muted', 'line']) if (o.paleta.bg || o.paleta.text) delete spec.palette[k]; if (o.paleta.accent && !o.paleta.accent2) delete spec.palette.accent2; feito.push('paleta'); }
      if (o.tipografia) { spec.fonts = { ...spec.fonts, ...o.tipografia }; feito.push('tipografia'); }
      if (o.cursor) { spec.cursor = o.cursor; feito.push('cursor'); }
      if (o.grao != null) { spec.grain = o.grao; feito.push('grão'); }
      if (o.vinheta != null) { spec.vignette = o.vinheta; feito.push('vinheta'); }
      if (o.suavidade != null) { spec.smooth = o.suavidade === 0 ? false : o.suavidade; feito.push('suavidade'); }
      if (o.som === false) { spec.sound = false; feito.push('som desligado'); }
      else if (o.som === true || o.som_ambiente !== undefined) {
        spec.sound = { enabled: true, ...(spec.sound || {}) };
        if (o.som_ambiente !== undefined) spec.sound.ambient = o.som_ambiente || null;
        feito.push('som');
      }
      if (o.loader) { spec.loader = o.loader === 'nenhum' ? false : { style: o.loader }; feito.push('loader'); }
      if (o.portao_som !== undefined) { spec.gate = o.portao_som ? { label: o.portao_som } : null; feito.push('portão de som'); }
      if (o.indice != null) { spec.index = o.indice; feito.push('índice'); }
      if (o.preload) { spec.preload = o.preload; feito.push('preload'); }
      if (o.titulo) { spec.title = o.titulo; feito.push('título'); }
      if (o.descricao) { spec.description = o.descricao; feito.push('descrição'); }
      const { derivePalette, checkPalette } = await import('../lib/palette.js');
      spec.palette = derivePalette(spec.palette || {});
      await writeJson(path.join(dir, 'experience.json'), spec);
      const { avisos } = await regerar(dir, spec);
      return result([`Atualizado: ${feito.join(', ') || 'nada'}.`, ...checkPalette(spec.palette).map((w) => '⚠ ' + w), ...avisos.map((a) => '⚠ ' + a)].join('\n'));
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('atualizar_motor', {
    title: 'Atualizar o motor no projeto',
    description: 'Reinstala imersao/imersao.js, imersao.css e Lenis no projeto (ou num site transformado) com a versão deste MCP. Não toca em index.html, css/site.css nem js/site.js.',
    inputSchema: { projeto: z.string() },
  }, async ({ projeto }) => {
    try {
      const dest = await instalarMotor(path.resolve(projeto));
      return result(`Motor atualizado em ${dest}.`);
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('nota_de_direcao', {
    title: 'Nota de direção (sentimento → ajuste)',
    description: 'Dirija com sentimentos, como nos prompts validados: “o título cobre o produto”, “a explosão é rápida demais”, “faça parecer mais caro”, “está sem vida”, “travando”, “não dá pra ler”, “pula no meio”, “parece template”. Diagnostica, lista os ajustes concretos e, com aplicar=true, altera o spec e regera a página. Cite o capítulo (id ou rótulo) na nota ou em "capitulo" para mirar um só.',
    inputSchema: { nota: z.string(), projeto: z.string().optional(), capitulo: z.string().optional(), aplicar: z.boolean().optional() },
  }, async ({ nota, projeto, capitulo, aplicar }) => {
    try {
      const regras = diagnosticar(nota);
      if (!regras.length) {
        return result(`Não reconheci um sintoma conhecido em “${nota}”.\nDescreva o que você SENTE olhando a tela (onde, em qual capítulo, em que momento do scroll). Sintomas que eu traduzo: ${REGRAS.map((r) => r.nome.toLowerCase()).join('; ')}.\nDica: capturar_capitulo mostra um capítulo em qualquer ponto para apontar o problema.`);
      }
      let spec = null, dir = null;
      if (projeto) ({ dir, spec } = await carregarSpec(projeto));
      const L = [];
      const mudancas = [];
      for (const r of regras) {
        L.push(`### ${r.nome}`, `Diagnóstico: ${r.diagnostico}`, ...r.ajustes.map((a) => `- ${a}`));
        if (spec && r.comandos) { const cmds = r.comandos(spec); if (cmds.length) L.push('Comandos sugeridos:', ...cmds.map((c) => `  - ${c}`)); }
        if (spec && aplicar) {
          const alvos = r.escopo === 'global' || r.escopo === 'nenhum' ? [] : escolherAlvos(spec, r, { capitulo, nota });
          const ch = r.aplicar(spec, alvos);
          mudancas.push(...ch);
          L.push(ch.length ? `Aplicado: ${ch.join('; ')}` : 'Nada a alterar no spec para este sintoma.');
        }
        L.push('');
      }
      if (spec && aplicar) {
        await writeJson(path.join(dir, 'experience.json'), spec);
        const { avisos } = await regerar(dir, spec);
        L.push(...avisos.map((a) => '⚠ ' + a));
        L.push(mudancas.length ? 'Página regerada. Rode capturar_capitulo ou verificar_site para conferir.' : 'O spec não mudou.');
      } else if (spec) L.push('Para aplicar: chame de novo com aplicar=true.');
      return result(L.join('\n'));
    } catch (e) { return fail(String(e.message || e)); }
  });
}
