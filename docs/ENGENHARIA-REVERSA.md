# Engenharia reversa: os 31 prompts validados

Este documento registra o que foi extraído dos quatro PDFs da pasta e como cada descoberta virou parte do MCP **HEAD de Interação**.

| PDF | Ferramenta original | Prompts | Técnica dominante |
|---|---|---|---|
| Award-Winning-3D-Website-Prompt-Pack | Claude Code + Higgsfield | 7 + 5 power-ups | Sequência de frames + instrumentos + módulo de negócio |
| ChatGPT-Website-Creator-Prompt-Pack | ChatGPT/Codex + Higgsfield | 7 | Sequência de frames, “um sujeito + um momento impossível” |
| Fable5-Higgsfield-Website-Prompt-Pack | Claude Fable 5 + Higgsfield | 10 | Frames + clipes encadeados + verticais de negócio |
| GPT-6-Astra-3D-Website-Prompt-Pack | Codex + Higgsfield | 7 | 3D real (Three.js + GSAP), jornada de câmera, interação útil |

---

## 1. O segredo técnico

O “3D no scroll” que viraliza **não usa motor 3D**. É um *scrub* de sequência de imagens:

1. Um clipe cinematográfico curto é fatiado em ~150–200 frames numerados (1600–1920 px, JPEG q3).
2. Todos os frames são pré-carregados (loader com porcentagem trava o scroll até 100%).
3. Uma seção fixada (*pinned*, 100vh de palco dentro de N telas de scroll) converte progresso de scroll → índice de frame.
4. O frame é pintado num `<canvas>` em tela cheia com matemática de *cover-fit*, suavização *lerp* e `requestAnimationFrame`, repintando **só quando o índice muda**.

Rolar para baixo toca o filme. Rolar para cima rebobina. Todo o 3D vem da filmagem — por isso a qualidade dos modelos de imagem/vídeo importa tanto. O pack Astra completa com o caso oposto: quando é preciso orbitar livremente, trocar materiais ou interagir com o modelo, usa-se 3D real.

**No MCP:** o motor `engine/imersao.js` implementa o scrub (frames, vídeo, imagem com câmera, procedural) com todas as regras de performance. A ferramenta `extrair_frames` faz o pipeline ffmpeg.

---

## 2. A anatomia de um prompt validado

Todos os 31 prompts seguem a mesma espinha, sempre nesta ordem:

| # | Bloco | O que contém | Por que funciona |
|---|---|---|---|
| 1 | **Enquadramento** | “Build me an award-winning cinematic 3D scroll website for MARCA, a fictional …” + uma frase de conceito (“Scrolling restores a neglected car”). | Fixa o padrão de qualidade (Awwwards) e o *verbo* da experiência. |
| 2 | **O momento impossível** | Um único sujeito + uma transformação: explodir, florescer, afundar, restaurar, ver por dentro… | Uma ideia só, executada com seriedade total. |
| 3 | **A técnica** | “It is NOT Three.js. It is a canvas image-sequence scrub…” | Impede o agente de “adivinhar” e cair num template. |
| 4 | **STILLS (placas)** | UMA placa-herói; toda outra imagem é um **EDIT** dela (passa o job id como referência). | Produto, câmera e luz idênticos em todos os planos. |
| 5 | **FILMS** | Cada clipe tem `start_image` **e** `end_image`; “one continuous shot, no cuts”; loop = mesma placa no início e no fim. | O quadro final é o volante: decide onde o plano aterrissa. |
| 6 | **FRAMES** | ffmpeg, N frames, largura, qualidade, nome `frames/<clipe>/frame_0001.jpg`, “confirme que existem antes do código”. | Elimina a etapa mais frágil antes de escrever o site. |
| 7 | **WEBSITE** | Capítulos fixados, um por clipe, cada um com tipografia + **instrumentos** + interação; depois o **módulo de negócio**. | Espetáculo + utilidade = site que o cliente paga. |
| 8 | **DESIGN** | Paleta em hex, um acento usado com parcimônia, display serif/condensada + caps espaçadas + mono para leituras, espaço negativo, “sem cards, sem sombras”. | Restrição é o que faz parecer caro. |
| 9 | **SOM / MOBILE / PERFORMANCE** | Web Audio sintetizado (desligado por padrão); fallback MP4 em mobile e *reduced motion*; rAF, 60fps. | Imersão sensorial sem quebrar acessibilidade. |
| 10 | **VERIFY** | “Launch on localhost and verify every chapter mid-scroll before telling me it's done.” | A verificação é de onde vem a confiabilidade. |

**No MCP:** `criar_briefing` monta exatamente esta espinha para qualquer marca/segmento, em PT ou EN (os prompts visuais ficam sempre em inglês). `revisar_prompt_visual` audita prompts de movimento contra as regras dos blocos 4–5.

---

## 3. Os princípios de imersão (o “porquê”)

Extraídos das lições e do que se repete nos 31 prompts:

1. **O scroll move o visitante, não a página.** “Scrolling does not move the page, it moves the VISITOR.” O scroll é câmera, tempo, profundidade ou luz.
2. **Um sujeito + um momento impossível.** Troque o sujeito, escolha o momento, mantenha o sistema.
3. **Para trás é mágica de graça.** Toda transformação funciona nos dois sentidos: explodir/remontar, florescer/fechar, afundar/emergir, “role para cima para des-crocar”.
4. **Continuidade absoluta.** Um plano contínuo não tem emendas quando o visitante rebobina. Clipes encadeados (último frame = primeiro do próximo) viram uma câmera só.
5. **Instrumentos atrelados à filmagem.** dB, Hz, metros, GU, camadas, altitude — atrelados ao que está *na tela*, não à porcentagem do scroll. Isso faz o filme parecer engenharia.
6. **O ambiente reage.** O fundo escurece com a profundidade; o acento da interface é amostrado do frame; a paleta muda filmes e UI juntos; o palco treme com a velocidade.
7. **Espalhe a mudança pelo scroll.** Corte os frames parados; dê mais scroll aos momentos lentos (curva de *time-warp*); pausas legíveis em cada destino.
8. **Descreva fisicamente.** Diga o que luz e matéria fazem, não com o que se parecem (“água-viva” vira uma água-viva de verdade).
9. **Restrição é luxo.** Fundo quase preto, um acento “só onde há calor/luz”, poucas palavras, espaço enorme, sem caixas.
10. **Um momento sensorial.** Som sintetizado que toca só enquanto o filme se move e silencia quando o scroll para; um golpe no grande momento.
11. **Uma interação útil.** Orçamento, reserva, configurador, carrinho, escolha narrativa — testada com entradas reais.
12. **Honestidade.** Formulários de demonstração dizem “nada foi enviado”; nada de prêmios, clientes ou depoimentos inventados.
13. **Verifique no meio do scroll.** Cada capítulo em 50% do seu progresso, para frente e para trás, sem erros no console.
14. **Dirija com sentimentos.** “O título cobre o produto”, “a explosão é rápida demais”, “faça parecer mais caro” — descrever o problema é melhor que prescrever a correção.

**No MCP:** recurso `imersao://principios`, ferramenta `guia_imersao`, e `nota_de_direcao` (traduz sentimentos em ajustes concretos).

---

## 4. Os momentos impossíveis catalogados

| Momento | Origem | Estrutura de placas → filmes | Instrumentos típicos | Para trás vira |
|---|---|---|---|---|
| Explosão e remontagem | OBSCURA, AURUM & NOIR | herói → explodida | contador de peças, callouts com linhas finas | remontagem |
| Explosão de cor | CYMA | limpa → carregada → pico | Hz, cores no ar, amostrador de cor | tinta volta ao cone |
| Lançamento flagship | LAMINA | herói (loop) → partido → fatiado → forno | dB, camadas, forno ao vivo | “des-crocar” |
| Lançamento em plano único | HESPER | 30 s contínuos | contagem T−, telemetria, altitude | pouso |
| Restauração | UNDO | antes → depois (edit) | brilho em GU, anos removidos | 20 anos de sujeira em 2 s |
| Raio-X | CLEARLINE | herói → raio-X → térmica → falha | status “vazamento → selado” | paredes voltam |
| Dentro da luz | FACET | herói → fogo → macro interno | retorno de luz, acento amostrado | sair do diamante |
| Construção | OASIS | terra → pronto (edit) | linha do tempo de etapas, semanas | desconstrói |
| Travessia | Galeria, MERIDIAN | aproximação → caminhada → destino | legendas sincronizadas a cada peça | volta pelo corredor |
| Gênese | AURELIA | fluxo → formação → macro | graus, quilates | volta a metal líquido |
| Tempo congelado | STILL | órbita (tempo parado) → liberação | “o scroll move você, não o tempo” | órbita reversa |
| Florescer | NOX | botão → flor → gota | pétalas, colheita | flor se fecha |
| Descida | ABYSS, ABYSSAL | superfície → zonas → fundo | profundímetro, fundo sincronizado | emergir |
| Revelação pela luz | NOIR | varredura → abertura → golpe | partes, cordas | a luz se apaga |
| Jornada encadeada | ABYSSAL, MERIDIAN, VANTA | 4–5 clipes encadeados | HUD de profundidade/velocidade/cômodos | caminho de volta |
| Montagem de partículas | PULSE | caos → painel | métricas | dissolve |
| Portal / túnel 3D | Astra 01 | tela → vazio → túnel → aterrissagem | — (3D real) | reversível |
| Mundo contínuo 3D | Astra 02, 04, 05 | caminho com paradas | capítulos, escolhas | reversível |

**No MCP:** `listar_momentos` e `detalhar_momento` expõem cada um com prompts de placa/filme prontos (em inglês, com o sujeito trocável), instrumentos, som, comportamento do fundo e capítulos sugeridos.

---

## 5. Os módulos de negócio (o que o cliente paga)

“Meters and a real business turn spectacle into a website.” Cada prompt fecha com um módulo funcional:

pedido antecipado com steppers e horários (LAMINA) · orçamento instantâneo com estimativa ao vivo (UNDO, CLEARLINE) · reserva com vagas/horários (OASIS, FACET, EMBER & OAK) · configurador com preço e prazo (OASIS, VANTA, FACET) · carrinho com gaveta e totais persistentes (ONYX, FORM) · tabela de preços com plano do meio destacado (PULSE, FORGE) · cardápio em duas colunas (EMBER & OAK) · barra de emergência com clique-para-ligar (CLEARLINE) · lista de espera / alocação (AURUM & NOIR, STILL) · índice de trabalhos (Galeria) · FAQ (PULSE) · janela de lançamento calculada pelo pôr do sol real (HESPER).

**No MCP:** todos existem como componentes declarativos do motor (`data-im-calc`, `data-im-slots`, `data-im-cart`, `data-im-honest`, `data-im-countdown`, `data-im-sunset`…) e como tipos de capítulo em `criar_site`.

---

## 6. Power-ups

Os cinco do pack Award-Winning mais os que aparecem espalhados nos demais:

| Power-up | Atributo no motor |
|---|---|
| Seletor de paleta (filtros CSS em todos os canvas + acento pela mesma matemática) | `data-im-palette` |
| Lente de raio-X / térmica com leitura do pixel e varredura ociosa | `data-im-lens` |
| Som que segue o scroll (Web Audio, sem arquivos, `?mute=1`) | `data-im-sound`, `data-im-hit` |
| Bake-off de modelos com folha de contato | ferramenta `folha_de_contato` |
| Pronto para filmar (offline, launcher, `?solo=capitulo:0.5`) | `servidor` + launcher + modo solo |
| Amostrador de cor ao vivo | `data-im-sample-accent` |
| Visualizador arraste-para-girar reaproveitando os frames | `data-im-spin` |
| Antes/depois arrastável | `data-im-compare` |
| Tremor do palco com a velocidade | `data-im-shake` |
| Fundo sincronizado à profundidade | `data-im-bg` |
| Cursor anel/ponto ou spray de tinta | `data-im-cursor` |
| Manifesto “uma palavra por passo” | `data-im-lines` |
| Contadores que sobem | `data-im-count` |

---

## 7. Tabela de modelos (preços de referência, set/2026, Higgsfield)

| Modelo | Custo | Melhor em |
|---|---|---|
| Kling 3.0 · 4K | 60 cr / 10 s | Burro de carga: aterrissa no quadro final e constrói gradualmente. Segura o 1º frame alguns segundos — corte. |
| Cinema Studio 3.0 · 4K | 240 cr | Maior espetáculo; trata o quadro final como sugestão e inventa movimentos ousados. |
| Seedance 2.0 · 4K | 220 cr | Detalhe mais denso; eventos rápidos terminam em ~1,5 s e seguram (rápido demais para scroll). |
| Seedance 2.5 · 1080p | 360 cr / 30 s | Um plano contínuo de 30 s; leva palavras ao pé da letra. |
| GPT Image 2.5 · 4K | 4,25 / 15 cr | Placas e edits alinhados o bastante para empilhar um raio-X. |
| Topaz FPS boost | 56 cr | Dobra para 48 fps — scrub mais sedoso em movimento rápido. |
| Hunyuan3D v3 | 19 cr | Uma foto vira modelo 3D girável (GLB: quantize + texturas webp, não meshopt). |

O pack ChatGPT orça ~100 créditos (~US$ 5) por site: 1 imagem âncora + 3 clipes de 10 s. O pack Fable usa Seedance 2.0 std, 1080p, ~8 s, sem áudio como ponto ideal.

---

## 8. O que o MCP acrescenta além dos prompts

Os prompts dependem de o agente reescrever do zero o motor de scroll a cada site. O MCP fixa esse conhecimento em código testado:

- **Motor de imersão** reutilizável (`engine/imersao.js` + `imersao.css`), declarativo por atributos `data-im-*`, com modo solo, auto-teste (`Imersao.status()`), fallback mobile/reduced-motion e tolerância a frames faltando.
- **Caminho sem IA de vídeo:** mídias procedurais (partículas que se montam no nome da marca, brasas, poeira de luz, bioluminescência, tinta, raios) e imagens com câmera (push-in, varredura de luz, explosão em fragmentos) — o site já nasce imersivo antes de existir qualquer filme.
- **Transformação de site existente:** análise de seções, mapa de imersão e injeção não destrutiva do motor numa cópia.
- **Pipeline ffmpeg:** corte automático de frames parados (freezedetect), detecção de cortes secos, fatiamento, fallback MP4, pôster, folha de contato, interpolação local de fps.
- **Verificação automática** com Chrome/Edge headless: cada capítulo no meio do scroll, nos dois sentidos, com screenshots e erros de console.
