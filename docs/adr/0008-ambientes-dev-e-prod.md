# Dois ambientes: dev para testar, prod para a demo

A demo do Hack Brasil precisa funcionar na hora em que o júri abrir o painel ou mandar mensagem pro bot. Ao mesmo tempo, a gente continua mexendo no código, rodando benchmarks (como os do [ADR 0006](./0006-cnefe-em-arquivo-no-servidor.md) e do [ADR 0007](./0007-damerau-levenshtein-no-nome-da-rua.md)), o eval da triagem e testes de ponta a ponta pelo WhatsApp. Se tudo isso rodasse no mesmo deployment da demo, um experimento no meio do caminho podia derrubar a demo ou sujar os dados que ela mostra.

Decidimos separar **dois ambientes completos**, cada um com uma branch, um site e um backend:

| Branch | Vercel | Convex |
|---|---|---|
| `dev` | Preview, em `fiscalizai-dev.vercel.app` | dev, `laudable-greyhound-798` |
| `main` | Production, em `fiscalizai-five.vercel.app` | prod, `kindhearted-leopard-380` |

## Como funciona

- A Vercel está ligada ao repositório. Um push em `main` publica em produção; um push em `dev` publica o Preview da branch `dev`, que tem o domínio fixo `fiscalizai-dev.vercel.app`.
- O build da Vercel roda `npx convex deploy --cmd 'next build'` (`vercel.json`). O deployment do Convex que recebe as funções sai da `CONVEX_DEPLOY_KEY`, e o próprio `convex deploy` passa a URL dele para o `next build`. Por isso cada site sempre conversa com o seu Convex.
- Na Vercel, a `CONVEX_DEPLOY_KEY` tem três valores:
  - Production: chave de prod.
  - Preview, só da branch `dev`: chave de dev do `laudable-greyhound-798`.
  - Preview, demais branches: a chave que já existia.
- O CLI do Convex se recusa a usar uma chave de prod num build que não é de produção. Isso evita que um Preview publique em prod por engano.

## Variáveis de ambiente

As variáveis do Convex são **as mesmas nos dois ambientes**, com os mesmos valores. Assim, o que funcionou em dev funciona em prod. A única exceção é `PUBLIC_APP_URL`, que aponta para o site do próprio ambiente: os links que o bot manda em dev abrem o painel de dev, que mostra os dados de dev.

Ao adicionar ou trocar uma variável, ela vai para os dois deployments (`npx convex env set` e `npx convex env set --prod`).

## Fluxo de trabalho

- O trabalho vai para `dev` primeiro: benchmarks, eval, seed de teste e testes com o WhatsApp rodam lá.
- Só vai para `main` o que já foi testado em `dev`. Perto da apresentação, `main` fica congelada.
- Dados de dev podem ser apagados ou recarregados à vontade. Os de prod são os da demo, e a demo usa só dados sintéticos (regra 9 do regulamento).

## Consequências

- O `laudable-greyhound-798` também é o deployment pessoal de quem roda `npx convex dev` com essa conta. Um `npx convex dev` na máquina e um push em `dev` escrevem no mesmo lugar, e o último que publicar vence. Para um time pequeno até o fim do hackathon, isso basta. Se atrapalhar, a saída é dar à branch `dev` um deployment próprio.
- O app da Meta tem **uma URL de webhook só**. Hoje ela aponta para o dev, para os testes. Antes da demo, a URL precisa mudar para `https://kindhearted-leopard-380.convex.site/whatsapp`, senão as mensagens do júri caem no dev.
- Branches que não são `dev` ganham um Preview da Vercel com a chave Preview antiga. Não usamos esses Previews para testar o bot.
- O `.env` local não decide nada disso; ele só serve para rodar scripts na máquina.
