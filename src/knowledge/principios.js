// Princípios, anatomia do prompt validado, lições, modelos e power-ups.

export const PRINCIPIOS = [
  { id: 'visitante', titulo: 'O scroll move o visitante, não a página', texto: 'O scroll é câmera, tempo, profundidade ou luz. Cada capítulo responde: o que o scroll faz aqui? (gira, desce, constrói, revela, atravessa).' },
  { id: 'um-momento', titulo: 'Um sujeito + um momento impossível', texto: 'Escolha UM momento (explodir, florescer, afundar, restaurar, ver por dentro, nascer do fogo…) e trate-o com seriedade total. Troque o sujeito, mantenha o sistema.' },
  { id: 'para-tras', titulo: 'Para trás é mágica de graça', texto: 'Toda transformação funciona nos dois sentidos: explodir/remontar, abrir/fechar, afundar/emergir. Um clipe, dois momentos. Diga ao visitante para rolar de volta.' },
  { id: 'continuidade', titulo: 'Continuidade absoluta', texto: 'Um plano contínuo, sem cortes, não tem emendas quando o visitante rebobina. Clipes encadeados (último frame = primeiro do próximo) viram uma câmera só. “One continuous shot, no cuts” em todo prompt de movimento.' },
  { id: 'instrumentos', titulo: 'Instrumentos atrelados à filmagem', texto: 'Medidores (dB, Hz, metros, GU, camadas, altitude) atrelados ao que está NA TELA, não à porcentagem do scroll. Use keyframes não lineares. Isso faz o filme parecer engenharia.' },
  { id: 'ambiente-reage', titulo: 'O ambiente reage', texto: 'O fundo escurece com a profundidade; o acento da interface é amostrado do frame; a paleta muda filmes e UI juntos; o palco treme com a velocidade.' },
  { id: 'espalhar', titulo: 'Espalhe a mudança pelo scroll', texto: 'Corte frames parados no início/fim, dê mais scroll aos momentos lentos (time-warp) e uma pausa legível em cada destino. Uma explosão que termina em 1,5 s é desperdiçada.' },
  { id: 'fisico', titulo: 'Descreva fisicamente', texto: 'Diga o que a luz e a matéria fazem, não com o que se parecem. Metáforas são renderizadas literalmente.' },
  { id: 'restricao', titulo: 'Restrição é luxo', texto: 'Fundo quase preto, UM acento usado só onde há luz/calor, poucas palavras, espaço negativo enorme, sem caixas nem sombras. Display serifada ou larga + caps espaçadas + mono nas leituras.' },
  { id: 'sensorial', titulo: 'Um momento sensorial', texto: 'Som sintetizado (desligado por padrão) que toca só enquanto o filme se move e silencia quando o scroll para, com um golpe no grande momento.' },
  { id: 'utilidade', titulo: 'Uma interação útil', texto: 'O espetáculo atrai; o módulo de negócio (orçamento, reserva, configurador, carrinho, escolha) é o que o cliente paga. Teste com entradas reais.' },
  { id: 'honestidade', titulo: 'Honestidade', texto: 'Formulários de demonstração dizem que nada foi enviado. Não invente prêmios, clientes, depoimentos nem números. Rotule conceitos como conceitos.' },
  { id: 'verificar', titulo: 'Verifique no meio do scroll', texto: 'Cada capítulo em ~50% do progresso, para frente e para trás, no desktop e no celular, sem erros no console — antes de dizer que terminou.' },
  { id: 'dirigir', titulo: 'Dirija com sentimentos', texto: '“O título cobre o produto”, “a explosão é rápida demais”, “faça parecer mais caro”. Descrever o problema funciona melhor que prescrever a correção.' },
];

export const ANATOMIA = [
  { bloco: 'ENQUADRAMENTO', regra: 'Uma frase com padrão de qualidade (“award-winning cinematic 3D scroll website”), marca, categoria (fictícia ou real) e o verbo da experiência (“Scrolling restores…”).' },
  { bloco: 'MOMENTO', regra: 'Um sujeito e uma transformação. Uma frase sobre o que o visitante sente.' },
  { bloco: 'TÉCNICA', regra: 'Declare o método: sequência de frames num canvas fixado (não Three.js), ou 3D real quando houver órbita livre, troca de material ou personagem articulado. Impede o agente de cair num template.' },
  { bloco: 'STILLS', regra: 'UMA placa-herói. Toda outra placa é EDIT dela (job id como referência). Mesma posição e tamanho quando for empilhar (lente). “no text, no watermark”.' },
  { bloco: 'FILMS', regra: 'start_image E end_image em cada clipe; loop = mesma placa no início e no fim; “one continuous shot, no cuts”; câmera suave; duração e modelo explícitos; recuse presets sugeridos.' },
  { bloco: 'FRAMES', regra: 'ffmpeg: corte o que o modelo segura no início, ~150–200 frames, 1600–1920 px, JPEG q3, frames/<clipe>/frame_0001.jpg; confirme que existem antes de escrever o site.' },
  { bloco: 'WEBSITE', regra: 'Capítulos fixados com Lenis; por capítulo: tipografia + instrumentos atrelados + interação; depois o módulo de negócio.' },
  { bloco: 'DESIGN', regra: 'Registro, paleta em hex, acento com parcimônia, pares tipográficos, motivo visual, o que NÃO usar.' },
  { bloco: 'SOM · MOBILE · PERFORMANCE', regra: 'Web Audio desligado por padrão; fallback MP4 em mobile/reduced motion; rAF, repintar só quando o frame muda, 60 fps.' },
  { bloco: 'VERIFY', regra: 'Abrir em localhost (porta própria) e verificar cada capítulo no meio do scroll, nos dois sentidos, sem erros, antes de declarar pronto.' },
];

export const LICOES = [
  'O quadro final é o volante: decide exatamente onde o plano aterrissa.',
  'Toda placa é edit de uma placa só: imagens novas derivam; edits ficam alinhados o bastante para empilhar um raio-X.',
  'Teste o plano grande em mais de um modelo; cada modelo ganha um plano diferente.',
  'Espalhe a mudança pelo scroll: corte frames parados e escolha o take em que a mudança se constrói.',
  'Descreva fisicamente: luz e matéria, não metáforas.',
  'Medidores + negócio real transformam espetáculo em site.',
  'Consistência vence qualidade: o mesmo produto em todos os planos parece mais caro.',
  'Gaste os créditos extras em 2–3 takes do clipe-herói; ele é 80% do impacto.',
  'Comprima vídeos para web (~90% menor) e o scroll fica liso em qualquer notebook.',
  'Dê um destino à câmera; revise as transições com o mesmo cuidado do herói.',
  'Proteja o texto, respeite movimento reduzido, mantenha o celular confortável.',
  'Carregue a primeira vista rápido; transmita o resto em segundo plano.',
];

export const RESGATE = [
  { quando: 'O resultado rola como página normal em vez de fazer scrub do filme', fala: 'Não use template nem vídeo de fundo. Extraia os frames JPEG com ffmpeg e dirija-os com um loop de canvas drawImage mapeado ao scroll. O scrub é o produto.' },
  { quando: 'Reclamação de limite de tamanho de hospedagem', fala: 'Reduza para 100 frames por clipe a 1280 px, mas nunca troque a sequência de frames por um elemento de vídeo.' },
  { quando: 'Um preset de estilo aparece no lugar do vídeo', fala: 'Reenvie a geração recusando o preset (declined_preset_id) para que o job rode.' },
];

export const MODELOS = [
  { id: 'kling3_0', nome: 'Kling 3.0 · 4K', custo: 60, unidade: 'cr / 10 s', forte: 'Burro de carga: aterrissa no quadro final e constrói gradualmente — perfeito para scrub.', cuidado: 'Segura o primeiro frame por alguns segundos: corte (extrair_frames faz isso).' },
  { id: 'cinematic_studio_3_0', nome: 'Cinema Studio 3.0 · 4K', custo: 240, unidade: 'cr / 10 s', forte: 'O maior espetáculo; inventa movimentos de câmera ousados.', cuidado: 'Trata o quadro final como sugestão.' },
  { id: 'seedance_2_0', nome: 'Seedance 2.0 · 4K', custo: 220, unidade: 'cr / 10 s', forte: 'Detalhe mais denso.', cuidado: 'Eventos rápidos terminam em ~1,5 s e seguram — rápido demais para scroll. No modo std/1080p/~8 s é o ponto ideal de custo.' },
  { id: 'seedance_2_5', nome: 'Seedance 2.5 · 1080p', custo: 360, unidade: 'cr / 30 s', forte: 'Um plano contínuo de 30 s: o site inteiro pode ser um movimento de câmera.', cuidado: 'Leva as palavras ao pé da letra: descreva efeitos fisicamente.' },
  { id: 'gpt_image_2_5', nome: 'GPT Image 2.5 · 4K', custo: 4.25, unidade: 'cr (high) / 15 cr (max)', forte: 'Placas e edits alinhados o bastante para empilhar um raio-X.', cuidado: 'Sempre faça edits da placa-herói.' },
  { id: 'fps_boost', nome: 'Topaz FPS boost', custo: 56, unidade: 'cr', forte: 'Dobra para 48 fps: scrub mais sedoso em movimento rápido.', cuidado: 'Lento em 4K; comece cedo. Alternativa local grátis: extrair_frames com interpolar=true.' },
  { id: 'hunyuan3d_v3', nome: 'Hunyuan3D v3', custo: 19, unidade: 'cr', forte: 'Uma foto vira modelo 3D girável.', cuidado: 'Comprima o GLB com quantize e texturas webp, não meshopt.' },
];

export const POWERUPS = [
  { id: 'paleta', nome: 'Seletor de paleta', atributo: 'data-im-palette', descricao: 'Chips Original/Neon/Pôr do sol/Oceano/Mono aplicam filtros CSS em todos os canvas ao mesmo tempo; o acento da página passa pela mesma matemática de cor.', verificar: 'Cada chip muda filme E acento.' },
  { id: 'lente', nome: 'Lente raio-X / térmica', atributo: 'data-im-lens', descricao: 'Edit da placa-herói mostrando o interior, empilhada e revelada por um círculo suave que segue o cursor e varre sozinho quando ninguém toca; leitura do pixel embaixo da lente.', verificar: 'Meça o alinhamento das placas (medir_alinhamento) e corrija o offset.' },
  { id: 'som', nome: 'Som que segue o scroll', atributo: 'data-im-sound / data-im-hit', descricao: 'Toggle desligado por padrão; tudo sintetizado com Web Audio; um golpe no grande momento, textura só enquanto o filme se move, silêncio quando o scroll para. ?mute=1 para testes.', verificar: 'Som nunca toca sem clique; ?mute=1 esconde o botão.' },
  { id: 'bakeoff', nome: 'Bake-off de modelos', atributo: 'ferramenta folha_de_contato', descricao: 'Renderize o plano-herói em kling3_0, cinematic_studio_3_0 e seedance_2_0 com os mesmos quadros; gere folhas de contato e escolha o que faz o melhor scrub.', verificar: 'O vencedor espalha a mudança pelo clipe inteiro.' },
  { id: 'filmar', nome: 'Pronto para filmar', atributo: 'servidor + ?solo=capitulo:0.5', descricao: 'Bibliotecas locais (offline), launcher de duplo clique numa porta própria, servidor sem cache para arquivos ausentes, loop que continua mesmo se um frame falhar, e ?solo=capitulo:0.5 para fixar qualquer capítulo em screenshots.', verificar: 'Abrir via abrir-site.bat/.command.' },
  { id: 'amostrador', nome: 'Amostrador de cor ao vivo', atributo: 'data-im-sample-accent', descricao: 'Lê os pixels mais saturados do frame atual e define o acento da página.', verificar: 'O acento acompanha a cor na tela.' },
  { id: 'girar', nome: 'Arraste para girar', atributo: 'data-im-spin', descricao: 'Reaproveita os frames da órbita: arraste, inércia, teclado.', verificar: 'Gira nos dois sentidos, faz loop.' },
  { id: 'comparar', nome: 'Antes/depois', atributo: 'data-im-compare', descricao: 'Duas placas (edit uma da outra) com alça arrastável e acessível por teclado.', verificar: 'A forma não deriva entre as placas.' },
  { id: 'tremor', nome: 'Tremor do palco', atributo: 'data-im-shake="de,até,px"', descricao: 'O palco treme proporcional à velocidade do scroll numa faixa do capítulo (ignição, impacto).', verificar: 'Para quando o scroll para.' },
  { id: 'fundo', nome: 'Fundo sincronizado', atributo: 'data-im-bg / data-im-bg-section', descricao: 'A cor da página interpola com o progresso (profundidade, hora do dia) ou muda por seção.', verificar: 'Texto continua legível em todas as cores.' },
  { id: 'cursor', nome: 'Cursor', atributo: 'data-im-cursor="ring|dot|paint"', descricao: 'Anel com rótulo, ponto, ou spray de tinta que respinga no clique.', verificar: 'Desligado em toque e movimento reduzido.' },
  { id: 'manifesto', nome: 'Manifesto por passos', atributo: 'data-im-lines="stack|single"', descricao: 'Uma linha (ou uma palavra batendo) por passo de scroll.', verificar: 'Legível parado em cada passo.' },
  { id: 'contadores', nome: 'Contadores', atributo: 'data-im-count', descricao: 'Números que sobem ao entrar na tela.', verificar: 'Mostram o valor final com movimento reduzido.' },
  { id: 'magnetico', nome: 'Botões magnéticos', atributo: 'data-im-magnetic', descricao: 'CTAs que puxam levemente para o cursor.', verificar: 'Sem efeito em toque.' },
  { id: 'indice', nome: 'Índice de capítulos', atributo: 'data-im-index', descricao: 'Navegação fixa nomeando cada espaço ao passar, com progresso por capítulo.', verificar: 'Clique leva ao capítulo.' },
];

export const CHECKLIST_VERIFICACAO = [
  'Loader chega a 100% e libera o scroll (ou o portão aparece).',
  'Cada capítulo faz scrub em 10%, 50% e 90%; rolar para trás rebobina.',
  'Instrumentos mudam com o que está na tela; callouts alinhados às peças.',
  'Nenhum erro no console; nenhum frame 404.',
  'Celular (390 px): sem rolagem horizontal, texto legível, fallback MP4 ou scrub leve.',
  'Movimento reduzido: tudo visível e estático.',
  'Som só depois de clique; ?mute=1 funciona.',
  'Módulo de negócio funciona com entradas reais; formulários de demonstração dizem que nada foi enviado.',
  'Nenhum [[marcador]] sobrando no texto; nenhuma afirmação inventada.',
];
