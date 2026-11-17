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

`Header` é a barra de vidro flutuante; na página do mapa usa `overlay` para ficar por cima do mapa.
