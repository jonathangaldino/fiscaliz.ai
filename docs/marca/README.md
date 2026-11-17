# Marca do Fiscaliz.ai

<p align="center"><img src="../../public/brand/fiscaliz-logo-light.svg" alt="Fiscaliz.ai" height="64"></p>

## Ideia

**Você aponta. A cidade resolve.**

O símbolo junta as três partes do produto num desenho só:

- **o balão de conversa**: o relato começa como uma mensagem no WhatsApp;
- **a ponta de pin**: o balão termina num pin, porque o relato vira um ponto no mapa;
- **o check**: o problema resolvido, confirmado por quem relatou.

O quadrado azul arredondado segue o formato de ícone de app e o mesmo material de vidro do painel: gradiente do azul claro para o profundo, com um brilho no topo.

## Arquivos

Em `public/brand/`:

| Arquivo | Uso |
|---|---|
| `fiscaliz-mark.svg` | Símbolo colorido (ícone de app, avatar, favicon) |
| `fiscaliz-mark-512.png` | O mesmo em PNG, para redes e lojas |
| `fiscaliz-glyph.svg` | Só o balão, em uma cor (`currentColor`), para marca-d'água e carimbos |
| `fiscaliz-logo-light.svg` | Símbolo + nome, para fundo claro |
| `fiscaliz-logo-dark.svg` | Símbolo + nome, para fundo escuro |

No código: `LogoMark` e `Logo` (`components/ui/Logo.tsx`). Favicon, ícone e ícone da Apple ficam em `app/` (`favicon.ico`, `icon.svg`, `apple-icon.png`), como o Next.js espera.

Ilustrações 3D (mesmo estilo dos ícones de categoria) em `public/landing/`: `marca-3d.webp` e `cidade.webp`.

## Nome

- Escreva **Fiscaliz.ai**, com o F maiúsculo e o ".ai" junto. No logotipo, o ".ai" vai no azul de destaque.
- Na fala (vídeo, apresentação): "Fiscaliz ponto ai".

## Cores

| Nome | Hex | Uso |
|---|---|---|
| Azul claro | `#2B8CFF` | Início do gradiente do símbolo |
| Azul Fiscaliz | `#0B5FC6` | Destaque, botões, check |
| Azul profundo | `#0A4596` | Fim do gradiente do símbolo |
| Tinta | `#0B0D0C` | Texto |
| Névoa | `#EEF1EE` | Fundo |

As cores das categorias e da situação (aberta, verificando, resolvida) estão em `docs/design-system.md`.

## Tipografia

- **Logotipo**: Inter Semibold, convertida em curvas no SVG.
- **Interface**: fonte do sistema (San Francisco no Apple, Segoe no Windows), como no resto do painel.

## Cuidados

- Mantenha uma margem livre em volta do símbolo de pelo menos 1/4 da largura dele.
- Não troque as cores do símbolo, não gire, não aplique sombra extra nem contorno.
- Em tamanhos abaixo de 20 px, use só o símbolo, sem o nome.

## Voz

Direta, próxima e prática, em português simples. Fala com quem mora na cidade, não com técnicos. Frases curtas, sem jargão ("relato", "ocorrência" e "apelo" seguem o [GLOSSARY.md](../../GLOSSARY.md)). O vídeo explicativo está em [roteiro-video.md](./roteiro-video.md).
