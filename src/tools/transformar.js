import { z } from 'zod';
import { analisarOrigem, mapaDeImersao, transformarSite, trechoManual } from '../lib/transform.js';
import { recomendar } from '../lib/briefing.js';
import { result, fail } from '../lib/util.js';

const prologoShape = z.object({
  tipo: z.enum(['particulas', 'estilhacos', 'imagem', 'frames', 'video', 'nenhum']).optional().describe('particulas = partículas formando a marca; estilhacos = imagem do herói se monta em fragmentos; imagem = push-in com foco; frames = scrub real (rode extrair_frames com nome "prologo" depois); video; nenhum'),
  imagem: z.string().optional().describe('Imagem para estilhacos/imagem (padrão: a do herói)'),
  seq: z.string().optional().describe('Nome da sequência de frames (padrão "prologo")'),
  video: z.string().optional(),
  titulo: z.string().optional(), subtitulo: z.string().optional(), sobretitulo: z.string().optional(),
  texto_particulas: z.string().optional().describe('Texto que as partículas formam (padrão: a marca)'),
  telas: z.number().min(1).max(8).optional().describe('Telas de scroll do prólogo (padrão 2.6)'),
  rotulo: z.string().optional(),
}).partial();

export function register(server) {
  server.registerTool('analisar_site', {
    title: 'Analisar site existente',
    description: 'Lê um site já feito (pasta, arquivo .html, build de React/Vue/Vite ou URL) e devolve: marca, idioma, se é SPA, bibliotecas de scroll/animação já usadas, paleta e fontes detectadas, o herói, cada seção classificada (herói, texto, galeria, números, depoimentos, preços, formulário, FAQ, logos, rodapé) e o MAPA DE IMERSÃO — o que cada seção vai receber — além do momento impossível recomendado para um prólogo. Não altera nada.',
    inputSchema: {
      origem: z.string().describe('Pasta do site, arquivo .html ou URL (https://…)'),
      pagina: z.string().optional().describe('Página principal relativa à pasta (padrão index.html)'),
      intensidade: z.enum(['sutil', 'media', 'alta']).optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ origem, pagina, intensidade }) => {
    try {
      const { origem: o, analise: an } = await analisarOrigem(origem, { pagina });
      if (!an) return result(`${o.notas.join('\n')}\n\nInstalação manual no layout do framework:\n\`\`\`html\n${trechoManual(intensidade)}\n\`\`\``);
      const mapa = mapaDeImersao(an, intensidade || 'media');
      const rec = recomendar(`${an.marca} ${an.descricao} ${an.titulo} ${an.secoes.map((s) => s.titulo || '').join(' ')}`);
      const e = an.estilo;
      const txt = [
        `# ${an.marca}`,
        `${o.tipo === 'url' ? o.url : o.dir}${o.pagina ? ' · ' + o.pagina : ''} · idioma ${an.idioma}${o.framework ? ' · ' + o.framework : ''}`,
        ...o.notas.map((n) => `> ${n}`),
        an.spa.spa ? `**SPA:** ${an.spa.motivos.join(', ')} → a transformação usa um plano aplicado em tempo de execução (o motor marca os elementos depois que o JavaScript do site renderiza).` : '**HTML estático:** os atributos são gravados direto na cópia.',
        an.scroll.suave.length ? `Rolagem suave própria: ${an.scroll.suave.join(', ')} (o Lenis do motor fica desligado para não brigar).` : 'Sem rolagem suave própria: o motor liga o Lenis.',
        an.scroll.animacao.length ? `Animações já presentes: ${an.scroll.animacao.join(', ')} (elementos já animados serão pulados).` : '',
        `Paleta: fundo ${e.bg || '?'} · texto ${e.text || '?'} · acento ${e.accent || '?'} (tema ${e.theme}) · fontes ${e.fontes.display || '?'} / ${e.fontes.body || '?'}`,
        an.hero ? `Herói: \`${an.hero.seletor}\` — “${an.hero.titulo || ''}”${an.hero.imagem ? ` · imagem ${an.hero.imagem}` : ''}` : 'Herói não identificado.',
        '', '## Mapa de imersão',
        ...mapa.map((m) => `- \`${m.seletor}\` **${m.tipo}**${m.titulo ? ` “${m.titulo.slice(0, 50)}”` : ''} → ${m.tratamento}`),
        '', '## Prólogo cinematográfico',
        `Momento sugerido para o negócio: **${rec.momentos[0].nome}** (\`${rec.momento}\`). Sem filmes ainda: prólogo com ${an.hero && an.hero.imagem ? '"estilhacos" (a imagem do herói se monta em fragmentos) ou ' : ''}"particulas" (formam o nome ${an.marca}). Com filmes: criar_briefing → planejar_assets → extrair_frames com nome "prologo" na cópia transformada.`,
        '', `Próximo passo: transformar_site com origem="${origem}" (intensidade ${intensidade || 'media'}).`,
      ].filter((x) => x !== '').join('\n');
      return result(txt, { tipo: o.tipo, framework: o.framework || null, spa: an.spa, scroll: an.scroll, estilo: an.estilo, hero: an.hero, secoes: an.secoes, totais: an.totais, recomendacao: { momento: rec.momento, segmento: rec.segmento } });
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('transformar_site', {
    title: 'Transformar site existente em imersivo',
    description: 'Cria uma CÓPIA imersiva de um site já feito (o original nunca é tocado): instala o motor, liga rolagem suave, revelações em títulos e parágrafos, cascata em grades/galerias, contadores nos números, botões magnéticos, índice de seções, barra de progresso, cursor e um PRÓLOGO cinematográfico fixado antes do herói (partículas formando a marca, imagem se montando em fragmentos, push-in ou scrub de frames). Formulários reais continuam reais. Pode inserir um manifesto (uma linha por passo) e capítulos extras. Gera IMERSAO.md com cada alteração, servidor local e launchers.',
    inputSchema: {
      origem: z.string().describe('Pasta, arquivo .html, build de SPA ou URL'),
      saida: z.string().optional().describe('Pasta da cópia (padrão: <origem>-imersivo ao lado da original)'),
      pagina: z.string().optional(),
      intensidade: z.enum(['sutil', 'media', 'alta']).optional().describe('sutil = revelações e rolagem suave; media (padrão) = + parágrafos, cascatas, índice, cursor, prólogo; alta = + máscaras, inclinação, parallax, faixa de logos, grão, prólogo em fragmentos'),
      prologo: prologoShape.optional(),
      manifesto: z.array(z.string()).optional().describe('Linhas curtas para um capítulo-manifesto logo depois do herói (uma por passo de scroll)'),
      capitulos: z.array(z.object({ capitulo: z.record(z.any()), antes_de: z.string().optional().describe('Seletor CSS'), depois_de: z.string().optional() })).optional().describe('Capítulos extras no formato do spec (cinema, lens, compare, stats…)'),
      marca: z.string().optional(),
      acento: z.string().optional().describe('Cor de acento hex (padrão: detectada no CSS)'),
      fonte_display: z.string().optional(), fonte_texto: z.string().optional(),
      fundo_capitulos: z.string().optional().describe('Cor do palco dos capítulos inseridos (padrão: tom escuro do site)'),
      cursor: z.enum(['ring', 'dot', 'paint', 'none']).optional(),
      grao: z.boolean().optional(), vinheta: z.boolean().optional(),
      suave: z.number().min(0).max(1).optional().describe('lerp do Lenis (0.07 pesado … 0.2 ágil); 0 desliga a rolagem suave'),
      som: z.boolean().optional().describe('Textura e golpe sonoros no prólogo (desligados até o visitante clicar). Padrão true.'),
      max_paginas: z.number().int().min(1).max(400).optional(),
      sobrescrever: z.boolean().optional().describe('Refaz uma transformação existente a partir do original (frames/, media/ e manifesto são mantidos)'),
    },
  }, async (o) => {
    try {
      const r = await transformarSite(o);
      if (!r.ok) return fail(r.mensagem);
      const tot = r.relatorio.reduce((s, p) => s + p.alteracoes, 0);
      const txt = [
        `Cópia imersiva pronta em ${r.saida}${r.raizServida !== r.saida ? ` (servida a partir de ${r.raizServida})` : ''}.`,
        `${r.relatorio.length} página(s) · ${tot} alterações · ${r.capitulos.length} capítulo(s) inserido(s): ${r.capitulos.map((c) => `#${c.id} (${c.media ? c.media.kind : c.type})`).join(', ') || '—'}.`,
        ...r.relatorio.filter((p) => p.modo === 'runtime').map((p) => `${p.pagina}: SPA — plano aplicado em tempo de execução.`),
        '', 'Relatório completo em IMERSAO.md. Próximo passo: servir_site e verificar_site com projeto="' + r.raizServida + '".',
        '', '---', '', r.markdown,
      ].join('\n');
      return result(txt);
    } catch (e) { return fail(String(e.message || e)); }
  });
}
