# Previsão de atendimento pela fila e pela capacidade

A prioridade ([ADR 0011](./0011-prioridade-por-criterios-objetivos.md)) diz o que vem primeiro, mas não diz quando. O cidadão quer saber quando o problema será resolvido, e uma data errada é pior que nenhuma. O método está em [docs/priorizacao.md](../priorizacao.md).

## Decisão

- **A estimativa vem da posição na fila e da capacidade semanal do órgão**: quantas ocorrências ele atende por semana. A data esperada é hoje mais a posição dividida pela capacidade.
- **A janela acompanha a confiança:** dia (até 2 dias à frente), semana (até 14), mês (até 60) e trimestre (além disso). Não prometemos uma data quando só temos certeza do mês.
- **O órgão sempre vê a estimativa; o cidadão só vê o que o órgão assumiu.** Assumir grava a janela na ocorrência (`forecast`), mostra na página pública e avisa pelo bot quem relatou. Uma previsão assumida não é recalculada sozinha.
- **Capacidade ilustrativa na demo.** O número por órgão fica em constantes (`convex/lib/forecast.ts`), marcado como ilustrativo, pela regra 9 do regulamento.
- **Orçamento fica de fora por enquanto.** A primeira versão somava o custo típico de cada categoria contra o saldo anual do órgão e deixava para o ano seguinte o que não coubesse. O time decidiu que isso não precisa entrar agora, e a parte foi retirada. A ideia está registrada nos próximos passos do documento de pesquisa.

## Por que não uma data exata para tudo

A estimativa depende da posição na fila, e a fila muda: chega uma ocorrência mais grave, o apelo de outra sobe, uma chuva abre vinte buracos. Quanto mais longe a data, mais a fila muda até lá. Uma janela larga que se cumpre constrói mais confiança que uma data exata que falha, para o cidadão e para o órgão.

## Consequências

- **Sem login, "interno" é só a tela.** A estimativa aparece na fila do órgão, que hoje é pública como o resto do painel. A separação de verdade depende de autenticação por órgão. O botão de assumir a previsão também fica aberto, marcado como demonstração, como o de iniciar a verificação.
- **Toda ocorrência conta igual na capacidade.** Uma estrada rural e uma lâmpada ocupam uma posição cada. Com histórico de execução, a capacidade passa a ser medida por categoria em vez de estimada.
- **A capacidade é fixa no código.** Para o órgão editá-la, vira uma tabela, o que também depende de login.
- **A previsão assumida pode vencer.** A página mostra a janela assumida mesmo depois de passada, até a ocorrência ser resolvida.
