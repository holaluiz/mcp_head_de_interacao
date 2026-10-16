// Pasta de trabalho: cada cliente MCP inicia o servidor num diretório diferente
// (Claude Desktop, Codex, Antigravity, Cursor…). Caminhos relativos como
// "meu-site" precisam cair na pasta do projeto do usuário, nunca na pasta de
// instalação do MCP ou no cache do npx. Ordem de preferência:
//   1. HEAD_DE_INTERACAO_PASTA (definida na config do cliente)
//   2. a primeira raiz (roots) que o cliente informar — a pasta aberta no editor
//   3. o diretório atual, se for um lugar razoável
//   4. ~/HEAD-de-Interacao
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RootsListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { ROOT } from './util.js';

let origem = 'cwd';

function mudarPara(dir, fonte) {
  try {
    mkdirSync(dir, { recursive: true });
    process.chdir(dir);
    origem = fonte;
    return true;
  } catch { return false; }
}

function cwdRuim(cwd) {
  const c = path.resolve(cwd).toLowerCase();
  const raiz = path.parse(c).root;
  const sistema = [process.env.SystemRoot, process.env.windir, process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean).map((p) => path.resolve(p).toLowerCase());
  return c === raiz || c.startsWith(ROOT.toLowerCase()) || /[\\/](_npx|npm-cache|\.npm)[\\/]/.test(c) || sistema.some((s) => c === s || c.startsWith(s + path.sep));
}

/* Antes da conexão: variável de ambiente ou fallback. */
export function pastaInicial() {
  const env = process.env.HEAD_DE_INTERACAO_PASTA;
  if (env && mudarPara(path.resolve(env), 'env')) return;
  if (cwdRuim(process.cwd())) mudarPara(path.join(os.homedir(), 'HEAD-de-Interacao'), 'padrao');
}

/* Depois do initialize: usa as roots do cliente, se ele oferecer. As
 * ferramentas esperam essa consulta (no máximo 5 s) antes de resolver caminhos. */
let liberar;
let pronto = new Promise((r) => { liberar = r; });
export function usarRoots(server) {
  const low = server.server;
  const aplicar = async () => {
    try {
      if (origem === 'env' || !low.getClientCapabilities()?.roots) return;
      const { roots } = await low.listRoots({}, { timeout: 5000 });
      const r = (roots || []).find((x) => String(x.uri).startsWith('file://'));
      if (r) mudarPara(fileURLToPath(r.uri), 'roots');
    } catch { /* cliente sem roots de verdade */ } finally { liberar(); }
  };
  low.oninitialized = () => { aplicar(); };
  low.setNotificationHandler(RootsListChangedNotificationSchema, () => { pronto = new Promise((r) => { liberar = r; }); return aplicar(); });
  // Toda ferramenta registrada daqui em diante espera a pasta estar definida.
  const registrar = server.registerTool.bind(server);
  server.registerTool = (nome, cfg, handler) => registrar(nome, cfg, async (...a) => { await Promise.race([pronto, new Promise((r) => setTimeout(r, 6000))]); return handler(...a); });
}

export function pastaAtual() {
  return { pasta: process.cwd(), origem };
}
