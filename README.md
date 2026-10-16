# HEAD de Interação — MCP de sites imersivos

MCP que cria **sites interativos e imersivos do zero** e **transforma sites existentes** em experiências imersivas. Funciona em qualquer cliente MCP: Claude Code, Claude Desktop, Codex, Google Antigravity, Gemini CLI, Cursor, VS Code (Copilot), Windsurf, OpenCode e outros.

Ele nasceu da engenharia reversa de 31 prompts validados de quatro packs de prompts (veja [docs/ENGENHARIA-REVERSA.md](docs/ENGENHARIA-REVERSA.md)). A fórmula é **um sujeito + um momento impossível**: o scroll move o visitante (câmera, tempo, profundidade, luz) e o filme roda para frente e para trás. Os instrumentos acompanham o que está na tela, há um módulo de negócio de verdade e cada capítulo é verificado no meio do scroll antes da entrega.

- **Motor de imersão** (`engine/`): faz o scrub de sequência de frames em capítulos fixados, com medidores, callouts, lente de raio-X, som sintetizado, cursor, índice, módulos de negócio, fallback para celular e movimento reduzido e modo solo. Tudo é declarativo, por atributos `data-im-*` ([referência](docs/MOTOR.md)).
- **Conhecimento**: 22 momentos impossíveis com prompts de placa e filme, 24 segmentos de negócio, 17 módulos, princípios, tabela de modelos e regras de direção.
- **Pipeline de vídeo** (ffmpeg): corta frames parados, detecta cortes secos, fatia, gera fallback MP4, pôster, folha de contato e interpolação.
- **Transformação de sites existentes**: trabalha numa cópia, preserva o original e cobre HTML estático, build de React/Vue, código Vite/CRA e URL.
- **Verificação automática** com Chrome/Edge headless, no desktop, no celular e com movimento reduzido.

## Requisitos

- **Node.js 18.17+**.
- **ffmpeg**, opcional, para as ferramentas de vídeo (`extrair_frames` e similares). Windows: `winget install Gyan.FFmpeg` · macOS: `brew install ffmpeg` · Linux: `apt install ffmpeg`.
- **Chrome, Edge ou Chromium**, opcional, para `verificar_site` e `capturar_capitulo`. Nada é baixado: ele usa o navegador que você já tem.

Variáveis de ambiente opcionais:
- `FFMPEG_PATH` e `CHROME_PATH`: executáveis fora do PATH.
- `HEAD_DE_INTERACAO_PASTA`: pasta onde caminhos relativos são resolvidos (veja [Pasta de trabalho](#pasta-de-trabalho)).

## Instalação

### Opção A: clonar (recomendada, inicia mais rápido)

```bash
git clone https://github.com/holaluiz/mcp_head_de_interacao.git
```

```bash
cd mcp_head_de_interacao
```

```bash
npm install
```

```bash
node scripts/configurar.mjs
```

Esse último comando **mostra a configuração pronta** de todos os clientes, já com o caminho certo. Para gravar direto na config de um cliente, com backup `.bak` do arquivo atual:

```bash
node scripts/configurar.mjs antigravity --gravar
```

Clientes aceitos: `claude-code`, `claude-desktop`, `codex`, `gemini`, `antigravity`, `cursor`, `windsurf`, `vscode`, `opencode`.

### Opção B: sem clonar (npx direto do GitHub)

```bash
npx -y github:holaluiz/mcp_head_de_interacao configurar codex --gravar
```

O npx baixa e instala o pacote na primeira execução, então o primeiro início demora mais. Se o cliente der timeout, inicie de novo ou use a opção A.

## Configuração manual por cliente

Troque `/caminho/mcp_head_de_interacao` pela pasta onde você clonou. No Windows, use barras normais: `D:/projetos/mcp_head_de_interacao/src/index.js`.

**Claude Code**

```bash
claude mcp add --scope user head-de-interacao -- node /caminho/mcp_head_de_interacao/src/index.js
```

**Codex** (CLI e extensão de IDE): `~/.codex/config.toml`

```toml
[mcp_servers.head-de-interacao]
command = "node"
args = ["/caminho/mcp_head_de_interacao/src/index.js"]
startup_timeout_sec = 60
tool_timeout_sec = 900   # extrair_frames e verificar_site passam do padrão de 60 s
```

**Google Antigravity**: no painel do agente, ⋯ → *MCP Servers* → *Manage MCP Servers* → *View raw config* (`mcp_config.json`). Depois de salvar, clique em *Refresh*.

```json
{
  "mcpServers": {
    "head-de-interacao": {
      "command": "node",
      "args": ["/caminho/mcp_head_de_interacao/src/index.js"]
    }
  }
}
```

**Gemini CLI**: `~/.gemini/settings.json` (o `timeout` é em ms)

```json
{ "mcpServers": { "head-de-interacao": { "command": "node", "args": ["/caminho/mcp_head_de_interacao/src/index.js"], "timeout": 600000 } } }
```

**Claude Desktop** (`claude_desktop_config.json`), **Cursor** (`~/.cursor/mcp.json`), **Windsurf** (`~/.codeium/windsurf/mcp_config.json`) e **Cline**: usam o mesmo bloco `mcpServers` do Antigravity.

**VS Code / GitHub Copilot** (modo agente): `.vscode/mcp.json`

```json
{ "servers": { "head-de-interacao": { "type": "stdio", "command": "node", "args": ["/caminho/mcp_head_de_interacao/src/index.js"] } } }
```

**OpenCode**: `opencode.json`

```json
{ "mcp": { "head-de-interacao": { "type": "local", "command": ["node", "/caminho/mcp_head_de_interacao/src/index.js"], "enabled": true } } }
```

Para a versão via npx, troque `command`/`args` por `"command": "npx", "args": ["-y", "github:holaluiz/mcp_head_de_interacao"]`. No Windows, alguns clientes precisam de `"command": "cmd", "args": ["/c", "npx", "-y", "github:holaluiz/mcp_head_de_interacao"]`.

> Se o seu agente não seguir o fluxo (alguns clientes ignoram as instruções do servidor), cole as regras de [docs/AGENTES.md](docs/AGENTES.md) no `AGENTS.md`, `GEMINI.md`, `CLAUDE.md` ou `.cursor/rules` do seu projeto.

## Pasta de trabalho

Cada cliente inicia o servidor num diretório diferente. Por isso, caminhos **relativos** (por exemplo `"projeto": "meu-site"`) são resolvidos nesta ordem:

1. `HEAD_DE_INTERACAO_PASTA`, se estiver definida na config do cliente (bloco `env`);
2. a pasta aberta no editor, quando o cliente informa as *roots* do MCP (Antigravity, VS Code, Cursor e Claude Code informam);
3. o diretório atual, se for um lugar razoável;
4. `~/HEAD-de-Interacao`.

Caminhos absolutos sempre funcionam, e toda ferramenta responde com o caminho absoluto do que gravou.

## Usar

**Do zero**, pedindo assim:

> Use o head-de-interacao para criar um site imersivo para a LAMINA, uma padaria que lança o croissant como um celular topo de linha. Salve em D:/sites/lamina.

O fluxo é: `recomendar` → `criar_briefing` → `criar_site` → `servir_site` → `verificar_site`. Depois você gera as placas e os filmes do plano (Higgsfield ou outro gerador), salva os MP4 em `media/brutos/` e roda `extrair_frames`. A partir daí o site troca sozinho o fallback pelo scrub real. Para refinar, use `nota_de_direcao` (“a explosão é rápida demais”, “faça parecer mais caro”) e verifique de novo.

**Site existente**:

> Transforme o site em D:/clientes/brilho (ou https://…) numa experiência imersiva, intensidade alta.

O fluxo é: `analisar_site` (mapa de imersão) → `transformar_site` (cópia em `…-imersivo`) → `servir_site` → `verificar_site` com `secoes: true`. O site ganha rolagem suave, revelações, cascatas, contadores, botões magnéticos, índice, cursor e um **prólogo cinematográfico** (partículas formando a marca, imagem do herói se montando em fragmentos ou scrub de frames). Formulários reais continuam reais.

Sem gerador de vídeo, os capítulos usam fotos e mídias procedurais, então o site já nasce imersivo.

## Ferramentas (27)

| Grupo | Ferramentas |
|---|---|
| Conhecimento | `guia_imersao`, `listar_momentos`, `detalhar_momento`, `recomendar`, `listar_segmentos_e_modulos` |
| Briefing | `criar_briefing`, `planejar_assets`, `revisar_prompt_visual` |
| Site do zero | `criar_site`, `status_projeto`, `ajustar_capitulo`, `adicionar_capitulo`, `adicionar_modulo`, `ajustar_site`, `atualizar_motor`, `nota_de_direcao` |
| Site existente | `analisar_site`, `transformar_site` |
| Vídeo e frames | `analisar_video`, `extrair_frames`, `extrair_quadro`, `folha_de_contato`, `medir_alinhamento` |
| Verificação | `servir_site`, `parar_site`, `verificar_site`, `capturar_capitulo` |

Os **recursos** são `imersao://guia`, `imersao://principios`, `imersao://anatomia`, `imersao://motor`, `imersao://engenharia-reversa` e `imersao://momento/{id}`. Os **prompts** são `site-imersivo`, `transformar-site` e `dirigir`.

Os schemas das ferramentas usam só tipos simples (string, número, booleano, enum, objeto, lista), sem `union`/`nullable`, para funcionar inclusive em clientes com validação estrita, como Gemini/Antigravity e Codex.

## Estrutura

```
engine/            motor (src/ → build em imersao.js) + imersao.css + vendor/lenis
src/index.js       servidor MCP (stdio) · "configurar" abre o configurador
src/knowledge/     momentos, segmentos, módulos, princípios, direção
src/lib/           briefing, render, scaffold, transform, ffmpeg, serve, verify, browser, workspace
src/tools/         registro das ferramentas por grupo
templates/         server.mjs copiado para cada projeto (abrir-site.bat/.command)
scripts/           configurar.mjs (clientes MCP) · build-engine.mjs
test/              smoke.mjs + fixtures (site estático e SPA)
docs/              engenharia reversa, referência do motor, regras para agentes
```

## Desenvolvimento

```bash
npm test
```

Sobe o MCP por stdio como um cliente real e percorre os fluxos com verificação headless.

```bash
npm run test:rapido
```

Mesma coisa, sem navegador.

```bash
npm run build:engine
```

Junta `engine/src/*.js` em `engine/imersao.js`. Depois disso, `atualizar_motor` reinstala o motor em projetos já gerados.

Os PDFs originais de prompts não fazem parte deste repositório.

## Licença

MIT
