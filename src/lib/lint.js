// Revisor de prompts visuais: aplica as lições dos prompts validados.

const BRANDS = ['apple', 'iphone', 'nike', 'adidas', 'spacex', 'falcon 9', 'starship', 'nasa', 'rolex', 'omega', 'cartier', 'tiffany', 'tesla', 'porsche', 'ferrari', 'lamborghini', 'bmw', 'mercedes', 'audi', 'coca-cola', 'pepsi', 'starbucks', 'louis vuitton', 'gucci', 'chanel', 'dior', 'sony', 'bose', 'samsung', 'jbl', 'leica', 'canon', 'nikon', 'red bull', 'lego', 'disney', 'marvel'];
const METAPHOR = [/\blike an? \w+/i, /\bas if\b/i, /\bresembl\w*/i, /\breminiscent\b/i, /\blooks like\b/i, /\bas though\b/i, /\bcomo se\b/i, /\bparece\b/i, /\bfeito um[a]?\b/i];
const CUT = [/\bcut to\b/i, /\bthen cut\b/i, /\bnext scene\b/i, /\bscene changes?\b/i, /\bmontage\b/i, /\bjump cut\b/i, /\bcorte para\b/i, /\btransition to\b/i, /\bmultiple (shots|angles)\b/i];
const FAST = [/\bsuddenly\b/i, /\binstantly\b/i, /\bin a flash\b/i, /\bquickly\b/i, /\bfast\b/i, /\bde repente\b/i];
const PT_WORDS = /\b(com|uma|para|não|luz|fundo|câmera|produto|lentamente|então|sobre|cada|enquanto)\b/i;

export function revisarPrompt(prompt, { tipo = 'movimento', modelo = '', assunto = '' } = {}) {
  const p = String(prompt || '').trim();
  const lower = p.toLowerCase();
  const issues = [];
  const add = (gravidade, regra, detalhe, correcao) => issues.push({ gravidade, regra, detalhe, correcao });
  const words = p.split(/\s+/).filter(Boolean).length;

  if (PT_WORDS.test(p) && !/\bthe\b/i.test(p)) add('media', 'Escreva em inglês', 'Os modelos de imagem e vídeo seguem melhor prompts em inglês.', 'Traduza o prompt para inglês mantendo a descrição física.');
  for (const re of METAPHOR) if (re.test(p)) { add('alta', 'Descreva fisicamente', `Metáfora detectada (“${p.match(re)[0]}”): os modelos renderizam a comparação literalmente.`, 'Troque a comparação pelo que a luz e a matéria fazem (cor, forma, direção, velocidade).'); break; }
  for (const b of BRANDS) if (new RegExp(`\\b${b.replace(/[-]/g, '\\-')}\\b`, 'i').test(p)) { add('alta', 'Não copie marcas reais', `“${b}” aparece no prompt.`, 'Descreva um design original que não se pareça com nenhuma marca real.'); break; }
  if (/\b(text|logo|lettering|words|typography|letreiro|texto)\b/i.test(p) && !/\bno text\b/i.test(p)) add('media', 'Texto gerado sai ilegível', 'O prompt pede texto/logo dentro da imagem.', 'Remova o texto da imagem e coloque-o como HTML sobre o canvas; acrescente “no text, no watermark”.');

  if (tipo === 'imagem') {
    if (!/\bno text\b/i.test(p)) add('media', 'Sem texto', 'Falta “no text, no watermark”.', 'Acrescente “no text, no watermark.”');
    if (!/(light|lit|spotlight|rim|glow|sun|moon|lamp|illuminat)/i.test(p)) add('media', 'Luz explícita', 'Não há direção de luz.', 'Defina a luz: “single hard spotlight from above, thin rim light”.');
    if (!/(void|background|studio|black|interior|room|sky|water|outdoor|landscape|hall|street)/i.test(p)) add('baixa', 'Fundo explícito', 'O fundo não está definido.', 'Ex.: “floating in a pure black void”.');
    if (!/(photograph|photography|photoreal|macro|cinematic|render)/i.test(p)) add('baixa', 'Registro fotográfico', 'Falta o registro visual.', 'Ex.: “medium-format product photography, photorealistic”.');
    if (/\b(edit|same|identical)\b/i.test(p) === false && /\b(x-?ray|thermal|after|exploded|cross-section|split|finished|restored)\b/i.test(p)) add('alta', 'Placa deve ser EDIT da herói', 'Esta placa descreve uma variação (raio-X, depois, explodida…).', 'Gere como EDIT da placa-herói (job id como referência) e diga “same camera, same position and size”.');
  } else {
    if (!/(continuous|one take|single take|unbroken|no cuts)/i.test(p)) add('alta', 'Plano contínuo', 'Falta “one continuous shot, no cuts”. Um corte seco parece quebrado quando o visitante rola para trás.', 'Acrescente “One continuous shot, no cuts.”');
    for (const re of CUT) if (re.test(p)) { add('alta', 'Sem cortes', `Instrução de corte/transição (“${p.match(re)[0]}”).`, 'Descreva um único movimento de câmera contínuo.'); break; }
    for (const re of FAST) if (re.test(p) && !/slow motion|slowly|gradual/i.test(p)) { add('media', 'Espalhe a mudança', `“${p.match(re)[0]}”: eventos rápidos terminam em ~1,5 s e o resto do clipe fica parado — desperdiçado no scroll.`, 'Use “ultra slow motion”, “gradually”, “builds steadily across the whole shot”.'); break; }
    if (/(orbit|360|arc|circle around|rotat)/i.test(p) && /(car|coupe|vehicle|truck|carro|veículo|bike|motorcycle)/i.test(lower + ' ' + assunto.toLowerCase()) && !/gentle|slow|small/i.test(p)) add('media', 'Câmera suave em veículos', 'Arcos grandes deformam carros.', 'Prefira “one slow 180-degree arc” ou um push-in lento.');
    if (/(loop|seamless)/i.test(p)) add('info', 'Loop', 'Para um loop perfeito use a MESMA placa como start_image e end_image.', null);
    if (/(rotat|spin|turntable|orbit)/i.test(p) && !/(360|full|complete|one)/i.test(p)) add('baixa', 'Rotação completa', 'Diga quanto gira.', 'Ex.: “one smooth complete 360-degree rotation”.');
    if (!/(camera|dolly|push|glide|orbit|locked|static|tracking|pan|tilt|crane)/i.test(p)) add('media', 'Dê um destino à câmera', 'O movimento de câmera não está definido.', 'Diga o que a câmera faz: “camera locked”, “slow push-in”, “slow continuous dolly”.');
    if (/\b(person|man|woman|face|model|people|pessoa|rosto)\b/i.test(p) && !/(reference|identity|same person)/i.test(p)) add('media', 'Identidade', 'Pessoas mudam de rosto entre planos.', 'Passe a foto como referência de identidade em TODO clipe e fixe o figurino.');
    if (/kling/i.test(modelo)) add('info', 'Kling segura o 1º frame', 'O Kling costuma ficar parado nos primeiros segundos.', 'extrair_frames corta isso automaticamente (aparar: auto).');
    if (/seedance_2_0/i.test(modelo) && /(explod|burst|crash|pour|splash|erupt)/i.test(p)) add('info', 'Seedance 2.0 termina rápido', 'Eventos rápidos acabam em ~1,5 s e seguram.', 'Considere kling3_0 para o momento ou faça bake-off.');
  }
  if (words > (tipo === 'imagem' ? 90 : 110)) add('baixa', 'Curto e ordenado', `${words} palavras.`, 'Prompts curtos, físicos e em ordem cronológica funcionam melhor.');

  let melhorado = p.replace(/\s+/g, ' ');
  if (tipo === 'imagem' && !/\bno text\b/i.test(melhorado)) melhorado = melhorado.replace(/\.?\s*$/, '') + ', no text, no watermark.';
  if (tipo !== 'imagem' && !/(continuous|no cuts)/i.test(melhorado)) melhorado = melhorado.replace(/\.?\s*$/, '') + '. One continuous shot, no cuts.';
  const ordem = { alta: 0, media: 1, baixa: 2, info: 3 };
  issues.sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade]);
  const nota = Math.max(0, 10 - issues.reduce((s, i) => s + ({ alta: 3, media: 1.5, baixa: 0.5, info: 0 })[i.gravidade], 0));
  return { nota: +nota.toFixed(1), problemas: issues, promptMelhorado: melhorado };
}
