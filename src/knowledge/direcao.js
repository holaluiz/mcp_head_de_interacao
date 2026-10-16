// Notas de direção: traduz sentimentos ("o título cobre o produto", "a explosão
// é rápida demais", "faça parecer mais caro") em ajustes concretos no spec.
// Lição dos prompts validados: descrever o problema funciona melhor que
// prescrever a correção — esta tabela é a ponte entre os dois.

const cinema = (spec) => (spec.chapters || []).filter((c) => c.type === 'cinema' || c.type === 'lines');
const textItems = (ch) => (ch.groups || []).flatMap((g) => g.items || []).filter((it) => it.type === 'text');
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (n) => Math.round(n * 100) / 100;

/* O capítulo do clímax: o que tem golpe sonoro, senão o segundo cinema. */
function climax(list) {
  return list.find((c) => c.hits && c.hits.length) || list[1] || list[0];
}
function climaxAt(ch) {
  return ch && ch.hits && ch.hits.length ? ch.hits[0].at : 0.5;
}

export const REGRAS = [
  {
    id: 'titulo-cobre',
    nome: 'O texto cobre o sujeito',
    padroes: [/(t[ií]tulo|texto|letra|tipografia|legenda).{0,30}(cobre|tapa|em cima|sobre o produto|esconde|atrapalha)/i, /cobre o (produto|objeto|sujeito)/i, /(text|title|copy).{0,20}(covers|over the|on top of|hides)/i],
    diagnostico: 'Texto centralizado disputa o mesmo espaço do sujeito no filme.',
    ajustes: ['Tirar o texto do centro: grupos vão para a esquerda/direita (ou base).', 'Garantir a sombra (im-shade) por trás do texto.', 'Encolher o display XL para o tamanho médio.', 'Fazer o texto sair ANTES do clímax e voltar depois.'],
    escopo: 'capitulo',
    aplicar(spec, alvos) {
      const out = [];
      for (const ch of alvos) {
        let side = 0;
        for (const g of ch.groups || []) {
          const onlyCue = (g.items || []).every((it) => it.type === 'scrollcue');
          if (onlyCue) continue;
          if (['center', 'top-center', 'full'].includes(g.pos || 'center')) { const np = side++ % 2 ? 'right' : 'left'; out.push(`${ch.id}: grupo ${g.pos || 'center'} → ${np}`); g.pos = np; }
          else if (g.pos === 'bottom-center') { g.pos = 'bottom-left'; out.push(`${ch.id}: grupo bottom-center → bottom-left`); }
          for (const it of g.items || []) {
            if (it.type === 'text' && /display-xl/.test(it.cls || '')) { it.cls = it.cls.replace('display-xl', 'display-md'); out.push(`${ch.id}: "${String(it.text).slice(0, 24)}" display-xl → display-md`); }
          }
        }
        if (ch.shade === false) { delete ch.shade; out.push(`${ch.id}: sombra ligada`); }
        const at = ch.hits && ch.hits.length ? ch.hits[0].at : null;
        if (at != null) {
          for (const it of textItems(ch)) {
            if (it.in != null && it.out != null && it.in < at && it.out > at && it.out - it.in < 0.7) { it.out = r2(Math.max(it.in + 0.08, at - 0.04)); out.push(`${ch.id}: texto sai em ${it.out} (antes do clímax em ${at})`); }
          }
        }
      }
      return out;
    },
  },
  {
    id: 'rapido-demais',
    nome: 'O momento passa rápido demais',
    padroes: [/r[aá]pid[oa] demais|muito r[aá]pid|passa (muito )?r[aá]pido|acaba (muito )?r[aá]pido|corrid[oa]|n[aã]o d[aá] tempo de sentir/i, /too (fast|quick)|rushed|over too soon/i],
    diagnostico: 'O evento ocupa uma fatia pequena do scroll (ou o modelo de vídeo resolveu tudo em ~1,5 s).',
    ajustes: ['Dar mais telas de scroll ao capítulo (+1,5).', 'Curva de time-warp que desacelera em volta do clímax (o momento lento ganha mais scroll).', 'Suavização mais pesada (lerp 0,1).', 'Se o próprio filme é rápido: regere com kling3_0 (constrói gradualmente) ou rode extrair_frames com interpolar=true.'],
    escopo: 'climax',
    aplicar(spec, alvos) {
      const out = [];
      for (const ch of alvos) {
        const before = ch.length ?? 3;
        ch.length = r2(clampN(before + 1.5, 1.5, 10));
        const c = clampN(climaxAt(ch), 0.2, 0.8);
        ch.warp = [[0, 0], [0.25, r2(c - 0.12)], [0.75, r2(c + 0.12)], [1, 1]];
        ch.lerp = 0.1;
        out.push(`${ch.id}: ${before} → ${ch.length} telas, time-warp centrado em ${r2(c)}, lerp 0.1`);
      }
      return out;
    },
  },
  {
    id: 'lento-demais',
    nome: 'Arrastado / longo demais',
    padroes: [/lent[oa] demais|arrastad|demora (muito|demais)|cansativ|longo demais|comprid[oa] demais|enrola/i, /too slow|drags|too long|tedious/i],
    diagnostico: 'Telas de scroll demais para pouca mudança na tela.',
    ajustes: ['Encurtar o capítulo (−1 tela, mínimo 1,5).', 'Remover time-warp que alonga o meio.', 'Cortar frames parados do clipe (extrair_frames com aparar=auto ou inicio/fim).'],
    escopo: 'capitulo',
    aplicar(spec, alvos) {
      const out = [];
      for (const ch of alvos) {
        const before = ch.length ?? 3;
        ch.length = r2(clampN(before - 1, 1.5, 10));
        if (ch.warp) { delete ch.warp; out.push(`${ch.id}: time-warp removido`); }
        out.push(`${ch.id}: ${before} → ${ch.length} telas`);
      }
      return out;
    },
  },
  {
    id: 'fim-abrupto',
    nome: 'Termina sem pausa',
    padroes: [/abrupt|termina do nada|sem pausa|n[aã]o d[aá] tempo de (ler|ver)|corta no fim|acaba de repente/i, /ends abruptly|no time to (read|see)|no pause/i],
    diagnostico: 'O destino de cada plano precisa de uma pausa legível antes do próximo capítulo.',
    ajustes: ['Segurar o último quadro nos últimos 15% do capítulo (warp com platô).', 'Meia tela a mais de scroll.'],
    escopo: 'capitulo',
    aplicar(spec, alvos) {
      const out = [];
      for (const ch of alvos) {
        ch.warp = [[0, 0], [0.85, 1], [1, 1]];
        ch.length = r2(clampN((ch.length ?? 3) + 0.5, 1.5, 10));
        out.push(`${ch.id}: platô no fim (85%→100%), ${ch.length} telas`);
      }
      return out;
    },
  },
  {
    id: 'mais-caro',
    nome: 'Parecer mais caro',
    padroes: [/mais caro|luxo|luxuos|premium|sofisticad|elegante|refinad|parece barato|cara de barato|chique/i, /more expensive|luxur|premium|high[- ]end|looks cheap|classier/i],
    diagnostico: 'Luxo é restrição: menos palavras, um acento, mais espaço, movimento mais pesado.',
    ajustes: ['Grão de filme e vinheta ligados.', 'Scroll mais pesado (smooth 0,07) e lerp 0,1 nos capítulos.', 'Display serifada se a atual for sem serifa.', 'Tirar gradientes do texto; acento só onde há luz.', 'Cortar o texto pela metade e aumentar o espaço negativo (manual).', 'Nos prompts de placa: “thin rim light”, “medium-format product photography”, fundo quase preto.'],
    escopo: 'global',
    aplicar(spec) {
      const out = [];
      if (spec.grain === false) { spec.grain = true; out.push('grão ligado'); }
      if (!spec.vignette) { spec.vignette = true; out.push('vinheta ligada'); }
      if (spec.smooth !== false) { spec.smooth = 0.07; out.push('smooth 0.07'); }
      const sans = /inter|manrope|sora|outfit|space grotesk|archivo|unbounded|syne|anton|bebas|oswald|barlow|big shoulders/i;
      if (spec.fonts && sans.test(spec.fonts.display || '')) { out.push(`display ${spec.fonts.display} → Cormorant Garamond`); spec.fonts.display = 'Cormorant Garamond'; delete spec.fonts.displayStretch; }
      for (const ch of cinema(spec)) {
        ch.lerp = 0.1;
        for (const it of textItems(ch)) if (/gradient/.test(it.cls || '')) { it.cls = it.cls.replace(/\s*gradient/, ''); out.push(`${ch.id}: gradiente removido de "${String(it.text).slice(0, 20)}"`); }
      }
      if (!spec.cursor || spec.cursor === 'none') { spec.cursor = 'ring'; out.push('cursor anel'); }
      return out;
    },
  },
  {
    id: 'sem-vida',
    nome: 'Sem impacto / pouco imersivo',
    padroes: [/sem graça|sem vida|sem emo[cç]|parad[oa] demais|chat[oa]|morno|sem impacto|n[aã]o impressiona|falta impacto|mais imersiv|mais impacto|falta (algo|emo)/i, /flat|boring|lifeless|more immersive|no impact|underwhelming|needs more wow/i],
    diagnostico: 'Falta o ambiente reagir: som, tremor, fundo sincronizado, câmera e acento vivos.',
    ajustes: ['Textura sonora que só toca enquanto o filme se move + golpe no clímax.', 'Tremor do palco proporcional à velocidade no clímax.', 'Acento da interface amostrado do frame.', 'Câmera com push-in lento onde não há câmera.', 'Cursor anel, grão, índice de capítulos.', 'Diga na tela que rolar para trás desfaz o momento.'],
    escopo: 'global',
    aplicar(spec) {
      const out = [];
      const list = cinema(spec).filter((c) => c.type === 'cinema');
      const top = climax(list);
      if (top) {
        if (!top.hits || !top.hits.length) { top.hits = [{ preset: 'impact', at: 0.5 }]; out.push(`${top.id}: golpe "impact" em 0.5`); }
        if (!top.shake) { const at = climaxAt(top); top.shake = [r2(Math.max(0, at - 0.12)), r2(Math.min(1, at + 0.18)), 7]; out.push(`${top.id}: tremor ${top.shake.join(',')}`); }
        if (!top.hint) { top.hint = String(spec.lang || '').startsWith('en') ? 'Scroll back up to undo it.' : 'Role para cima para desfazer.'; out.push(`${top.id}: dica de rolar para trás`); }
      }
      for (const ch of list) {
        if (!ch.sound) { ch.sound = (spec.sound && spec.sound.ambient) || 'air'; out.push(`${ch.id}: textura sonora "${ch.sound}"`); }
        if (ch.media && ch.media.kind === 'frames' && !ch.media.sampleAccent) { ch.media.sampleAccent = true; out.push(`${ch.id}: acento amostrado do frame`); }
        if (ch.media && !ch.media.cam && ['frames', 'image', 'video'].includes(ch.media.kind)) { ch.media.cam = [[0, { s: 1.08 }], [1, { s: 1 }]]; out.push(`${ch.id}: câmera com push-in lento`); }
      }
      if (!spec.cursor || spec.cursor === 'none') { spec.cursor = 'ring'; out.push('cursor anel'); }
      if (spec.grain === false) { spec.grain = true; out.push('grão ligado'); }
      if (spec.index === false) { spec.index = true; out.push('índice de capítulos'); }
      if (spec.sound === false) { spec.sound = { enabled: true, ambient: null }; out.push('botão de som'); }
      return out;
    },
  },
  {
    id: 'travando',
    nome: 'Travando / pesado',
    padroes: [/trav|engasg|pesad[oa]|lag|demora (pra|para) carregar|carregamento lento|n[aã]o roda liso|fps/i, /stutter|choppy|janky|laggy|slow to load|heavy/i],
    diagnostico: 'Frames grandes demais ou carregamento total antes de liberar o scroll.',
    ajustes: ['Pré-carregamento progressivo (primeira vista rápida, resto em segundo plano).', 'Refatiar com quadros 150, largura 1600 ou formato webp (extrair_frames).', 'Conferir fps em Imersao.status() e frames que falharam (verificar_site).'],
    escopo: 'global',
    aplicar(spec) {
      const out = [];
      if (spec.preload !== 'progressive') { spec.preload = 'progressive'; out.push('preload progressivo'); }
      return out;
    },
    comandos: (spec) => cinema(spec).filter((c) => c.media && c.media.kind === 'frames').map((c) => `extrair_frames { projeto, video: "media/brutos/${c.media.seq}.mp4", nome: "${c.media.seq}", quadros: 150, largura: 1600, formato: "webp" }`),
  },
  {
    id: 'ilegivel',
    nome: 'Texto ilegível',
    padroes: [/n[aã]o (d[aá]|consigo) (pra |para )?ler|ileg[ií]vel|contraste|texto (some|sumindo|apagado)|dif[ií]cil de ler/i, /hard to read|illegible|low contrast|can'?t read/i],
    diagnostico: 'Texto sobre áreas claras do filme ou visível por pouco tempo.',
    ajustes: ['Sombra (im-shade) em todos os capítulos.', 'Texto fica mais tempo na tela (janela +0,1).', 'Texto mais claro no tema escuro.', 'Posicione texto onde o filme é escuro (direção manual).'],
    escopo: 'capitulo',
    aplicar(spec, alvos) {
      const out = [];
      for (const ch of alvos) {
        if (ch.shade === false) { delete ch.shade; out.push(`${ch.id}: sombra ligada`); }
        for (const it of textItems(ch)) if (it.out != null && it.out < 1) { it.out = r2(Math.min(1, it.out + 0.1)); }
        out.push(`${ch.id}: textos ficam +0,1 na tela`);
      }
      if (spec.palette && spec.palette.theme !== 'light') { spec.palette.text = '#F4F1EC'; out.push('texto #F4F1EC'); }
      return out;
    },
  },
  {
    id: 'pulo',
    nome: 'Pulos, cortes ou piscadas',
    padroes: [/pul[oa]|salt[oa]|corte sec|emenda|tranco|piscad|pisca|tremid/i, /jump|glitch|flicker|jerk|cut in the/i],
    diagnostico: 'Corte seco no clipe (quebra o scroll reverso), emenda entre clipes encadeados ou suavização curta demais.',
    ajustes: ['Suavização mais pesada (lerp 0,1).', 'analisar_video no clipe: procure “cortes secos”.', 'Regerar com “one continuous shot, no cuts” e start/end na mesma família de placas.', 'Clipes encadeados: use extrair_quadro (último) como start_image do próximo.'],
    escopo: 'capitulo',
    aplicar(spec, alvos) {
      const out = [];
      for (const ch of alvos) { ch.lerp = 0.1; out.push(`${ch.id}: lerp 0.1`); }
      return out;
    },
  },
  {
    id: 'comeco-parado',
    nome: 'Começo parado',
    padroes: [/come[cç]o parad|demora (pra|para) come[cç]ar|primeiros segundos|n[aã]o se mexe no (in[ií]cio|come[cç]o)|fica parad[oa] no in[ií]cio/i, /frozen start|holds the first|nothing happens at first/i],
    diagnostico: 'O modelo segurou o primeiro quadro (Kling faz isso).',
    ajustes: ['Pular os primeiros 6% do filme (warp).', 'Refatiar com aparar=auto ou inicio em segundos (extrair_frames).'],
    escopo: 'capitulo',
    aplicar(spec, alvos) {
      const out = [];
      for (const ch of alvos) if (ch.media && ch.media.kind === 'frames') { ch.warp = [[0, 0.06], [1, 1]]; out.push(`${ch.id}: começa em 6% do filme`); }
      return out;
    },
  },
  {
    id: 'som-demais',
    nome: 'Som incomoda',
    padroes: [/(som|barulho|[aá]udio|ru[ií]do).{0,20}(irritante|alto|demais|chato|incomoda)/i, /(sound|audio|noise).{0,20}(annoying|loud|too much)/i],
    diagnostico: 'Ambiente contínuo cansa; o som deve seguir o scroll e silenciar quando ele para.',
    ajustes: ['Remover o ambiente contínuo; manter só texturas atreladas ao movimento e os golpes.'],
    escopo: 'global',
    aplicar(spec) {
      const out = [];
      if (spec.sound && spec.sound.ambient) { spec.sound.ambient = null; out.push('ambiente removido'); }
      return out;
    },
  },
  {
    id: 'falta-som',
    nome: 'Falta som',
    padroes: [/(falta|sem|quero|coloca|adiciona)r? som|mudo|sil[eê]ncio demais/i, /no sound|add sound|too quiet/i],
    diagnostico: 'Um momento sensorial dá corpo ao filme.',
    ajustes: ['Textura em cada capítulo de cinema e golpe no clímax.', 'Portão no loader “Entrar com som”.'],
    escopo: 'global',
    aplicar(spec) {
      const out = [];
      if (spec.sound === false || !spec.sound) spec.sound = { enabled: true, ambient: null };
      const list = cinema(spec).filter((c) => c.type === 'cinema');
      for (const ch of list) if (!ch.sound) { ch.sound = 'air'; out.push(`${ch.id}: textura "air"`); }
      const top = climax(list);
      if (top && (!top.hits || !top.hits.length)) { top.hits = [{ preset: 'impact', at: 0.5 }]; out.push(`${top.id}: golpe "impact"`); }
      if (!spec.gate) { spec.gate = { label: String(spec.lang || '').startsWith('en') ? 'Enter with sound' : 'Entrar com som' }; out.push('portão de som no loader'); }
      return out;
    },
  },
  {
    id: 'generico',
    nome: 'Genérico / cara de template',
    padroes: [/gen[eé]ric|template|comum demais|igual a todo|sem personalidade|sem identidade|sem alma/i, /generic|looks like a template|cookie[- ]cutter|bland/i],
    diagnostico: 'Falta UM momento impossível tratado com seriedade e uma identidade restrita.',
    ajustes: ['Um sujeito + um momento impossível (listar_momentos / recomendar).', 'Plano-herói em 2–3 takes ou bake-off (folha_de_contato) — ele é 80% do impacto.', 'Um acento só; display com personalidade; poucas palavras.', 'Instrumentos atrelados ao filme (medidores, status) em vez de texto genérico.'],
    escopo: 'global',
    aplicar(spec) {
      const out = [];
      if (spec.fonts && /^(inter|roboto|open sans|arial|helvetica)$/i.test(spec.fonts.display || '')) { spec.fonts.display = 'Instrument Serif'; out.push('display → Instrument Serif'); }
      if (!spec.cursor || spec.cursor === 'none') { spec.cursor = 'ring'; out.push('cursor anel'); }
      return out;
    },
  },
  {
    id: 'celular',
    nome: 'Problema no celular',
    padroes: [/celular|mobile|smartphone|iphone|android|tela pequena/i],
    diagnostico: 'Abaixo de 768 px o motor usa o MP4 leve em loop (ou scrub leve se pedido).',
    ajustes: ['Rodar verificar_site com dispositivo celular e olhar overflow horizontal.', 'Para scrub também no celular: media.mobileScrub=true com frames ≤1280 px.', 'Textos longos: encurtar no spec (o celular corta primeiro).'],
    escopo: 'nenhum',
    aplicar() { return []; },
  },
];

export function diagnosticar(nota) {
  const txt = String(nota || '');
  return REGRAS.filter((r) => r.padroes.some((re) => re.test(txt)));
}

/* Escolhe os capítulos citados na nota (por id ou rótulo) ou um padrão por escopo. */
export function escolherAlvos(spec, regra, { capitulo, nota } = {}) {
  const list = cinema(spec);
  if (capitulo) return list.filter((c) => c.id === capitulo || String(c.label || '').toLowerCase() === String(capitulo).toLowerCase());
  const low = String(nota || '').toLowerCase();
  const named = list.filter((c) => (c.id && low.includes(String(c.id).toLowerCase())) || (c.label && String(c.label).length > 2 && low.includes(String(c.label).toLowerCase())));
  if (named.length) return named;
  if (regra.escopo === 'climax') { const c = climax(list.filter((x) => x.type === 'cinema')); return c ? [c] : []; }
  return list;
}
