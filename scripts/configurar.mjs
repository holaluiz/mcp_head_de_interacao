#!/usr/bin/env node
// Configura o HEAD de Interação em qualquer cliente MCP.
//   node scripts/configurar.mjs                  → imprime a config de todos os clientes
//   node scripts/configurar.mjs codex            → só a do Codex
//   node scripts/configurar.mjs codex --gravar   → grava na config do Codex (com backup .bak)
//   node scripts/configurar.mjs --npx            → usa "npx github:…" em vez do caminho local
// Também roda via: npx -y github:holaluiz/mcp_head_de_interacao configurar <cliente>
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOME = 'head-de-interacao';
const REPO = 'github:holaluiz/mcp_head_de_interacao';
const args = process.argv.slice(2).filter((a) => a !== 'configurar');
const flags = new Set(args.filter((a) => a.startsWith('--')));
const alvo = args.find((a) => !a.startsWith('--'));
const emCacheNpx = /[\\/](_npx|npm-cache)[\\/]/.test(ROOT);
const usarNpx = flags.has('--npx') || emCacheNpx;
const WIN = process.platform === 'win32';
const HOME = os.homedir();
const entry = path.join(ROOT, 'src', 'index.js').split(path.sep).join('/');

const cmd = usarNpx
  ? (WIN ? { command: 'cmd', args: ['/c', 'npx', '-y', REPO] } : { command: 'npx', args: ['-y', REPO] })
  : { command: 'node', args: [entry] };

const appData = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming');
const CLIENTES = {
  'claude-code': {
    nome: 'Claude Code',
    tipo: 'cli',
    cli: ['claude', 'mcp', 'add', '--scope', 'user', NOME, '--', cmd.command, ...cmd.args],
  },
  'claude-desktop': {
    nome: 'Claude Desktop',
    arquivo: WIN ? path.join(appData, 'Claude', 'claude_desktop_config.json') : process.platform === 'darwin' ? path.join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json') : path.join(HOME, '.config', 'Claude', 'claude_desktop_config.json'),
    chave: 'mcpServers', valor: { ...cmd },
  },
  codex: {
    nome: 'Codex CLI / IDE',
    tipo: 'toml',
    arquivo: path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'config.toml'),
    cli: ['codex', 'mcp', 'add', NOME, '--', cmd.command, ...cmd.args],
  },
  gemini: {
    nome: 'Gemini CLI',
    arquivo: path.join(HOME, '.gemini', 'settings.json'),
    chave: 'mcpServers', valor: { ...cmd, timeout: 600000 },
  },
  antigravity: {
    nome: 'Google Antigravity',
    nota: 'No painel do agente: ⋯ → MCP Servers → Manage MCP Servers → View raw config. Depois de gravar, clique em Refresh.',
    arquivo: path.join(HOME, '.gemini', 'antigravity', 'mcp_config.json'),
    chave: 'mcpServers', valor: { ...cmd },
  },
  cursor: {
    nome: 'Cursor',
    arquivo: path.join(HOME, '.cursor', 'mcp.json'),
    chave: 'mcpServers', valor: { ...cmd },
  },
  windsurf: {
    nome: 'Windsurf',
    arquivo: path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json'),
    chave: 'mcpServers', valor: { ...cmd },
  },
  vscode: {
    nome: 'VS Code (Copilot, modo agente)',
    nota: 'Crie .vscode/mcp.json no projeto (ou rode "MCP: Add Server" na paleta de comandos).',
    arquivo: path.join(process.cwd(), '.vscode', 'mcp.json'),
    chave: 'servers', valor: { type: 'stdio', ...cmd },
  },
  opencode: {
    nome: 'OpenCode',
    nota: 'Em opencode.json (projeto) ou ~/.config/opencode/opencode.json.',
    arquivo: path.join(HOME, '.config', 'opencode', 'opencode.json'),
    chave: 'mcp', valor: { type: 'local', command: [cmd.command, ...cmd.args], enabled: true },
  },
};

const tomlStr = (s) => JSON.stringify(s);
function blocoToml() {
  return `[mcp_servers.${NOME}]\ncommand = ${tomlStr(cmd.command)}\nargs = [${cmd.args.map(tomlStr).join(', ')}]\nstartup_timeout_sec = 60\ntool_timeout_sec = 900\n`;
}
const quote = (a) => (/\s/.test(a) ? `"${a}"` : a);

function mostrar(id, c) {
  console.log(`\n### ${c.nome}${c.nota ? `\n${c.nota}` : ''}`);
  if (c.tipo === 'cli') { console.log(c.cli.map(quote).join(' ')); return; }
  if (c.tipo === 'toml') {
    console.log(`Arquivo: ${c.arquivo}\n${blocoToml()}\nOu: ${c.cli.map(quote).join(' ')}  (depois ajuste tool_timeout_sec = 900: extrair_frames e verificar_site passam de 60 s)`);
    return;
  }
  console.log(`Arquivo: ${c.arquivo}`);
  console.log(JSON.stringify({ [c.chave]: { [NOME]: c.valor } }, null, 2));
}

function gravar(id, c) {
  if (c.tipo === 'cli') {
    const r = spawnSync(c.cli[0], c.cli.slice(1), { stdio: 'inherit', shell: WIN });
    if (r.status !== 0) console.log(`Não consegui rodar "${c.cli[0]}". Rode manualmente:\n${c.cli.map(quote).join(' ')}`);
    return;
  }
  mkdirSync(path.dirname(c.arquivo), { recursive: true });
  if (c.tipo === 'toml') {
    const atual = existsSync(c.arquivo) ? readFileSync(c.arquivo, 'utf8') : '';
    if (atual.includes(`[mcp_servers.${NOME}]`)) { console.log(`${c.arquivo} já tem [mcp_servers.${NOME}] — edite à mão se quiser trocar.`); return; }
    if (atual) copyFileSync(c.arquivo, c.arquivo + '.bak');
    writeFileSync(c.arquivo, `${atual}${atual && !atual.endsWith('\n') ? '\n' : ''}\n${blocoToml()}`);
    console.log(`✔ ${c.nome}: gravado em ${c.arquivo}${atual ? ' (backup .bak)' : ''}`);
    return;
  }
  let obj = {};
  if (existsSync(c.arquivo)) {
    const raw = readFileSync(c.arquivo, 'utf8');
    try { obj = raw.trim() ? JSON.parse(raw) : {}; } catch { console.log(`✖ ${c.arquivo} não é JSON puro (tem comentários?). Nada foi alterado; cole o bloco abaixo à mão.`); mostrar(id, c); return; }
    copyFileSync(c.arquivo, c.arquivo + '.bak');
  }
  obj[c.chave] = { ...(obj[c.chave] || {}), [NOME]: c.valor };
  writeFileSync(c.arquivo, JSON.stringify(obj, null, 2) + '\n');
  console.log(`✔ ${c.nome}: gravado em ${c.arquivo}${existsSync(c.arquivo + '.bak') ? ' (backup .bak)' : ''}. Reinicie o cliente.`);
}

if (alvo && !CLIENTES[alvo]) {
  console.log(`Cliente desconhecido: ${alvo}. Opções: ${Object.keys(CLIENTES).join(', ')}`);
  process.exit(1);
}
console.log(`HEAD de Interação · servidor: ${usarNpx ? `npx -y ${REPO}` : entry}`);
if (!usarNpx && !existsSync(path.join(ROOT, 'node_modules', '@modelcontextprotocol'))) console.log('⚠ Rode "npm install" nesta pasta antes de usar o servidor.');
for (const [id, c] of Object.entries(CLIENTES)) {
  if (alvo && id !== alvo) continue;
  if (flags.has('--gravar') && alvo) gravar(id, c);
  else mostrar(id, c);
}
if (!flags.has('--gravar')) console.log(`\nPara gravar direto: node scripts/configurar.mjs <cliente> --gravar   (clientes: ${Object.keys(CLIENTES).join(', ')})`);
