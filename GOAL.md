Estamos participando do hackbrasil.com, o maior hackaton do Brasil. As regras estão dentro de [RULES.md](./rules.md). Queremos enquadrar nossa submissão na trilha 07: logísitca e automação.

## V1
A ideia do nosso projeto é:

Criar um painel de ocorrências da cidade. Cidadães irão reportar (via whatsapp) problemas que estão ocorrendo na cidade.
- Pavimentação ruim
- Semáforo com problema
- Árvore caída
- Recolhimento de lixo
- etc

Qualquer tipo de emergência e/ou urgência relacionado a saúde e segurança, devem ser realocados aos canais de emergências.

Esse painel será com base no mapa.

Conforme as pessoas vão reportando via WhatsApp, a camada de inteligência vai adicionando as ocorrências no mapa.

Vamos construir um Chatbot de WhatsApp que vai ouvir áudio e ler textos. Com base na conversa, vai extrair dados da ocorrência. Exemplo:

- endereço: nome e número da rua (nome facilita, número é um plus, pq dá pra criar a ocorrência exatamente onde aconteceu o problema)
- descrição do problema
- data/hora da ocorrência

Essas informações precisam ir pro mapa. 

O mapa não vai mostrar informações pessoais de quem está reportando. O mapa será de uso do Governo (prefeitura vigente).

Nossa camada de inteligência precisa de-duplicar: multiplos cidadães reportando um mesmo "problema" deveria cair na mesma ocorrência, entretanto, essa ocorrência (se existente) ganha "apelo" - como se fosse um upvote do Reddit, aqui no caso, "apelo" segnifica quantas pessoas estão apelando pra que esse problema seja resolvido.

Vamos nos basear na cidade de Apucarana, PR.

Queremos associar as "categorias" da ocorrência com o respectivo responsável.
Veja: [COMPENTENCIAS](./COMPETENCIAS.md)

Todas essas informações estão no site da prefeitura. Dados públicos: https://www.apucarana.pr.gov.br/site/orgaos-da-administracao/. Com nome dos responsáveis de cada orgão, telefone e e-mails de contato. 

Essas informações serão utilizadas apenas para informação. O intuito aqui não é atacar esses orgãos e sim, dar visibilidade para que eles possam ser mais eficientes e resolver os problemas de maneira mais rápida.

## V2
Gostaríamos de criar, se tivermos tempo hábil, um mecanismo que "resolva" a ocorrência. Essa mecanismo deve disparar mensagens para os cidadãos reportaram aquele problema / apelaram.
Nesse meio tempo, a ocorrência no mapa fica em "verificando", muda o status o visual. Quando pelo menos 30% confirmar, a ocorrência some do mapa, mas fica guardada na aplicação.

Em tese teríamos:

- quando a ocorrência foi aberta
- o problema
- quando ela foi marcada como corrigida
- quando ela foi validade como corrigida

O chatbot enviaria uma mensagem no WhatsApp com os detalhes da ocorrência, um link pra vê-la no mapa e a mensagem no formato: "essa ocorrência foi resolvida?" - responda SIM ou NÃO.

Com base na resposta, o chatbot atualizaria o mapa com as informações.


## Tabela de competências
