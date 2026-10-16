# Regras para agentes (cole no seu AGENTS.md, GEMINI.md, CLAUDE.md ou .cursor/rules)

Alguns clientes MCP ignoram as instruções que o servidor envia. Se o seu agente não estiver seguindo o fluxo, cole o bloco abaixo nas regras do projeto em que você vai criar sites.

```markdown
## Sites imersivos (MCP head-de-interacao)

Quando eu pedir um site imersivo, interativo, cinematográfico ou "nível Awwwards", use o MCP `head-de-interacao`. Não escreva o scroll do zero.

Regra de ouro: um sujeito + UM momento impossível (explodir, florescer, afundar, restaurar, ver por dentro…). O scroll move o visitante (câmera, tempo, profundidade, luz) e funciona para trás. Os instrumentos acompanham o que está na tela. Tem um módulo de negócio útil.

Do zero:
1. `recomendar` → explique em 2 frases o momento e os módulos escolhidos.
2. `criar_briefing` com `projeto` (pasta absoluta). `produto_visual` vai em INGLÊS, com descrição física.
3. `criar_site` → `servir_site` → `verificar_site`. Corrija até passar.
4. Mostre o plano de placas/filmes com o custo. Só gere assets com a minha aprovação. Com os MP4 em media/brutos/, rode `extrair_frames` para cada clipe e `verificar_site` de novo.
5. Feedback de sensação ("rápido demais", "mais caro", "sem vida") → `nota_de_direcao` com aplicar=true → `capturar_capitulo` → `verificar_site`.

Site existente:
1. `analisar_site` → mostre o mapa de imersão.
2. `transformar_site` (sempre numa cópia) → `servir_site` → `verificar_site` com secoes=true.

Nunca invente prêmios, clientes, depoimentos ou números: deixe os [[marcadores]] e me pergunte. Formulários reais continuam reais. Formulários de demonstração dizem que nada foi enviado.
Só diga que terminou depois de um `verificar_site` sem ✖ (marcadores pendentes contam como ✖ até eu passar os fatos).
```
