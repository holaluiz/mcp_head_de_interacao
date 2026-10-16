// Compositor de briefing: reconstrói a espinha dos prompts validados
// (enquadramento → técnica → stills → films → frames → website → design →
// som/mobile/performance → verify) para qualquer marca, e produz o spec
// (experience.json) e o plano de assets.
import { MOMENTOS, getMomento } from '../knowledge/momentos.js';
import { SEGMENTOS, getSegmento, detectarSegmentos } from '../knowledge/segmentos.js';
import { buildModulo, MODULOS } from '../knowledge/modulos.js';
import { MODELOS, PRINCIPIOS, CHECKLIST_VERIFICACAO, RESGATE } from '../knowledge/principios.js';
import { derivePalette, colorName, checkPalette } from './palette.js';
import { slug, isEn } from './util.js';

export function fill(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? String(vars[k]) : `[[${k}]]`));
}

export function recomendar(texto, { segmento, momento } = {}) {
  const segs = segmento ? [{ id: segmento, score: 99, palavras: ['(informado)'] }] : detectarSegmentos(texto, 3);
  const seg = segs.length ? getSegmento(segs[0].id) : null;
  let moms = [];
  if (momento && getMomento(momento)) moms = [momento];
  else if (seg) moms = seg.momentos.slice();
  if (!moms.length) {
    const physical = /produto|product|objeto|garrafa|bottle|joia|relógio|watch|tênis|sneaker|caixa|box|perfume|câmera|camera/i.test(texto || '');
    moms = physical ? ['explosao-remontagem', 'orbita-produto'] : ['montagem-particulas', 'travessia'];
  }
  return {
    segmentos: segs.map((s) => ({ ...s, nome: (getSegmento(s.id) || {}).nome || s.id })),
    segmento: seg ? seg.id : null,
    momentos: moms.map((id) => { const m = getMomento(id); return { id, nome: m.nome, resumo: m.resumo, motor: m.motor }; }),
    momento: moms[0],
    modulos: seg ? seg.modulos.map(([id]) => ({ id, nome: (MODULOS[id] || {}).nome || id })) : [{ id: 'espera', nome: MODULOS.espera.nome }],
    tom: seg ? seg.tom : null,
  };
}

function uniqueIds(chapters) {
  const seen = new Map();
  for (const c of chapters) {
    const base = c.id || c.type || 'secao';
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    c.id = n ? `${base}-${n + 1}` : base;
  }
  return chapters;
}

export function montarContexto(input = {}) {
  const lang = input.idioma || 'pt-BR';
  const brand = input.marca || '[[MARCA]]';
  return {
    lang, brand,
    tagline: input.tagline || '',
    product: input.produto || '',
    city: input.cidade || '',
    phone: input.telefone || '',
    email: input.email || '',
    address: input.endereco || '',
    currency: input.moeda || (String(lang).toLowerCase().startsWith('en') ? 'USD' : 'BRL'),
    items: Array.isArray(input.itens) ? input.itens : [],
    fictional: input.ficticio !== false,
  };
}

export function montarSpec(input = {}) {
  const rec = recomendar(`${input.descricao || ''} ${input.marca || ''} ${input.produto || ''}`, { segmento: input.segmento, momento: input.momento });
  const moment = getMomento(rec.momento);
  const segment = rec.segmento ? getSegmento(rec.segmento) : null;
  const ctx = montarContexto(input);
  const palette = derivePalette({ ...moment.paleta, ...(input.paleta || {}) });
  const fonts = { ...moment.tipografia, ...(input.tipografia || {}) };
  ctx.fallbackPreset = moment.fallbackPreset;

  const chapters = moment.capitulos(ctx).map((c) => ({ ...c }));
  const mods = (input.modulos && input.modulos.length ? input.modulos.map((id) => [id, {}]) : segment ? segment.modulos : [['espera', {}]]);
  for (const [id, opts] of mods) {
    const ch = buildModulo(id, ctx, opts);
    if (ch) chapters.push(ch);
  }
  if (!chapters.some((c) => ['cta', 'booking', 'configurator', 'order', 'shop'].includes(c.type))) chapters.push(buildModulo('espera', ctx, {}));
  uniqueIds(chapters);

  const spec = {
    $schema: 'head-de-interacao/experience@1',
    version: 1,
    brand: ctx.brand,
    title: input.titulo || `${ctx.brand}${ctx.tagline ? ' — ' + ctx.tagline : ''}`,
    description: input.descricao || ctx.tagline || '',
    tagline: ctx.tagline,
    lang: ctx.lang,
    currency: ctx.currency,
    fictional: ctx.fictional,
    moment: moment.id,
    segment: segment ? segment.id : null,
    engine: moment.motor === '3d' ? '3d' : 'frames',
    palette,
    fonts,
    loader: { style: moment.loader || 'line' },
    gate: moment.gate ? { label: isEn(ctx) ? 'Go for launch' : 'Pronto para começar' } : null,
    cursor: input.cursor || moment.cursor || 'ring',
    grain: input.grao !== false,
    vignette: false,
    smooth: 0.1,
    sound: { enabled: true, ambient: moment.som && moment.som.ambiente ? moment.som.ambiente : null },
    index: true,
    fallbackPreset: moment.fallbackPreset,
    chapters,
  };
  return { spec, ctx, moment, segment, rec, palette };
}

function visualVars(ctx, moment, segment, input, palette) {
  const v = input.visual || {};
  return {
    subject: v.subject || input.produto_visual || (segment ? segment.assunto : ''),
    accent: v.accent || colorName(palette.accent),
    brand: ctx.brand,
    product: ctx.product || ctx.brand,
    setting: v.setting, detail: v.detail, parts: v.parts, trigger: v.trigger, inner: v.inner, material: v.material,
    liquid: v.liquid, flower: v.flower, glow: v.glow, opening: v.opening, wardrobe: v.wardrobe, beats: v.beats,
    stages: v.stages, variant: v.variant, particles: v.particles, craft: v.craft,
  };
}

function modelCost(f) {
  const id = String(f.modelo || '');
  if (id.startsWith('kling3_0')) return { cr: 60 * Math.max(1, Math.round((f.duracao || 10) / 10)), modelo: 'kling3_0' };
  if (id.startsWith('cinematic_studio')) return { cr: 240, modelo: 'cinematic_studio_3_0' };
  if (id.startsWith('seedance_2_5')) return { cr: 360 * Math.max(1, Math.round((f.duracao || 30) / 30)), modelo: 'seedance_2_5' };
  if (id.startsWith('seedance_2_0')) return { cr: f.modo === 'std' ? 30 : 220, modelo: 'seedance_2_0' };
  return { cr: 30, modelo: 'melhor image-to-video disponível' };
}

export function planejarAssets({ moment, ctx, segment, input = {}, palette }) {
  const gen = input.gerador || 'higgsfield';
  const vars = visualVars(ctx, moment, segment, input, palette || derivePalette(moment.paleta));
  const quality = input.qualidade === 'max' ? 'max' : 'high';
  const imagens = moment.placas.map((p) => ({
    id: p.id, papel: p.papel, editDe: p.editDe || null, prompt: fill(p.prompt, vars),
    parametros: gen === 'higgsfield' ? { model: 'gpt_image_2_5', resolution: '4k', quality, aspect_ratio: '16:9', ...(p.editDe ? { image_reference: `<job id da placa "${p.editDe}">` } : {}) } : { proporcao: '16:9', resolucao: '4K', ...(p.editDe ? { referencia: `placa "${p.editDe}" (faça um EDIT, não uma imagem nova)` } : {}) },
  }));
  const videos = moment.filmes.map((f) => {
    const c = modelCost(f);
    const start = f.inicio ? (String(f.inicio).endsWith(':ultimo') ? `<último frame do clipe "${f.inicio.split(':')[0]}">` : `<placa "${f.inicio}">`) : null;
    const end = f.fim ? `<placa "${f.fim}">` : null;
    const params = gen === 'higgsfield'
      ? { model: c.modelo, mode: f.modo || (c.modelo === 'kling3_0' ? '4k' : undefined), duration: f.duracao || 10, resolution: f.resolucao || undefined, sound: 'off', aspect_ratio: '16:9', start_image: start, end_image: end, references: f.referencias ? f.referencias.map((r) => `<placa "${r}">`) : undefined }
      : { duracao: `${f.duracao || 10} s`, proporcao: '16:9', quadro_inicial: start, quadro_final: end, audio: 'desligado' };
    for (const k of Object.keys(params)) if (params[k] === undefined || params[k] === null) delete params[k];
    return { id: f.id, prompt: fill(f.prompt, vars), parametros: params, nota: f.nota || null, custoEstimado: gen === 'higgsfield' ? c.cr : null };
  });
  const custoImg = imagens.length * (quality === 'max' ? 15 : 4.25);
  const custoVid = videos.reduce((s, v) => s + (v.custoEstimado || 0), 0);
  const pend = new Set();
  for (const x of [...imagens, ...videos]) for (const m of x.prompt.matchAll(/\[\[(\w+)\]\]/g)) pend.add(m[1]);
  return {
    gerador: gen,
    regras: [
      'Gere UMA placa-herói primeiro; toda outra placa é EDIT dela (passe o job id como referência de imagem).',
      'Todo filme recebe start_image e end_image; loop = a mesma placa nos dois.',
      '“One continuous shot, no cuts” em todo prompt de movimento; câmera suave.',
      'Faça preflight do custo de cada geração antes de enviar e acompanhe o saldo.',
      'Se um preset for recomendado no lugar do job, reenvie com o preset recusado (declined_preset_id).',
      'Prompts visuais em inglês, descrevendo luz e matéria fisicamente; “no text, no watermark”.',
      'Baixe os MP4 para media/brutos/ no projeto e rode extrair_frames.',
    ],
    imagens,
    videos,
    extra3d: moment.extra3d || null,
    encadeamento: moment.encadeado || null,
    frames: videos.map((v) => ({ video: `media/brutos/${v.id}.mp4`, nome: v.id, quadros: 200, largura: 1920 })),
    custoEstimado: gen === 'higgsfield' ? { creditos: Math.round(custoImg + custoVid), imagens: custoImg, videos: custoVid, referencia: 'preços Higgsfield de set/2026 nos PDFs; confirme com preflight' } : null,
    lacunasVisuais: [...pend],
  };
}

function chapterLine(c, i) {
  const n = String(i + 1).padStart(2, '0');
  const parts = [];
  if (c.type === 'cinema') {
    const m = c.media || {};
    parts.push(m.kind === 'frames' ? `scrub da sequência **${m.seq}**${m.reverse ? ' AO CONTRÁRIO' : ''} (fallback: ${m.fallback || 'procedural'})` : `mídia ${m.kind}${m.preset ? ' ' + (typeof m.preset === 'string' ? m.preset : '') : ''}`);
    if (m.cam) parts.push('câmera com keyframes (zoom/deslocamento)');
    const texts = (c.groups || []).flatMap((g) => g.items || []).filter((x) => x.type === 'text').map((x) => `“${x.text}” (${x.in}–${x.out})`);
    if (texts.length) parts.push('texto: ' + texts.join(', '));
    const meters = (c.groups || []).flatMap((g) => g.items || []).filter((x) => x.type === 'meter').map((x) => `${x.label} ${x.keys[0][1]}→${x.keys[x.keys.length - 1][1]} ${x.unit || ''}`.trim());
    if (meters.length) parts.push('medidores: ' + meters.join('; '));
    const st = (c.groups || []).flatMap((g) => g.items || []).filter((x) => x.type === 'status' || x.type === 'steps');
    if (st.length) parts.push('status/etapas atrelados ao filme');
    if (c.callouts && c.callouts.length) parts.push(`${c.callouts.length} callouts com linhas finas`);
    if (c.bg) parts.push('fundo da página sincronizado');
    if (c.shake) parts.push('palco treme com a velocidade');
    if (c.sound) parts.push(`textura sonora "${c.sound}"`);
    if (c.hits) parts.push('golpe sonoro: ' + c.hits.map((h) => `${h.preset} em ${h.at}`).join(', '));
    if (c.warp) parts.push('time-warp (momentos lentos ganham mais scroll)');
    if (c.hint) parts.push(`dica: “${c.hint}”`);
  } else if (c.type === 'lines') parts.push(`${(c.lines || []).length} linhas, uma por passo (${c.mode || 'stack'})`);
  else if (c.type === 'lens') parts.push(`lente sobre ${c.base} com ${(c.layers || []).map((l) => l.name).join(' / ')}`);
  else if (c.type === 'compare') parts.push(`antes/depois ${c.before} ↔ ${c.after}`);
  else if (c.type === 'spin') parts.push(`arraste para girar com a sequência ${c.seq}`);
  else if (c.type === 'configurator') parts.push(`${c.wizard ? 'assistente em etapas' : 'configurador'}: ${(c.groups || []).map((g) => g.label).join(', ')} → ${(c.outputs || []).map((o) => o.label).join(', ')}`);
  else parts.push(c.title || '');
  const len = c.length ? `, ${c.length} telas` : '';
  return `- **${n} · ${c.label || c.id}** \`${c.type}\`${len} — ${parts.filter(Boolean).join(' · ')}`;
}

export function pendencias(spec) {
  const found = new Set();
  const walk = (v) => {
    if (typeof v === 'string') for (const m of v.matchAll(/\[\[([^\]]+)\]\]/g)) found.add(m[1]);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(spec.chapters);
  if (String(spec.brand).includes('[[')) found.add('MARCA');
  return [...found];
}

export function briefingMarkdown({ spec, ctx, moment, segment, plan, input = {} }) {
  const pal = spec.palette;
  const gen = plan.gerador;
  const en = isEn(ctx);
  const warns = checkPalette(pal);
  const pend = pendencias(spec);
  const L = [];
  L.push(`# Briefing de imersão — ${spec.brand}`);
  L.push('');
  L.push(`> Momento: **${moment.nome}** · Segmento: **${segment ? segment.nome : 'geral'}** · Motor: **${spec.engine === '3d' ? '3D real (Three.js + GSAP) + motor de imersão' : 'sequência de frames (motor de imersão)'}** · Idioma do site: **${spec.lang}** · Gerador: **${gen}**`);
  L.push('');
  L.push('## 1. Enquadramento');
  L.push(`Construa um site de scroll cinematográfico, nível Awwwards, para **${spec.brand}**${input.descricao ? ` — ${input.descricao}` : ''}. ${moment.verbo}`);
  L.push('');
  L.push(`Linha em inglês para geradores/revisores: *Build an award-winning cinematic 3D scroll website for ${spec.brand}${spec.fictional ? ', a fictional brand' : ''}: ${fill(moment.conceitoEN, { subject: plan.imagens[0] ? (input.produto_visual || (input.visual || {}).subject || (segment ? segment.assunto : '[[subject]]')) : '[[subject]]', product: ctx.product || spec.brand, brand: spec.brand, setting: (input.visual || {}).setting, trigger: (input.visual || {}).trigger })}.*`);
  L.push('');
  L.push(`**O momento impossível:** ${moment.resumo}`);
  L.push(`**Para trás:** ${moment.paraTras}`);
  L.push('');
  L.push('## 2. A técnica (siga à risca)');
  if (spec.engine === '3d') {
    L.push('- Este momento pede **3D real**: React/Three.js + GSAP, geometria e personagens reais. Amarre a cena ao progresso dos capítulos com `Imersao.onProgress(id, p => …)` em `js/site.js` — o motor cuida de loader, fixação, índice, som, modo solo e verificação.');
    for (const r of moment.tresD || []) L.push(`- ${r}`);
    L.push('- Até a cena 3D existir, cada capítulo mostra um fallback procedural (o site já funciona).');
  } else {
    L.push('- **Não é Three.js nem WebGL.** É um scrub de sequência de imagens: cada filme vira ~200 frames, todos pré-carregados; o progresso de scroll de um capítulo fixado escolhe o frame pintado num canvas de tela cheia (cover-fit, lerp, rAF, repinta só quando o índice muda).');
    L.push('- O **motor HEAD de Interação** já implementa tudo isso de forma declarativa (`data-im-*`). Não reescreva o scroll: gere o site com `criar_site` usando o spec deste briefing e ajuste o HTML.');
    L.push('- Enquanto os filmes não existem, cada capítulo usa fallback (fotos → procedural). Quando os frames chegam ao manifesto, o scrub real assume sozinho.');
  }
  L.push('');
  L.push('## 3. STILLS — placas');
  if (gen === 'nenhum') L.push('Sem gerador de IA: use fotos reais (antes/depois, ambientes, produto) nas pastas `img/` e os fallbacks procedurais. Pule para a seção 6.');
  else {
    L.push(gen === 'higgsfield' ? 'Higgsfield MCP · `gpt_image_2_5` · 4k · quality high · 16:9.' : 'Qualquer gerador de imagem com edição por referência · 16:9 · 4K.');
    L.push('Gere **UMA** placa-herói; toda outra é **EDIT** dela (passe o job id como referência) para manter produto, câmera e luz idênticos.');
    L.push('');
    plan.imagens.forEach((im, i) => L.push(`${i + 1}. **${im.id}** — ${im.papel}${im.editDe ? ` · EDIT de \`${im.editDe}\`` : ''}\n   \`${im.prompt}\``));
  }
  L.push('');
  L.push('## 4. FILMS');
  if (gen === 'nenhum' || !plan.videos.length) L.push(plan.videos.length ? 'Sem gerador: os capítulos ficam com mídias procedurais/fotos.' : 'Este momento não usa filmes gerados (3D real).');
  else {
    L.push(gen === 'higgsfield' ? 'Sempre passe **start_image E end_image** — é assim que se controla onde o plano aterrissa. Som desligado, 16:9.' : 'Use um gerador image-to-video que aceite quadro inicial e final. Som desligado, 16:9.');
    L.push('');
    L.push('| Clipe | Início → fim | Parâmetros | Prompt |');
    L.push('|---|---|---|---|');
    for (const v of plan.videos) {
      const p = v.parametros;
      const se = `${p.start_image || p.quadro_inicial || '—'} → ${p.end_image || p.quadro_final || '(livre)'}`;
      const pr = Object.entries(p).filter(([k]) => !['start_image', 'end_image', 'quadro_inicial', 'quadro_final'].includes(k)).map(([k, x]) => `${k}: ${Array.isArray(x) ? x.join(' + ') : x}`).join(', ');
      L.push(`| **${v.id}** | ${se} | ${pr} | ${v.prompt.replace(/\|/g, '/')}${v.nota ? ` _(${v.nota})_` : ''} |`);
    }
    if (plan.encadeamento) L.push(`\n**Encadeamento:** ${plan.encadeamento}`);
    if (plan.extra3d) L.push(`\n**Modelo 3D:** \`${plan.extra3d.modelo}\` a partir da placa \`${plan.extra3d.de}\`. ${plan.extra3d.nota}`);
    L.push('');
    L.push('- Se aparecer um preset recomendado no lugar do vídeo, reenvie recusando-o (`declined_preset_id`).');
    L.push('- Plano-herói é 80% do impacto: gere 2–3 takes dele (ou faça o bake-off em 2–3 modelos com `folha_de_contato`) e fique com o que espalha a mudança pelo clipe.');
    if (plan.custoEstimado) L.push(`- Custo estimado: **~${plan.custoEstimado.creditos} créditos** (${plan.custoEstimado.referencia}).`);
  }
  L.push('');
  L.push('## 5. FRAMES');
  L.push('Baixe cada MP4 para `media/brutos/<clipe>.mp4` e rode `extrair_frames` (projeto, video, nome do clipe). A ferramenta corta os frames que o modelo segura no início/fim (freezedetect), avisa sobre cortes secos, fatia ~200 frames a 1920 px em JPEG q3 (`frames/<clipe>/frame_0001.jpg`), gera o MP4 leve de fallback e o pôster, e registra tudo em `imersao.manifest.json`. Movimento rápido? use `interpolar: true` (48 fps local) ou o FPS boost do gerador.');
  L.push('');
  L.push('## 6. WEBSITE — capítulos');
  L.push('Capítulos fixados com Lenis. Instrumentos atrelados ao que está **na tela** (keyframes não lineares), não à porcentagem do scroll.');
  L.push('');
  spec.chapters.forEach((c, i) => L.push(chapterLine(c, i)));
  L.push('');
  L.push(`**Interações do momento:** ${moment.interacoes.join('; ')}.`);
  L.push(`**Instrumentos do momento:** ${moment.instrumentos.join('; ') || '—'}.`);
  if (segment) L.push(`**Tom de copy (${segment.nome}):** ${segment.tom}`);
  L.push('');
  L.push('## 7. DESIGN');
  L.push(`Registro: fundo ${pal.theme === 'light' ? 'claro editorial' : 'quase preto'}, **um** acento usado com parcimônia (só onde há luz/calor/ação), poucas palavras, espaço negativo enorme, sem cards pesados nem sombras.`);
  L.push('');
  L.push('| Token | Cor |');
  L.push('|---|---|');
  for (const k of ['bg', 'surface', 'text', 'muted', 'accent', 'accent2', 'line']) L.push(`| ${k} | \`${pal[k]}\` |`);
  L.push('');
  L.push(`Tipografia: display **${spec.fonts.display}**${spec.fonts.displayStretch ? ` (largura ${spec.fonts.displayStretch}%)` : ''}, texto **${spec.fonts.body}**, leituras em **${spec.fonts.mono}** (caps espaçadas). Loader: \`${spec.loader.style}\`${spec.gate ? ' com portão que liga o som' : ''}. Cursor: \`${spec.cursor}\`. Grão de filme: ${spec.grain ? 'sim' : 'não'}.`);
  for (const w of warns) L.push(`- ⚠ ${w}`);
  L.push('');
  L.push('## 8. SOM · MOBILE · PERFORMANCE');
  L.push(`- Som desligado por padrão, tudo sintetizado com Web Audio; ${moment.som && (moment.som.textura || moment.som.ambiente) ? `textura "${moment.som.textura || moment.som.ambiente}" só enquanto o filme se move; ` : ''}${moment.som && moment.som.golpes ? `golpe no grande momento (${moment.som.golpes.map((g) => g.preset).join(', ')}); ` : ''}\`?mute=1\` para testes.`);
  L.push('- Abaixo de 768 px usa o MP4 leve em loop (ou scrub com `data-im-mobile-scrub`); com movimento reduzido tudo fica estático e legível.');
  L.push('- rAF único, repintar só quando o frame muda, frames carregados do grosso ao fino, loop que nunca para se um frame falhar.');
  L.push('');
  L.push('## 9. VERIFY — antes de dizer que terminou');
  L.push('`servir_site` (porta própria) → `verificar_site` (cada capítulo em 10/50/90%, ida e volta, desktop + celular + movimento reduzido, console limpo, screenshots) → corrigir → repetir.');
  for (const c of CHECKLIST_VERIFICACAO) L.push(`- [ ] ${c}`);
  L.push('');
  if (pend.length) {
    L.push('## 10. Pendências para preencher');
    L.push('Substitua estes marcadores `[[…]]` por fatos reais (nada inventado):');
    L.push(pend.map((p) => `\`[[${p}]]\``).join(' · '));
    L.push('');
  }
  if (plan.lacunasVisuais && plan.lacunasVisuais.length && gen !== 'nenhum') {
    L.push(`**Lacunas dos prompts visuais (em inglês):** ${plan.lacunasVisuais.map((x) => `\`${x}\``).join(', ')} — preencha via parâmetro \`visual\` ou edite os prompts.`);
    L.push('');
  }
  L.push('## Dicas deste momento');
  for (const d of moment.dicas || []) L.push(`- ${d}`);
  L.push('');
  L.push('## Se sair do trilho');
  for (const r of RESGATE) L.push(`- **${r.quando}:** “${r.fala}”`);
  L.push('- Dirija com sentimentos depois da primeira passada (“o título cobre o produto”, “a explosão é rápida demais”) — use `nota_de_direcao`.');
  return L.join('\n');
}

export { MOMENTOS, SEGMENTOS, PRINCIPIOS, MODELOS };
