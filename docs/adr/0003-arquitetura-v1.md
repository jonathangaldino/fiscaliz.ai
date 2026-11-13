# Arquitetura da V1: Convex como backend único, bot com fluxo determinístico

Um único app Next.js (App Router, TypeScript) com a pasta `convex/` dentro, deploy na Vercel + Convex Cloud.

- **Webhook do WhatsApp em `convex/http.ts`**, não em rota do Next: valida `X-Hub-Signature-256`, grava o `wamid` (idempotência contra reenvio da Meta), responde 200 e agenda o processamento com `scheduler.runAfter(0, ...)`.
- **Núcleo do bot independente de canal**: adaptador WhatsApp e adaptador web (`/simular`), para o júri testar sem WhatsApp (o número de teste da Meta só fala com 5 números cadastrados).
- **O código controla o fluxo, a IA só preenche**: máquina de estados em `conversations` (`collecting` → `confirming` → `registered`); Claude **Haiku 5.5** com saída estruturada faz triagem (emergência / fora de escopo / urbano / inválido) e extração; o enum de categorias vem de um único `categories.ts` derivado de `COMPETENCIAS.md`.
- **Áudio**: transcrição com ElevenLabs Scribe; o áudio não é guardado.
- **Local**: pin direto; endereço em texto via Google Geocoding; ponto fora do polígono de Apucarana (malha IBGE 4101408) é recusado.
- **De-duplicação**: ocorrências abertas da mesma categoria filtradas por haversine (≤ 50 m, ou raio maior sem número da rua); se houver candidatas, o Claude decide se é o mesmo problema. Sem componente geoespacial: o volume de uma cidade pequena não justifica.
- **Painel**: `react-map-gl/maplibre` com tiles OpenFreeMap (sem chave), clusters nativos, `useQuery` reativo do Convex.
- **Privacidade**: telefone só na tabela `citizens` (a V2 precisa dele); relatos guardam um hash HMAC; toda query pública declara `returns:` explícito, então telefone e texto cru não saem para o navegador.

## Consequences

Três chaves externas (Anthropic, ElevenLabs, Google Maps) e o app secret da Meta viram variáveis de ambiente no Convex. A qualidade do Haiku 5.5 na triagem é medida por um eval de mensagens-fixture; se ele falhar em casos de emergência, troca de modelo.
