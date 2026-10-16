// Momentos impossíveis: o coração da engenharia reversa.
// Cada prompt validado = UM sujeito + UM momento impossível + a mesma espinha técnica.
// Os prompts visuais ficam em inglês (os modelos respondem melhor) e usam
// {subject}, {accent}, {setting}, {detail}, {parts}, {brand} como lacunas.

const tx = (ctx) => (pt, en) => (String(ctx.lang || 'pt-BR').toLowerCase().startsWith('en') ? en : pt);
const T = (cls, text, a, b, anim = 'fade', tag = 'p', extra = {}) => ({ type: 'text', tag, cls, text, in: a, out: b, anim, ...extra });
const M = (label, unit, keys, extra = {}) => ({ type: 'meter', label, unit, keys, decimals: 0, bar: true, ...extra });
const frames = (seq, fallback, extra = {}) => ({ kind: 'frames', seq, fallback, ...extra });

export const MOMENTOS = [
  {
    id: 'lancamento-flagship',
    nome: 'Lançamento flagship',
    resumo: 'Um produto humilde lançado com a seriedade de um celular topo de linha: gira, quebra, vira fatias de tomografia e se revela por dentro.',
    origem: ['LAMINA (Award-Winning 01)'],
    melhorPara: ['padaria', 'café', 'confeitaria', 'restaurante', 'qualquer negócio com UM produto-herói'],
    motor: 'frames',
    verbo: 'O scroll apresenta o produto como um lançamento de tecnologia: ele gira, se parte e mostra suas camadas.',
    conceitoEN: 'launches its {product} the way a tech giant launches a flagship phone',
    placas: [
      { id: 'hero', papel: 'placa-herói', prompt: 'A single perfect {subject} floating in a pure black void, three-quarter view, razor-thin {accent} rim light, a few tiny fragments drifting, medium-format product photography, no text, no watermark.' },
      { id: 'split', papel: 'momento do impacto', editDe: 'hero', prompt: 'Same {subject}, same camera and light, snapped cleanly in two, halves drifting apart, inner structure exposed, fragments frozen in a halo around it, no text.' },
      { id: 'slices', papel: 'corte em camadas', editDe: 'hero', prompt: 'Same {subject}, same camera and light, sliced into seven thin cross-sections floating apart in a row like a CT scan, no text.' },
      { id: 'xray', papel: 'camada de lente (raio-X)', editDe: 'hero', prompt: 'Same {subject} in exactly the same position and size, rendered as a clean medical X-ray: translucent cool-blue layers, internal structure glowing, black background, no text.' },
      { id: 'thermal', papel: 'camada de lente (térmica)', editDe: 'hero', prompt: 'Same {subject} in exactly the same position and size, rendered as a thermal-camera image: purple and blue cool zones, orange and yellow warm core, black background, no text.' },
      { id: 'macro', papel: 'interior (voo)', prompt: 'Extreme macro inside the {detail} of a {subject}, an open tunnel of texture ahead, soft {accent} light, shallow depth of field, no text.' },
      { id: 'process-a', papel: 'processo: antes', prompt: '{subject} in its raw unfinished state inside {setting}, dark, warm glow, product photography, no text.' },
      { id: 'process-b', papel: 'processo: depois', editDe: 'process-a', prompt: 'Same frame, same camera, the {subject} now finished and perfect, golden, glowing, no text.' },
    ],
    filmes: [
      { id: 'giro', inicio: 'hero', fim: 'hero', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'One smooth complete 360-degree rotation of the {subject}, centred, camera locked, nothing else moves. One continuous shot, no cuts, seamless loop.' },
      { id: 'impacto', inicio: 'hero', fim: 'split', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'Ultra slow motion: the {subject} snaps in two, fragments burst outward and hang in the air. One continuous shot, no cuts.' },
      { id: 'camadas', inicio: 'hero', fim: 'slices', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'The {subject} separates into thin slices that glide apart in a row like a CT scan, camera locked. One continuous shot, no cuts.' },
      { id: 'interior', inicio: 'macro', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'Slow continuous fly-through along the inner tunnel of texture, steady pace. One continuous shot, no cuts.' },
      { id: 'processo', inicio: 'process-a', fim: 'process-b', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'Time-lapse: the {subject} transforms from raw to finished, rising, colour deepening, camera locked. One continuous shot, no cuts.' },
    ],
    instrumentos: ['medidor de dB no impacto (0→94)', 'contador de fragmentos no ar', 'contador de camadas (0→81)', 'leitura de processo ao vivo (tempo, temperatura, crescimento, nome da cor)'],
    interacoes: ['lente raio-X/térmica com leitura do pixel', 'arraste para girar reaproveitando os frames do giro', 'lineup com tabela de especificações', 'pedido antecipado com steppers, horários de retirada e contagem até a próxima fornada'],
    som: { ambiente: 'hum', golpes: [{ capitulo: 'impacto', preset: 'crunch', em: 0.42 }] },
    paraTras: 'Rolar para cima “des-quebra” o produto — diga isso na tela.',
    paleta: { bg: '#000000', text: '#EDEAE4', accent: '#C9A24B', accent2: '#F4DC97' },
    tipografia: { display: 'Instrument Serif', body: 'Inter Tight', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'dust',
    dicas: ['A piada funciona porque o tratamento é mortalmente sério.', 'Troque o croissant por qualquer orgulho do cliente: donut, vela, saco de café. Mantenha placas-como-edits e quadros inicial/final.'],
    capitulos(ctx) {
      const t = tx(ctx);
      const prod = ctx.product || ctx.brand;
      return [
        { id: 'giro', type: 'cinema', label: t('Apresentação', 'Reveal'), length: 4, media: frames('giro', 'procedural:dust', { cam: [[0, { s: 0.62, y: 9 }], [0.3, { s: 1, y: 0 }], [0.52, { s: 1, x: -17 }], [0.78, { s: 1, x: 17 }], [1, { s: 1, x: 0 }]] }),
          groups: [
            { pos: 'top-center', items: [T('overline', ctx.tagline || t('Apresentamos', 'Introducing'), 0, 0.3), T('display gradient', prod, 0, 0.3, 'track', 'h1')] },
            { pos: 'right', items: [T('display-md', t('[[número]] camadas.', '[[number]] layers.'), 0.4, 0.62, 'rise', 'p')] },
            { pos: 'left', items: [T('display-md', t('[[número]] etapas.', '[[number]] steps.'), 0.68, 0.92, 'rise', 'p')] },
            { pos: 'bottom-center', items: [{ type: 'scrollcue', text: t('Role', 'Scroll'), in: 0, out: 0.12 }] },
          ] },
        { id: 'impacto', type: 'cinema', label: t('O impacto', 'The crunch'), length: 3.5, media: frames('impacto', 'procedural:embers'), hits: [{ preset: 'crunch', at: 0.42 }],
          groups: [
            { pos: 'top-left', items: [T('overline', t('Impacto', 'Impact'), 0.05, 0.95), T('h2', t('Ouça a diferença.', 'Hear the difference.'), 0.08, 0.6, 'rise', 'h2')] },
            { pos: 'bottom-right', items: [M(t('Crocância', 'Crunch'), 'dB', [[0, 0], [0.38, 12], [0.5, 94], [1, 94]]), M(t('Fragmentos no ar', 'Flakes airborne'), '', [[0, 0], [0.42, 0], [0.7, 1240], [1, 1312]], { bar: false })] },
          ], hint: t('Role para cima para desfazer', 'Scroll back up to undo it') },
        { id: 'camadas', type: 'cinema', label: t('Camadas', 'Layers'), length: 3, media: frames('camadas', 'procedural:aurora'),
          groups: [
            { pos: 'left', items: [T('overline', t('Laminação', 'Lamination'), 0.05, 0.95), M(t('Camadas', 'Layers'), '', [[0, 0], [0.85, 81], [1, 81]], { bar: true })] },
            { pos: 'bottom-center', items: [T('mono', t('[[especificação 1]] · [[especificação 2]] · [[especificação 3]]', '[[spec 1]] · [[spec 2]] · [[spec 3]]'), 0.45, 1, 'fade')] },
          ] },
        { id: 'interior', type: 'cinema', label: t('Por dentro', 'Inside'), length: 3, media: frames('interior', 'procedural:tunnel'),
          groups: [
            { pos: 'left', items: [{ type: 'glass', title: t('[[Detalhe 1]]', '[[Detail 1]]'), text: t('[[uma frase sobre o detalhe]]', '[[one line about it]]'), in: 0.1, out: 0.45 }] },
            { pos: 'right', items: [{ type: 'glass', title: t('[[Detalhe 2]]', '[[Detail 2]]'), text: t('[[uma frase sobre o detalhe]]', '[[one line about it]]'), in: 0.5, out: 0.9 }] },
          ] },
        { id: 'processo', type: 'cinema', label: t('O processo', 'The process'), length: 3, media: frames('processo', 'procedural:embers'),
          groups: [
            { pos: 'top-right', items: [M(t('Tempo', 'Time'), 'min', [[0, 0], [1, 18]], { bar: false }), M(t('Temperatura', 'Temperature'), '°C', [[0, 24], [0.25, 210], [1, 210]], { bar: false })] },
            { pos: 'bottom-left', items: [{ type: 'status', keys: [[0, t('Cru', 'Raw')], [0.35, t('Crescendo', 'Rising')], [0.7, t('Dourando', 'Browning')], [0.92, t('Pronto', 'Ready'), 'is-ok']] }] },
          ] },
        { id: 'lente', type: 'lens', label: t('Raio-X', 'X-ray'), title: t('Veja o que ninguém vê.', 'See what nobody sees.'), text: t('Passe o cursor sobre o produto.', 'Move your cursor over the product.'), base: 'img/hero.jpg', layers: [{ name: t('Raio-X', 'X-ray'), src: 'img/xray.jpg', legend: [['#9fd3ff', t('camada externa', 'outer layer')], ['#3a6db5', t('estrutura interna', 'inner structure')]] }, { name: t('Térmica', 'Thermal'), src: 'img/thermal.jpg', thermal: [18, 96] }] },
        { id: 'girar', type: 'spin', label: t('Gire', 'Spin'), title: t('Gire você mesmo.', 'Spin it yourself.'), seq: 'giro', hint: t('Arraste para girar', 'Drag to rotate') },
      ];
    },
  },

  {
    id: 'explosao-de-cor',
    nome: 'Explosão de cor',
    resumo: 'A cor sai de dentro do produto num momento físico (um grave, um impacto, uma tampa) sobre fundo preto.',
    origem: ['CYMA (Award-Winning 02)'],
    melhorPara: ['áudio', 'tênis', 'cosméticos', 'bebidas', 'loja de tintas', 'qualquer produto com um “momento”'],
    motor: 'frames',
    verbo: 'O scroll dispara o momento e a cor explode para fora do produto; o fundo continua preto.',
    conceitoEN: 'when {trigger}, the paint sitting on the {subject} erupts into a towering rainbow fountain',
    placas: [
      { id: 'clean', papel: 'placa limpa', prompt: 'A {subject} positioned low in the centre of the frame, empty black space above, sculpted rim lights, medium-format product photography, pure black background, no text.' },
      { id: 'loaded', papel: 'placa carregada', editDe: 'clean', prompt: 'Same {subject}, same camera and light, now with about fifteen dollops of pure paint resting on it in eight colours (magenta, cyan, yellow, orange, violet, lime, cobalt, crimson), no text.' },
      { id: 'peak', papel: 'placa do pico', editDe: 'loaded', prompt: 'Same frame at the peak of the impact: the paint leaping upward into tendrils, crowns and thousands of droplets that fill the upper frame. A single high-speed camera frame, real acrylic paint, not CGI, not cartoon, no text.' },
      { id: 'anatomy', papel: 'vista explodida', editDe: 'clean', prompt: 'Same {subject} as an exploded view: its parts floating in a vertical stack, a different pigment burst blasting out of every gap, black background, no text.' },
    ],
    filmes: [
      { id: 'drop', inicio: 'loaded', fim: 'peak', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'Silence. Then {trigger}: the {subject} punches upward and the paint leaps in ultra slow motion into a towering multicolour fountain. One continuous shot, no cuts.' },
      { id: 'congelado', inicio: 'peak', fim: 'peak', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'Time is frozen at the peak. The camera orbits 360 degrees around the suspended paint. Seamless loop, one continuous shot.' },
      { id: 'dentro', inicio: 'loaded', fim: 'peak', modelo: 'cinematic_studio_3_0', modo: '4k', duracao: 10, prompt: 'Silence. Then {trigger}: the paint erupts and the camera flies up into the colour. One continuous shot, no cuts.', nota: 'Este modelo inventa um movimento maior; aproveite do pico em diante.' },
      { id: 'anatomia', inicio: 'clean', fim: 'anatomy', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'It comes apart layer by layer and a colour bursts out of every gap. One continuous shot, no cuts.' },
    ],
    instrumentos: ['medidor de frequência que salta para 32 Hz', 'contador de cores no ar (0→8)', 'graus de órbita', 'varredura 32 Hz→20 kHz', 'contador de peças'],
    interacoes: ['chips de paleta (Original, Neon, Pôr do sol, Oceano, Mono) que recolorem todos os filmes', 'amostrador de cor ao vivo que define o acento da página', 'cursor que borrifa tinta e espirra no clique', 'grade de specs com contadores', 'compra com amostras de acabamento'],
    som: { golpes: [{ capitulo: 'drop', preset: 'drop808', em: 0.36 }] },
    paraTras: 'A tinta volta para dentro do produto.',
    paleta: { bg: '#050505', text: '#F2F2F2', accent: '#FF2D95', accent2: '#00D1FF' },
    tipografia: { display: 'Archivo', displayStretch: 125, body: 'Inter', mono: 'JetBrains Mono' },
    cursor: 'paint',
    loader: 'bar',
    fallbackPreset: 'fountain',
    dicas: ['Fórmula: placa limpa → placa carregada → placa do pico.', 'Renderize o drop em 2–3 modelos e fique com o vencedor; cada modelo ganha um plano diferente.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'drop', type: 'cinema', label: 'Drop', length: 4, media: frames('drop', 'procedural:fountain', { sampleAccent: true }), hits: [{ preset: 'drop808', at: 0.36 }],
          groups: [
            { pos: 'top-left', items: [T('overline', ctx.tagline || t('Veja o grave', 'See the bass'), 0, 0.3), T('display', ctx.brand, 0, 0.32, 'track', 'h1')] },
            { pos: 'bottom-right', items: [M(t('Frequência', 'Frequency'), 'Hz', [[0, 0], [0.33, 0], [0.4, 32], [1, 32]]), M(t('Cores no ar', 'Colours in the air'), '', [[0, 0], [0.38, 0], [0.7, 8], [1, 8]], { bar: false })] },
          ] },
        { id: 'congelado', type: 'cinema', label: t('Congelado', 'Frozen'), length: 3, media: frames('congelado', 'procedural:bokeh', { sampleAccent: true }),
          groups: [
            { pos: 'top-right', items: [M(t('Órbita', 'Orbit'), '°', [[0, 0], [1, 360]], { bar: false })] },
            { pos: 'bottom-left', items: [T('lead', t('O tempo parou no pico. Escolha a paleta.', 'Time stopped at the peak. Pick a palette.'), 0.05, 1), { type: 'palette', in: 0.05, out: 1 }] },
          ] },
        { id: 'dentro', type: 'cinema', label: t('Dentro da cor', 'Inside'), length: 3, media: frames('dentro', 'procedural:aurora', { sampleAccent: true }),
          groups: [{ pos: 'center', items: [M(t('Resposta', 'Response'), 'Hz', [[0, 32], [1, 20000]], { bar: true })] }] },
        { id: 'anatomia', type: 'cinema', label: t('Anatomia', 'Anatomy'), length: 3, media: frames('anatomia', 'procedural:particles', { cam: [[0, { s: 1 }], [1, { s: 0.86 }]] }),
          groups: [
            { pos: 'right', items: [M(t('Peças', 'Parts'), '', [[0, 1], [0.8, 9], [1, 9]], { bar: false }), { type: 'glass', title: t('[[Componente-chave]]', '[[Key component]]'), text: t('[[o que ele faz em uma frase]]', '[[what it does in one line]]'), in: 0.35, out: 1 }] },
          ] },
      ];
    },
  },

  {
    id: 'plano-unico',
    nome: 'Plano único (contagem regressiva)',
    resumo: 'Um único take contínuo de 30 s vira a agulha do toca-discos: o scroll faz a contagem, a ignição e a subida.',
    origem: ['HESPER (Award-Winning 03)'],
    melhorPara: ['lançamentos', 'inaugurações', 'drops de produto', 'eventos', 'qualquer coisa com contagem regressiva'],
    motor: 'frames',
    verbo: 'O scroll é a agulha: conta, dispara e acompanha a subida num plano sem cortes.',
    conceitoEN: 'scrolling launches the {subject}, one unbroken take from the pad to the edge of space',
    placas: [
      { id: 'hero', papel: 'placa-herói', prompt: 'A sleek {subject} at {setting} at dusk, distinctive livery that does not copy any real brand, low mist, warm sky, cinematic wide shot, no text.' },
      { id: 'studio', papel: 'foto de estúdio para modelo 3D', prompt: 'The same {subject} isolated on a seamless neutral studio background, even soft light, three-quarter view, full object visible, no text.' },
    ],
    filmes: [
      { id: 'voo', inicio: 'hero', modelo: 'seedance_2_5', modo: 'omni_reference', duracao: 30, resolucao: '1080p', prompt: 'One continuous shot: {beats}. No cuts.', nota: 'Descreva cada efeito fisicamente. Renderize dois takes e fique com o melhor.' },
      { id: 'detalhe', inicio: 'hero', modelo: 'seedance_2_0', modo: '4k', duracao: 10, prompt: 'A slow continuous move revealing {detail}. One continuous shot, no cuts.' },
    ],
    extra3d: { modelo: 'hunyuan3d_v3', de: 'studio', nota: 'GLB com quantize + texturas webp (não meshopt, que o visualizador web não decodifica).' },
    instrumentos: ['contagem T−10 → ignição em T−3 → T+0', 'telemetria atrelada ao filme (relógio da missão, altitude, velocidade, fase)', 'curva de time-warp: momentos lentos ganham mais scroll'],
    interacoes: ['portão “Pronto para começar” no loader que liga o som', 'palco treme com a velocidade do scroll na ignição', 'modelo 3D girável com rótulos ancorados', 'reserva: opções → preço indicativo + próxima janela ao pôr do sol calculada de verdade'],
    som: { textura: 'rumble', faixa: [0, 0.82], golpes: [{ capitulo: 'voo', preset: 'ignition', em: 0.24 }] },
    paraTras: 'Rebobinar desfaz a decolagem sem emendas — por isso o plano é único.',
    paleta: { bg: '#0B0A10', text: '#EEE7DC', accent: '#C9814A', accent2: '#F2C9A0' },
    tipografia: { display: 'Fraunces', body: 'Inter', mono: 'IBM Plex Mono' },
    loader: 'propellant',
    gate: true,
    fallbackPreset: 'deep',
    dicas: ['Qualquer contagem vira este site: noite de abertura de restaurante, drop de tênis, primeira aula de academia.', 'Uma palavra poética (“água-viva”) é renderizada literalmente: descreva luz e matéria.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'voo', type: 'cinema', label: t('O lançamento', 'The launch'), length: 7, warp: [[0, 0], [0.18, 0.1], [0.32, 0.3], [0.6, 0.62], [1, 1]],
          media: frames('voo', 'procedural:deep', { preset: { mode: 'rise' } }), shake: [0.22, 0.42, 10], sound: 'rumble', soundRange: [0, 0.82], hits: [{ preset: 'ignition', at: 0.24 }],
          groups: [
            { pos: 'top-left', items: [T('overline', ctx.tagline || t('Só voamos ao entardecer', 'We only fly at dusk'), 0, 0.2), T('display', ctx.brand, 0, 0.2, 'track', 'h1')] },
            { pos: 'center', items: [{ type: 'status', keys: [[0, 'T−10'], [0.06, 'T−9'], [0.08, 'T−8'], [0.1, 'T−7'], [0.12, 'T−6'], [0.14, 'T−5'], [0.16, 'T−4'], [0.19, t('T−3 · IGNIÇÃO', 'T−3 · IGNITION'), 'is-alert'], [0.25, 'T+0'], [0.3, '']], in: 0.04, out: 0.3, cls: 'display-md' }] },
            { pos: 'bottom-right', items: [M(t('Altitude', 'Altitude'), 'km', [[0, 0], [0.25, 0], [0.6, 18], [1, 100]], { decimals: 1 }), M(t('Velocidade', 'Velocity'), 'km/h', [[0, 0], [0.25, 0], [1, 27000]], { bar: false })] },
            { pos: 'bottom-left', items: [{ type: 'steps', items: [t('Plataforma', 'Pad'), t('Ignição', 'Ignition'), t('Decolagem', 'Liftoff'), t('Nuvens', 'Clouds'), t('Segundo pôr do sol', 'Second sunset'), t('Borda do espaço', 'Edge of space')], keys: [[0, 0], [0.19, 1], [0.25, 2], [0.45, 3], [0.7, 4], [0.9, 5]] }] },
          ] },
        { id: 'detalhe', type: 'cinema', label: t('O detalhe', 'The detail'), length: 3, media: frames('detalhe', 'procedural:rays'),
          groups: [{ pos: 'left', items: [T('h2', t('[[A carga]]', '[[The payload]]'), 0.08, 0.9, 'rise', 'h2'), T('lead', t('[[uma frase sobre o que acontece]]', '[[one line about it]]'), 0.15, 0.9, 'rise')] }] },
      ];
    },
  },

  {
    id: 'restauracao',
    nome: 'Restauração',
    resumo: 'O scroll restaura algo negligenciado; rolar de volta traz vinte anos de sujeira em dois segundos.',
    origem: ['UNDO (Award-Winning 04)'],
    melhorPara: ['estética automotiva', 'funilaria', 'lavagem', 'limpeza de piscina', 'telhados', 'qualquer serviço cujo resultado é uma transformação'],
    motor: 'frames',
    verbo: 'O scroll restaura; para trás, envelhece de novo.',
    conceitoEN: 'scrolling restores a neglected {subject}; scrolling back brings the years of grime back in two seconds',
    placas: [
      { id: 'antes', papel: 'placa ANTES', prompt: 'A neglected {subject}: dusty, faded, stained, worn, inside {setting}, low three-quarter view, no badges, no logos, no people, no text.' },
      { id: 'depois', papel: 'placa DEPOIS', editDe: 'antes', prompt: 'Identical {subject}, identical camera and framing, now perfectly restored: deep clean finish, crisp reflections, bright details, no text.' },
      { id: 'prova', papel: 'macro de prova', editDe: 'depois', prompt: 'Macro of the restored surface of the {subject}, water beading on it, crisp highlights, no text.' },
    ],
    filmes: [
      { id: 'restauracao', inicio: 'antes', fim: 'depois', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'The camera slowly pushes in. A clean restoration line sweeps across the {subject} from one end to the other: dust lifts, dull surfaces deepen, details brighten as the line passes. One continuous shot; the shape of the {subject} never changes.' },
      { id: 'vitrine', inicio: 'depois', fim: 'depois', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'One slow 180-degree arc around the {subject} and back, reflections gliding across the surface. Seamless, one continuous shot.', nota: 'Movimentos de câmera suaves: arcos grandes deformam o objeto.' },
      { id: 'prova', inicio: 'prova', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'Water is poured across the surface and beads, rolls and sheets away in slow motion. One continuous shot, no cuts.' },
    ],
    instrumentos: ['medidor de brilho 12→94 GU', 'contador de anos removidos', 'repelência à água até 110° de ângulo de contato'],
    interacoes: ['dica “role de volta”', 'antes/depois arrastável com as duas placas', 'pacotes com preço', 'orçamento instantâneo (tamanho, estado, pacote)', 'reserva com vagas/boxes livres'],
    som: { golpes: [{ capitulo: 'restauracao', preset: 'whoosh', em: 0.08 }] },
    paraTras: 'Vinte anos de sujeira voltam em dois segundos.',
    paleta: { bg: '#060708', text: '#E9EEF0', accent: '#19E3D0', accent2: '#9DF5EC' },
    tipografia: { display: 'Archivo', displayStretch: 125, body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'bar',
    fallbackPreset: 'wipe',
    dicas: ['A placa DEPOIS deve ser um edit da ANTES, nunca uma imagem nova, ou a forma deriva.', 'Funciona para garagem com musgo, piscina verde, cozinha cansada, deck manchado.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'restauracao', type: 'cinema', label: t('A restauração', 'The restoration'), length: 4, media: frames('restauracao', 'image:img/antes.jpg', { cam: [[0, { s: 1 }], [1, { s: 1.08 }]], wipeFallback: { before: 'img/antes.jpg', after: 'img/depois.jpg' } }), hits: [{ preset: 'whoosh', at: 0.08 }],
          groups: [
            { pos: 'top-left', items: [T('overline', ctx.tagline || t('Role para restaurar', 'Scroll to restore'), 0, 0.3), T('display', ctx.brand, 0, 0.3, 'track', 'h1')] },
            { pos: 'bottom-right', items: [M(t('Brilho', 'Gloss'), 'GU', [[0, 12], [0.9, 94], [1, 94]]), M(t('Anos removidos', 'Years removed'), '', [[0, 0], [0.9, 20], [1, 20]], { bar: false })] },
          ], hint: t('Role de volta e veja tudo envelhecer de novo', 'Scroll back and watch it age again') },
        { id: 'comparar', type: 'compare', label: t('Antes e depois', 'Before & after'), title: t('Arraste e compare.', 'Drag to compare.'), before: 'img/antes.jpg', after: 'img/depois.jpg', labels: [t('Antes', 'Before'), t('Depois', 'After')] },
        { id: 'prova', type: 'cinema', label: t('A prova', 'The proof'), length: 3, media: frames('prova', 'procedural:deep', { preset: { mode: 'dive' } }),
          groups: [{ pos: 'left', items: [T('h2', t('Repele tudo.', 'Repels everything.'), 0.06, 0.95, 'rise', 'h2'), M(t('Ângulo de contato', 'Contact angle'), '°', [[0, 0], [0.8, 110], [1, 110]])] }] },
      ];
    },
  },

  {
    id: 'raio-x',
    nome: 'Raio-X (ver por dentro)',
    resumo: 'As paredes viram vidro e revelam o que ninguém vê; uma lente segue o cursor e lê o pixel embaixo dela.',
    origem: ['CLEARLINE (Award-Winning 05)'],
    melhorPara: ['ar-condicionado e climatização', 'encanador', 'eletricista', 'dedetização', 'isolamento', 'dentista', 'mecânica', 'serviços que as pessoas pagam mas nunca veem'],
    motor: 'frames',
    verbo: 'O scroll transforma o exterior em vidro e mostra os sistemas por dentro.',
    conceitoEN: 'whose promise is "we see what you can\'t"',
    placas: [
      { id: 'hero', papel: 'placa-herói', prompt: '{subject} at blue hour, warm windows, three-quarter view, no people, no text.' },
      { id: 'xray', papel: 'raio-X', editDe: 'hero', prompt: 'Exactly the same {subject}, same position and size, outer surfaces turned to translucent blue glass revealing {inner} glowing inside, no text.' },
      { id: 'thermal', papel: 'térmica', editDe: 'hero', prompt: 'Exactly the same {subject}, same position and size, rendered in thermal-camera colours: a warm core, a cold draughty area, one hot spot, no text.' },
      { id: 'falha', papel: 'falha', editDe: 'xray', prompt: 'The same X-ray view with one fault glowing red, everything else identical, no text.' },
    ],
    filmes: [
      { id: 'chegada', inicio: 'hero', fim: 'hero', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'Slow continuous dolly toward the {subject} at blue hour. No cuts.', nota: 'Use como quadro final uma versão levemente mais próxima da placa-herói.' },
      { id: 'transparencia', inicio: 'hero', fim: 'xray', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'The outer surfaces slowly turn to glass from top to bottom, revealing the systems glowing inside. Camera locked. One continuous shot.' },
      { id: 'conserto', inicio: 'falha', fim: 'xray', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'The red fault drains away and the part glows healthy again. Camera locked. One continuous shot.' },
    ],
    instrumentos: ['leitura de sistema ao vivo', 'rótulos de cada sistema aparecendo', 'status “Vazamento detectado” → “Selado, 0,0 L/h”'],
    interacoes: ['lente raio-X/térmica com alternância e leitura do pixel (tubo, duto, fio ou temperatura)', 'medição de alinhamento entre placas', 'assistente de orçamento em 90 s (sistema, sintoma, tamanho, urgência)', 'avaliações', 'barra de emergência com clique-para-ligar'],
    som: { golpes: [{ capitulo: 'transparencia', preset: 'chime', em: 0.5 }] },
    paraTras: 'As paredes voltam a ser sólidas.',
    paleta: { bg: '#081120', text: '#EAF0F7', accent: '#F2B84B', accent2: '#FF4D3D' },
    tipografia: { display: 'Space Grotesk', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'wipe',
    dicas: ['A lente é um componente reutilizável: motor para mecânico, colchão, tênis de corrida, dente para dentista.', 'Só funciona se as placas forem edits de uma imagem.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'chegada', type: 'cinema', label: t('Chegada', 'Arrival'), length: 3, media: frames('chegada', 'image:img/hero.jpg', { cam: [[0, { s: 1 }], [1, { s: 1.12 }]] }),
          groups: [
            { pos: 'bottom-left', items: [T('overline', ctx.tagline || t('Vemos o que você não vê', 'We see what you can\'t'), 0, 0.9), T('display', ctx.brand, 0, 0.9, 'track', 'h1')] },
            { pos: 'top-right', items: [{ type: 'status', keys: [[0, t('Sistema: verificando', 'System: checking')], [0.6, t('Sistema: 3 pontos de atenção', 'System: 3 points of attention'), 'is-alert']] }] },
          ] },
        { id: 'transparencia', type: 'cinema', label: t('Transparência', 'See-through'), length: 3.5, media: frames('transparencia', 'procedural:aurora', { wipeFallback: { before: 'img/hero.jpg', after: 'img/xray.jpg', dir: 'ttb' } }),
          callouts: [
            { text: t('<strong>Água</strong> tubulação de cobre', '<strong>Water</strong> copper pipes'), x: 0.35, y: 0.55, lx: 0.12, ly: 0.32, in: 0.3, out: 1 },
            { text: t('<strong>Ar</strong> dutos', '<strong>Air</strong> ducts'), x: 0.6, y: 0.4, lx: 0.82, ly: 0.28, in: 0.45, out: 1 },
            { text: t('<strong>Energia</strong> fiação', '<strong>Power</strong> wiring'), x: 0.55, y: 0.7, lx: 0.84, ly: 0.74, in: 0.6, out: 1 },
          ] },
        { id: 'conserto', type: 'cinema', label: t('O conserto', 'The fix'), length: 3, media: frames('conserto', 'procedural:rays'),
          groups: [{ pos: 'bottom-left', items: [{ type: 'status', keys: [[0, t('Vazamento detectado', 'Leak detected'), 'is-alert'], [0.65, t('Selado · 0,0 L/h', 'Sealed · 0.0 L/h'), 'is-ok']], cls: 'h3' }] }] },
        { id: 'lente', type: 'lens', label: t('A lente', 'The lens'), title: t('Passe a lente pela casa.', 'Move the lens over the house.'), text: t('Alterne entre raio-X e térmica. A leitura mostra o que está embaixo do cursor.', 'Switch between X-ray and thermal. The readout shows what is under the cursor.'), base: 'img/hero.jpg',
          layers: [{ name: t('Raio-X', 'X-ray'), src: 'img/xray.jpg', legend: [['#b87333', t('tubo de cobre', 'copper pipe')], ['#e04040', t('duto de ar quente', 'warm air duct')], ['#3a7bd5', t('duto de ar frio', 'cold air duct')], ['#ffd23f', t('fiação', 'wiring')]] }, { name: t('Térmica', 'Thermal'), src: 'img/thermal.jpg', thermal: [12, 68] }] },
      ];
    },
  },

  {
    id: 'dentro-da-luz',
    nome: 'Dentro da luz',
    resumo: 'O scroll leva o visitante para dentro da peça, onde a luz branca explode em fogo espectral.',
    origem: ['FACET (Award-Winning 06)'],
    melhorPara: ['joalheria', 'relojoaria', 'cristais e vidro', 'qualquer produto que na verdade é sobre luz'],
    motor: 'frames',
    verbo: 'O scroll atravessa a peça e a luz se divide em arco-íris.',
    conceitoEN: 'scrolling flies the visitor inside the {subject}, where white light explodes into rainbow fire',
    placas: [
      { id: 'hero', papel: 'placa-herói', prompt: 'A {subject} floating in a black void, one hard spotlight, crisp spectral flashes, luxury product photography, no text.' },
      { id: 'fogo', papel: 'fogo', editDe: 'hero', prompt: 'The same {subject} throwing a full-spectrum burst of rainbow rays and caustics across the dark around it, no text.' },
      { id: 'macro', papel: 'macro interno', editDe: 'hero', prompt: 'An extreme macro from inside the {subject} looking out through its facets: a kaleidoscope of prisms and rainbow light, no text.' },
      { id: 'variante-a', papel: 'variante de material', editDe: 'hero', prompt: 'The same {subject} in an alternative material finish ({variant}), identical camera and light, no text.' },
    ],
    filmes: [
      { id: 'giro', inicio: 'hero', fim: 'hero', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'The {subject} rotates one full 360 degrees under a fixed spotlight, spectral fire rolling across the facets. Seamless loop, one continuous shot.' },
      { id: 'fogo', inicio: 'hero', fim: 'fogo', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'The spotlight intensifies and the {subject} splits the light into an expanding burst of rainbow rays and caustics that fill the dark. Camera locked. One continuous shot.' },
      { id: 'dentro', inicio: 'hero', fim: 'macro', modelo: 'cinematic_studio_3_0', modo: '4k', duracao: 10, prompt: 'The camera pushes slowly into the {subject} and travels inside through a cathedral of prisms and rainbow light. One continuous shot.', nota: 'Pode levar o movimento além do pedido — é por isso que este modelo pega este plano.' },
    ],
    instrumentos: ['os quatro Cs aparecendo um a um com leituras', 'medidor de retorno de luz'],
    interacoes: ['amostrador de cor ao vivo que muda o acento para a cor que pisca na tela', 'montador: metal (troca as placas), quilates com preço ao vivo, tamanho, gravação com prévia', 'agendamento de visita privada', 'faixa de cuidados e garantia'],
    som: { textura: 'shimmer', golpes: [{ capitulo: 'fogo', preset: 'chime', em: 0.4 }] },
    paraTras: 'A luz se recolhe de volta para a pedra.',
    paleta: { bg: '#030304', text: '#F3F3F1', accent: '#DCE3EA', accent2: '#B9C6FF' },
    tipografia: { display: 'Bodoni Moda', body: 'Manrope', mono: 'DM Mono' },
    loader: 'line',
    fallbackPreset: 'rays',
    dicas: ['Luz + espaço preto é a explosão de cor mais confiável que existe, e nunca parece infantil.', 'Troque o diamante por um movimento de relógio, um decanter de cristal ou um vitral.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'giro', type: 'cinema', label: t('O giro', 'The turn'), length: 3.5, media: frames('giro', 'procedural:rays', { preset: { mode: 'spectral' } }),
          groups: [
            { pos: 'top-center', items: [T('overline', ctx.tagline || t('Uma peça, uma luz', 'One piece, one light'), 0, 0.25), T('display', ctx.brand, 0, 0.25, 'track', 'h1')] },
            { pos: 'bottom-left', items: [T('mono', t('Lapidação · [[excelente]]', 'Cut · [[excellent]]'), 0.3, 1, 'rise'), T('mono', t('Cor · [[D]]', 'Colour · [[D]]'), 0.45, 1, 'rise'), T('mono', t('Pureza · [[VVS1]]', 'Clarity · [[VVS1]]'), 0.6, 1, 'rise'), T('mono', t('Quilates · [[1,2]]', 'Carat · [[1.2]]'), 0.75, 1, 'rise')] },
          ] },
        { id: 'fogo', type: 'cinema', label: t('O fogo', 'The fire'), length: 3, media: frames('fogo', 'procedural:rays', { sampleAccent: true, preset: { mode: 'spectral' } }), hits: [{ preset: 'chime', at: 0.4 }],
          groups: [{ pos: 'bottom-center', items: [T('line', t('A luz entra branca. Sai em fogo.', 'Light goes in white. It comes out as fire.'), 0.35, 0.95, 'blur')] }] },
        { id: 'dentro', type: 'cinema', label: t('Por dentro', 'Inside'), length: 3, media: frames('dentro', 'procedural:tunnel'), sound: 'shimmer',
          groups: [{ pos: 'right', items: [M(t('Retorno de luz', 'Light return'), '%', [[0, 0], [0.85, 98], [1, 98]])] }] },
      ];
    },
  },

  {
    id: 'construcao',
    nome: 'Construção',
    resumo: 'O espaço se constrói sozinho enquanto a câmera orbita, da terra nua ao resultado aceso ao entardecer.',
    origem: ['OASIS (Award-Winning 07)'],
    melhorPara: ['piscinas', 'paisagismo', 'decks', 'cozinhas planejadas', 'construtoras', 'reformas', 'trabalhos caros em que o cliente precisa ver o resultado antes'],
    motor: 'frames',
    verbo: 'O scroll constrói o projeto etapa por etapa, num plano contínuo.',
    conceitoEN: 'scrolling builds {setting} from nothing into the finished result',
    placas: [
      { id: 'antes', papel: 'placa ANTES', prompt: 'An aerial three-quarter view of {setting} in its empty, unbuilt state at golden hour, no people, no text.' },
      { id: 'depois', papel: 'placa DEPOIS', editDe: 'antes', prompt: 'Same camera: the finished {subject} at dusk, lit and inviting, every detail complete, no people, no text.' },
      { id: 'olhar', papel: 'vista à altura dos olhos', editDe: 'depois', prompt: 'A low eye-level view across the finished {subject} at dusk, lights glowing, no people, no text.' },
    ],
    filmes: [
      { id: 'obra', inicio: 'antes', modelo: 'seedance_2_5', modo: 'omni_reference', referencias: ['antes', 'depois'], duracao: 30, resolucao: '1080p', prompt: 'One continuous slow aerial orbit around the site while it builds itself in time-lapse: {stages}, and the sun sets until the lights glow. No cuts; the surroundings never change.' },
      { id: 'noite', inicio: 'olhar', modelo: 'kling3_0', modo: '4k', duracao: 10, prompt: 'The camera glides low across the finished {subject} at dusk, lights shimmering. One continuous shot.' },
    ],
    instrumentos: ['linha do tempo de etapas (Projeto, Escavação, Estrutura, Concreto, Revestimento, Enchimento, Plantio, Iluminação)', 'contador de semanas atrelado ao que está na tela'],
    interacoes: ['antes/depois arrastável', 'configurador (formato, acabamento, materiais, extras) com faixa de preço e prazo', 'portfólio', 'financiamento como parcela mensal', 'consulta gratuita com data'],
    som: { textura: 'air' },
    paraTras: 'A obra se desfaz até a terra nua.',
    paleta: { bg: '#0D1418', text: '#F1ECE3', accent: '#D8A657', accent2: '#3FB6C6' },
    tipografia: { display: 'Cormorant Garamond', body: 'Manrope', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'wipe',
    dicas: ['Passe as placas ANTES e DEPOIS como referências para a casa e a câmera ficarem paradas enquanto o resto muda.', 'Funciona para decks, cozinhas, entradas de garagem e casas inteiras.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'obra', type: 'cinema', label: t('A obra', 'The build'), length: 6, media: frames('obra', 'image:img/antes.jpg', { wipeFallback: { before: 'img/antes.jpg', after: 'img/depois.jpg' } }), sound: 'air',
          groups: [
            { pos: 'top-left', items: [T('overline', ctx.tagline || t('Seu projeto, antes de existir', 'Your project, before it exists'), 0, 0.2), T('display', ctx.brand, 0, 0.2, 'track', 'h1')] },
            { pos: 'bottom-left', items: [{ type: 'steps', items: [t('Projeto', 'Design'), t('Escavação', 'Dig'), t('Estrutura', 'Steel'), t('Concreto', 'Concrete'), t('Revestimento', 'Stone'), t('Enchimento', 'Fill'), t('Plantio', 'Plant'), t('Iluminação', 'Light')], from: 0.05, to: 0.97 }] },
            { pos: 'bottom-right', items: [M(t('Semana', 'Week'), '', [[0, 0], [0.97, 14], [1, 14]], { bar: false })] },
          ] },
        { id: 'noite', type: 'cinema', label: t('A noite', 'The evening'), length: 3, media: frames('noite', 'procedural:bokeh'),
          groups: [{ pos: 'center', items: [T('display-md', t('Pronto. Do jeito que você imaginou.', 'Finished. Exactly as you pictured it.'), 0.5, 1, 'blur', 'p')] }] },
        { id: 'comparar', type: 'compare', label: t('Antes e depois', 'Before & after'), title: t('Do zero ao pronto.', 'From nothing to finished.'), before: 'img/antes.jpg', after: 'img/depois.jpg', labels: [t('Antes', 'Before'), t('Depois', 'After')] },
      ];
    },
  },

  {
    id: 'explosao-remontagem',
    nome: 'Explosão e remontagem',
    resumo: 'O produto explode em dezenas de componentes flutuantes; seguindo o scroll, ele se remonta — com o mesmo clipe ao contrário.',
    origem: ['OBSCURA (ChatGPT 01)', 'AURUM & NOIR (Fable 01)'],
    melhorPara: ['câmeras', 'relógios', 'fones', 'eletrônicos', 'qualquer produto com peças'],
    motor: 'frames',
    verbo: 'O scroll desmonta o produto em peças suspensas e depois o remonta.',
    conceitoEN: 'as the visitor scrolls, the {subject} explodes into dozens of floating components, then reassembles',
    placas: [
      { id: 'hero', papel: 'âncora', prompt: 'Ultra premium product photograph of {subject}, floating centred in a pure black void, single dramatic top light, subtle {accent} rim light, photorealistic, luxury advertisement lighting, no text, no watermark.' },
    ],
    filmes: [
      { id: 'orbita', inicio: 'hero', modelo: 'melhor image-to-video disponível', duracao: 10, resolucao: '1080p', prompt: 'The {subject} floats in the black void and slowly rotates 360 degrees, gentle drift, nothing else moves. One continuous shot, no cuts.' },
      { id: 'explosao', inicio: 'hero', modelo: 'melhor image-to-video disponível', duracao: 10, resolucao: '1080p', prompt: 'The {subject} smoothly disassembles outward into its individual components which hang suspended in space: {parts}. Slow, elegant, constant speed, ends fully exploded and holding. One continuous shot, no cuts.' },
      { id: 'macro', inicio: 'hero', modelo: 'melhor image-to-video disponível', duracao: 10, resolucao: '1080p', prompt: 'Slow macro glide across the {detail}, light rippling over the surfaces, ending on the engraved maker mark. One continuous shot, no cuts.' },
    ],
    instrumentos: ['callouts com linhas finas presos às peças (contagem de lentes, lâminas, peças totais)', 'contador de componentes'],
    interacoes: ['manifesto em uma linha por passo', 'specs em grade de duas colunas com linhas finas', 'CTA com e-mail'],
    som: { golpes: [{ capitulo: 'explosao', preset: 'whoosh', em: 0.05 }] },
    paraTras: 'A remontagem não precisa de clipe: o clipe da explosão rodando ao contrário É a remontagem.',
    paleta: { bg: '#050505', text: '#EDEAE4', accent: '#B08D57', accent2: '#E5CFA4' },
    tipografia: { display: 'Cormorant Garamond', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'shatter',
    dicas: ['Arco-íris espectral SÓ onde a luz do prisma aparece.', 'Funciona para qualquer coisa com peças; a estrutura órbita + macro + explodido é universal.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'orbita', type: 'cinema', label: t('Órbita', 'Orbit'), length: 3.5, media: frames('orbita', 'procedural:particles'),
          groups: [{ pos: 'center', items: [T('overline', ctx.tagline || t('[[linha de abertura]]', '[[opening line]]'), 0.02, 0.4), T('display-xl', ctx.brand, 0, 0.42, 'track', 'h1')] }, { pos: 'bottom-center', items: [{ type: 'scrollcue', text: t('Role', 'Scroll'), in: 0, out: 0.1 }] }] },
        { id: 'manifesto', type: 'lines', label: t('Manifesto', 'Manifesto'), length: 3, lines: [t('[[Primeira linha curta.]]', '[[First short line.]]'), t('[[Segunda linha curta.]]', '[[Second short line.]]'), t('[[Terceira linha curta.]]', '[[Third short line.]]')] },
        { id: 'explosao', type: 'cinema', label: t('A explosão', 'The explosion'), length: 4, media: frames('explosao', 'procedural:particles', { shatterFallback: 'img/hero.png' }), hits: [{ preset: 'whoosh', at: 0.05 }],
          callouts: [
            { text: t('<strong>Elemento I</strong> [[9 lentes de vidro]]', '<strong>Element I</strong> [[9 glass lenses]]'), x: 0.38, y: 0.42, lx: 0.12, ly: 0.26, in: 0.35, out: 1 },
            { text: t('<strong>Íris</strong> [[12 lâminas]]', '<strong>Iris</strong> [[12 blades]]'), x: 0.56, y: 0.36, lx: 0.84, ly: 0.22, in: 0.45, out: 1 },
            { text: t('<strong>Prisma</strong> [[espectro completo]]', '<strong>Prism</strong> [[full spectrum]]'), x: 0.5, y: 0.55, lx: 0.86, ly: 0.7, in: 0.55, out: 1 },
            { text: t('<strong>[[214]]</strong> peças no total', '<strong>[[214]]</strong> parts in total'), x: 0.42, y: 0.66, lx: 0.14, ly: 0.78, in: 0.65, out: 1 },
          ] },
        { id: 'remontagem', type: 'cinema', label: t('Remontagem', 'Reassembly'), length: 3, media: frames('explosao', 'procedural:particles', { reverse: true, shatterFallback: 'img/hero.png' }),
          groups: [{ pos: 'bottom-center', items: [T('line', t('Cada peça, lembrada.', 'Every part, remembered.'), 0.7, 1, 'blur')] }] },
        { id: 'macro', type: 'cinema', label: 'Macro', length: 3, media: frames('macro', 'procedural:dust'),
          groups: [{ pos: 'bottom-left', items: [T('lead', t('[[uma frase sobre o acabamento]]', '[[one line about the craft]]'), 0.15, 0.9, 'rise')] }] },
      ];
    },
  },

  {
    id: 'travessia',
    nome: 'Travessia (o scroll é uma caminhada)',
    resumo: 'O scroll não move a página, move o visitante: a câmera desliza por um espaço e para em cada peça.',
    origem: ['The Gallery (ChatGPT 02)', 'THE MERIDIAN (Fable 06)'],
    melhorPara: ['portfólio', 'galeria', 'museu', 'imóvel', 'hotel', 'showroom'],
    motor: 'frames',
    verbo: 'O scroll é uma caminhada por um espaço, de destino em destino.',
    conceitoEN: 'scrolling does not move the page, it moves the visitor through {setting}',
    placas: [
      { id: 'ancora', papel: 'âncora', prompt: '{setting}, cinematic, photorealistic, architectural photography, no people, no text, no watermark.' },
    ],
    filmes: [
      { id: 'aproximacao', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'The doors part slightly and the camera glides slowly forward into the space, the first point of interest emerging from the dark. One continuous shot, no cuts.' },
      { id: 'caminhada', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'One continuous smooth dolly through the space, passing close by four lit points of interest, each catching the light differently, steady pace, no cuts.' },
      { id: 'destino', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'The camera rises and tilts up to a monumental wall with a warm backlit glow along huge engraved letterforms, dust motes in the light. One continuous shot.' },
    ],
    instrumentos: ['indicador de progresso nomeando cada espaço ao passar', 'legendas sincronizadas com a câmera passando por cada peça'],
    interacoes: ['índice de trabalhos (nome, resultado, ano)', 'contato grande', 'galeria'],
    som: { textura: 'air' },
    paraTras: 'Volta pelo corredor.',
    paleta: { bg: '#0B0B0C', text: '#F1E4C8', accent: '#A98963', accent2: '#F1E4C8' },
    tipografia: { display: 'Cormorant Garamond', body: 'Inter', mono: 'IBM Plex Mono' },
    loader: 'line',
    fallbackPreset: 'stills',
    dicas: ['Cronometre as legendas com a câmera passando pela peça um, dois, três, quatro.', 'Para imóveis: encadeie os clipes (último frame = primeiro do próximo) para um tour contínuo.'],
    capitulos(ctx) {
      const t = tx(ctx);
      const items = (ctx.items && ctx.items.length ? ctx.items : [1, 2, 3, 4].map((n) => ({ name: t(`[[Projeto ${n}]]`, `[[Project ${n}]]`), result: t('[[resultado em uma linha]]', '[[one-line result]]'), year: '[[ano]]' }))).slice(0, 4);
      return [
        { id: 'aproximacao', type: 'cinema', label: t('Entrada', 'Entrance'), length: 3, media: frames('aproximacao', 'procedural:dust', { stillsFallback: ['img/espaco-1.jpg', 'img/espaco-2.jpg'] }),
          groups: [{ pos: 'center', items: [T('overline', ctx.tagline || t('[[seu título]]', '[[your title]]'), 0, 0.5), T('display-xl', ctx.brand, 0, 0.55, 'track', 'h1')] }, { pos: 'bottom-center', items: [{ type: 'scrollcue', text: t('Entrar', 'Enter'), in: 0, out: 0.15 }] }] },
        { id: 'caminhada', type: 'cinema', label: t('A caminhada', 'The walk'), length: 5, media: frames('caminhada', 'procedural:dust', { stillsFallback: ['img/espaco-1.jpg', 'img/espaco-2.jpg', 'img/espaco-3.jpg', 'img/espaco-4.jpg'] }),
          callouts: items.map((it, i) => ({ text: `<strong>${it.name}</strong> ${it.result}${it.year ? ' · ' + it.year : ''}`, x: [0.3, 0.68, 0.32, 0.66][i], y: 0.56, lx: [0.1, 0.9, 0.1, 0.9][i], ly: 0.35, in: 0.08 + i * 0.22, out: 0.08 + i * 0.22 + 0.2 })) },
        { id: 'destino', type: 'cinema', label: t('O nome', 'The name'), length: 3, media: frames('destino', 'procedural:rays'),
          groups: [{ pos: 'center', items: [T('display-xl', ctx.brand, 0.35, 1, 'blur'), T('lead', t('Cada peça, no lugar certo.', 'Every piece, placed on purpose.'), 0.55, 1, 'rise')] }] },
      ];
    },
  },

  {
    id: 'genese',
    nome: 'Gênese (nascimento do fogo)',
    resumo: 'Não é destruição, é nascimento: matéria líquida flui, toma forma, esfria e se completa sob o polegar do visitante.',
    origem: ['AURELIA (ChatGPT 03)'],
    melhorPara: ['joias', 'artesanato', 'vidro soprado', 'chocolate', 'velas', 'cerâmica', 'cutelaria', 'forja'],
    motor: 'frames',
    verbo: 'O scroll faz o produto nascer da matéria em fusão.',
    conceitoEN: 'the visitor scrolls the {subject} into existence from molten material',
    placas: [
      { id: 'ancora', papel: 'âncora', prompt: 'A luminous ribbon of molten {material} suspended mid-pour in a pure black void, white-hot core fading to deep ember orange at the edges, tiny sparks drifting, macro photography, photorealistic, no text, no watermark.' },
    ],
    filmes: [
      { id: 'fluxo', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'Molten {material} pours slowly through the black void, coiling and folding, sparks rising, hypnotic and continuous. One continuous shot, no cuts.' },
      { id: 'forma', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'The molten stream wraps into the shape of the {subject}, the glow cooling from white through orange to the final finish, surfaces smoothing, ending on the finished {subject} rotating slowly. One continuous shot, no cuts.' },
      { id: 'macro', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'Extreme macro orbit of the finished {subject}, an engraving reading {brand} appearing, light flashing across it. One continuous shot.' },
    ],
    instrumentos: ['callouts: temperatura de fusão, pureza, peso, “peça única”'],
    interacoes: ['juramento em linhas', 'specs', 'CTA de encomenda'],
    som: { textura: 'fire' },
    paraTras: 'A peça volta a ser metal líquido.',
    paleta: { bg: '#060504', text: '#EDE3D0', accent: '#FFB25E', accent2: '#C9742A' },
    tipografia: { display: 'Cormorant Garamond', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'ember',
    fallbackPreset: 'embers',
    dicas: ['O gradiente de calor só onde o calor existe.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'fluxo', type: 'cinema', label: t('O fluxo', 'The pour'), length: 3.5, media: frames('fluxo', 'procedural:embers'), sound: 'fire',
          groups: [{ pos: 'center', items: [T('overline', ctx.tagline || t('Do fogo.', 'From fire.'), 0, 0.4), T('display-xl gradient', ctx.brand, 0, 0.45, 'track', 'h1')] }] },
        { id: 'forma', type: 'cinema', label: t('A forma', 'The forming'), length: 4, media: frames('forma', 'procedural:embers', { preset: { keys: [[0, 1], [1, 0.25]] } }),
          groups: [{ pos: 'left', items: [T('mono', t('[[1.064]] graus', '[[1,064]] degrees'), 0.15, 1, 'rise'), T('mono', t('[[24]] quilates', '[[24]] karat'), 0.32, 1, 'rise'), T('mono', t('[[1,2]] quilates', '[[1.2]] carats'), 0.5, 1, 'rise'), T('mono', t('Peça única', 'One of one'), 0.68, 1, 'rise')] }] },
        { id: 'macro', type: 'cinema', label: 'Macro', length: 3, media: frames('macro', 'procedural:dust') },
        { id: 'juramento', type: 'lines', label: t('O juramento', 'The vow'), length: 3, lines: [t('[[Uma coisa.]]', '[[One thing.]]'), t('[[Feita uma vez.]]', '[[Made once.]]'), t('[[Feita perfeita.]]', '[[Made perfectly.]]')] },
      ];
    },
  },

  {
    id: 'tempo-congelado',
    nome: 'Tempo congelado',
    resumo: 'Bullet time como site: o instante está congelado e o scroll orbita o visitante ao redor dele; num capítulo o tempo solta por meio segundo.',
    origem: ['STILL (ChatGPT 04)'],
    melhorPara: ['bebidas', 'destilados', 'perfumes', 'cosméticos líquidos', 'esportes'],
    motor: 'frames',
    verbo: 'O scroll move você, não o tempo.',
    conceitoEN: 'a frozen instant around the {subject}; scrolling moves the camera, not time',
    placas: [
      { id: 'ancora', papel: 'âncora', prompt: 'A {subject} standing in a pure black void, a dramatic wave of {liquid} frozen mid-crash wrapping around it, hundreds of droplets suspended motionless in the air, one shaft of warm light from above, ultra sharp, photorealistic advertising photography, no text, no watermark.' },
    ],
    filmes: [
      { id: 'orbita', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'The liquid stays perfectly frozen while the camera orbits 360 degrees around the {subject} and the suspended wave, light glinting through it, nothing moves except the viewpoint. One continuous shot.' },
      { id: 'liberacao', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'Time unfreezes: the wave continues its crash in extreme slow motion for a breath, droplets colliding and blooming, then freezes again in a new sculptural shape. One continuous shot.' },
      { id: 'macro', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'The camera drifts through the droplet field close up, each droplet acting as a tiny lens refracting the {subject}, one droplet trembling on the edge of falling. One continuous shot.' },
    ],
    instrumentos: ['callouts com linhas âmbar: barril, anos, teor'],
    interacoes: ['credo em linhas', 'grade de degustação (aroma, paladar, final)', 'pedido de alocação'],
    som: { golpes: [{ capitulo: 'liberacao', preset: 'impact', em: 0.3 }] },
    paraTras: 'A órbita volta pelo mesmo caminho; o tempo continua parado.',
    paleta: { bg: '#070605', text: '#EDE7DA', accent: '#C87A1E', accent2: '#F2B66B' },
    tipografia: { display: 'Cormorant Garamond', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'bokeh',
    dicas: ['Legenda pequena no herói: “o scroll move você, não o tempo”.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'orbita', type: 'cinema', label: t('A órbita', 'The orbit'), length: 4, media: frames('orbita', 'procedural:bokeh'),
          groups: [{ pos: 'center', items: [T('overline', ctx.tagline || t('O tempo, parado.', 'Time, held.'), 0, 0.4), T('display-xl', ctx.brand, 0, 0.45, 'track', 'h1'), T('mono', t('O scroll move você. Não o tempo.', 'Scroll moves you. Not time.'), 0.05, 0.45)] }] },
        { id: 'liberacao', type: 'cinema', label: t('A liberação', 'The release'), length: 3.5, media: frames('liberacao', 'procedural:fountain', { preset: { colors: ['#C87A1E', '#F2B66B', '#8A4A10', '#FFE0B0'] } }), hits: [{ preset: 'impact', at: 0.3 }],
          callouts: [
            { text: t('<strong>Barril nº [[8]]</strong> [[primeiro uso]]', '<strong>Cask No. [[8]]</strong> [[first fill]]'), x: 0.45, y: 0.4, lx: 0.12, ly: 0.28, in: 0.3, out: 1 },
            { text: t('<strong>[[18]] anos</strong> adormecido', '<strong>[[18]] years</strong> asleep'), x: 0.56, y: 0.5, lx: 0.86, ly: 0.4, in: 0.45, out: 1 },
            { text: t('<strong>[[46]]%</strong> [[sem filtragem a frio]]', '<strong>[[46]]%</strong> [[non-chill filtered]]'), x: 0.5, y: 0.66, lx: 0.14, ly: 0.76, in: 0.6, out: 1 },
          ] },
        { id: 'macro', type: 'cinema', label: 'Macro', length: 3, media: frames('macro', 'procedural:bokeh', { preset: { keys: [[0, 0], [1, 1.2]] } }) },
        { id: 'credo', type: 'lines', label: t('O credo', 'The creed'), length: 3, lines: [t('[[Paciência]]', '[[Patience]]'), t('[[é o ingrediente]]', '[[is the ingredient]]'), t('[[que não se compra.]]', '[[money can\'t buy.]]')] },
      ];
    },
  },

  {
    id: 'florescer',
    nome: 'Florescer',
    resumo: 'Crescimento em vez de destruição: algo se abre pétala por pétala no ritmo exato do scroll.',
    origem: ['NOX (ChatGPT 05)'],
    melhorPara: ['beleza', 'skincare', 'perfumaria', 'botânica', 'floricultura', 'bem-estar'],
    motor: 'frames',
    verbo: 'O scroll abre a flor exatamente na velocidade do visitante.',
    conceitoEN: 'a closed bud unfurls petal by petal under the visitor\'s scroll, and the {subject} is drawn from its heart',
    placas: [
      { id: 'ancora', papel: 'âncora', prompt: 'A single closed {flower} bud on a slender stem inside a dark glasshouse at night, cool moonlight through the glass, dew on the petals, deep green-black tones, macro botanical photography, photorealistic, no text, no watermark.' },
    ],
    filmes: [
      { id: 'florada', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'Time-lapse of the {flower} unfurling petal by petal, dew beads forming and rolling off, moonlight shifting subtly, ending fully open and holding. One continuous shot.' },
      { id: 'essencia', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'From the open bloom\'s centre a single luminous drop rises, hangs, then falls in slow motion into a small dark glass bottle rising into frame, a soft glow spreading through the glass as it lands. One continuous shot.' },
      { id: 'macro', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'Extreme macro across the petal surface, velvet texture, a dew bead acting as a lens, then a dropper releasing one glowing drop. One continuous shot.' },
    ],
    instrumentos: ['callouts com linhas prateadas: uma floração por estação, prensado a frio, pétalas, volume numerado'],
    interacoes: ['ritual em três passos (noite, pele, manhã)', 'lista para a primeira colheita'],
    som: { textura: 'air' },
    paraTras: 'A flor se fecha de novo.',
    paleta: { bg: '#0A0F0C', text: '#DDE4DC', accent: '#8E7BB8', accent2: '#C9BEE6' },
    tipografia: { display: 'Italiana', body: 'Manrope', mono: 'DM Mono' },
    loader: 'stem',
    fallbackPreset: 'bloom',
    dicas: ['O violeta só no coração da flor.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'florada', type: 'cinema', label: t('A florada', 'The bloom'), length: 4, media: frames('florada', 'procedural:bloom'), sound: 'air',
          groups: [{ pos: 'top-center', items: [T('overline', ctx.tagline || t('Cresce no escuro.', 'Grown in the dark.'), 0, 0.5), T('display-xl', ctx.brand, 0, 0.5, 'track', 'h1')] }] },
        { id: 'essencia', type: 'cinema', label: t('A essência', 'The essence'), length: 3.5, media: frames('essencia', 'procedural:bloom', { preset: { keys: [[0, 1], [1, 1]] } }),
          callouts: [
            { text: t('<strong>Uma florada</strong> por estação', '<strong>One bloom</strong> a season'), x: 0.5, y: 0.45, lx: 0.14, ly: 0.3, in: 0.15, out: 1 },
            { text: t('<strong>Prensado a frio</strong> em uma hora', '<strong>Cold pressed</strong> within the hour'), x: 0.52, y: 0.5, lx: 0.86, ly: 0.34, in: 0.32, out: 1 },
            { text: t('<strong>[[12]] pétalas</strong>, uma gota', '<strong>[[12]] petals</strong>, one drop'), x: 0.48, y: 0.62, lx: 0.14, ly: 0.74, in: 0.5, out: 1 },
            { text: t('<strong>[[30]] ml</strong>, numerado', '<strong>[[30]] ml</strong>, numbered'), x: 0.5, y: 0.7, lx: 0.86, ly: 0.78, in: 0.66, out: 1 },
          ] },
        { id: 'macro', type: 'cinema', label: 'Macro', length: 3, media: frames('macro', 'procedural:dust') },
      ];
    },
  },

  {
    id: 'descida',
    nome: 'Descida',
    resumo: 'O scroll é um profundímetro: a página escurece literalmente enquanto se desce até o escuro total.',
    origem: ['ABYSS (ChatGPT 06)', 'ABYSSAL (Fable 02)'],
    melhorPara: ['relógios de mergulho', 'expedições', 'turismo', 'mergulho', 'tour de fábrica', 'subida de montanha (invertida)'],
    motor: 'frames',
    verbo: 'Rolar para baixo É descer: a página escurece em sincronia com a profundidade.',
    conceitoEN: 'the {subject} sinks through the ocean as the visitor scrolls, the page darkening with depth',
    placas: [
      { id: 'ancora', papel: 'âncora', prompt: '{subject} sinking through clear sunlit ocean water, light rays from the surface, small bubbles rising past it, photorealistic underwater advertising photography, no text, no watermark.' },
    ],
    filmes: [
      { id: 'mergulho', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'At golden hour the {subject} slips beneath the ocean surface seen from just below, bubbles bloom, light rays wheeling, and it begins to sink. One continuous shot.' },
      { id: 'descida', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'One continuous sinking shot, the water darkening from turquoise through deep indigo to near black, light rays fading out, particles drifting past, the {glow} growing brighter as everything else goes dark, ending in pure black with only the glow visible.' },
      { id: 'escuro', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'Macro in total darkness: only the {glow} visible, a faint cloud of silt drifting past the light. One continuous shot.' },
    ],
    encadeado: 'Para 4–5 zonas (superfície, luz, crepúsculo, meia-noite, fundo), gere em ordem usando o ÚLTIMO frame de cada clipe como start_image do próximo e concatene.',
    instrumentos: ['profundímetro 0 → 3.000 m', 'callouts nas profundidades (200 m fim da luz, 1.000 m zona crepuscular, 3.000 m meia-noite)', 'fundo da página interpolando #0E3A5C → #071B30 → #000000'],
    interacoes: ['specs em preto', 'reserva'],
    som: { textura: 'water' },
    paraTras: 'Rolar para cima é voltar à superfície.',
    paleta: { bg: '#04121F', text: '#E9EDEA', accent: '#B8FF9E', accent2: '#7FE3FF' },
    tipografia: { display: 'Cormorant Garamond', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'deep',
    dicas: ['O verde do lume só no medidor, nos callouts e no brilho.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'mergulho', type: 'cinema', label: t('Superfície', 'Surface'), length: 3, media: frames('mergulho', 'procedural:deep', { preset: { mode: 'dive', sky: [[0, '#1d6f9a'], [1, '#0E3A5C']] } }), sound: 'water',
          groups: [{ pos: 'center', items: [T('overline', ctx.tagline || t('Feito para o escuro.', 'Rated for the dark.'), 0, 0.5), T('display-xl', ctx.brand, 0, 0.55, 'track', 'h1')] }] },
        { id: 'descida', type: 'cinema', label: t('A descida', 'The descent'), length: 6, media: frames('descida', 'procedural:deep', { preset: { mode: 'dive' } }), sound: 'water', bg: [[0, '#0E3A5C'], [0.5, '#071B30'], [1, '#000000']],
          groups: [{ pos: 'top-right', items: [M(t('Profundidade', 'Depth'), 'm', [[0, 0], [1, 3000]])] }],
          callouts: [
            { text: t('<strong>200 m</strong> a luz do sol termina', '<strong>200 m</strong> sunlight ends'), x: 0.5, y: 0.5, lx: 0.12, ly: 0.4, in: 0.07, out: 0.33 },
            { text: t('<strong>1.000 m</strong> zona crepuscular', '<strong>1,000 m</strong> twilight zone'), x: 0.5, y: 0.5, lx: 0.86, ly: 0.55, in: 0.33, out: 0.66 },
            { text: t('<strong>3.000 m</strong> meia-noite. Ainda funcionando.', '<strong>3,000 m</strong> midnight zone. Still ticking.'), x: 0.5, y: 0.5, lx: 0.12, ly: 0.68, in: 0.85, out: 1 },
          ] },
        { id: 'escuro', type: 'cinema', label: t('No escuro', 'In the dark'), length: 3, media: frames('escuro', 'procedural:deep', { preset: { mode: 'dive', sky: [[0, '#000000'], [1, '#000000']] } }), bg: [[0, '#000000'], [1, '#000000']] },
      ];
    },
  },

  {
    id: 'revelacao-luz',
    nome: 'Revelação pela luz',
    resumo: 'Nada explode, nada se move além da luz: um feixe varre a escuridão e o objeto passa a existir curva por curva.',
    origem: ['NOIR (ChatGPT 07)'],
    melhorPara: ['instrumentos musicais', 'móveis de design', 'automóveis clássicos', 'arte', 'objetos de alto acabamento'],
    motor: 'frames',
    verbo: 'Só existe o que a luz toca.',
    conceitoEN: 'the page opens in darkness and a single warm beam sweeps across the {subject} as the visitor scrolls',
    placas: [
      { id: 'ancora', papel: 'âncora', prompt: 'A {subject} standing in total darkness, a single warm spotlight beam grazing only one curve, the rest dissolving into black, extreme chiaroscuro contrast, photorealistic, no text, no watermark.' },
    ],
    filmes: [
      { id: 'varredura', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'Everything is black; one warm light beam travels slowly across the {subject}, revealing it section by section, reflections sliding across the surface, most of the frame always in darkness. One continuous shot.' },
      { id: 'abertura', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'The light widens as {opening} in slow motion, inner details catching warm glints, like something breathing. One continuous shot.' },
      { id: 'golpe', inicio: 'ancora', duracao: 10, resolucao: '1080p', modelo: 'melhor image-to-video disponível', prompt: 'Extreme macro in low light of {detail}, dust motes drifting through the beam. One continuous shot.' },
    ],
    instrumentos: ['callouts com linhas de tungstênio: dimensões, número de peças, horas de acabamento'],
    interacoes: ['título surge letra a letra como se o feixe encontrasse a tipografia', 'credo', 'specs', 'CTA'],
    som: { golpes: [{ capitulo: 'golpe', preset: 'chime', em: 0.5 }] },
    paraTras: 'A luz recua e o objeto volta para a escuridão.',
    paleta: { bg: '#060606', text: '#EDE7DA', accent: '#E8C28A', accent2: '#E8C28A' },
    tipografia: { display: 'Cormorant Garamond', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'dust',
    dicas: ['Nenhuma outra cor no site; a tipografia só aparece onde há conteúdo.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'varredura', type: 'cinema', label: t('A varredura', 'The sweep'), length: 4, media: frames('varredura', 'procedural:dust'),
          groups: [{ pos: 'center', items: [T('overline', ctx.tagline || t('Ouvido antes de ser visto.', 'Heard before seen.'), 0.1, 0.55), T('display-xl', ctx.brand, 0, 0.6, 'letters', 'h1')] }] },
        { id: 'abertura', type: 'cinema', label: t('A abertura', 'The opening'), length: 3.5, media: frames('abertura', 'procedural:rays'),
          callouts: [
            { text: t('<strong>[[2,7 m]]</strong> de laca', '<strong>[[9 feet]]</strong> of lacquer'), x: 0.3, y: 0.5, lx: 0.1, ly: 0.3, in: 0.2, out: 1 },
            { text: t('<strong>[[12.000]]</strong> peças', '<strong>[[12,000]]</strong> parts'), x: 0.55, y: 0.42, lx: 0.86, ly: 0.26, in: 0.35, out: 1 },
            { text: t('<strong>[[243]]</strong> cordas', '<strong>[[243]]</strong> strings'), x: 0.6, y: 0.6, lx: 0.86, ly: 0.72, in: 0.5, out: 1 },
            { text: t('<strong>[[200]] horas</strong> de ajuste', '<strong>[[200]] hours</strong> of voicing'), x: 0.4, y: 0.66, lx: 0.12, ly: 0.78, in: 0.65, out: 1 },
          ] },
        { id: 'golpe', type: 'cinema', label: t('O golpe', 'The strike'), length: 3, media: frames('golpe', 'procedural:dust'), hits: [{ preset: 'chime', at: 0.5 }] },
        { id: 'credo', type: 'lines', label: t('O credo', 'The creed'), length: 3, lines: [t('[[Primeiro, o silêncio.]]', '[[First, silence.]]'), t('[[Depois, a primeira nota.]]', '[[Then, the first note.]]'), t('[[O resto é memória.]]', '[[The rest is memory.]]')] },
      ];
    },
  },

  {
    id: 'orbita-produto',
    nome: 'Órbita de produto',
    resumo: 'O ponto de partida universal: uma órbita de estúdio, um macro e um detalhe. O scroll gira o produto.',
    origem: ['AURUM & NOIR (Fable 01)', 'ONYX SUPPLY (Fable 04)', 'FORM (Astra 03)'],
    melhorPara: ['e-commerce', 'produto premium', 'moda', 'tênis', 'fragrâncias', 'eletrônicos'],
    motor: 'frames',
    verbo: 'O scroll gira o produto em estúdio e aproxima os detalhes.',
    conceitoEN: 'scrolling rotates the {subject} in a dark studio',
    placas: [
      { id: 'hero', papel: 'placa-herói', prompt: 'A {subject} floating in a black void studio, dramatic rim lighting, faint dust drifting, premium product photography, no text.' },
    ],
    filmes: [
      { id: 'orbita', inicio: 'hero', fim: 'hero', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'A slow, perfectly smooth 360-degree studio turntable of the {subject} floating in a black void, dramatic rim lighting. One continuous shot, seamless loop.' },
      { id: 'macro', inicio: 'hero', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'Extreme close-up glide across the {detail}, light rippling across the materials. One continuous shot.' },
    ],
    instrumentos: ['specs em contador'],
    interacoes: ['arraste para girar', 'seletor de cor/acabamento', 'carrinho'],
    som: {},
    paraTras: 'Gira no sentido contrário.',
    paleta: { bg: '#0A0A0A', text: '#F2EFEA', accent: '#D4AF37', accent2: '#F5E3A6' },
    tipografia: { display: 'Playfair Display', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'image',
    dicas: ['Consistência vence qualidade: um clipe mais suave em que o produto é idêntico parece mais caro.', 'Gere 2–3 takes só do clipe-herói; ele é 80% do impacto.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'orbita', type: 'cinema', label: t('Apresentação', 'Reveal'), length: 3.5, media: frames('orbita', 'image:img/hero.jpg', { cam: [[0, { s: 1.08 }], [1, { s: 1 }]] }),
          groups: [{ pos: 'bottom-left', items: [T('overline', ctx.tagline || t('[[linha de abertura]]', '[[opening line]]'), 0, 0.6), T('display', ctx.product || ctx.brand, 0, 0.6, 'track', 'h1')] }] },
        { id: 'macro', type: 'cinema', label: t('Detalhes', 'Details'), length: 3, media: frames('macro', 'procedural:dust'),
          groups: [{ pos: 'right', items: [T('h2', t('[[O detalhe que importa.]]', '[[The detail that matters.]]'), 0.1, 0.9, 'rise', 'h2'), T('lead', t('[[uma frase concreta]]', '[[one concrete sentence]]'), 0.18, 0.9, 'rise')] }] },
        { id: 'girar', type: 'spin', label: t('Gire', 'Spin'), title: t('Gire você mesmo.', 'Spin it yourself.'), seq: 'orbita', hint: t('Arraste para girar', 'Drag to rotate') },
      ];
    },
  },

  {
    id: 'jornada-encadeada',
    nome: 'Jornada encadeada',
    resumo: 'Quatro ou cinco clipes encadeados (último frame = primeiro do próximo) viram um movimento de câmera único e contínuo.',
    origem: ['ABYSSAL (Fable 02)', 'THE MERIDIAN (Fable 06)', 'VANTA (Fable 07)'],
    melhorPara: ['veículos', 'motos', 'barcos', 'drones', 'imóveis', 'hotéis', 'turismo', 'fábricas'],
    motor: 'frames',
    verbo: 'O scroll conduz uma viagem contínua por ambientes, com um HUD que acompanha.',
    conceitoEN: 'scrolling drives the {subject} through {setting}, one continuous journey',
    placas: [
      { id: 'hero', papel: 'placa-herói', prompt: 'The {subject}, distinctive silhouette, {setting}, cinematic wide shot, no text.' },
    ],
    filmes: [
      { id: 'revelacao', inicio: 'hero', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'Dust settles to reveal the {subject} motionless; its lights ignite. One continuous shot.' },
      { id: 'corrida', inicio: 'revelacao:ultimo', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'Low tracking shot as it moves across the first environment. One continuous shot.' },
      { id: 'ambiente', inicio: 'corrida:ultimo', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'It threads a dramatic second environment at speed, the camera following around a corner. One continuous shot.' },
      { id: 'noite', inicio: 'ambiente:ultimo', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'Full dark; only its light signature and trails carving through the landscape under stars. One continuous shot.' },
    ],
    encadeado: 'Gere em ordem; o start_image de cada clipe é o último frame do anterior. Depois concatene (extrair_frames com varios videos) e faça scrub da jornada inteira.',
    instrumentos: ['HUD de velocidade 0 → 250', 'nome do ambiente atual', 'estatísticas que contam'],
    interacoes: ['seção de design com macros', 'configurador de cor que recolore uma foto', 'reserva com sinal'],
    som: { textura: 'rumble' },
    paraTras: 'A viagem volta pelo mesmo caminho, sem emendas.',
    paleta: { bg: '#030405', text: '#EAF6F8', accent: '#00E5FF', accent2: '#8AF3FF' },
    tipografia: { display: 'Unbounded', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'bar',
    fallbackPreset: 'deep',
    dicas: ['Estrutura: revelação → corrida → ambiente → noite.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'jornada', type: 'cinema', label: t('A jornada', 'The journey'), length: 7, media: { kind: 'frames', seq: 'jornada', fallback: 'procedural:deep', preset: { mode: 'warp' } }, sound: 'rumble', hud: true,
          groups: [
            { pos: 'center', items: [T('display-xl', ctx.brand, 0, 0.16, 'track', 'h1')] },
            { pos: 'bottom-right', items: [M(t('Velocidade', 'Speed'), 'km/h', [[0, 0], [0.2, 0], [0.7, 320], [1, 320]])] },
            { pos: 'bottom-left', items: [{ type: 'steps', items: [t('Revelação', 'Reveal'), t('Corrida', 'The run'), t('Ambiente', 'Terrain'), t('Noite', 'Night')], from: 0, to: 1 }] },
          ] },
      ];
    },
  },

  {
    id: 'montagem-particulas',
    nome: 'Montagem de partículas',
    resumo: 'Milhares de partículas no escuro se organizam no produto (um painel, uma marca, um gráfico) enquanto o visitante rola.',
    origem: ['PULSE (Fable 08)'],
    melhorPara: ['SaaS', 'aplicativos', 'IA', 'fintech', 'startups', 'serviços intangíveis'],
    motor: 'frames',
    verbo: 'O scroll organiza o caos: o produto literalmente se monta.',
    conceitoEN: 'thousands of glowing particles swirl and assemble themselves into {subject} as the visitor scrolls',
    placas: [
      { id: 'hero', papel: 'placa-herói', prompt: 'A clean floating {subject} made of light in a dark void, glowing data points, a rising graph, no readable text, no logos.' },
    ],
    filmes: [
      { id: 'montagem', inicio: 'hero', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'A dark void where thousands of glowing particles swirl and assemble themselves into the floating {subject}; the graph pulses like a heartbeat. One continuous shot.' },
      { id: 'sinal', inicio: 'hero', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'Macro camera glide across holographic charts and streaming numbers, one red anomaly lighting up and being caught. One continuous shot.' },
    ],
    instrumentos: ['métricas que contam (precisão, equipes, receita)'],
    interacoes: ['faixa de logos', 'três blocos fixados (Prever · Explicar · Prevenir)', 'mockup do produto', 'preços com alternância mensal/anual', 'FAQ'],
    som: {},
    paraTras: 'O produto se desfaz em poeira de dados.',
    paleta: { bg: '#07060B', text: '#F2F0FA', accent: '#8B5CF6', accent2: '#C4B5FD' },
    tipografia: { display: 'Space Grotesk', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'bar',
    fallbackPreset: 'particles',
    dicas: ['Gerado no herói + telas reais do produto = credibilidade.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'montagem', type: 'cinema', label: t('Montagem', 'Assembly'), length: 4, media: frames('montagem', 'procedural:particles', { preset: { text: ctx.brand } }),
          groups: [
            { pos: 'top-center', items: [T('overline', ctx.tagline || t('[[a promessa em uma linha]]', '[[the promise in one line]]'), 0.55, 1, 'rise')] },
            { pos: 'bottom-center', items: [{ type: 'button', text: t('Começar grátis', 'Start free'), href: '#oferta', in: 0.6, out: 1 }] },
          ] },
        { id: 'sinal', type: 'cinema', label: t('Como funciona', 'How it works'), length: 3.5, media: frames('sinal', 'procedural:aurora'),
          groups: [{ pos: 'center', items: [{ type: 'lines', mode: 'single', cls: 'display-md', lines: [t('Prever.', 'Predict.'), t('Explicar.', 'Explain.'), t('Prevenir.', 'Prevent.')] }] }] },
      ];
    },
  },

  {
    id: 'retrato',
    nome: 'Retrato (o elemento central é você)',
    resumo: 'Portfólio pessoal em que a figura central gira com o scroll, com referência de identidade em todos os planos.',
    origem: ['Portfolio — starring you (Fable 03)', 'Portrait + Portal (Astra 01)'],
    melhorPara: ['criadores', 'freelancers', 'consultores', 'donos de agência', 'marca pessoal'],
    motor: 'frames',
    verbo: 'O scroll orbita você; seu nome entra letra por letra.',
    conceitoEN: 'a personal portfolio whose central 3D element, rotating with the scroll, is the person',
    placas: [
      { id: 'retrato', papel: 'referência de identidade', prompt: 'Use the attached portrait as an identity reference on EVERY generation. Keep wardrobe identical: {wardrobe}.' },
    ],
    filmes: [
      { id: 'orbita', inicio: 'retrato', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'The person stands confident, arms crossed, in a black-void studio with {accent} rim lighting; the camera does one slow 360-degree orbit around them. One continuous shot.' },
      { id: 'trabalho', inicio: 'retrato', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'The person sits at a dark desk surrounded by floating holographic screens; slow cinematic push-in. One continuous shot.' },
      { id: 'final', inicio: 'retrato', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'The person walks toward camera down a dark gallery lined with glowing screens, stopping in a confident pose. One continuous shot.' },
    ],
    instrumentos: ['faixa de números que contam (clientes, projetos, seguidores)'],
    interacoes: ['três pilares revelados um a um', 'cards de trabalho com movimento no hover', 'CTA final com dois botões e redes'],
    som: {},
    paraTras: 'A órbita volta.',
    paleta: { bg: '#07090A', text: '#F2EEE3', accent: '#2BD98B', accent2: '#A6F5CF' },
    tipografia: { display: 'Big Shoulders Display', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'image',
    dicas: ['Gere 2–3 takes da órbita e fique com aquele em que o rosto se mantém em toda a rotação. A foto de entrada decide tudo.', 'Não invente conquistas; verifique as afirmações.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'orbita', type: 'cinema', label: t('Apresentação', 'Intro'), length: 3.5, media: frames('orbita', 'image:img/retrato.jpg', { cam: [[0, { s: 1.06 }], [1, { s: 1 }]] }),
          groups: [{ pos: 'bottom-left', items: [T('display-xl', ctx.brand, 0, 0.7, 'letters', 'h1'), T('lead', ctx.tagline || t('[[o que você faz em uma linha]]', '[[what you do in one line]]'), 0.08, 0.7, 'rise')] }] },
        { id: 'pilares', type: 'cinema', label: t('O que eu faço', 'What I do'), length: 3.5, media: frames('trabalho', 'procedural:aurora'),
          groups: [{ pos: 'left', items: [{ type: 'lines', mode: 'single', cls: 'display-md', lines: [t('[[Oferta 1]]', '[[Offer 1]]'), t('[[Oferta 2]]', '[[Offer 2]]'), t('[[Oferta 3]]', '[[Offer 3]]')] }] }] },
      ];
    },
  },

  {
    id: 'tinta-manifesto',
    nome: 'Tinta e manifesto',
    resumo: 'Tinta florescendo em câmera lenta atrás de uma tipografia gigante; o manifesto bate uma palavra por passo.',
    origem: ['NOIR&CO (Fable 09)', 'The Studio with Gravity (Astra 07)'],
    melhorPara: ['agências', 'estúdios', 'produtoras', 'branding', 'consultorias criativas'],
    motor: 'frames',
    verbo: 'O scroll bate as palavras do manifesto na tela, uma por vez.',
    conceitoEN: 'a creative studio that designs brands for companies that refuse to be ignored',
    placas: [{ id: 'hero', papel: 'âncora', prompt: 'Black ink blooming through clear water in extreme slow motion, occasional flashes of gold, pure black background, no text.' }],
    filmes: [
      { id: 'tinta', inicio: 'hero', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'Black ink blooming and morphing through water in extreme slow motion, occasionally flashing into gold. One continuous shot.' },
      { id: 'trabalho', inicio: 'hero', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'A stylised showreel shot: oversized posters and screens with bold graphic shapes sliding past on gallery walls, camera dollying sideways. No readable text. One continuous shot.' },
    ],
    instrumentos: [],
    interacoes: ['manifesto que bate uma palavra por passo', 'grade de cases com vídeo revelado no hover', 'serviços em duas colunas editoriais', 'cursor ponto dourado com anel', 'acento dourado usado exatamente três vezes'],
    som: { golpes: [{ capitulo: 'manifesto', preset: 'impact', em: 0.1 }] },
    paraTras: 'A tinta se recolhe.',
    paleta: { bg: '#000000', text: '#EFEBE3', accent: '#C9A227', accent2: '#EFEBE3' },
    tipografia: { display: 'Anton', body: 'Newsreader', mono: 'IBM Plex Mono' },
    cursor: 'ring',
    loader: 'line',
    fallbackPreset: 'ink',
    dicas: ['Se não houver trabalhos reais, rotule cada projeto como conceito.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'tinta', type: 'cinema', label: t('Estúdio', 'Studio'), length: 3.5, media: frames('tinta', 'procedural:ink'),
          groups: [{ pos: 'full', items: [T('display-xl', ctx.brand, 0, 0.7, 'track', 'h1'), T('lead', ctx.tagline || t('Marcas para quem se recusa a ser ignorado.', 'Brands for companies that refuse to be ignored.'), 0.1, 0.7, 'letters')] }] },
        { id: 'manifesto', type: 'lines', label: t('Manifesto', 'Manifesto'), length: 3, mode: 'single', cls: 'display-xl', lines: [t('ALTO.', 'LOUD.'), t('PRECISO.', 'PRECISE.'), t('INESQUECÍVEL.', 'UNFORGETTABLE.')] },
      ];
    },
  },

  {
    id: 'sensorial-local',
    nome: 'Sensorial local',
    resumo: 'Um macro sensorial (fogo, giz, vapor) abre o site de um negócio local; poucas palavras, confiança, grão de filme.',
    origem: ['EMBER & OAK (Fable 05)', 'FORGE (Fable 10)'],
    melhorPara: ['restaurantes', 'bares', 'cafés', 'academias', 'estúdios de luta', 'barbearias'],
    motor: 'frames',
    verbo: 'O scroll toca o momento sensorial em câmera lenta.',
    conceitoEN: 'opens on a slow-motion sensory macro of {detail}',
    placas: [],
    filmes: [
      { id: 'heroi', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'Slow-motion macro of {detail}, {particles} rising into darkness, cinematic warm light. One continuous shot.' },
      { id: 'ambiente', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'A slow dolly through {setting} at golden hour, moody light, a person working softly in the background. One continuous shot.' },
      { id: 'oficio', modelo: 'seedance_2_0', modo: 'std', duracao: 8, resolucao: '1080p', prompt: 'Overhead shot of hands doing the craft: {craft}, steam or dust curling up, dark surface. One continuous shot.' },
    ],
    instrumentos: ['contadores de resultados (membros, recordes, anos)'],
    interacoes: ['filosofia em uma linha por passo', 'cardápio ou programas', 'preços', 'horários + mapa + reserva/cadastro'],
    som: { textura: 'fire' },
    paraTras: 'O momento volta.',
    paleta: { bg: '#0B0908', text: '#F1E9DC', accent: '#E8692C', accent2: '#F6B37A' },
    tipografia: { display: 'Cormorant Garamond', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'ember',
    fallbackPreset: 'embers',
    dicas: ['Para vender: troque pela empresa real, use o cardápio real e fotos reais como referência.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'heroi', type: 'cinema', label: t('Início', 'Start'), length: 3, media: frames('heroi', 'procedural:embers'), sound: 'fire',
          groups: [{ pos: 'center', items: [T('display-xl', ctx.brand, 0, 0.6, 'track', 'h1'), T('lead', ctx.tagline || t('[[o lema em poucas palavras]]', '[[the motto in a few words]]'), 0.1, 0.6, 'rise')] }] },
        { id: 'filosofia', type: 'lines', label: t('Filosofia', 'Philosophy'), length: 3, lines: [t('[[Linha curta 1.]]', '[[Short line 1.]]'), t('[[Linha curta 2.]]', '[[Short line 2.]]'), t('[[Linha curta 3.]]', '[[Short line 3.]]')] },
        { id: 'ambiente', type: 'cinema', label: t('O lugar', 'The place'), length: 3, media: frames('ambiente', 'procedural:dust', { stillsFallback: ['img/lugar-1.jpg', 'img/lugar-2.jpg', 'img/lugar-3.jpg'] }),
          groups: [{ pos: 'bottom-left', items: [T('h2', t('[[Uma frase sobre o lugar.]]', '[[One line about the place.]]'), 0.1, 0.9, 'rise', 'h2')] }] },
      ];
    },
  },

  {
    id: 'portal-tunel',
    nome: 'Portal e túnel (3D real)',
    resumo: 'Do retrato editorial para dentro de uma tela; o visitante atravessa um túnel de arcos e aterrissa de pé no primeiro plano.',
    origem: ['The Portrait + Portal (Astra 01)'],
    melhorPara: ['portfólio', 'marca pessoal', 'eventos', 'lançamentos digitais'],
    motor: '3d',
    verbo: 'O scroll mergulha numa tela, atravessa um túnel e atravessa o vidro de volta para a página.',
    conceitoEN: 'the signature scroll journey starts inside a tilted project screen, tumbles through a tunnel and lands in the foreground',
    placas: [{ id: 'retrato', papel: 'retrato editorial', prompt: 'Use the attached portrait; full-screen editorial hero, oversized serif typography behind the face, warm ivory and ink black.' }],
    filmes: [],
    tresD: [
      'React + Three.js + GSAP, geometria 3D real; um personagem com rig adequado.',
      'Câmera, membros e trajetórias dos estilhaços numa única timeline.',
      'O túnel ganha várias telas de scroll, aceleração gradual e uma pausa legível na aterrissagem.',
      'Atravesse todo o túnel; nunca volte no meio. A saída é por um monitor de vidro com rachaduras radiais e estilhaços refrativos espessos.',
      'Aterrissagem de pé: joelhos dobram, assenta, fica em pé com sombra de contato. Pose final ereta, braços intactos.',
    ],
    instrumentos: [],
    interacoes: ['Sobre, Trabalhos, Recursos, Contato', 'CTA visível de imediato'],
    som: {},
    paraTras: 'Reversível: o scroll para cima refaz o caminho.',
    paleta: { bg: '#F3EEE4', text: '#141414', accent: '#1F3FD1', accent2: '#5A6B3A', theme: 'light' },
    tipografia: { display: 'Fraunces', body: 'Inter', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'tunnel',
    dicas: ['Dê um destino à câmera: abertura, meio e pose final mapeados.', 'Verifique o percurso completo no desktop e no celular, com fallback de movimento reduzido.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [
        { id: 'portal', type: 'cinema', label: t('O portal', 'The portal'), length: 6, media: { kind: 'procedural', preset: 'tunnel' }, hooks: true,
          groups: [{ pos: 'center', items: [T('display-xl', ctx.brand, 0, 0.12, 'track', 'h1')] }, { pos: 'bottom-center', items: [T('lead', ctx.tagline || '', 0.88, 1, 'rise')] }] },
      ];
    },
  },

  {
    id: 'mundo-continuo',
    nome: 'Mundo contínuo (3D real)',
    resumo: 'Um mundo 3D único explorado pelo scroll: jardim de esculturas, história ramificada ou arquitetura com tour guiado e exploração livre.',
    origem: ['Sculpture Journey (Astra 02)', 'The Last Seed (Astra 04)', 'Inside the Quiet (Astra 05)', 'Living Notebook (Astra 06)'],
    melhorPara: ['comunidades', 'educação', 'narrativas de marca', 'exposições', 'arquitetura', 'interiores', 'blogs'],
    motor: '3d',
    verbo: 'O scroll move a câmera por um caminho fluido, com pausas suaves em cada capítulo do mesmo mundo.',
    conceitoEN: 'one continuous 3D world explored by scrolling',
    placas: [{ id: 'ref', papel: 'referência de mundo', prompt: 'Consistent original environment references and textures for {setting}, same world in every view.' }],
    filmes: [],
    tresD: [
      'Um único mundo coerente em Three.js com timeline GSAP suave; ponto de vista baixo, à altura humana.',
      'Cada capítulo com silhueta distinta, título curto e uma frase útil ligada à oferta.',
      'O próximo capítulo fica escondido até a câmera se aproximar; nunca atravesse paredes ou pilares.',
      'Escolhas narrativas (ex.: chuva ou sol) mudam o crescimento e o final; os dois ramos funcionam, são rejogáveis e compreensíveis rolando para trás.',
      'Alternância suave entre tour guiado e exploração manual, com retorno claro ao tour.',
    ],
    instrumentos: ['índice de capítulos', 'seletor de pavimentos', 'dia/noite'],
    interacoes: ['controles diretos de capítulo', 'recurso para baixar', 'CTA final'],
    som: {},
    paraTras: 'Reversível em todo o percurso.',
    paleta: { bg: '#EDE8DF', text: '#1D1B18', accent: '#9A6B3C', accent2: '#5D6B4E', theme: 'light' },
    tipografia: { display: 'Cormorant Garamond', body: 'Manrope', mono: 'JetBrains Mono' },
    loader: 'line',
    fallbackPreset: 'aurora',
    dicas: ['Mantenha legendas como HTML selecionável, nunca pintadas no canvas.', 'Carregue a primeira vista rápido e transmita o resto em segundo plano.'],
    capitulos(ctx) {
      const t = tx(ctx);
      return [1, 2, 3, 4].map((n) => ({ id: `capitulo-${n}`, type: 'cinema', label: t(`[[Capítulo ${n}]]`, `[[Chapter ${n}]]`), length: 3, media: { kind: 'procedural', preset: 'aurora' }, hooks: true,
        groups: [{ pos: n % 2 ? 'left' : 'right', items: [T('overline', String(n).padStart(2, '0'), 0.1, 0.9), T('h2', t(`[[Título ${n}]]`, `[[Title ${n}]]`), 0.12, 0.88, 'rise', 'h2'), T('lead', t('[[uma frase útil ligada à oferta]]', '[[one useful sentence tied to the offer]]'), 0.18, 0.86, 'rise')] }] }));
    },
  },
];

export function getMomento(id) {
  return MOMENTOS.find((m) => m.id === id) || null;
}
