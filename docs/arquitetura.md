# Arquitetura do Fiscaliz.ai

Este documento detalha como a V1 é construída. As decisões e seus porquês estão nas ADRs ([0001](./adr/0001-emergencias-e-fora-de-escopo-so-contador-anonimo.md), [0002](./adr/0002-whatsapp-cloud-api-oficial.md), [0003](./adr/0003-arquitetura-v1.md), [0004](./adr/0004-por-que-nao-langgraph.md), [0005](./adr/0005-geocodificacao-pelo-cnefe-do-ibge.md), [0006](./adr/0006-cnefe-em-arquivo-no-servidor.md), [0007](./adr/0007-damerau-levenshtein-no-nome-da-rua.md), [0009](./adr/0009-telegram-no-lugar-do-whatsapp.md)). O vocabulário segue o [GLOSSARY](../GLOSSARY.md); os nomes no código seguem a tabela "Nomes no código" de lá.

## Sumário

- [Visão geral](#visão-geral)
- [Stack](#stack)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Modelo de dados](#modelo-de-dados)
- [Recebimento de mensagens](#recebimento-de-mensagens)
- [Processamento de uma mensagem](#processamento-de-uma-mensagem)
- [Máquina de estados da conversa](#máquina-de-estados-da-conversa)
- [Camada de IA](#camada-de-ia)
- [Localização](#localização)
- [De-duplicação e apelo](#de-duplicação-e-apelo)
- [Canais: Telegram e simulador](#canais-telegram-e-simulador)
- [Painel](#painel)
- [Privacidade](#privacidade)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes e qualidade](#testes-e-qualidade)
- [Deploy](#deploy)
- [V2: verificação](#v2-verificação)
- [Riscos](#riscos)

## Visão geral

```mermaid
flowchart LR
  C[Cidadão] -- Telegram --> M[Telegram Bot API]
  M -- webhook --> H[Convex httpAction<br/>/telegram]
  S[Simulador web<br/>/simular] -- mutation --> Q
  H -- grava update_id + agenda --> Q[action handleIncoming]
  Q -- áudio --> E[ElevenLabs Scribe]
  Q -- extração / duplicata --> A[Claude Haiku 5.5]
  Q -- endereço --> G[Google Geocoding]
  Q -- foto no SIM --> B[Modal<br/>YOLO rosto/placa]
  Q -- mutations --> DB[(Convex DB)]
  DB -- useQuery em tempo real --> P[Painel Next.js<br/>Vercel]
  Q -- resposta --> M
  Q -- resposta --> S
```

Um único app Next.js com a pasta `convex/` dentro. O Convex é o backend inteiro: banco, funções, webhook, agendamentos e tempo real. O Next.js só desenha o painel e o simulador.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind, shadcn/ui | Deploy simples na Vercel; componentes prontos e acessíveis |
| Backend | Convex | Banco transacional + funções + agendador + reatividade num lugar só |
| Mapa | MapLibre via `react-map-gl/maplibre`, tiles OpenFreeMap | Vetorial, grátis, sem chave; o OSM raster oficial proíbe uso pesado |
| IA | Claude Haiku 5.5 (SDK `@anthropic-ai/sdk`) | Rápido e barato para chat; qualidade medida pelo eval |
| Transcrição | ElevenLabs Scribe | Boa qualidade em pt-BR |
| Geocodificação | Google Geocoding API | Melhor precisão para rua + número em cidade pequena |
| Mensageria | Telegram Bot API (antes WhatsApp Cloud API, ADR 0002) | ADR 0009 |
| Testes | Vitest + `convex-test` | Testa funções Convex sem deploy |
| CI | GitHub Actions | Typecheck, lint e testes em todo PR |

## Estrutura de pastas

```
app/
  page.tsx                    # mapa + lista + filtros
  ocorrencias/[id]/page.tsx   # detalhe (link enviado ao cidadão)
  orgaos/[slug]/page.tsx      # fila e contadores do órgão
  simular/page.tsx            # chat que simula o bot
components/                   # mapa, lista, filtros, chat
convex/
  schema.ts
  http.ts                     # webhook do Telegram
  occurrences.ts              # queries públicas do painel
  agencies.ts
  forecast.ts                 # estimativa, compromisso e aviso da previsão (ADR 0012)
  simulator.ts                # mutations/queries do simulador
  crons.ts                    # expiração de conversas
  seed.ts                     # dados sintéticos de Apucarana
  bot/
    stateMachine.ts           # nextStep: função pura (ADR 0004)
    handleIncoming.ts         # action que orquestra o processamento
    extract.ts                # chamadas ao Claude
    dedup.ts
    transcribe.ts             # ElevenLabs
    geocode.ts                # Google
    processed.ts              # idempotência por messageId
    channels/
      telegram.ts
      simulator.ts
      whatsapp.ts             # sem rota desde o ADR 0009
  telegram/webhook.ts         # segredo e parse dos updates (puro)
  whatsapp/                   # sem rota desde o ADR 0009
  lib/
    categories.ts             # fonte única de categorias → órgão (de COMPETENCIAS.md)
    priority.ts               # prioridade de 0 a 100 por fatores objetivos (ADR 0011)
    forecast.ts               # previsão pela fila e pela capacidade do órgão (ADR 0012)
    geo.ts                    # haversine, point-in-polygon
    apucarana.geo.json        # limite do município (IBGE 4101408)
evals/
  fixtures.jsonl              # mensagens de exemplo + resultado esperado
  run.ts
```

As rotas públicas (`/ocorrencias`, `/orgaos`, `/simular`, `/confiabilidade`) ficam em pt-BR porque o cidadão as vê no link. Fora isso, nomes de arquivo e de código são em inglês.

## Modelo de dados

Tabelas do Convex (`convex/schema.ts`):

| Tabela | Campos principais | Índices |
|---|---|---|
| `agencies` | `slug`, `name`, `phone`, `email`, `url` (só contato institucional) | `by_slug` |
| `occurrences` | `category`, `agencyId?` ("Outros" não tem órgão), `status` (`open` / `verifying` / `resolved`), `lat`, `lng`, `address`, `summary` (texto público reescrito pela IA), `appeal`, `openedAt`, `verificationStartedAt?`, `resolvedAt?`, `forecast?` (janela de previsão assumida pelo órgão: `precision`, `start`, `end`, `committedAt`), `source` (`telegram` / `simulator` / `seed`; `whatsapp` é legado) | `by_category_status`, `by_status_appeal`, `by_agency_status` |
| `reports` | `occurrenceId`, `citizenId`, `description` (interna, nunca vai ao navegador), `occurredAt`, `createdAt` | `by_occurrence_citizen`, `by_citizen_createdAt` |
| `citizens` | `channel`, `externalIdHash` (HMAC do chat do Telegram ou da sessão do simulador), `telegramChatId?` (a V2 precisa dele), `sessionId?` (simulador), `phone?` (legado do WhatsApp) | `by_channel_hash` |
| `conversations` | `citizenId`, `state` (união discriminada, ver abaixo), `updatedAt` | `by_citizen`, `by_updatedAt` |
| `processedMessages` | `channel`, `messageId` | `by_channel_message` |
| `anonymousCounters` | `kind` (`emergency` / `out_of_scope`), `target` (ex.: `samu`, `sanepar`), `createdAt` | `by_kind` |
| `geocodeAttempts` | `citizenId`, `medium` (`text` / `audio`), `source` (`cnefe_exact` / `cnefe_typo` / `google` / `none`), `typoDistance`, `ambiguous`, `precise?`, `ms`, `lat?`, `lng?`, `outcome?` (`confirmed` / `corrected_pin` / `corrected_text` / `abandoned`), `errorMeters?`, `query?` (texto do endereço, só quando `none` ou ambíguo), `createdAt` | `by_citizen_outcome` |

- **`appeal` é desnormalizado**: a mesma mutation que insere o primeiro relato de um cidadão numa ocorrência incrementa o campo. Assim o mapa ordena por apelo sem contar relatos a cada leitura.
- **Um cidadão conta uma vez por ocorrência**: se ele relatar de novo a mesma ocorrência, o bot responde "você já relatou" e nada muda.
- **`anonymousCounters` não tem identificador, texto nem local** (ADR 0001).
- **`geocodeAttempts` mede o match de endereços** (#37): uma linha por endereço em texto ou áudio, gravada no `applyStep`. O desfecho é preenchido no SIM, quando chega pin ou outro endereço, ou quando a conversa acaba. A página `/confiabilidade` mostra só contagens; o texto que falhou sai só por `npx convex run addressMetrics:failedQueries`.

## Recebimento de mensagens

`convex/http.ts` expõe `POST /telegram`:

1. Compara o cabeçalho `X-Telegram-Bot-Api-Secret-Token` com `TELEGRAM_WEBHOOK_SECRET`, em tempo constante. Se não bater, responde 401.
2. `parseUpdate` (`convex/telegram/webhook.ts`) lê só conversas privadas: texto, `/start` (vira saudação), localização, nota de voz e toque em botão (`callback_query`). Grupos e outros tipos de update são ignorados.
3. Insere `(channel, update_id)` em `processedMessages`. Se já existir, ignora: o Telegram reenvia o update quando não recebe 200 a tempo.
4. Agenda `bot.handleIncoming` com `ctx.scheduler.runAfter(0, ...)` e responde 200 na hora, sem esperar a IA.

As rotas `/whatsapp` saíram junto com a conta da Meta ([ADR 0009](./adr/0009-telegram-no-lugar-do-whatsapp.md)); o código delas continua em `convex/whatsapp/`.

## Processamento de uma mensagem

`handleIncoming` é uma action (pode chamar APIs externas). Ela orquestra e delega toda gravação a mutations.

```mermaid
sequenceDiagram
  participant H as handleIncoming (action)
  participant X as APIs externas
  participant DB as mutations/queries
  H->>X: áudio? baixa mídia (Graph API) e transcreve (ElevenLabs)
  H->>DB: carrega citizen + conversation
  H->>X: Claude extrai (kind, categoria, descrição, endereço, data/hora)
  H->>X: endereço sem pin? geocodifica (Google)
  H->>H: confere se o ponto está dentro de Apucarana
  H->>DB: applyStep: roda nextStep e grava o novo estado (atômico)
  alt cidadão confirmou (SIM)
    H->>DB: busca ocorrências candidatas
    H->>X: Claude decide se é a mesma ocorrência
    H->>DB: registerReport: revalida, cria/une ocorrência, soma apelo
  end
  H->>X: envia resposta pelo canal de origem
```

- **Normalização**: texto, áudio transcrito e pin viram uma mesma entrada `{ text?, lat?, lng?, receivedAt }`.
- **Concorrência**: `applyStep` recebe a versão do estado que a action leu e recusa a gravação se ela mudou no meio. Mutations do Convex são serializáveis; isso cobre duas mensagens do mesmo cidadão chegando juntas.
- **Falha externa** (IA, transcrição ou geocodificação fora do ar): o bot pede para o cidadão tentar de novo e não grava nada.

## Máquina de estados da conversa

`nextStep(state, extraction): Step` em `convex/bot/stateMachine.ts` é uma função pura (ADR 0004). A IA preenche `extraction`; a função decide o que fazer.

```mermaid
stateDiagram-v2
  [*] --> collecting
  collecting --> collecting: falta local ou descrição → pergunta
  collecting --> confirming: tem local + descrição → mostra resumo
  confirming --> registered: SIM
  confirming --> collecting: NÃO → pergunta o que corrigir
  registered --> [*]
  collecting --> [*]: expira (cron)
  confirming --> [*]: expira (cron)
```

Regras aplicadas antes de qualquer transição, em qualquer estado:

| Ordem | Condição | Passo |
|---|---|---|
| 1 | `extraction.kind = emergency` | Redireciona para 190/192/193/199, grava contador anônimo, encerra a conversa |
| 2 | `extraction.kind = out_of_scope` | Informa o canal da Sanepar ou da Copel, grava contador anônimo, encerra |
| 3 | `extraction.kind = invalid` | Recusa: não é problema urbano |
| 4 | Cidadão já tem 5 relatos confirmados hoje (fuso de Brasília) | Recusa por limite diário |
| 5 | Local fora de Apucarana | Pede outro local |

Outros detalhes:

- **Data/hora do relato**: a hora da mensagem, salvo se o cidadão informar outra.
- **Expiração**: `crons.ts` apaga, a cada 10 min, conversas sem atividade há 30 min. Conversa expirada não vira relato.
- **Confirmação**: no Telegram, teclado inline SIM/NÃO (`callback_data`), e o bot responde `answerCallbackQuery` para o botão parar de carregar; no simulador, os mesmos botões renderizados no chat.

## Camada de IA

Duas funções em `convex/bot/extract.ts`, ambas com Claude Haiku 5.5 e saída estruturada (`output_config.format`) validada com Zod:

1. **`extract`**: recebe o rascunho atual da conversa e a nova mensagem. Devolve:
   - `kind`: `urban` / `emergency` / `out_of_scope` / `invalid`
   - `emergencyTarget` ou `outOfScopeTarget` quando for o caso
   - `category`: enum gerado de `categories.ts` (16 categorias + `other`)
   - `description`, `address`, `occurredAt` (só o que a mensagem trouxe)
   - `publicSummary`: texto curto, sem dados pessoais, para o painel
2. **`isSameOccurrence`**: recebe o relato novo e até 5 ocorrências candidatas. Devolve o `id` da ocorrência igual ou `null`.

Regras de prompt:

- Lista de categorias, exemplos de `COMPETENCIAS.md` e a regra das árvores ficam no system prompt, que é estável e vai primeiro (favorece o cache de prompt).
- O texto do cidadão vai como dado, nunca como instrução. O enum de saída limita o estrago de uma tentativa de prompt injection.
- O esforço de raciocínio (`effort`) começa em `low` e sobe só se o eval mostrar ganho.

## Localização

- **Pin**: usado direto. Uma geocodificação reversa (Google) gera o endereço exibido no painel.
- **Endereço em texto ou áudio**: primeiro o CNEFE do IBGE, depois o Google ([ADR 0005](./adr/0005-geocodificacao-pelo-cnefe-do-ibge.md), [ADR 0006](./adr/0006-cnefe-em-arquivo-no-servidor.md)).
  - **CNEFE**: as ruas e os números de Apucarana ficam em `convex/cnefe/4101408.ts`, gerado do CSV do IBGE em `data/cnefe/` (veja [dados-ibge.md](./dados-ibge.md)). Quando uma única rua contém todas as palavras do nome que o cidadão escreveu (sem match exato, com tolerância a erro de digitação pela distância de Damerau-Levenshtein, [ADR 0007](./adr/0007-damerau-levenshtein-no-nome-da-rua.md)), o ponto é o do número no IBGE ou fica entre os números vizinhos do mesmo lado da rua. É preciso quando o número existe, ou quando os vizinhos estão a até 200 m um do outro.
  - **Google Geocoding**, quando o CNEFE não acha a rua, com `components=locality:Apucarana|administrative_area:PR|country:BR`. `location_type` `ROOFTOP` ou `RANGE_INTERPOLATED` significa que o número foi encontrado: raio de de-duplicação de 50 m. `GEOMETRIC_CENTER` ou `APPROXIMATE` significa só a rua: raio de 150 m. Um `partial_match` só é aceito se tiver todas as palavras do nome, e nunca como preciso.
- **Limite do município**: o ponto precisa cair dentro do polígono de Apucarana (malha do IBGE, código 4101408, em `apucarana.geo.json`). Teste de point-in-polygon em `geo.ts`.

## De-duplicação e apelo

Ao confirmar um relato:

1. Busca ocorrências com `status = open` e mesma categoria (índice `by_category_status`).
2. Filtra em memória pela distância de haversine dentro do raio (50 m ou 150 m). O volume de uma cidade pequena não justifica índice geoespacial.
3. Se sobrar alguma, `isSameOccurrence` decide.
4. `registerReport` (mutation):
   - Confere que a ocorrência escolhida continua `open`.
   - Se o cidadão ainda não tem relato nela, cria o relato e soma 1 no `appeal`.
   - Sem candidata, cria uma ocorrência nova com `appeal = 1`.
5. Resposta ao cidadão:
   - Nova: "registrado" + link + órgão responsável.
   - Existente: "já relatado, seu apelo foi somado — agora são N pessoas" + link.

## Canais: Telegram e simulador

O núcleo do bot não sabe de onde veio a mensagem. Cada canal implementa:

```ts
interface Channel {
  send(citizen: Citizen, message: OutgoingMessage): Promise<void>; // texto ou botões
}
```

- **Telegram** (`channels/telegram.ts`): `sendMessage` na Bot API com `TELEGRAM_BOT_TOKEN`, em HTML (o `*negrito*` do texto vira `<b>`). Áudio: `getFile` devolve o caminho e o binário vem de `api.telegram.org/file/bot<token>/...`.
- **WhatsApp** (`channels/whatsapp.ts`): sem rota desde o ADR 0009. Fica no código para leitura.
- **Simulador** (`channels/simulator.ts`): grava a resposta numa tabela que a página `/simular` assina com `useQuery`.
  - O cidadão do simulador é um id de sessão aleatório guardado no navegador.
  - Vale o mesmo limite de 5 relatos por dia.
  - Ocorrências criadas pelo simulador aparecem no mapa com `source = simulator`.
  - Áudio pelo navegador fica fora da V1 do simulador; pin vira um clique no mapa.

O simulador nasceu porque o número de teste da Meta só falava com 5 números cadastrados. Hoje ele serve para quem não tem Telegram testar o bot sem instalar nada.

## Painel

Aberto, sem login, somente leitura.

- **`/`**: mapa em tela cheia e lista lateral ordenada por apelo.
  - Pinos coloridos por categoria, tamanho pelo apelo, clusters nativos do MapLibre.
  - Filtros por categoria e órgão guardados na URL (`?categoria=...&orgao=...`), para o link ser compartilhável.
- **`/ocorrencias/[id]`**: resumo público, categoria, endereço, apelo, datas, prioridade com os pontos de cada fator e contato institucional do órgão.
- **`/orgaos/[slug]`**: fila de ocorrências abertas do órgão, ordenada por prioridade (ou por apelo, ou pelas mais antigas), e contadores (abertas, apelo total, acima do prazo de referência).
- **Previsão**: a fila do órgão mostra a estimativa de cada ocorrência, calculada por `planQueue` (`convex/lib/forecast.ts`) a partir da posição na fila e de uma capacidade semanal ilustrativa. Na página da ocorrência, o botão **Assumir previsão** (demonstração, como o da verificação) grava a janela em `occurrences.forecast`, e só então ela fica pública e o bot avisa quem relatou ([ADR 0012](./adr/0012-previsao-por-fila-e-capacidade.md)).
- **Prioridade**: calculada no navegador por `computePriority` (`convex/lib/priority.ts`), porque muda com o passar dos dias. Fórmula e fontes em [priorizacao.md](./priorizacao.md) e no [ADR 0011](./adr/0011-prioridade-por-criterios-objetivos.md).
- **Tempo real**: `useQuery` do Convex; ocorrência criada no Telegram aparece no mapa sem recarregar.
- **Contato de órgão**: só nome, telefone, e-mail e link oficial. Nenhum nome de pessoa.

## Privacidade

| Dado | Onde fica | Chega ao navegador? |
|---|---|---|
| Id do chat do Telegram | `citizens.telegramChatId` | Nunca |
| Texto cru e áudio | Áudio não é guardado; texto só na memória da action | Nunca |
| Descrição do relato | `reports.description` | Nunca |
| Resumo público | `occurrences.summary` (reescrito pela IA, sem dados pessoais) | Sim |
| Emergência e fora de escopo | Só tipo + data/hora em `anonymousCounters` | Só agregado |
| Endereço que o match não achou | `geocodeAttempts.query` | Nunca; a página `/confiabilidade` só tem contagens |

Como isso é garantido:

- Toda query pública declara `returns:` com validator explícito, então um campo novo numa tabela não vaza por acidente.
- Funções que tocam dado pessoal são `internal*`, sem acesso a partir do cliente.
- `externalIdHash` usa HMAC com `CITIZEN_HASH_SECRET`, não hash puro: ids de chat têm pouca entropia e um hash simples seria revertido por força bruta.
- O seed e a demo usam só dados sintéticos (regra 9 do regulamento).

## Variáveis de ambiente

**Convex** (`npx convex env set`):

| Variável | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | Claude |
| `ELEVENLABS_API_KEY` | Transcrição |
| `GOOGLE_MAPS_API_KEY` | Geocodificação |
| `TELEGRAM_BOT_TOKEN` | Envio, botões e download de áudio. Um por ambiente |
| `TELEGRAM_WEBHOOK_SECRET` | Segredo do `setWebhook`, conferido em cada update. Um por ambiente |
| `CITIZEN_HASH_SECRET` | HMAC do chat / sessão |
| `PUBLIC_APP_URL` | Monta os links enviados ao cidadão |
| `MODAL_BLUR_URL` | Endpoint `BlurWorker.process` do worker de fotos (ADR 0010). Um por ambiente |
| `MODAL_BLUR_SECRET` | Bearer enviado ao worker; o mesmo valor no `modal.Secret` `fiscaliza-blur`. Um por ambiente |

**Vercel**: `NEXT_PUBLIC_CONVEX_URL` e `CONVEX_DEPLOY_KEY`. O site escolhe o bot (`@stgFiscalizaiBot` ou `@FiscalizaiBot`) pela `NEXT_PUBLIC_CONVEX_URL` (`lib/contact.ts`).

## Testes e qualidade

- **Unitários (Vitest)**: `nextStep` (uma linha da tabela de transições = um caso), `haversine`, point-in-polygon, mapeamento categoria → órgão.
- **Integração (`convex-test`)**: `registerReport` (apelo conta pessoas, não mensagens), limite diário, idempotência por `messageId`, expiração. A IA é substituída por respostas fixas.
- **Eval (`evals/`)**: ~30 mensagens reais de estilo (emergência, árvore sobre fiação, vazamento da Sanepar, spam, buraco com e sem número) rodando contra o Claude de verdade. Mede acerto de `kind` e `category`. Roda sob demanda, não no CI, porque custa dinheiro.
- **CI (GitHub Actions)**: confere se `convex/_generated` está atualizado (`npm run codegen`, que roda sem deployment), `tsc --noEmit`, lint e Vitest em todo PR.

## Deploy

- **Vercel**: build com `npx convex deploy --cmd 'next build'`, que publica as funções Convex e o frontend juntos.
- **Webhook**: cada bot registra `https://<deployment>.convex.site/telegram` com `setWebhook` e o `TELEGRAM_WEBHOOK_SECRET` do ambiente (comando no README).
- **Seed**: `npx convex run seed:run` uma vez no deployment de produção.
- A demo precisa ficar no ar durante toda a avaliação (até o anúncio dos finalistas, 2 dez).

## V2: verificação

Código em `convex/verification.ts`; regras puras em `convex/lib/verification.ts`.

1. **Início:** o botão "Iniciar verificação" na página da ocorrência chama `verification.start` (aberto a qualquer visitante, só para a demo). Ele só aparece se a ocorrência estiver aberta, tiver ao menos um relato de cidadão que dá para consultar (as do seed não têm) e não tiver voltado para Aberta nos últimos 7 dias (`reopenedAt`). A ocorrência passa para `verifying` e ganha um anel âmbar no mapa.
2. **Pergunta:** `verification.notify` manda a pergunta a cada cidadão com relato na ocorrência. No Telegram e no simulador vai a mesma mensagem (`messages.verificationQuestion`), com o resumo, o endereço, o link e dois botões. O Telegram não tem janela de 24 h nem modelo aprovado: o bot fala com quem já abriu a conversa a qualquer hora. Para isso, `citizens.telegramChatId` e `citizens.sessionId` guardam o destino. Uma falha de envio não interrompe as demais.
3. **Resposta:** os botões carregam `verify:<occurrenceId>:yes|no`. O webhook (`callback_query`) e o simulador transformam isso em `message.verification`, que vai direto para `verification.vote`, sem passar pela conversa. Só conta quem tem relato na ocorrência; um segundo toque troca o voto (`verificationVotes`).
4. **Decisão**, a cada voto: NÃO > SIM → volta para `open` e grava `reopenedAt`; SIM ≥ 30% do apelo → `resolved` e grava `resolvedAt`. Um `scheduler.runAfter` de 48 h devolve para `open` se nada decidir antes. Ao fim de cada rodada, os votos são apagados.
5. **Histórico:** a ocorrência resolvida sai do mapa e aparece em `/resolvidas`.

## Riscos

| Risco | Mitigação |
|---|---|
| Júri não tem Telegram | Simulador web |
| Haiku 5.5 erra emergência | Eval com casos de emergência; trocar de modelo se falhar |
| Geocodificação ruim em rua sem número | Pin como forma preferida; raio maior; o bot pede o pin quando o resultado é aproximado |
| Cota ou chave externa falha no dia da avaliação | Alertas de billing; mensagem de erro amigável sem gravar nada |
| Vazamento de dado pessoal no painel | `returns:` explícito em toda query pública + teste que confere os campos retornados |
