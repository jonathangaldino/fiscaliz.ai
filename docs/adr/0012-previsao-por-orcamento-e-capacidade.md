# Previsão de atendimento por orçamento e capacidade

A prioridade ([ADR 0011](./0011-prioridade-por-criterios-objetivos.md)) diz o que vem primeiro, mas não diz quando. O órgão tem orçamento e equipe limitados: nem tudo que é relatado cabe no ano. E o cidadão quer saber quando o problema será resolvido, mas uma data errada é pior que nenhuma. O método e os valores estão em [docs/priorizacao.md](../priorizacao.md).

## Decisão

- **Plano do órgão com três números:** orçamento anual de zeladoria, valor já executado e capacidade mensal de execução. Cada categoria tem um custo típico por atendimento.
- **A fila é percorrida em ordem de prioridade.** O custo de cada ocorrência é somado; a data esperada é hoje mais o acumulado dividido pela capacidade mensal.
- **O que não cabe fica para o ano seguinte**, por dinheiro (passa do saldo do ano) ou por equipe (a data esperada cai depois de 31 de dezembro). A ocorrência que não cabe é pulada, e uma mais barata, adiante na fila, ainda pode caber.
- **A janela acompanha a confiança:** dia (até 2 dias à frente), semana (até 14), mês (até 60), trimestre (além disso) e ano (fora do orçamento). Não prometemos uma data quando só temos certeza do mês.
- **O órgão sempre vê a estimativa; o cidadão só vê o que o órgão assumiu.** Assumir grava a janela na ocorrência (`forecast`), mostra na página pública e avisa pelo bot quem relatou. Ocorrência fora do orçamento não pode ser assumida, e uma previsão assumida não é recalculada sozinha.
- **Valores ilustrativos na demo.** Orçamentos, capacidades e custos ficam em constantes (`convex/lib/forecast.ts`), marcados como ilustrativos, pela regra 9 do regulamento.

## Por que não uma data exata para tudo

A estimativa depende da posição na fila, e a fila muda: chega uma ocorrência mais grave, o apelo de outra sobe, uma chuva abre vinte buracos. Quanto mais longe a data, mais a fila muda até lá. Uma janela larga que se cumpre constrói mais confiança que uma data exata que falha, para o cidadão e para o órgão.

## Consequências

- **Sem login, "interno" é só a tela.** A estimativa aparece na fila do órgão, que hoje é pública como o resto do painel. A separação de verdade depende de autenticação por órgão. O botão de assumir a previsão também fica aberto, marcado como demonstração, como o de iniciar a verificação.
- **Custo é da categoria, não do caso.** Uma estrada rural inteira e um trecho pequeno custam o mesmo na conta. Com histórico de execução, o custo e a capacidade passam a ser medidos em vez de estimados.
- **O plano é fixo no código.** Para o órgão editar orçamento e capacidade, o plano vira uma tabela, o que também depende de login.
- **Uma ocorrência crítica pode ficar fora do orçamento** (uma área de risco custa mais que o saldo de fim de ano). A fila mostra isso em destaque: é o dado que justifica pedir crédito suplementar ou priorizar a categoria no orçamento seguinte.
- **A previsão assumida pode vencer.** A página mostra a janela assumida mesmo depois de passada, até a ocorrência ser resolvida.
