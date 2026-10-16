# Motor de imersão — referência dos atributos `data-im-*`

`imersao/imersao.js` + `imersao/imersao.css` (+ `imersao/vendor/lenis.min.js`). JavaScript puro, sem dependências além do Lenis, tudo declarativo. Tudo o que o motor injeta usa o prefixo `im-`, então ele convive com o CSS de qualquer site.

```html
<link rel="stylesheet" href="imersao/imersao.css">
<body data-im-root data-im-brand="MARCA" data-im-cursor="ring" data-im-smooth="0.1" data-im-grain>
  …
  <script src="imersao/vendor/lenis.min.js" defer></script>
  <script src="imersao/imersao.js" defer></script>
</body>
```

Keyframes aceitam JSON `[[0,0],[0.5,94],[1,94]]` ou o formato compacto `"0:0,0.5:94,1:94"`. Os valores podem ser números, cores (`#0E3A5C`) ou objetos (`{"s":1.2,"x":-10}`). O progresso vai sempre de 0 a 1 dentro do capítulo.

---

## Raiz (`<body>`)

| Atributo | Efeito |
|---|---|
| `data-im-root` | Ativa o motor nesta árvore. |
| `data-im-brand="NOME"` | Nome usado pelas partículas e pelo loader. |
| `data-im-smooth="0.1"` · `"off"` | lerp do Lenis (0,07 é pesado e 0,2 é ágil). `off` mantém a rolagem nativa ou a do próprio site. |
| `data-im-cursor="ring\|dot\|paint"` | Cursor em anel com rótulo, em ponto, ou spray de tinta que respinga no clique. Fica desligado em telas de toque e com movimento reduzido. `data-im-paint-colors='["#f0f","#0ff"]'` · `data-im-cursor-hide` |
| `data-im-grain` · `data-im-vignette` | Grão de filme e vinheta. |
| `data-im-ambient="hum"` | Textura sonora ambiente, que só toca depois do clique no botão de som. |
| `data-im-preload="all\|progressive"` | `progressive` libera a primeira vista e carrega o resto em segundo plano (padrão acima de 900 frames). |
| `data-im-manifest="imersao.manifest.json"` · `"none"` | De onde vêm as sequências de frames. |

## Capítulo fixado

```html
<section class="im-chapter" id="impacto" data-im-chapter data-im-label="O impacto" data-im-length="3.5">
  <div class="im-stage">
    <canvas class="im-media" data-im-media="frames" data-im-seq="impacto" data-im-fallback="procedural:embers"></canvas>
    <div class="im-shade"></div>
    <div class="im-layer"> … grupos .im-pos …</div>
  </div>
</section>
```

| Atributo | Efeito |
|---|---|
| `data-im-chapter` | Seção fixada. O progresso de scroll dirige tudo o que está dentro dela. |
| `data-im-label` | Nome no índice lateral (também vale para seções comuns). |
| `data-im-length="3"` | Altura em telas de scroll (quanto maior, mais lento). |
| `data-im-lerp="0.14"` | Suavização entre o scroll e o que aparece na tela. |
| `data-im-warp="[[0,0],[0.3,0.4],[1,1]]"` | Curva de *time-warp* que dá mais scroll aos momentos lentos. Um platô (`[0.85,1],[1,1]`) segura o destino. |
| `data-im-bg="[[0,'#0E3A5C'],[1,'#000']]"` | Fundo da página sincronizado ao progresso (profundidade, hora do dia). |
| `data-im-shake="0.3,0.6,8"` | Tremor do palco entre 30% e 60%, até 8 px, proporcional à velocidade. |
| `data-im-sound="rumble"` · `data-im-sound-range="0.2,0.8"` | Textura que só toca enquanto o filme se move: `rumble`, `fire`, `air`, `wind`, `water`, `shimmer`, `hum`. |
| `data-im-hit="crunch@0.42,chime@0.9"` | Golpe sonoro ao cruzar o ponto: `drop808`, `crunch`, `whoosh`, `impact`, `chime`, `ignition`, `tick`. |
| `data-im-hook` | Libera `Imersao.onProgress(id, fn)` (por exemplo para Three.js/GSAP). |

Posições dos grupos: `.im-pos.im-pos-{center|top-center|bottom-center|left|right|top-left|top-right|bottom-left|bottom-right|full}`.

## Mídias (`.im-media`)

| `data-im-media` | Atributos |
|---|---|
| `frames` | `data-im-seq` (nome no manifesto), `data-im-range="0.1,0.9"`, `data-im-reverse`, `data-im-sample-accent` (o acento da interface vem do frame), `data-im-mobile-scrub` (scrub também no celular), `data-im-fallback` (cadeia usada enquanto os frames não existem: `wipe:a.jpg\|b.jpg\|ltr; stills:a\|b; shatter:hero.jpg; image:x.jpg; procedural:aurora`). Também aceita `data-im-src="frames/x/frame_{i}.jpg"` + `data-im-count` sem manifesto. |
| `procedural` | `data-im-preset`: `particles` (montam `data-im-text`), `embers`, `dust`, `deep` (`data-im-mode="dive\|rise"`), `ink`, `rays` (`data-im-mode="spectral"`, `data-im-origin`), `aurora`, `tunnel`, `fountain` (`data-im-profile`), `bloom`, `bokeh`. Também aceita `data-im-keys` e `data-im-colors`. |
| `image` · `video` | Imagem com câmera, ou vídeo que faz scrub pelo `currentTime` (melhor com MP4 all-intra). |
| `stills` | Várias fotos em sequência (`data-im-overlap`, `data-im-zoom`). |
| `wipe` | Antes/depois varrido pelo scroll (`data-im-dir="ltr\|rtl\|ttb\|btt"`, `data-im-keys`). |
| `shatter` | A imagem `data-im-src` se parte em fragmentos (`data-im-grid="12x7"`, `data-im-flare="accent\|spectral\|none"`, `data-im-keys`: 0 = inteira, 1 = explodida). |

Câmera em qualquer mídia: `data-im-cam='[[0,{"s":0.62,"y":9}],[0.3,{"s":1}],[1,{"s":1,"x":-17}]]'`, em que `s` é escala, `x`/`y` são deslocamentos em %, `r` é rotação, `o` é opacidade e `b` é desfoque. `data-im-fit="cover|contain"`.

## Sobreposições e instrumentos (dentro do palco)

| Atributo | Efeito |
|---|---|
| `data-im-in="0.1" data-im-out="0.6"` | Janela de visibilidade. `data-im-anim`: `fade`, `rise`, `drop`, `left`, `right`, `scale`, `blur`, `mask`, `track`, `letters`, `slam`. `data-im-fade` define a duração da borda. |
| `data-im-meter data-im-name="Crocância" data-im-unit="dB" data-im-keys="0:0,0.42:94,1:94"` | Medidor atrelado ao filme. Aceita `data-im-decimals`, `data-im-prefix`, `data-im-suffix`, `data-im-bar` e `data-im-ease`. |
| `data-im-texts='[[0,"Vazamento"],[0.6,"Selado","is-ok"]]'` | Texto de status que troca por degraus. |
| `<ol data-im-steps data-im-from="0.1" data-im-to="0.9">` | Etapas acesas uma a uma. |
| `data-im-callout data-im-x=".42" data-im-y=".5" data-im-lx=".75" data-im-ly=".25"` | Callout com linha fina presa a um ponto da mídia. |
| `data-im-lines="stack\|single"` | Manifesto com uma linha (ou uma palavra batendo) por passo. |
| `data-im-hint` | Dica que aparece no fim, por exemplo “role para cima para desfazer”. |
| `<div class="im-hud">` | HUD do capítulo. |

## Componentes de página

| Atributo | Efeito |
|---|---|
| `data-im-reveal="rise\|mask\|left\|right\|scale\|blur"` | Entra ao aparecer na tela. |
| `data-im-stagger="90"` | Os filhos entram em cascata (`data-im-stagger-anim`). |
| `data-im-count` | Número que sobe ao aparecer. Sem valor, lê o próprio texto. Aceita `data-im-prefix`, `data-im-suffix`, `data-im-decimals` e `data-im-duration`. |
| `data-im-magnetic="0.25"` · `data-im-tilt="4"` · `data-im-parallax="0.12"` | Botão magnético, inclinação com o cursor e parallax. |
| `data-im-marquee="28"` | Faixa contínua que acelera com o scroll. |
| `video[data-im-hoverplay]` | Toca ao passar o cursor no card (`data-im-hover-card`). |
| `data-im-bg-section="#111"` · `data-im-fg-section="#fff"` | A cor da página muda ao entrar na seção. |
| `data-im-lens` | Lente de raio-X/térmica sobre `.im-lens-base`, com camadas `.im-lens-layer` (`data-name`, `data-legend`, `data-thermal="18,96"`). Aceita `data-im-radius` e `data-im-offset="x,y"`, este último vindo de `medir_alinhamento`. |
| `data-im-compare` | Antes/depois arrastável e acessível por teclado (`data-im-start="0.5"`). |
| `data-im-spin data-im-seq="giro"` | Arraste para girar reaproveitando os frames (`data-im-autorotate`). |
| `data-im-palette` | Chips de paleta que aplicam filtros em todos os canvas e no acento. |
| `data-im-index` · `.im-progress` · `data-im-sound-toggle` · `data-im-loader` | Índice de capítulos, barra de progresso, botão de som e loader (`data-style="line\|bar\|ember\|stem\|propellant"`, `data-im-timeout`, portão `data-im-gate="sound\|silent"`). |

## Módulos de negócio

| Atributo | Efeito |
|---|---|
| `form[data-im-calc]` | Estimativa ao vivo. Aceita `data-im-base`, `data-im-base-days`, `data-im-spread` (faixa ±), `data-im-months` + `data-im-rate` (parcela) e `data-im-currency`. As opções usam `data-price`, `data-mult` e `data-days`. Sliders e números usam `data-price-per`, `data-days-per` e `data-mult-per`. A troca de imagem usa `data-swap-target` + `data-swap-src`/`data-swap-filter`. |
| `output[data-im-out="total\|range\|min\|max\|days\|weeks\|monthly\|label:nome"]` | Saídas do cálculo. Use `data-im-calc-scope` para colocá-las fora do formulário. |
| `data-im-wizard` + `[data-im-step]` | Assistente em etapas. |
| `data-im-slots='{"days":5,"hours":["09:00","14:00"],"skip":[0],"busy":0.3}'` | Horários disponíveis. |
| `data-im-stepper` | Quantidade com − e +. |
| `form[data-im-honest]` | Formulário de demonstração: mostra o resumo e avisa que **nada foi enviado**. Nunca use em formulários reais. |
| `data-im-countdown="2026-12-01T20:00"` · `data-im-countdown-every="40"` | Contagem até uma data, ou ciclo em minutos (“próxima fornada”). |
| `data-im-sunset="-25.43,-49.27"` | Janela calculada pelo pôr do sol real. |
| `data-im-billing` + `data-im-billing-set` | Alternância mensal/anual (`data-monthly`/`data-yearly`). |
| `data-im-cart` + `data-im-add='{"id","name","price","img"}'` | Sacola com gaveta e totais persistentes. |
| `data-im-bind="#alvo"` · `data-im-show="#saida"` | Espelham o texto ou o valor de um campo. |

## Sites existentes e SPAs

`<script type="application/json" id="im-plan">{"rules":[{"sel":"main h2","attrs":{"data-im-reveal":"rise"}}],"insert":[{"id":"prologo","before":"#root","html":"…"}]}</script>`: aplica atributos e insere capítulos depois que o framework renderiza. O motor observa o DOM por 12 s e depois disso `Imersao.refresh()` reaplica. Se um ancestral com `overflow` impede o `position: sticky`, o motor corrige sozinho (vira `clip`) e registra o ajuste.

## Parâmetros de URL

`?solo=capitulo:0.5` fixa um capítulo para screenshot · `?mute=1` · `?debug=1` (HUD com fps e frames) · `?reduced` · `?noloader`.

## API `window.Imersao`

```js
Imersao.status()               // capítulos, progresso, frames carregados/falhos, erros, som
await Imersao.selfTest([0.1, 0.5, 0.9])  // ida e volta em cada capítulo
Imersao.goTo('impacto', 0.5, { instant: true })
Imersao.onProgress('capitulo', (p, ch) => { /* 0→1, rebobina junto */ })
Imersao.refresh()              // reescaneia o DOM (conteúdo novo)
Imersao.sound.on(); Imersao.sound.hit('impact')
document.addEventListener('imersao:ready', (e) => console.log(e.detail))
form.addEventListener('imersao:calc', (e) => console.log(e.detail.total))
```

Com movimento reduzido, o motor mostra cada capítulo como uma seção estática e legível: pôster no lugar dos frames, textos e revelações sempre visíveis. Abaixo de 768 px usa o MP4 leve em loop quando ele existe (a não ser que o capítulo tenha `data-im-mobile-scrub`).
