import { z } from 'zod';
import path from 'node:path';
import { getMomento } from '../knowledge/momentos.js';
import { getSegmento } from '../knowledge/segmentos.js';
import { montarSpec, planejarAssets, briefingMarkdown, montarContexto, pendencias } from '../lib/briefing.js';
import { derivePalette } from '../lib/palette.js';
import { revisarPrompt } from '../lib/lint.js';
import { result, fail, writeJson, writeText } from '../lib/util.js';

const visualShape = z.object({
  subject: z.string().optional(), setting: z.string().optional(), detail: z.string().optional(), parts: z.string().optional(),
  trigger: z.string().optional(), inner: z.string().optional(), material: z.string().optional(), liquid: z.string().optional(),
  flower: z.string().optional(), glow: z.string().optional(), opening: z.string().optional(), wardrobe: z.string().optional(),
  beats: z.string().optional(), stages: z.string().optional(), variant: z.string().optional(), particles: z.string().optional(), craft: z.string().optional(),
}).partial().describe('Lacunas dos prompts visuais, SEMPRE em inglês (ex.: subject "all-butter croissant", setting "a glowing deck oven", parts "glass lens elements, iris blades, gears")');

export const briefingInput = {
  marca: z.string().describe('Nome da marca/negócio'),
  descricao: z.string().describe('O que é o negócio/produto e o objetivo do site, em uma ou duas frases'),
  produto: z.string().optional().describe('Nome do produto-herói (ex.: "Croissant Pro")'),
  tagline: z.string().optional(),
  produto_visual: z.string().optional().describe('Descrição física do produto/sujeito EM INGLÊS para os prompts visuais'),
  visual: visualShape.optional(),
  segmento: z.string().optional().describe('Força um segmento (veja listar_segmentos_e_modulos)'),
  momento: z.string().optional().describe('Força um momento impossível (veja listar_momentos)'),
  modulos: z.array(z.string()).optional().describe('Força os módulos de negócio (ex.: ["orcamento","reserva"])'),
  idioma: z.string().optional().describe('Idioma do site (padrão pt-BR)'),
  moeda: z.string().optional().describe('BRL, USD, EUR…'),
  cidade: z.string().optional(), telefone: z.string().optional(), email: z.string().optional(), endereco: z.string().optional(),
  itens: z.array(z.object({ name: z.string(), result: z.string().optional(), year: z.string().optional(), href: z.string().optional() })).optional().describe('Projetos/obras reais (portfólio)'),
  paleta: z.object({ bg: z.string().optional(), text: z.string().optional(), accent: z.string().optional(), accent2: z.string().optional(), theme: z.enum(['dark', 'light']).optional() }).optional(),
  tipografia: z.object({ display: z.string().optional(), body: z.string().optional(), mono: z.string().optional(), displayStretch: z.number().optional() }).optional(),
  cursor: z.enum(['ring', 'dot', 'paint', 'none']).optional(),
  gerador: z.enum(['higgsfield', 'outro', 'nenhum']).optional().describe('higgsfield = parâmetros exatos do MCP Higgsfield; outro = genérico; nenhum = só fotos/procedural'),
  qualidade: z.enum(['high', 'max']).optional(),
  ficticio: z.boolean().optional().describe('Marca fictícia (rodapé avisa que é demonstração). Padrão true.'),
};

export function register(server) {
  server.registerTool('criar_briefing', {
    title: 'Criar briefing de imersão',
    description: 'Reconstrói, para qualquer marca, a espinha dos prompts validados: enquadramento → técnica → STILLS (placa-herói + edits) → FILMS (start/end frame, sem cortes) → FRAMES → WEBSITE (capítulos com instrumentos atrelados ao filme + módulo de negócio) → DESIGN → SOM/MOBILE/PERFORMANCE → VERIFY. Devolve o briefing em markdown, o spec do site (experience.json) e o plano de assets com custo estimado. Com "projeto", salva BRIEFING.md, experience.json e plano-de-assets.json na pasta.',
    inputSchema: { ...briefingInput, projeto: z.string().optional().describe('Pasta onde salvar os arquivos (não gera o site; para isso use criar_site)') },
  }, async (input) => {
    try {
      const { spec, ctx, moment, segment, palette } = montarSpec(input);
      const plan = planejarAssets({ moment, ctx, segment, input, palette });
      const md = briefingMarkdown({ spec, ctx, moment, segment, plan, input });
      const files = [];
      if (input.projeto) {
        const dir = path.resolve(input.projeto);
        await writeText(path.join(dir, 'BRIEFING.md'), md);
        await writeJson(path.join(dir, 'experience.json'), spec);
        await writeJson(path.join(dir, 'plano-de-assets.json'), plan);
        files.push(path.join(dir, 'BRIEFING.md'), path.join(dir, 'experience.json'), path.join(dir, 'plano-de-assets.json'));
      }
      const head = files.length ? `Arquivos salvos:\n${files.map((f) => '- ' + f).join('\n')}\n\nPróximo passo: criar_site com projeto="${input.projeto}" (usa o experience.json salvo). Depois gere as placas/filmes do plano e rode extrair_frames.\n\n---\n\n` : 'Próximo passo: criar_site com o spec abaixo (ou chame de novo com "projeto" para salvar os arquivos).\n\n---\n\n';
      const content = [{ type: 'text', text: head + md }];
      if (!input.projeto) content.push({ type: 'text', text: 'Spec (experience.json):\n```json\n' + JSON.stringify(spec, null, 2) + '\n```' });
      content.push({ type: 'text', text: 'Plano de assets:\n```json\n' + JSON.stringify({ custoEstimado: plan.custoEstimado, imagens: plan.imagens.map((i) => ({ id: i.id, editDe: i.editDe, parametros: i.parametros })), videos: plan.videos.map((v) => ({ id: v.id, parametros: v.parametros })), frames: plan.frames, pendencias: pendencias(spec) }, null, 2) + '\n```' });
      return { content };
    } catch (e) { return fail(String(e.stack || e)); }
  });

  server.registerTool('planejar_assets', {
    title: 'Planejar placas e filmes',
    description: 'Gera só o plano de geração para um momento: placa-herói, edits (com referência), filmes com start_image/end_image, modelo, modo, duração, prompts em inglês preenchidos, ordem de encadeamento, custo estimado em créditos e os comandos extrair_frames correspondentes. Use com o MCP do Higgsfield (gerador "higgsfield") ou qualquer outro.',
    inputSchema: {
      momento: z.string(), marca: z.string().optional(), produto: z.string().optional(),
      produto_visual: z.string().optional().describe('Sujeito EM INGLÊS'), visual: visualShape.optional(),
      acento: z.string().optional().describe('Cor de acento hex'), gerador: z.enum(['higgsfield', 'outro', 'nenhum']).optional(), qualidade: z.enum(['high', 'max']).optional(), segmento: z.string().optional(),
    },
    annotations: { readOnlyHint: true },
  }, async (input) => {
    const moment = getMomento(input.momento);
    if (!moment) return fail(`Momento "${input.momento}" não existe. Use listar_momentos.`);
    const ctx = montarContexto({ marca: input.marca, produto: input.produto });
    const palette = derivePalette({ ...moment.paleta, ...(input.acento ? { accent: input.acento } : {}) });
    const plan = planejarAssets({ moment, ctx, segment: input.segmento ? getSegmento(input.segmento) : null, input, palette });
    const txt = [
      `Plano para **${moment.nome}** (${plan.gerador}).`,
      ...plan.regras.map((r) => '- ' + r),
      '',
      '**Placas:**', ...plan.imagens.map((i, k) => `${k + 1}. ${i.id}${i.editDe ? ` (EDIT de ${i.editDe})` : ''}: ${i.prompt}`),
      '', '**Filmes:**', ...plan.videos.map((v, k) => `${k + 1}. ${v.id} — ${JSON.stringify(v.parametros)}\n   ${v.prompt}${v.nota ? `\n   nota: ${v.nota}` : ''}`),
      plan.encadeamento ? `\nEncadeamento: ${plan.encadeamento}` : '',
      plan.custoEstimado ? `\nCusto estimado: ~${plan.custoEstimado.creditos} créditos (${plan.custoEstimado.referencia}).` : '',
      plan.lacunasVisuais.length ? `\nLacunas a preencher (inglês): ${plan.lacunasVisuais.join(', ')}` : '',
    ].join('\n');
    return result(txt, plan);
  });

  server.registerTool('revisar_prompt_visual', {
    title: 'Revisar prompt de imagem/vídeo',
    description: 'Audita um prompt de placa (imagem) ou de movimento (vídeo) contra as lições dos prompts validados: plano contínuo sem cortes, descrição física em vez de metáfora, mudança espalhada pelo clipe, câmera com destino, placas como edits, sem texto/marcas reais, identidade de pessoas, inglês. Devolve nota, problemas e versão melhorada.',
    inputSchema: { prompt: z.string(), tipo: z.enum(['imagem', 'movimento']).optional(), modelo: z.string().optional(), assunto: z.string().optional() },
    annotations: { readOnlyHint: true },
  }, async ({ prompt, tipo, modelo, assunto }) => {
    const r = revisarPrompt(prompt, { tipo: tipo || 'movimento', modelo, assunto });
    const txt = `Nota ${r.nota}/10\n${r.problemas.length ? r.problemas.map((p) => `- [${p.gravidade}] ${p.regra}: ${p.detalhe}${p.correcao ? ` → ${p.correcao}` : ''}`).join('\n') : '- Nenhum problema encontrado.'}\n\nVersão sugerida:\n${r.promptMelhorado}`;
    return result(txt, r);
  });
}
