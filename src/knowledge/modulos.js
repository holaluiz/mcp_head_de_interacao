// Módulos de negócio: o que transforma um showreel em site que o cliente paga.
// Cada builder devolve um capítulo do spec (tipos renderizados por src/lib/render.js).

const tx = (ctx) => (pt, en) => (String(ctx.lang || 'pt-BR').toLowerCase().startsWith('en') ? en : pt);

export const MODULOS = {
  pedido: {
    nome: 'Pedido antecipado',
    descricao: 'Itens com stepper de quantidade, horários de retirada, contagem até a próxima fornada e reserva honesta.',
    origem: 'LAMINA',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'pedido', type: 'order', label: t('Encomendar', 'Order'), title: o.title || t('Reserve antes que acabe.', 'Reserve before it sells out.'), text: o.text || t('Escolha, defina o horário e retire quentinho.', 'Choose, pick a time, collect it warm.'),
        items: o.items || [{ name: ctx.product || t('[[Produto principal]]', '[[Main product]]'), price: 18 }, { name: t('[[Produto 2]]', '[[Product 2]]'), price: 14 }, { name: t('[[Produto 3]]', '[[Product 3]]'), price: 16 }],
        slots: o.slots || { days: 3, hours: ['07:30', '09:00', '11:00', '15:00', '17:30'], skip: [], busy: 0.25 },
        countdown: o.countdown || { every: 40, label: t('Próxima fornada em', 'Next batch in') }, cta: t('Reservar', 'Reserve') };
    },
  },
  orcamento: {
    nome: 'Orçamento instantâneo',
    descricao: 'Configurador com estimativa ao vivo (faixa de preço) e prazo, seguido de reserva honesta.',
    origem: 'UNDO, CLEARLINE',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'orcamento', type: 'configurator', label: t('Orçamento', 'Quote'), title: o.title || t('Seu orçamento em segundos.', 'Your quote in seconds.'), text: o.text || t('Valores indicativos; confirmamos após avaliação.', 'Indicative figures; confirmed after inspection.'),
        base: o.base ?? 0, spread: o.spread ?? 0.15, wizard: !!o.wizard,
        groups: o.groups || [
          { label: t('Tamanho', 'Size'), name: 'tamanho', kind: 'radio', options: [{ label: t('Pequeno', 'Small'), mult: 1 }, { label: t('Médio', 'Medium'), mult: 1.25 }, { label: t('Grande', 'Large'), mult: 1.5 }] },
          { label: t('Estado atual', 'Current condition'), name: 'estado', kind: 'radio', options: [{ label: t('Bom', 'Good'), mult: 1 }, { label: t('Regular', 'Fair'), mult: 1.2 }, { label: t('Ruim', 'Poor'), mult: 1.45 }] },
          { label: t('Pacote', 'Package'), name: 'pacote', kind: 'radio', options: [{ label: t('Essencial', 'Essential'), price: 450, days: 1 }, { label: t('Completo', 'Complete'), price: 1200, days: 2 }, { label: t('Premium', 'Premium'), price: 2800, days: 4 }] },
        ],
        outputs: o.outputs || [{ key: 'range', label: t('Estimativa', 'Estimate') }, { key: 'days', label: t('Prazo (dias)', 'Turnaround (days)') }],
        slots: o.slots === false ? null : (o.slots || { days: 5, hours: ['08:00', '10:00', '13:30', '16:00'], skip: [0], busy: 0.35, name: 'vaga' }),
        contact: true, cta: o.cta || t('Reservar avaliação', 'Book an inspection') };
    },
  },
  configurador: {
    nome: 'Configurador / montador',
    descricao: 'Opções que trocam imagens (data-swap), slider com preço por unidade, texto com prévia, preço e prazo ao vivo, parcela mensal.',
    origem: 'FACET, OASIS, VANTA',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'configurador', type: 'configurator', label: t('Monte o seu', 'Build yours'), title: o.title || t('Monte o seu.', 'Build yours.'), text: o.text || '',
        base: o.base ?? 1000, spread: o.spread ?? 0, months: o.months || 0, rate: o.rate || 0,
        preview: o.preview || { img: 'img/hero.jpg', id: 'previa' },
        groups: o.groups || [
          { label: t('Acabamento', 'Finish'), name: 'acabamento', kind: 'radio', options: [{ label: t('Original', 'Original'), price: 0, swap: { target: '#previa', filter: 'none' } }, { label: t('Ouro', 'Gold'), price: 400, swap: { target: '#previa', filter: 'sepia(.6) saturate(1.6) hue-rotate(-10deg)' }, color: '#d4af37' }, { label: t('Grafite', 'Graphite'), price: 250, swap: { target: '#previa', filter: 'grayscale(1) brightness(.85)' }, color: '#555' }] },
          { label: t('Tamanho', 'Size'), name: 'tamanho', kind: 'range', min: 1, max: 5, step: 1, value: 2, pricePer: 300, unit: '' },
        ],
        outputs: o.outputs || [{ key: 'total', label: t('Total', 'Total') }],
        contact: o.contact ?? true, cta: o.cta || t('Solicitar', 'Request') };
    },
  },
  reserva: {
    nome: 'Reserva / agendamento',
    descricao: 'Campos essenciais + horários disponíveis + confirmação honesta.',
    origem: 'EMBER & OAK, FACET, OASIS, MERIDIAN',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'reserva', type: 'booking', label: t('Reservar', 'Book'), title: o.title || t('Reserve seu horário.', 'Book your time.'), text: o.text || '',
        fields: o.fields || ['name', 'email', 'party', 'notes'], slots: o.slots || { days: 6, hours: ['19:00', '19:30', '20:00', '20:30', '21:00'], skip: [1], busy: 0.3 },
        agent: o.agent || null, cta: o.cta || t('Confirmar reserva', 'Confirm booking') };
    },
  },
  loja: {
    nome: 'Loja com sacola',
    descricao: 'Grade de produtos com vídeo no hover, tamanhos, “adicionar à sacola”, gaveta com totais persistentes e checkout de demonstração.',
    origem: 'ONYX SUPPLY, FORM',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'loja', type: 'shop', label: t('Loja', 'Shop'), title: o.title || t('A coleção.', 'The collection.'),
        products: o.products || [1, 2, 3].map((n) => ({ id: `p${n}`, name: t(`[[Produto ${n}]]`, `[[Product ${n}]]`), price: [180, 210, 340][n - 1], img: `img/produto-${n}.jpg`, video: `media/produto-${n}.mp4`, sizes: ['P', 'M', 'G', 'GG'] })),
        countdown: o.countdown || null, notify: o.notify ?? true };
    },
  },
  precos: {
    nome: 'Tabela de preços',
    descricao: 'Três planos, o do meio destacado, alternância mensal/anual opcional.',
    origem: 'PULSE, FORGE',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'precos', type: 'pricing', label: t('Planos', 'Pricing'), title: o.title || t('Escolha seu plano.', 'Choose your plan.'), toggle: o.toggle ?? { yearlyFactor: 0.8 },
        tiers: o.tiers || [
          { name: t('Básico', 'Starter'), price: 49, period: t('/mês', '/mo'), features: [t('[[recurso]]', '[[feature]]'), t('[[recurso]]', '[[feature]]')], cta: t('Começar', 'Start') },
          { name: t('Pro', 'Pro'), price: 129, period: t('/mês', '/mo'), features: [t('[[recurso]]', '[[feature]]'), t('[[recurso]]', '[[feature]]'), t('[[recurso]]', '[[feature]]')], featured: true, cta: t('Começar', 'Start') },
          { name: t('Equipe', 'Team'), price: 349, period: t('/mês', '/mo'), features: [t('[[recurso]]', '[[feature]]'), t('[[recurso]]', '[[feature]]'), t('[[recurso]]', '[[feature]]')], cta: t('Falar com vendas', 'Talk to sales') },
        ] };
    },
  },
  cardapio: {
    nome: 'Cardápio',
    descricao: 'Duas colunas com nomes e preços em tipografia refinada; vira uma coluna no celular.',
    origem: 'EMBER & OAK',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'cardapio', type: 'menu', label: t('Cardápio', 'Menu'), title: o.title || t('Seis pratos. Um fogo.', 'Six dishes. One fire.'),
        columns: o.columns || [
          { title: t('Fogo', 'Fire'), items: [1, 2, 3].map((n) => ({ name: t(`[[Prato ${n}]]`, `[[Dish ${n}]]`), desc: t('[[descrição curta]]', '[[short description]]'), price: 0 })) },
          { title: t('Campo', 'Field'), items: [4, 5, 6].map((n) => ({ name: t(`[[Prato ${n}]]`, `[[Dish ${n}]]`), desc: t('[[descrição curta]]', '[[short description]]'), price: 0 })) },
        ] };
    },
  },
  agenda: {
    nome: 'Grade de horários',
    descricao: 'Tabela simples de aulas/horários.',
    origem: 'FORGE',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'horarios', type: 'schedule', label: t('Horários', 'Schedule'), title: o.title || t('Horários.', 'Schedule.'),
        head: o.head || [t('Dia', 'Day'), t('Manhã', 'Morning'), t('Tarde', 'Afternoon'), t('Noite', 'Evening')],
        rows: o.rows || [[t('Seg–Sex', 'Mon–Fri'), '06:00 · 07:00', '12:00', '18:00 · 19:00 · 20:00'], [t('Sábado', 'Saturday'), '08:00 · 09:00', '—', '—']] };
    },
  },
  emergencia: {
    nome: 'Barra de emergência',
    descricao: 'Faixa fixa com clique-para-ligar.',
    origem: 'CLEARLINE',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'emergencia', type: 'emergency', text: o.text || t('Emergência 24 h', '24/7 emergency'), phone: ctx.phone || o.phone || '[[telefone]]' };
    },
  },
  espera: {
    nome: 'Lista de espera / alocação',
    descricao: 'CTA final com e-mail e letras miúdas; formulário honesto.',
    origem: 'OBSCURA, STILL, AURUM & NOIR, ABYSSAL',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'contato', type: 'cta', label: t('Contato', 'Contact'), title: o.title || t('Entre na lista.', 'Join the list.'), text: o.text || '', button: o.button || t('Solicitar', 'Request'), email: true, small: o.small || t('Sem spam. Avisamos uma vez, quando abrir.', 'No spam. We write once, when it opens.') };
    },
  },
  indice: {
    nome: 'Índice de trabalhos',
    descricao: 'Lista editorial: nome, resultado em uma linha, ano.',
    origem: 'The Gallery',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'trabalhos', type: 'index', label: t('Trabalhos', 'Work'), title: o.title || t('Trabalhos selecionados.', 'Selected work.'),
        items: ctx.items && ctx.items.length ? ctx.items : [1, 2, 3, 4].map((n) => ({ name: t(`[[Projeto ${n}]]`, `[[Project ${n}]]`), result: t('[[resultado em uma linha]]', '[[one-line result]]'), year: '[[ano]]', href: '#' })) };
    },
  },
  faq: {
    nome: 'Perguntas frequentes',
    descricao: 'Acordeão nativo acessível.',
    origem: 'PULSE',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'faq', type: 'faq', label: 'FAQ', title: o.title || t('Perguntas frequentes.', 'Questions.'), items: o.items || [1, 2, 3, 4].map((n) => ({ q: t(`[[Pergunta ${n}]]`, `[[Question ${n}]]`), a: t('[[resposta curta e honesta]]', '[[short honest answer]]') })) };
    },
  },
  avaliacoes: {
    nome: 'Avaliações',
    descricao: 'Depoimentos com estrelas — use apenas avaliações reais; exemplos são rotulados.',
    origem: 'CLEARLINE',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'avaliacoes', type: 'reviews', label: t('Avaliações', 'Reviews'), title: o.title || t('Quem já viu por dentro.', 'From people who\'ve seen inside.'), example: !o.items,
        items: o.items || [1, 2, 3].map((n) => ({ name: t(`[[Cliente ${n}]]`, `[[Client ${n}]]`), text: t('[[depoimento real]]', '[[real testimonial]]'), stars: 5 })) };
    },
  },
  especificacoes: {
    nome: 'Especificações',
    descricao: 'Grade de duas colunas com linhas finas.',
    origem: 'OBSCURA, AURELIA, ABYSS, NOIR',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'specs', type: 'specs', label: t('Especificações', 'Specs'), title: o.title || t('Especificações.', 'Specifications.'), items: o.items || [1, 2, 3, 4, 5, 6].map((n) => [t(`[[Item ${n}]]`, `[[Item ${n}]]`), t('[[valor]]', '[[value]]')]) };
    },
  },
  numeros: {
    nome: 'Números',
    descricao: 'Contadores que sobem ao entrar.',
    origem: 'PULSE, FORGE, Portfolio',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'numeros', type: 'stats', label: t('Números', 'Numbers'), title: o.title || '', items: o.items || [{ value: 0, suffix: '', label: t('[[métrica real 1]]', '[[real metric 1]]') }, { value: 0, suffix: '', label: t('[[métrica real 2]]', '[[real metric 2]]') }, { value: 0, suffix: '', label: t('[[métrica real 3]]', '[[real metric 3]]') }] };
    },
  },
  cards: {
    nome: 'Cards (programas, serviços, lineup)',
    descricao: 'Grade de cards com tilt e hover.',
    origem: 'FORGE, LAMINA, NOIR&CO',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: o.id || 'servicos', type: 'cards', label: o.label || t('Serviços', 'Services'), title: o.title || t('O que fazemos.', 'What we do.'), items: o.items || [1, 2, 3].map((n) => ({ title: t(`[[Serviço ${n}]]`, `[[Service ${n}]]`), text: t('[[uma frase concreta]]', '[[one concrete sentence]]') })) };
    },
  },
  localizacao: {
    nome: 'Localização e horário',
    descricao: 'Endereço, horários e link para o mapa.',
    origem: 'EMBER & OAK, FORGE',
    build(ctx, o = {}) {
      const t = tx(ctx);
      return { id: 'local', type: 'location', label: t('Onde', 'Where'), title: o.title || t('Venha.', 'Come by.'), address: ctx.address || o.address || t(`[[endereço]], ${ctx.city || '[[cidade]]'}`, `[[address]], ${ctx.city || '[[city]]'}`), hours: o.hours || [[t('Ter–Dom', 'Tue–Sun'), '18:00–00:00']] };
    },
  },
};

export function buildModulo(id, ctx, opts) {
  const m = MODULOS[id];
  return m ? m.build(ctx, opts || {}) : null;
}
