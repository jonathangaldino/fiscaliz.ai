# Telegram no lugar do WhatsApp

Substitui o [ADR 0002](./0002-whatsapp-cloud-api-oficial.md).

Em novembro de 2026 a Meta baniu de forma definitiva a conta do WhatsApp Business do Fiscaliz.ai. Sem conta, não há número nem Cloud API, e a fase online do Hack Brasil termina em 30/11. O canal com o cidadão passa a ser o **Telegram**, pela Bot API oficial.

## Por que Telegram

- **API oficial, gratuita e sem revisão.** O bot nasce no @BotFather em minutos, sem verificação de empresa, sem número de telefone e sem aprovação de modelo. Isso continua respeitando a trilha 07 ("burla de limites de plataformas"), como o ADR 0002 exigia.
- **Cobre o que o bot já fazia:** texto, áudio (nota de voz em OGG/Opus, a mesma do WhatsApp), localização pelo clipe 📎 e botões SIM/NÃO (teclado inline com `callback_data`).
- **A V2 fica mais simples.** No WhatsApp, mensagem iniciada pelo bot fora da janela de 24 h exigia o modelo `occurrence_verification`, que a Meta recusou. No Telegram o bot pode falar com quem já iniciou a conversa a qualquer hora. A pergunta de verificação é uma mensagem comum, a mesma do simulador, e o flag `VERIFICATION_WHATSAPP_ENABLED` deixa de existir.
- **Um bot por ambiente.** O app da Meta tinha uma URL de webhook só (ADR 0008). Agora há dois bots, `@stgFiscalizaiBot` (dev) e `@FiscalizaiBot` (prod), cada um com token e webhook próprios.

## Como fica

- Webhook em `POST /telegram` (`convex/http.ts`). O Telegram manda o segredo do `setWebhook` no cabeçalho `X-Telegram-Bot-Api-Secret-Token`, comparado em tempo constante com `TELEGRAM_WEBHOOK_SECRET`. A idempotência usa o `update_id` em `processedMessages`.
- Só conversas privadas são lidas; grupos são ignorados. `/start` vira a saudação e abre a conversa.
- O cidadão é identificado pelo `chat.id`. Guardamos o HMAC dele, como antes, e o `telegramChatId` em `citizens` para a V2. Não recebemos o telefone.
- O núcleo do bot não mudou: só entrou um adaptador novo (`convex/bot/channels/telegram.ts` e `convex/telegram/webhook.ts`).

## O código do WhatsApp

O código continua no repositório para o júri ler (`convex/whatsapp/`, `convex/bot/channels/whatsapp.ts`, download de mídia da Graph API), mas **nenhuma rota o chama**: as rotas `/whatsapp` saíram do `convex/http.ts`. A última versão que funcionava com o WhatsApp está na release [`whatsapp-final`](https://github.com/jonathangaldino/fiscaliz.ai/releases/tag/whatsapp-final).

Os dados de dev e prod da época do WhatsApp foram apagados, e o banco foi recarregado com o seed. A demo usa só dados sintéticos (regra 9 do regulamento).

## Consequências

- O cidadão precisa ter o Telegram, que no Brasil é menos comum que o WhatsApp. O simulador (`/simular`) continua sendo o caminho para testar sem instalar nada.
- `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` têm valores diferentes em dev e prod. É a segunda exceção à regra de variáveis iguais do ADR 0008.
- O site escolhe qual bot mostrar pela `NEXT_PUBLIC_CONVEX_URL`: o deployment de dev mostra o bot de dev, e qualquer outro mostra o de prod. Não precisa de variável nova na Vercel.
