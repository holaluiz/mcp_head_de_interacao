// Receitas por segmento: qual momento impossível + quais módulos de negócio
// + tom de copy. Extraído dos campos "Best for" e "Make it yours" dos 31 prompts.

const tx = (ctx) => (pt, en) => (String(ctx.lang || 'pt-BR').toLowerCase().startsWith('en') ? en : pt);

export const SEGMENTOS = [
  { id: 'padaria-cafe', nome: 'Padaria, café, confeitaria', palavras: ['padaria', 'pão', 'croissant', 'confeitaria', 'doceria', 'café', 'cafeteria', 'bolo', 'donut', 'brigadeiro', 'bakery', 'pastry', 'coffee', 'cafe', 'patisserie'],
    momentos: ['lancamento-flagship', 'sensorial-local'], modulos: [['pedido'], ['localizacao']], tom: 'Registro de lançamento de tecnologia aplicado a algo humilde: frases curtas, números exatos, seriedade total.', assunto: 'all-butter croissant' },
  { id: 'restaurante', nome: 'Restaurante, bar, hamburgueria', palavras: ['restaurante', 'bistrô', 'bistro', 'steakhouse', 'churrascaria', 'pizzaria', 'hamburgueria', 'bar', 'gastronomia', 'chef', 'cozinha', 'restaurant', 'grill', 'burger', 'sushi', 'trattoria'],
    momentos: ['sensorial-local', 'tempo-congelado'], modulos: [['cardapio'], ['reserva'], ['localizacao']], tom: 'Esparso, confiante, sensorial. “Seis pratos. Um fogo.”', assunto: 'ribeye searing over open flame' },
  { id: 'bebidas', nome: 'Bebidas, destilados, vinhos', palavras: ['cervejaria', 'cerveja', 'destilaria', 'whisky', 'uísque', 'gin', 'cachaça', 'vinho', 'vinícola', 'drink', 'bebida', 'licor', 'brewery', 'distillery', 'wine', 'spirits'],
    momentos: ['tempo-congelado', 'explosao-de-cor', 'genese'], modulos: [['especificacoes', { title: 'Degustação.' }], ['espera', { title: 'Peça sua alocação.' }]], tom: 'Paciência, tempo, pouca palavra.', assunto: 'whisky bottle' },
  { id: 'academia', nome: 'Academia, luta, treinamento', palavras: ['academia', 'crossfit', 'box', 'musculação', 'pilates', 'luta', 'jiu-jitsu', 'muay thai', 'boxe', 'personal', 'treino', 'gym', 'fitness', 'strength', 'martial'],
    momentos: ['sensorial-local'], modulos: [['cards', { id: 'programas', label: 'Programas', title: 'Programas.' }], ['numeros'], ['precos', { toggle: false }], ['agenda'], ['reserva', { title: 'Primeira semana grátis.', fields: ['name', 'email', 'phone'], slots: { days: 5, hours: ['06:00', '07:00', '12:00', '18:00', '19:00'], skip: [0], busy: 0.2 } }]], tom: 'Industrial, direto, duro. “Conquiste.”', assunto: 'athlete clapping chalked hands under a single shaft of light' },
  { id: 'imobiliaria', nome: 'Imóveis, hotéis, hospedagem', palavras: ['imobiliária', 'imóvel', 'apartamento', 'cobertura', 'casa à venda', 'corretor', 'lançamento imobiliário', 'hotel', 'pousada', 'resort', 'airbnb', 'real estate', 'penthouse', 'listing', 'villa'],
    momentos: ['travessia', 'jornada-encadeada'], modulos: [['numeros'], ['reserva', { title: 'Agende uma visita privada.', fields: ['name', 'email', 'phone', 'notes'], slots: { days: 6, hours: ['10:00', '11:30', '14:00', '16:00', '17:30'], skip: [0], busy: 0.3 }, agent: { name: '[[Corretor]]', role: '[[CRECI]]' } }]], tom: 'Elegante, espaçoso, números concretos (quartos, m², andar).', assunto: 'glass tower penthouse at dusk' },
  { id: 'estetica-automotiva', nome: 'Estética automotiva, funilaria', palavras: ['estética automotiva', 'detailing', 'lava-jato', 'lava jato', 'funilaria', 'vitrificação', 'polimento', 'ppf', 'envelopamento', 'martelinho', 'car wash', 'paint correction', 'ceramic coating'],
    momentos: ['restauracao'], modulos: [['cards', { id: 'pacotes', label: 'Pacotes', title: 'Pacotes.' }], ['orcamento', {
      groups: [
        { label: 'Porte do veículo', name: 'porte', kind: 'radio', options: [{ label: 'Hatch / compacto', mult: 1 }, { label: 'Sedã / SUV', mult: 1.25 }, { label: 'Picape / van', mult: 1.5 }] },
        { label: 'Estado da pintura', name: 'pintura', kind: 'radio', options: [{ label: 'Boa', mult: 1 }, { label: 'Riscos leves', mult: 1.2 }, { label: 'Muito marcada', mult: 1.45 }] },
        { label: 'Pacote', name: 'pacote', kind: 'radio', options: [{ label: 'Revitalização', price: 450, days: 1 }, { label: 'Correção', price: 1200, days: 2 }, { label: 'Vitrificação', price: 2800, days: 3 }] },
      ], slots: { days: 6, hours: ['08:00', '10:00', '13:30', '16:00'], skip: [0], busy: 0.35, name: 'box' }, cta: 'Reservar box' }]], tom: 'Garagem preta, confiança técnica, números de medição.', assunto: '1960s-style coupe with no badges' },
  { id: 'limpeza-reforma', nome: 'Limpeza, lavagem, reforma, telhado', palavras: ['limpeza', 'lavagem', 'hidrojateamento', 'pintura predial', 'telhado', 'reforma', 'impermeabilização', 'piscina verde', 'pressure washing', 'roofing', 'cleaning', 'renovation'],
    momentos: ['restauracao'], modulos: [['orcamento'], ['avaliacoes']], tom: 'Transformação visível, prova antes/depois.', assunto: 'mossy stone driveway' },
  { id: 'servicos-residenciais', nome: 'Climatização, hidráulica, elétrica, dedetização', palavras: ['ar-condicionado', 'ar condicionado', 'climatização', 'refrigeração', 'encanador', 'hidráulica', 'vazamento', 'eletricista', 'elétrica', 'dedetização', 'desentupidora', 'isolamento', 'hvac', 'plumber', 'electrician', 'pest control'],
    momentos: ['raio-x'], modulos: [['cards', { id: 'servicos', title: 'Serviços.' }], ['orcamento', {
      wizard: true, title: 'Orçamento em 90 segundos.',
      groups: [
        { label: 'Sistema', name: 'sistema', kind: 'radio', options: [{ label: 'Climatização', price: 380 }, { label: 'Hidráulica', price: 260 }, { label: 'Elétrica', price: 300 }] },
        { label: 'Sintoma', name: 'sintoma', kind: 'radio', options: [{ label: 'Manutenção preventiva', mult: 1 }, { label: 'Não funciona', mult: 1.3 }, { label: 'Vazamento / faísca', mult: 1.6 }] },
        { label: 'Tamanho do imóvel', name: 'imovel', kind: 'radio', options: [{ label: 'Até 70 m²', mult: 1 }, { label: '70–150 m²', mult: 1.25 }, { label: 'Acima de 150 m²', mult: 1.5 }] },
        { label: 'Urgência', name: 'urgencia', kind: 'radio', options: [{ label: 'Esta semana', mult: 1 }, { label: 'Amanhã', mult: 1.15 }, { label: 'Hoje', mult: 1.4 }] },
      ], slots: { days: 4, hours: ['08:00', '10:00', '14:00', '16:00'], skip: [0], busy: 0.4 } }], ['avaliacoes'], ['emergencia']], tom: '“Vemos o que você não vê.” Técnico, tranquilizador, honesto.', assunto: 'modern two-storey family home' },
  { id: 'saude', nome: 'Odontologia, clínicas, fisioterapia', palavras: ['dentista', 'odontologia', 'clínica', 'consultório', 'fisioterapia', 'ortodontia', 'implante', 'estética facial', 'dermatologia', 'dental', 'clinic', 'physio'],
    momentos: ['raio-x', 'travessia'], modulos: [['cards', { id: 'tratamentos', label: 'Tratamentos', title: 'Tratamentos.' }], ['reserva', { title: 'Agende sua avaliação.', fields: ['name', 'email', 'phone', 'notes'], slots: { days: 5, hours: ['08:00', '09:30', '11:00', '14:00', '15:30', '17:00'], skip: [0, 6], busy: 0.35 } }], ['faq']], tom: 'Calmo, preciso, sem promessas médicas.', assunto: 'healthy human tooth' },
  { id: 'joalheria', nome: 'Joalheria, relojoaria, cristais', palavras: ['joalheria', 'joia', 'jóia', 'anel', 'aliança', 'diamante', 'ouro', 'relojoaria', 'relógio', 'cristal', 'jewel', 'jewellery', 'jewelry', 'ring', 'watch', 'diamond'],
    momentos: ['dentro-da-luz', 'genese', 'explosao-remontagem'], modulos: [['configurador', {
      title: 'Monte o seu anel.', base: 4800, preview: { img: 'img/hero.jpg', id: 'previa', engraving: true },
      groups: [
        { label: 'Metal', name: 'metal', kind: 'radio', options: [{ label: 'Platina', price: 1800, swap: { target: '#previa', src: 'img/hero.jpg' }, color: '#e5e4e2' }, { label: 'Ouro amarelo', price: 900, swap: { target: '#previa', src: 'img/ouro-amarelo.jpg' }, color: '#d4af37' }, { label: 'Ouro rosé', price: 950, swap: { target: '#previa', src: 'img/ouro-rose.jpg' }, color: '#b76e79' }] },
        { label: 'Quilates', name: 'quilates', kind: 'range', min: 0.5, max: 3, step: 0.1, value: 1, pricePer: 9500, unit: 'ct' },
        { label: 'Aro', name: 'aro', kind: 'select', options: [10, 12, 14, 16, 18, 20, 22].map((n) => ({ label: String(n) })) },
        { label: 'Gravação', name: 'gravacao', kind: 'text', placeholder: 'Para sempre', bind: '#gravacao-previa' },
      ], cta: 'Agendar visita privada' }], ['reserva', { title: 'Visita privada.', fields: ['name', 'email', 'phone'], slots: { days: 6, hours: ['11:00', '14:00', '16:00', '18:00'], skip: [0], busy: 0.4 } }]], tom: 'Veludo negro, luz, refinamento, pouquíssimas palavras.', assunto: 'platinum solitaire ring with a round brilliant diamond' },
  { id: 'construcao-paisagismo', nome: 'Piscinas, paisagismo, construção, planejados', palavras: ['piscina', 'paisagismo', 'jardim', 'deck', 'pergolado', 'construtora', 'construção', 'obra', 'marcenaria', 'planejados', 'cozinha planejada', 'arquitetura de interiores', 'pool', 'landscaping', 'builder', 'contractor', 'kitchen'],
    momentos: ['construcao'], modulos: [['configurador', {
      title: 'Desenhe o seu.', base: 45000, spread: 0.12, months: 60, rate: 0.0149, preview: null,
      groups: [
        { label: 'Formato', name: 'formato', kind: 'radio', options: [{ label: 'Retangular', mult: 1, days: 45 }, { label: 'Orgânico', mult: 1.18, days: 55 }, { label: 'Raia longa', mult: 1.3, days: 60 }] },
        { label: 'Acabamento', name: 'acabamento', kind: 'radio', options: [{ label: 'Pastilha', price: 0 }, { label: 'Pedra natural', price: 18000, days: 7 }, { label: 'Vinil', price: -6000 }] },
        { label: 'Deck', name: 'deck', kind: 'radio', options: [{ label: 'Madeira', price: 14000 }, { label: 'Porcelanato', price: 11000 }, { label: 'Pedra', price: 19000 }] },
        { label: 'Extras', name: 'extras', kind: 'checkbox', options: [{ label: 'Spa', price: 22000, days: 10 }, { label: 'Fogo ao ar livre', price: 9000, days: 3 }, { label: 'Iluminação', price: 6500, days: 2 }] },
      ], outputs: [{ key: 'range', label: 'Faixa de investimento' }, { key: 'weeks', label: 'Semanas de obra' }, { key: 'monthly', label: 'Parcela estimada (60x)' }], cta: 'Agendar consulta gratuita' }], ['cards', { id: 'portfolio', label: 'Portfólio', title: 'Projetos entregues.' }]], tom: 'Luxo relaxado, entardecer, resultado visível antes de existir.', assunto: 'suburban backyard pool and landscape' },
  { id: 'audio-eletronicos', nome: 'Áudio, eletrônicos, câmeras, gadgets', palavras: ['caixa de som', 'som', 'áudio', 'fone', 'headphone', 'speaker', 'eletrônico', 'gadget', 'câmera', 'camera', 'audio', 'earbuds', 'keyboard', 'teclado'],
    momentos: ['explosao-de-cor', 'explosao-remontagem', 'orbita-produto'], modulos: [['numeros'], ['configurador', { title: 'Escolha o acabamento.', base: 2499, groups: [{ label: 'Acabamento', name: 'acabamento', kind: 'radio', options: [{ label: 'Titânio', price: 0, swap: { target: '#previa', filter: 'none' }, color: '#8a8d91' }, { label: 'Areia', price: 0, swap: { target: '#previa', filter: 'sepia(.45) brightness(1.08)' }, color: '#c8b79a' }, { label: 'Cobalto', price: 200, swap: { target: '#previa', filter: 'hue-rotate(190deg) saturate(1.6)' }, color: '#2747ff' }] }], cta: 'Comprar' }]], tom: 'Engenharia + emoção; números de especificação.', assunto: 'sculptural speaker with the woofer cone facing up' },
  { id: 'moda', nome: 'Moda, streetwear, tênis', palavras: ['moda', 'roupa', 'streetwear', 'tênis', 'sneaker', 'boutique', 'coleção', 'drop', 'vestuário', 'fashion', 'apparel', 'clothing', 'shoes'],
    momentos: ['orbita-produto', 'explosao-de-cor'], modulos: [['loja', { countdown: { to: '' } }], ['espera', { title: 'Avise-me quando voltar.' }]], tom: 'Brutalista, condensado, contagem regressiva.', assunto: 'heavyweight matte black hoodie' },
  { id: 'beleza', nome: 'Beleza, skincare, perfumaria', palavras: ['cosmético', 'skincare', 'sérum', 'perfume', 'fragrância', 'maquiagem', 'salão', 'spa', 'beleza', 'beauty', 'serum', 'fragrance', 'cosmetics'],
    momentos: ['florescer', 'explosao-de-cor', 'tempo-congelado'], modulos: [['cards', { id: 'ritual', label: 'Ritual', title: 'O ritual.' }], ['loja', { products: null }], ['espera', { title: 'Entre para a primeira colheita.' }]], tom: 'Quieto, botânico, sensorial.', assunto: 'black orchid' },
  { id: 'saas', nome: 'SaaS, aplicativos, IA, startups', palavras: ['saas', 'software', 'aplicativo', 'app', 'plataforma', 'startup', 'inteligência artificial', ' ia ', 'dashboard', 'api', 'fintech', 'automação', 'b2b', 'ai', 'platform'],
    momentos: ['montagem-particulas'], modulos: [['numeros'], ['precos'], ['faq'], ['espera', { title: 'Comece grátis.', button: 'Criar conta' }]], tom: 'Claro, confiante, benefícios concretos; nada de jargão vazio.', assunto: 'floating analytics dashboard made of light' },
  { id: 'agencia', nome: 'Agência, estúdio criativo, produtora', palavras: ['agência', 'agencia', 'estúdio', 'studio', 'produtora', 'branding', 'design', 'marketing', 'publicidade', 'motion', 'creative', 'agency'],
    momentos: ['tinta-manifesto'], modulos: [['cards', { id: 'cases', label: 'Cases', title: 'Trabalhos.' }], ['cards', { id: 'servicos', title: 'Serviços.' }], ['espera', { title: 'Tem uma marca que vale a briga?', button: 'Vamos conversar' }]], tom: 'Ousado, curto, sem modéstia e sem inventar clientes.', assunto: 'black ink blooming in water' },
  { id: 'portfolio', nome: 'Portfólio pessoal, freelancer, consultor', palavras: ['portfólio', 'portfolio', 'freelancer', 'freela', 'consultor', 'consultoria', 'fotógrafo', 'designer', 'desenvolvedor', 'criador de conteúdo', 'marca pessoal', 'personal brand', 'creator', 'photographer', 'developer'],
    momentos: ['travessia', 'retrato', 'portal-tunel'], modulos: [['indice'], ['espera', { title: 'Visite o estúdio.', button: 'Enviar e-mail' }]], tom: 'Silêncio e espaço; primeira pessoa, sem exageros.', assunto: 'dark private museum hall with glowing glass artifacts on plinths' },
  { id: 'turismo', nome: 'Turismo, expedições, experiências', palavras: ['turismo', 'viagem', 'expedição', 'mergulho', 'passeio', 'trilha', 'aventura', 'experiência', 'museu', 'tour', 'expedition', 'travel', 'diving'],
    momentos: ['descida', 'jornada-encadeada', 'travessia'], modulos: [['numeros'], ['reserva', { title: 'Reserve sua vaga.', fields: ['name', 'email', 'party'], slots: { days: 6, hours: ['07:00', '09:00', '14:00'], skip: [], busy: 0.5 } }]], tom: 'Pergunta-convite (“Até onde você vai?”), fatos marcantes por etapa.', assunto: 'sleek deep-sea submersible with a glowing viewport ring' },
  { id: 'veiculos', nome: 'Veículos, motos, barcos, drones', palavras: ['carro', 'concessionária', 'moto', 'motocicleta', 'bike', 'bicicleta', 'e-bike', 'barco', 'lancha', 'drone', 'veículo', 'car', 'motorcycle', 'boat', 'vehicle'],
    momentos: ['jornada-encadeada', 'orbita-produto'], modulos: [['numeros'], ['configurador', { title: 'Escolha a cor.', base: 0, groups: [{ label: 'Pintura', name: 'pintura', kind: 'radio', options: [{ label: 'Obsidiana', price: 0, swap: { target: '#previa', filter: 'none' }, color: '#111' }, { label: 'Ártico', price: 0, swap: { target: '#previa', filter: 'invert(.85) hue-rotate(180deg)' }, color: '#e8e8e8' }, { label: 'Ciano', price: 0, swap: { target: '#previa', filter: 'hue-rotate(160deg) saturate(1.8)' }, color: '#00e5ff' }] }], outputs: [], cta: 'Reservar com sinal' }]], tom: 'Performance, terreno, noite.', assunto: 'low wide matte obsidian electric hypercar with a thin light bar' },
  { id: 'eventos', nome: 'Eventos, lançamentos, inaugurações', palavras: ['evento', 'lançamento', 'inauguração', 'festa', 'show', 'festival', 'conferência', 'estreia', 'event', 'launch', 'opening', 'conference'],
    momentos: ['plano-unico'], modulos: [['reserva', { title: 'Garanta seu lugar.', fields: ['name', 'email', 'party'] }], ['faq']], tom: 'Contagem regressiva, expectativa, data e hora claras.', assunto: 'stage curtain at the moment of opening' },
  { id: 'arquitetura', nome: 'Arquitetura e interiores', palavras: ['arquitetura', 'arquiteto', 'interiores', 'design de interiores', 'escritório de arquitetura', 'architecture', 'interior design'],
    momentos: ['travessia', 'mundo-continuo'], modulos: [['cards', { id: 'projetos', label: 'Projetos', title: 'Projetos.' }], ['espera', { title: 'Vamos conversar sobre o seu espaço.', button: 'Contato' }]], tom: 'Revista de arquitetura: margens generosas, regras finas, legendas precisas.', assunto: 'coastal residence in travertine, pale oak and glass' },
  { id: 'blog', nome: 'Blog, newsletter, publicação', palavras: ['blog', 'newsletter', 'escritor', 'escritora', 'pesquisador', 'revista', 'publicação', 'artigos', 'ensaios', 'writer', 'essays', 'publication'],
    momentos: ['mundo-continuo'], modulos: [['indice', { title: 'Textos.' }], ['espera', { title: 'Receba os próximos textos.', button: 'Assinar' }]], tom: 'Leitura em primeiro lugar; o 3D fica quieto.', assunto: 'open notebook, pencil and ceramic object on a softly lit desk' },
  { id: 'educacao', nome: 'Educação, cursos, comunidades', palavras: ['curso', 'escola', 'comunidade', 'mentoria', 'workshop', 'treinamento', 'educação', 'aula', 'formação', 'course', 'community', 'academy', 'bootcamp'],
    momentos: ['mundo-continuo', 'travessia'], modulos: [['cards', { id: 'trilha', label: 'Trilha', title: 'A trilha.' }], ['precos', { toggle: false }], ['faq'], ['espera', { title: 'Entre para a comunidade.', button: 'Quero entrar' }]], tom: 'Convite, progresso, resultado concreto para o aluno.', assunto: 'sculpture garden over shallow reflective water' },
  { id: 'artesanal', nome: 'Artesanal: cerâmica, velas, chocolate, cutelaria', palavras: ['cerâmica', 'vela', 'chocolate', 'artesanal', 'vidro soprado', 'cutelaria', 'faca', 'forja', 'sabonete', 'ceramics', 'candle', 'handmade', 'knife'],
    momentos: ['genese', 'revelacao-luz'], modulos: [['loja'], ['espera', { title: 'Encomende uma peça.' }]], tom: 'Fogo, tempo, mãos; peça única.', assunto: 'hand-forged chef knife' },
];

/* Pontua o texto livre contra as palavras-chave de cada segmento. */
export function detectarSegmentos(texto, max = 3) {
  const s = ` ${String(texto || '').toLowerCase()} `;
  const res = [];
  for (const seg of SEGMENTOS) {
    const hits = seg.palavras.filter((w) => s.includes(w.toLowerCase()));
    if (hits.length) res.push({ id: seg.id, nome: seg.nome, score: hits.length + hits.reduce((a, w) => a + (w.length > 8 ? 0.5 : 0), 0), palavras: hits });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, max);
}

export function getSegmento(id) {
  return SEGMENTOS.find((s) => s.id === id) || null;
}

export function modulosDoSegmento(seg, ctx) {
  const t = tx(ctx);
  return (seg && seg.modulos) || [['espera', { title: t('Fale com a gente.', 'Get in touch.') }]];
}
