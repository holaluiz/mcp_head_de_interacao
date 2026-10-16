import { z } from 'zod';
import { MOMENTOS, getMomento } from '../knowledge/momentos.js';
import { SEGMENTOS } from '../knowledge/segmentos.js';
import { MODULOS } from '../knowledge/modulos.js';
import { PRINCIPIOS, ANATOMIA, LICOES, RESGATE, MODELOS, POWERUPS, CHECKLIST_VERIFICACAO } from '../knowledge/principios.js';
import { recomendar, fill, montarContexto } from '../lib/briefing.js';
import { derivePalette, colorName } from '../lib/palette.js';
import { result, fail } from '../lib/util.js';

export function guiaTexto(secao = 'tudo') {
  const S = [];
  const want = (k) => secao === 'tudo' || secao === k;
  if (want('principios')) S.push('## Princípios de imersão\n' + PRINCIPIOS.map((p, i) => `${i + 1}. **${p.titulo}.** ${p.texto}`).join('\n'));
  if (want('anatomia')) S.push('## Anatomia do prompt validado (sempre nesta ordem)\n' + ANATOMIA.map((a, i) => `${i + 1}. **${a.bloco}** — ${a.regra}`).join('\n'));
  if (want('licoes')) S.push('## Lições\n' + LICOES.map((l) => `- ${l}`).join('\n'));
  if (want('resgate')) S.push('## Falas de resgate\n' + RESGATE.map((r) => `- **${r.quando}:** “${r.fala}”`).join('\n'));
  if (want('modelos')) S.push('## Modelos (preços de referência Higgsfield, set/2026)\n| Modelo | Custo | Forte em | Cuidado |\n|---|---|---|---|\n' + MODELOS.map((m) => `| \`${m.id}\` ${m.nome} | ${m.custo} ${m.unidade} | ${m.forte} | ${m.cuidado} |`).join('\n'));
  if (want('powerups')) S.push('## Power-ups do motor\n' + POWERUPS.map((p) => `- **${p.nome}** (\`${p.atributo}\`): ${p.descricao} _Verificar: ${p.verificar}_`).join('\n'));
  if (want('checklist')) S.push('## Checklist antes de entregar\n' + CHECKLIST_VERIFICACAO.map((c) => `- [ ] ${c}`).join('\n'));
  if (want('fluxo')) S.push(`## Fluxo recomendado
**Do zero:** recomendar → criar_briefing (salva BRIEFING.md + experience.json + plano de assets) → criar_site → gerar placas e filmes (Higgsfield ou outro) → extrair_frames para cada clipe → servir_site → verificar_site → nota_de_direcao/ajustar_capitulo → verificar de novo.
**Site existente:** analisar_site → transformar_site (cópia não destrutiva) → (opcional) criar_briefing só para o prólogo + extrair_frames → servir_site → verificar_site.
**Sem IA de vídeo:** os capítulos usam fotos (stills/wipe/shatter) e mídias procedurais; o site já nasce imersivo.`);
  return S.join('\n\n');
}

export function register(server) {
  server.registerTool('guia_imersao', {
    title: 'Guia de imersão (engenharia reversa)',
    description: 'Devolve a metodologia extraída dos 31 prompts validados: princípios de imersão, anatomia do prompt, lições, falas de resgate, tabela de modelos, power-ups do motor, checklist de verificação e o fluxo de trabalho. Leia antes de projetar ou revisar uma experiência.',
    inputSchema: { secao: z.enum(['tudo', 'principios', 'anatomia', 'licoes', 'resgate', 'modelos', 'powerups', 'checklist', 'fluxo']).optional() },
    annotations: { readOnlyHint: true },
  }, async ({ secao }) => result(guiaTexto(secao || 'tudo')));

  server.registerTool('listar_momentos', {
    title: 'Listar momentos impossíveis',
    description: 'Lista os momentos impossíveis catalogados (explosão e remontagem, explosão de cor, descida, florescer, restauração, raio-X, gênese, tempo congelado, travessia, revelação pela luz, plano único, construção, jornada encadeada, montagem de partículas, retrato, tinta e manifesto, sensorial local, portal 3D, mundo contínuo 3D…). Filtre por texto (ex.: "joalheria", "restaurante").',
    inputSchema: { filtro: z.string().optional() },
    annotations: { readOnlyHint: true },
  }, async ({ filtro }) => {
    const f = String(filtro || '').toLowerCase();
    const list = MOMENTOS.filter((m) => !f || [m.id, m.nome, m.resumo, ...m.melhorPara].join(' ').toLowerCase().includes(f));
    const txt = list.map((m) => `- **${m.id}** — ${m.nome} (${m.motor === '3d' ? '3D real' : 'frames'}): ${m.resumo}\n  Melhor para: ${m.melhorPara.join(', ')} · Origem: ${m.origem.join(', ')}`).join('\n');
    return result(txt || 'Nenhum momento corresponde ao filtro.', list.map((m) => ({ id: m.id, nome: m.nome, motor: m.motor, melhorPara: m.melhorPara })));
  });

  server.registerTool('detalhar_momento', {
    title: 'Detalhar um momento',
    description: 'Mostra tudo de um momento: placas (stills) e filmes com prompts em inglês já preenchidos com o seu assunto, instrumentos atrelados ao filme, interações, som, o que acontece para trás, capítulos sugeridos e dicas.',
    inputSchema: {
      id: z.string().describe('id do momento (veja listar_momentos)'),
      assunto: z.string().optional().describe('Descrição física do produto/sujeito EM INGLÊS para os prompts visuais'),
      visual: z.record(z.string()).optional().describe('Outras lacunas em inglês: setting, detail, parts, trigger, inner, material, liquid, flower, glow, opening, beats, stages…'),
      acento: z.string().optional().describe('Cor de acento em hex (vira nome de cor nos prompts)'),
      marca: z.string().optional(),
      idioma: z.string().optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id, assunto, visual = {}, acento, marca, idioma }) => {
    const m = getMomento(id);
    if (!m) return fail(`Momento "${id}" não existe. Use listar_momentos.`);
    const pal = derivePalette({ ...m.paleta, ...(acento ? { accent: acento } : {}) });
    const vars = { subject: assunto, accent: colorName(pal.accent), brand: marca, product: marca, ...visual };
    const ctx = montarContexto({ marca: marca || 'MARCA', idioma });
    const caps = m.capitulos(ctx);
    const txt = [
      `# ${m.nome} (\`${m.id}\`)`, m.resumo, '', `**Verbo:** ${m.verbo}`, `**Para trás:** ${m.paraTras}`, `**Origem:** ${m.origem.join(', ')}`, `**Melhor para:** ${m.melhorPara.join(', ')}`, '',
      '## Placas', ...m.placas.map((p) => `- **${p.id}** (${p.papel}${p.editDe ? `, EDIT de ${p.editDe}` : ''}): \`${fill(p.prompt, vars)}\``),
      '', '## Filmes', ...(m.filmes.length ? m.filmes.map((f) => `- **${f.id}** ${f.inicio || '—'} → ${f.fim || '(livre)'} · ${f.modelo}${f.modo ? ' ' + f.modo : ''} · ${f.duracao || 10}s: \`${fill(f.prompt, vars)}\`${f.nota ? ` _(${f.nota})_` : ''}`) : ['- (3D real — sem filmes gerados)']),
      m.encadeado ? `\n**Encadeamento:** ${m.encadeado}` : '',
      m.tresD ? '\n## Regras do 3D\n' + m.tresD.map((r) => `- ${r}`).join('\n') : '',
      '', `## Instrumentos\n${m.instrumentos.map((x) => `- ${x}`).join('\n') || '-'}`,
      `## Interações\n${m.interacoes.map((x) => `- ${x}`).join('\n')}`,
      `## Som\n${JSON.stringify(m.som)}`,
      `## Capítulos sugeridos\n${caps.map((c) => `- ${c.id} (${c.type}${c.length ? ', ' + c.length + ' telas' : ''})${c.label ? ' — ' + c.label : ''}`).join('\n')}`,
      `## Paleta e tipo\n${Object.entries(m.paleta).map(([k, v]) => `${k} ${v}`).join(' · ')} · display ${m.tipografia.display}, texto ${m.tipografia.body}, mono ${m.tipografia.mono}`,
      `## Dicas\n${(m.dicas || []).map((d) => `- ${d}`).join('\n')}`,
    ].filter((x) => x !== '').join('\n');
    return result(txt);
  });

  server.registerTool('recomendar', {
    title: 'Recomendar momento e módulos',
    description: 'A partir de uma descrição livre do negócio ou site (ex.: "estética automotiva em Curitiba", "SaaS de previsão de churn"), detecta o segmento e recomenda o momento impossível, os módulos de negócio (orçamento, reserva, configurador, loja…) e o tom de copy.',
    inputSchema: { descricao: z.string(), segmento: z.string().optional() },
    annotations: { readOnlyHint: true },
  }, async ({ descricao, segmento }) => {
    const r = recomendar(descricao, { segmento });
    const txt = [
      r.segmentos.length ? `Segmento: **${r.segmentos[0].nome}** (palavras: ${r.segmentos[0].palavras.join(', ')})${r.segmentos.length > 1 ? ` · alternativas: ${r.segmentos.slice(1).map((s) => s.nome).join(', ')}` : ''}` : 'Segmento não identificado — usando recomendação genérica.',
      `Momentos: ${r.momentos.map((m, i) => `${i === 0 ? '**' : ''}${m.id}${i === 0 ? '**' : ''} (${m.nome})`).join(' · ')}`,
      `Por quê: ${r.momentos[0].resumo}`,
      `Módulos de negócio: ${r.modulos.map((m) => m.nome).join(' · ')}`,
      r.tom ? `Tom: ${r.tom}` : '',
      '',
      'Próximo passo: criar_briefing com marca, descricao e (opcional) produto_visual em inglês.',
    ].filter(Boolean).join('\n');
    return result(txt, r);
  });

  server.registerTool('listar_segmentos_e_modulos', {
    title: 'Listar segmentos e módulos de negócio',
    description: 'Lista os segmentos de negócio conhecidos (com seus momentos e módulos) e todos os módulos de negócio disponíveis para criar_briefing/adicionar_modulo.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  }, async () => {
    const txt = '## Segmentos\n' + SEGMENTOS.map((s) => `- **${s.id}** ${s.nome}: momentos ${s.momentos.join(', ')} · módulos ${s.modulos.map(([m]) => m).join(', ')}`).join('\n') +
      '\n\n## Módulos de negócio\n' + Object.entries(MODULOS).map(([id, m]) => `- **${id}** — ${m.nome}: ${m.descricao} _(origem: ${m.origem})_`).join('\n');
    return result(txt);
  });
}
