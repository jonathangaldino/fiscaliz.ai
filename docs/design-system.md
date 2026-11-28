# Design system

Um mini design system para o painel: poucos tokens, poucos componentes, sem biblioteca externa. Referências: o "liquid glass" da Apple (superfícies translúcidas sobre o conteúdo) e mapas exploradores com painel flutuante e card ao tocar no pin.

## Princípios

- **O mapa é o fundo.** A interface flutua sobre ele em vidro; nada de faixas opacas que cortam o mapa.
- **Vidro é material, não cor.** Fundo translúcido, desfoque, borda fina e um brilho no topo. Texto sempre sobre vidro com opacidade suficiente para o contraste.
- **Acessível por padrão.** Contraste AA, foco visível, alvos de 44 px em telas de toque. O vidro vira superfície sólida com `prefers-reduced-transparency` ou `prefers-contrast: more`, e as animações somem com `prefers-reduced-motion`.
- **Pouco código.** Se o Tailwind resolve com uma classe, não vira componente.

## Tokens

Ficam em `app/globals.css`, como variáveis CSS com versão clara e escura. O bloco `@theme inline` expõe as cores ao Tailwind.

| Token | Classe | Uso |
|---|---|---|
| `--bg` | `bg-bg` | Fundo da página |
| `--surface` | `bg-surface` | Superfície sólida (fallback do vidro) |
| `--fg` | `text-fg` | Texto principal |
| `--fg-muted` | `text-muted` | Texto secundário (AA sobre vidro) |
| `--fg-subtle` | `text-subtle` | Metadados curtos (AA sobre branco) |
| `--line` | `border-line` | Divisórias |
| `--accent` | `text-accent` | Links e ícones de ação |
| `--accent-solid` | `bg-accent-solid` | Fundo do botão principal (texto `text-on-accent`) |
| `--accent-tint` | `bg-accent-tint` | Hover e seleção leves |
| `--status-*` | `text-(--status-open)` etc. | Situação da ocorrência: aberta, verificando, resolvida |
| `--dur-fast`, `--dur`, `--dur-slow` | `duration-(--dur)` | 120, 200 e 340 ms |
| `--ease-out`, `--ease-spring` | `ease-out`, `ease-spring` | Curvas de movimento |

Raios: `rounded-control` (14 px), `rounded-card` (20 px), `rounded-panel` (28 px) e `rounded-full` para pílulas.

## Materiais

| Utilitário | Quando usar |
|---|---|
| `glass` | Barras, botões e chips sobre o mapa |
| `glass-strong` | Painéis com muito texto (lista, card da ocorrência) |
| `ambient` | Fundo das páginas sem mapa: gradientes suaves para o vidro ter o que desfocar |

## Componentes

Em `components/ui/`:

| Componente | O que é |
|---|---|
| `Button` / `buttonClass()` | Botão em pílula: `primary`, `glass`, `ghost`, `warning`; tamanhos `md` (44 px) e `sm`. `buttonClass()` aplica o mesmo visual a um `Link`. |
| `IconButton` | Botão redondo só com ícone; `label` é obrigatório e vira `aria-label`. |
| `Chip` | Pílula de filtro com `aria-pressed`. |
| `StatusBadge` | Situação da ocorrência; o texto carrega o sentido, a cor só reforça. |
| `PriorityBadge` | Faixa de prioridade (Crítica, Alta, Média, Baixa), com a pontuação opcional. Mesma regra: o nome da faixa carrega o sentido. |

`Header` é a barra de vidro flutuante; na página do mapa usa `overlay` para ficar por cima do mapa.

## Ícones de categoria

Um ícone 3D por categoria de `COMPETENCIAS.md`, no estilo dos emojis da Apple: brilho suave, formas arredondadas, leitura clara a partir de 24 px.

- Arquivos: `public/icons/categories/<categoria>.webp`, 128 × 128 px com transparência, ~6 KB cada.
- Mapa categoria → arquivo: `lib/categoryIcons.ts`. É um `Record<CategoryKey, string>`: categoria nova sem ícone quebra o typecheck.
- Componente: `CategoryIcon`. Decorativo por padrão (`alt=""`), porque o nome da categoria vem ao lado; passe `label` quando o ícone aparecer sozinho.
- Origem: gerados para o projeto com o GPT Image 2.6 no Higgsfield, fundo transparente, recortados e reduzidos para 128 px. Mesma licença do repositório.
- Categoria nova: gerar com o mesmo prompt-base abaixo, trocando só o assunto, e salvar com o nome da chave.

> A single 3D icon in the style of Apple's emoji set: glossy, soft studio lighting from the top left, rounded friendly chunky shapes, gentle 3/4 perspective, vibrant but natural colors, subtle soft contact shadow. Compact silhouette that fills most of the square and stays readable at 24 pixels. No text, no letters, no outline, no frame, no background plate. One isolated object centered, transparent background. Subject: …

## Movimento e microfeedback

Curto e discreto: o movimento confirma a ação, não chama atenção para si.

| Efeito | Onde | Como |
|---|---|---|
| Luz que segue o mouse | Botões, chips, linhas de lista, dock | Utilitário `lit` + `PointerLight` no layout (um único listener para a página) |
| Toque | Botões, chips, linhas | `active:scale-[0.97]` (linhas `0.99`) |
| Ícone que pula | Dock e listas | `group-hover:scale-110` com `ease-spring` |
| Elevação | Cartões clicáveis | Utilitário `lift` |
| Entrada do card | Card da ocorrência, mensagens do simulador | `animate-[card-in_…]` |
| Pin ativo | Mapa | Pin selecionado ou sob o mouse cresce 22% e vai para a camada de cima |
| Lista acompanha o mapa | Painel | Pin tocado rola a lista até o item |

Regras:
- Durações só pelos tokens (`--dur-fast`, `--dur`, `--dur-slow`); com `prefers-reduced-motion` todas viram 1 ms e a luz não aparece.
- A luz só existe com mouse (`hover: hover`); no toque não há efeito de hover.
- Nada anima em loop, exceto o ponto do selo "Verificando".

## Som

Sons curtos (até 250 ms) e baixos que confirmam uma ação. Ficam em `lib/sound.ts`, sintetizados com a Web Audio API: não há arquivo de áudio, licença nem download.

| Som | Quando |
|---|---|
| `tap` | Tocar num pin no simulador, abrir ou fechar a lista, trocar o órgão, botões SIM/NÃO |
| `toggleOn` / `toggleOff` | Ligar e desligar um filtro de categoria, limpar filtros |
| `open` / `close` | Abrir e fechar o card da ocorrência |
| `send` / `receive` | Mensagem enviada e resposta do bot no simulador |
| `success` | Verificação iniciada |

Regras:
- Som só depois de uma ação da pessoa; nunca ao carregar a página nem em atualizações automáticas (a resposta do bot é consequência de uma mensagem enviada).
- O botão de som no topo liga e desliga tudo (`aria-pressed`); a escolha fica salva no navegador.
- O som nunca carrega informação sozinho: tudo o que ele confirma também aparece na tela.
- Som novo: acrescentar ao `SoundName` e ao mapa `SOUNDS`, com notas curtas e ataque rápido.

## Acessibilidade

Meta: WCAG 2.1 AA. O que já está garantido e como manter:

- **Contraste**: textos e ícones de ação com 4,5:1 ou mais sobre o vidro, no claro e no escuro (tabela no PR #44). Cor nunca é a única pista: situação, apelo e filtros sempre têm texto.
- **Vidro**: vira superfície sólida com `prefers-reduced-transparency` e `prefers-contrast: more`.
- **Movimento**: `prefers-reduced-motion` zera durações, tira a luz do hover e deixa a rolagem instantânea.
- **Teclado**: link "Pular para o conteúdo"; a ordem do DOM é a ordem do teclado (topo → categorias → busca, órgão e lista → mapa); foco visível em tudo (`:focus-visible`).
- **Card da ocorrência**: no celular o foco entra no card ao abrir; `Esc` fecha de qualquer lugar e o foco volta para a linha da lista (ou para a alça da folha no celular).
- **Mapa**: os pins não são focáveis, mas tudo o que está no mapa também está na lista. O canvas se apresenta como "Mapa de ocorrências" e os controles do MapLibre falam português.
- **Leitor de tela**: contagem de resultados e mensagens do simulador em regiões ao vivo; carregando e vazio com `role="status"`; erros com `role="alert"`; apelo com o texto completo ("Apelo: 14 pessoas").
- **Toque**: alvos de 44 px em telas de toque (`pointer-coarse:`), 36 px ou mais com mouse.
- **Som**: sempre com botão de mudo e nunca como única confirmação.

Verificação: `axe-core` (regras WCAG 2.1 A/AA e boas práticas) em todas as páginas, claro e escuro, 1440 px e 390 px, sem violações.
