import { z } from 'zod';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import * as ff from '../lib/ffmpeg.js';
import { result, fail, exists, readJson, writeJson, rel, fmtBytes, slug, ensureDir } from '../lib/util.js';

function resolveIn(projeto, p) {
  if (!p) return p;
  if (path.isAbsolute(p)) return p;
  return projeto ? path.join(projeto, p) : path.resolve(p);
}

async function imageContent(file) {
  const buf = await fs.readFile(file);
  return { type: 'image', data: buf.toString('base64'), mimeType: file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg' };
}

export async function processarVideo(o) {
  const projeto = path.resolve(o.projeto);
  const nome = slug(o.nome || path.basename(o.videos[0], path.extname(o.videos[0])));
  const inputs = o.videos.map((v) => resolveIn(projeto, v));
  for (const f of inputs) if (!exists(f)) throw new Error('Vídeo não encontrado: ' + f);
  const alertas = [];
  let fonte = inputs[0];
  let analises = [];

  if (inputs.length > 1) {
    const trims = [];
    for (const f of inputs) {
      const a = await ff.analyze(f);
      analises.push({ arquivo: rel(projeto, f), duracao: a.duration, corteInicio: a.trimStart, corteFim: a.trimEnd, alertas: a.alerts });
      trims.push(o.aparar === 'nao' ? {} : { start: a.trimStart, end: a.trimEnd });
    }
    fonte = path.join(projeto, 'media', 'brutos', `${nome}-encadeado.mp4`);
    await ff.concat({ inputs, out: fonte, trims });
    alertas.push(`${inputs.length} clipes encadeados em ${rel(projeto, fonte)} (frames parados de cada um removidos).`);
  }

  if (o.interpolar) {
    const out = path.join(projeto, 'media', 'brutos', `${nome}-48fps.mp4`);
    await ff.interpolate({ input: fonte, out, fps: 48 });
    fonte = out;
    alertas.push('Interpolado para 48 fps (scrub mais sedoso em movimento rápido).');
  }

  const an = await ff.analyze(fonte);
  let inicio = 0, fim = an.duration;
  if (o.aparar === 'auto' || o.aparar == null) { inicio = an.trimStart; fim = an.trimEnd; }
  if (o.inicio != null) inicio = o.inicio;
  if (o.fim != null) fim = o.fim;
  alertas.push(...an.alerts);

  const outDir = path.join(projeto, 'frames', nome);
  const fr = await ff.extractFrames({ input: fonte, outDir, count: o.quadros || 200, width: o.largura || 1920, quality: o.qualidade || 3, start: inicio, end: fim, format: o.formato || 'jpg' });

  const seq = {
    path: `frames/${nome}/frame_{i}.${fr.ext}`, count: fr.count, start: 1, pad: 4, width: fr.width, height: fr.height,
    fonte: rel(projeto, fonte), aparado: { inicio: +inicio.toFixed(3), fim: +fim.toFixed(3) }, criadoEm: new Date().toISOString(),
  };
  if (o.mp4_fallback !== false) {
    const mp4 = path.join(projeto, 'media', `${nome}.mp4`);
    const sz = await ff.fallbackMp4({ input: fonte, out: mp4, start: inicio, end: fim, width: 1280, crf: 26 });
    seq.video = `media/${nome}.mp4`;
    seq.videoBytes = sz;
  }
  if (o.mp4_scrub) {
    const mp4 = path.join(projeto, 'media', `${nome}-scrub.mp4`);
    await ff.fallbackMp4({ input: fonte, out: mp4, start: inicio, end: fim, width: o.largura || 1920, crf: 22, allIntra: true });
    seq.scrubVideo = `media/${nome}-scrub.mp4`;
  }
  const poster = path.join(projeto, 'media', `${nome}-poster.jpg`);
  await ff.grabFrame({ input: fonte, out: poster, at: inicio + 0.05, width: 1600 });
  seq.poster = `media/${nome}-poster.jpg`;
  seq.bytesFrames = fr.bytes;

  const manPath = path.join(projeto, 'imersao.manifest.json');
  const man = (await readJson(manPath, null)) || { version: 1, sequences: {} };
  man.sequences = man.sequences || {};
  man.sequences[nome] = seq;
  await writeJson(manPath, man);
  const total = Object.values(man.sequences).reduce((s, q) => s + (q.bytesFrames || 0), 0);
  if (fr.bytes > 45 * 1024 * 1024) alertas.push(`Os frames de "${nome}" somam ${fmtBytes(fr.bytes)}. Para carregar rápido: quadros 150, largura 1600 ou formato webp.`);
  if (total > 120 * 1024 * 1024) alertas.push(`O site já soma ${fmtBytes(total)} em frames. Considere data-im-preload="progressive" no <body> ou reduzir quadros/largura.`);

  return { nome, seq, frames: fr, analise: { duracao: an.duration, fps: an.fps, resolucao: `${an.width}x${an.height}`, corteInicio: an.trimStart, corteFim: an.trimEnd, cortesSecos: an.cuts, distribuicaoDaMudanca: an.motion }, analisesDosClipes: analises, alertas };
}

export function register(server) {
  server.registerTool('analisar_video', {
    title: 'Analisar vídeo para scrub',
    description: 'Inspeciona um clipe antes de fatiar: duração, resolução, fps, trechos parados no início/fim (o Kling segura o 1º frame, o Seedance congela no fim), cortes secos (quebram o scroll reverso) e quanto da mudança se concentra num instante. Use para escolher o melhor take/modelo.',
    inputSchema: { video: z.string().describe('Caminho do MP4 (absoluto ou relativo ao projeto)'), projeto: z.string().optional().describe('Pasta do projeto (para caminhos relativos)') },
    annotations: { readOnlyHint: true },
  }, async ({ video, projeto }) => {
    if (!ff.findFfmpeg()) return fail('ffmpeg não encontrado. ' + ff.comoInstalar());
    try {
      const a = await ff.analyze(resolveIn(projeto, video));
      const veredito = a.alerts.length ? a.alerts.map((x) => '- ' + x).join('\n') : '- Clipe contínuo, sem trechos parados relevantes nem cortes secos. Bom para scrub.';
      return result(`Análise de ${video}\n${a.width}x${a.height} · ${a.fps.toFixed(2)} fps · ${a.duration.toFixed(2)} s\nCorte recomendado: ${a.trimStart.toFixed(2)} s → ${a.trimEnd.toFixed(2)} s\n${veredito}`, a);
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('extrair_frames', {
    title: 'Fatiar vídeo em frames (scrub)',
    description: 'Pipeline completo do prompt validado: corta automaticamente os frames parados, avisa sobre cortes secos, fatia ~200 frames (1600–1920 px, JPEG q3) em frames/<nome>/frame_0001.jpg, gera o MP4 leve de fallback (mobile) e o pôster (movimento reduzido) e registra a sequência em imersao.manifest.json. Vários vídeos = clipes encadeados unidos numa só jornada. O site passa a usar o scrub real automaticamente.',
    inputSchema: {
      projeto: z.string().describe('Pasta do projeto do site'),
      video: z.string().optional().describe('Um MP4 (absoluto ou relativo ao projeto, ex.: media/brutos/giro.mp4)'),
      videos: z.array(z.string()).optional().describe('Vários MP4 em ordem para uma jornada encadeada'),
      nome: z.string().optional().describe('Nome da sequência (deve bater com data-im-seq do capítulo). Padrão: nome do arquivo.'),
      quadros: z.number().int().min(24).max(600).optional().describe('Quantidade de frames (padrão 200)'),
      largura: z.number().int().min(480).max(3840).optional().describe('Largura em px (padrão 1920)'),
      qualidade: z.number().int().min(1).max(10).optional().describe('JPEG q (2–5; padrão 3)'),
      formato: z.enum(['jpg', 'webp']).optional(),
      aparar: z.enum(['auto', 'nao']).optional().describe('auto = corta trechos parados (padrão)'),
      inicio: z.number().optional().describe('Força o início em segundos'),
      fim: z.number().optional().describe('Força o fim em segundos'),
      interpolar: z.boolean().optional().describe('Interpola para 48 fps localmente (lento; para movimento rápido)'),
      mp4_fallback: z.boolean().optional().describe('Gera media/<nome>.mp4 leve para celular (padrão true)'),
      mp4_scrub: z.boolean().optional().describe('Gera também um MP4 all-intra para scrub por vídeo'),
    },
  }, async (o) => {
    if (!ff.findFfmpeg()) return fail('ffmpeg não encontrado. ' + ff.comoInstalar());
    const videos = o.videos && o.videos.length ? o.videos : o.video ? [o.video] : [];
    if (!videos.length) return fail('Informe video ou videos.');
    try {
      const r = await processarVideo({ ...o, videos });
      const txt = [
        `Sequência "${r.nome}" pronta: ${r.frames.count} frames ${r.frames.width}x${r.frames.height} (${fmtBytes(r.frames.bytes)}) em frames/${r.nome}/.`,
        `Trecho usado: ${r.seq.aparado.inicio}s → ${r.seq.aparado.fim}s de ${r.analise.duracao.toFixed(2)}s.`,
        r.seq.video ? `Fallback mobile: ${r.seq.video} · pôster: ${r.seq.poster}` : `Pôster: ${r.seq.poster}`,
        `Registrada em imersao.manifest.json. Capítulos com data-im-seq="${r.nome}" passam a fazer scrub real.`,
        ...r.alertas.map((a) => '⚠ ' + a),
      ].join('\n');
      return result(txt, r);
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('extrair_quadro', {
    title: 'Extrair um quadro (encadear clipes)',
    description: 'Salva o primeiro, o último ou um quadro em segundos de um vídeo como JPEG. Use o ÚLTIMO quadro de um clipe como start_image do próximo para encadear uma jornada contínua.',
    inputSchema: { video: z.string(), saida: z.string().describe('Caminho do JPEG de saída'), posicao: z.string().optional().describe('"primeiro", "ultimo" ou um tempo em segundos como "3.5" (padrão: ultimo)'), projeto: z.string().optional(), largura: z.number().int().optional() },
  }, async ({ video, saida, posicao: pos = 'ultimo', projeto, largura }) => {
    if (!ff.findFfmpeg()) return fail('ffmpeg não encontrado. ' + ff.comoInstalar());
    const posicao = /^\d+([.,]\d+)?$/.test(String(pos).trim()) ? parseFloat(String(pos).replace(',', '.')) : String(pos).trim().toLowerCase().replace('último', 'ultimo');
    try {
      const out = resolveIn(projeto, saida);
      await ff.grabFrame({ input: resolveIn(projeto, video), out, last: posicao === 'ultimo', at: typeof posicao === 'number' ? posicao : posicao === 'primeiro' ? 0 : null, width: largura || 1920 });
      return { content: [{ type: 'text', text: `Quadro salvo em ${out}` }, await imageContent(out)] };
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('folha_de_contato', {
    title: 'Folha de contato (bake-off de modelos)',
    description: 'Gera uma folha de contato (grade de quadros) de cada vídeo para comparar takes ou modelos (kling3_0 × cinematic_studio_3_0 × seedance_2_0) e escolher o que melhor espalha a mudança pelo clipe. Devolve as imagens e a análise de cada clipe.',
    inputSchema: { videos: z.array(z.string()).min(1), saida_dir: z.string().optional().describe('Pasta das folhas (padrão: <projeto>/.imersao/contato)'), projeto: z.string().optional(), colunas: z.number().int().min(2).max(10).optional(), linhas: z.number().int().min(1).max(8).optional() },
    annotations: { readOnlyHint: false },
  }, async ({ videos, saida_dir, projeto, colunas = 6, linhas = 3 }) => {
    if (!ff.findFfmpeg()) return fail('ffmpeg não encontrado. ' + ff.comoInstalar());
    try {
      const dir = saida_dir ? resolveIn(projeto, saida_dir) : path.join(projeto ? path.resolve(projeto) : process.cwd(), '.imersao', 'contato');
      await ensureDir(dir);
      const content = [];
      const ranking = [];
      for (const v of videos) {
        const input = resolveIn(projeto, v);
        const a = await ff.analyze(input);
        const out = path.join(dir, `${slug(path.basename(v, path.extname(v)))}.jpg`);
        await ff.contactSheet({ input, out, cols: colunas, rows: linhas, start: a.trimStart, end: a.trimEnd });
        const nota = (a.motion ? 1 - a.motion.concentracao : 0.5) - a.cuts.length * 0.25 - (a.trimStart > 1 ? 0.05 : 0);
        ranking.push({ video: v, folha: out, nota: +nota.toFixed(3), corteInicio: a.trimStart, corteFim: a.trimEnd, cortesSecos: a.cuts, concentracaoDaMudanca: a.motion ? a.motion.concentracao : null, alertas: a.alerts });
        content.push({ type: 'text', text: `▸ ${v}` }, await imageContent(out));
      }
      ranking.sort((x, y) => y.nota - x.nota);
      content.unshift({ type: 'text', text: `Ranking por “mudança espalhada e sem cortes” (maior é melhor para scrub):\n${ranking.map((r, i) => `${i + 1}. ${r.video} — nota ${r.nota}${r.alertas.length ? ' · ' + r.alertas.join(' ') : ''}`).join('\n')}\nOlhe as folhas: prefira o take em que o objeto mantém a forma e a transformação progride quadro a quadro.` });
      return { content };
    } catch (e) { return fail(String(e.message || e)); }
  });

  server.registerTool('medir_alinhamento', {
    title: 'Medir alinhamento de placas (lente)',
    description: 'Mede o deslocamento entre a placa-base e uma placa-edit (raio-X, térmica, depois) e devolve o valor pronto para data-im-offset da lente. As placas só funcionam empilhadas se forem edits de uma mesma imagem.',
    inputSchema: { base: z.string(), camada: z.string(), projeto: z.string().optional() },
    annotations: { readOnlyHint: true },
  }, async ({ base, camada, projeto }) => {
    if (!ff.findFfmpeg()) return fail('ffmpeg não encontrado. ' + ff.comoInstalar());
    try {
      const r = await ff.measureAlignment(resolveIn(projeto, base), resolveIn(projeto, camada));
      const ok = Math.abs(r.deslocamentoPct.x) < 0.35 && Math.abs(r.deslocamentoPct.y) < 0.35;
      return result(ok ? `Placas alinhadas (desvio ${r.deslocamentoPct.x}% × ${r.deslocamentoPct.y}%). Nenhuma correção necessária.` : `A camada está deslocada ${r.deslocamentoPct.x}% × ${r.deslocamentoPct.y}% (≈${r.deslocamentoPx.x.toFixed(1)} × ${r.deslocamentoPx.y.toFixed(1)} px). Use data-im-offset="${r.correcaoOffset}" no [data-im-lens].${r.confianca < 0.15 ? ' Confiança baixa: as placas talvez não sejam edits da mesma imagem.' : ''}`, r);
    } catch (e) { return fail(String(e.message || e)); }
  });
}
