# Priorização e previsão de atendimento

Como o Fiscaliz.ai ordena a fila de um órgão e estima quando cada ocorrência pode ser atendida. Este documento reúne a pesquisa, os parâmetros adotados e as fontes. As decisões estão no [ADR 0011](./adr/0011-prioridade-por-criterios-objetivos.md) (prioridade) e no [ADR 0012](./adr/0012-previsao-por-fila-e-capacidade.md) (previsão).

> **Os números são um ponto de partida.** Pesos, notas por categoria e prazos de referência foram calibrados a partir das referências abaixo e ficam em `convex/lib/priority.ts`. Cada órgão deve revisá-los. A capacidade semanal usada na previsão é ilustrativa.

## Por que não ordenar só por apelo

1. **Quantidade de relatos não mede necessidade.** Estudos com dados do 311 de Nova York mostram que bairros com problemas parecidos relatam em taxas diferentes, e que o sub-relato acompanha renda, escolaridade e raça. Quem atende só pelo volume de reclamações acaba negligenciando, de forma sistemática, os bairros que reclamam menos.
2. **Um ranking de reclamações não ajuda quem precisa decidir.** Ele mostra onde há barulho, não o que é mais grave, o que piora mais rápido nem o que a equipe consegue atender. Para o órgão, vira só exposição.
3. **A lei já pede outra coisa.** O Código de Defesa do Usuário do Serviço Público (Lei 13.460/2017, art. 7º) manda a Carta de Serviços informar a previsão do prazo máximo de cada serviço, as prioridades de atendimento e a previsão de tempo de espera. Prioridade e previsão são compromissos do próprio poder público.

O apelo continua valendo, como um dos fatores.

## O que as referências fazem

| Prática | Onde | O que aproveitamos |
|---|---|---|
| **Abordagem por risco**: impacto × probabilidade, com a hierarquia da via dentro da matriz | Código de prática britânico *Well-managed Highway Infrastructure* (UKRLG, 2016), recomendações 7 e 12, e os manuais dos condados | Prazo de resposta depende da gravidade do defeito **e** da classe da via |
| **Matriz de resposta por hierarquia** | Lancashire County Council (2026): defeito de alto impacto em 2 dias nas vias estratégicas, 5 dias nas distribuidoras e de ligação, 20 dias nas de acesso local | Via mais movimentada tem prazo menor (fator por classe de via) |
| **Matriz GUT** (Gravidade, Urgência, Tendência), de Kepner e Tregoe | Muito usada na gestão pública brasileira (revisão da UFRN, 2025; Defesa Civil de Juiz de Fora; resíduos sólidos do Recife) | Os três eixos. A crítica recorrente é a subjetividade das notas, por isso as notas aqui são fixas por categoria e a urgência é calculada |
| **Prazo por tipo de serviço (SLA)** | NYC 311 publica o prazo de cada tipo de pedido; cartas de serviço de prefeituras brasileiras | Prazo de referência por categoria |
| **Correção do viés de relato** | Kontokosta e Hong (2021); Agostini, Pierson e Garg (2023) | Apelo com retorno decrescente; gravidade e via não dependem de quem relata |

Prazos reais encontrados, usados para calibrar a coluna "prazo de referência":

| Serviço | Prazo | Fonte |
|---|---|---|
| Tapa-buracos | até 45 dias (prazo máximo da carta) | Carta de Serviços de Porto Alegre |
| Tapa-buracos | meta de 5 dias; média realizada de 2,5 dias | NYC DOT, Mayor's Management Report 2024 |
| Iluminação pública | cerca de 48 horas | Prefeitura de Curitiba |
| Iluminação pública | média de 3,6 dias | NYC DOT |
| Placa de regulamentação prioritária | meta de 3 dias úteis | NYC DOT |
| Árvore morta ou condenada | média de 89 dias | Conselho Municipal de Nova York, dados de 2018 |

## A fórmula

Cada ocorrência recebe de 0 a 100 pontos, soma de cinco fatores. Cada fator vale de 0 a 1 e é multiplicado pelo seu peso:

| Fator | Peso | Como é medido | De onde vem |
|---|---|---|---|
| **Gravidade** | 30 | Nota fixa da categoria, de 1 a 5: dano a pessoas se nada for feito | G da matriz GUT; "impacto" da matriz de risco |
| **Tempo em aberto** | 25 | Idade da ocorrência ÷ prazo de referência, até o dobro do prazo | U da matriz GUT, calculada em vez de atribuída |
| **Circulação no local** | 20 | Classe da via: arterial 1,0; coletora 0,7; local e rural 0,4 | Hierarquia viária do código britânico; CTB, art. 60 |
| **Apelo** | 15 | log₂(1 + apelo) ÷ log₂(51), até 50 pessoas | Demanda cidadã, com retorno decrescente |
| **Tendência de piora** | 10 | Nota fixa da categoria, de 1 a 5 | T da matriz GUT |

Faixas: **Crítica** a partir de 70, **Alta** de 50, **Média** de 30, **Baixa** abaixo disso. Empate vai para a ocorrência mais antiga.

A GUT clássica multiplica as três notas. Aqui a conta é uma soma, para que a página da ocorrência mostre quantos pontos vieram de cada fator e o órgão consiga explicar a ordem da fila.

O que a fórmula garante, e os testes conferem:

- o mesmo problema na avenida principal fica acima do da rua local;
- uma ocorrência antiga fica acima de uma nova igual, e o ganho para no dobro do prazo;
- a 2ª pessoa pesa mais que a 21ª, e depois de 50 o apelo não soma mais;
- apelo sozinho não passa um problema mais grave: um cemitério com 200 relatos fica abaixo de um semáforo apagado numa avenida com 1.

### Parâmetros por categoria

| Categoria | Gravidade | Tendência | Prazo de referência (via local) |
|---|---|---|---|
| Semáforo | 5 | 2 | 2 dias |
| Área de risco | 5 | 5 | 3 dias |
| Buracos / pavimento | 4 | 4 | 10 dias |
| Drenagem | 4 | 4 | 10 dias |
| Sinalização de trânsito | 4 | 2 | 7 dias |
| Iluminação pública | 3 | 1 | 5 dias |
| Árvores (execução) | 3 | 2 | 7 dias |
| Árvores (avaliação) | 3 | 3 | 30 dias |
| Estradas rurais | 3 | 4 | 20 dias |
| Ambiental | 3 | 3 | 15 dias |
| Limpeza urbana | 2 | 3 | 15 dias |
| Transporte urbano | 2 | 2 | 15 dias |
| Praças, parques e calçadas públicas | 2 | 2 | 30 dias |
| Obras e construções | 2 | 2 | 30 dias |
| Cemitérios | 1 | 1 | 30 dias |
| Área rural | 1 | 1 | 30 dias |
| Outros | 2 | 2 | 30 dias |

O prazo é multiplicado pela classe da via: arterial × 0,5; coletora × 0,75; local × 1; rural × 1,5. Um buraco numa avenida tem prazo de 5 dias; numa rua local, 10; numa estrada rural, 15.

### Classe da via

O Código de Trânsito Brasileiro (art. 60) classifica as vias urbanas em trânsito rápido, arterial, coletora e local, e as rurais em rodovias e estradas. A classificação de cada rua é do município, no Plano Diretor, e Apucarana não a publica como dado.

Por isso a classe é **deduzida do tipo de logradouro no endereço**:

- avenida, rodovia, contorno, marginal → arterial;
- praça, largo, terminal, parque, lago, alameda → coletora ou espaço de uso coletivo;
- estrada, sítio, ou endereço em distrito → rural;
- o resto → local.

É uma aproximação. Uma avenida de bairro conta como arterial e uma rua comercial movimentada conta como local. O caminho para corrigir está em [Próximos passos](#próximos-passos).

## Previsão

A previsão responde a uma pergunta: **quando a equipe chega nesta ocorrência?**

Cada órgão tem uma capacidade semanal: quantas ocorrências ele atende por semana. A fila é percorrida em ordem de prioridade, e a data esperada de cada ocorrência é hoje + posição na fila ÷ capacidade semanal. A 10ª ocorrência de um órgão que atende 5 por semana é esperada para daqui a duas semanas.

### A janela afina com a confiança

Quanto mais longe a data esperada, mais coisas podem mudar na fila. A previsão é dada numa janela proporcional a essa incerteza:

| Data esperada em | Janela informada | Exemplo |
|---|---|---|
| até 2 dias | dia | "até 30/11" |
| até 14 dias | semana | "na semana de 07/12" |
| até 60 dias | mês | "em dezembro de 2026" |
| mais que isso | trimestre | "no 1º trimestre de 2027" |

### Quem vê o quê

- **O órgão sempre vê a estimativa**, em cada linha da fila.
- **O cidadão só vê a previsão depois que o órgão a assume.** A partir daí ela aparece na página pública da ocorrência e o bot avisa quem relatou.

Na demo, sem login, o botão de assumir fica aberto e marcado como demonstração, igual ao de iniciar a verificação.

### Valores da demo

A capacidade semanal de cada órgão é **ilustrativa** (`convex/lib/forecast.ts`), na linha da regra 9 do regulamento (dados sintéticos). A real sai do histórico de atendimento do próprio órgão.

## Próximos passos

- **Classe da via por dado**, não por nome: hierarquia do Plano Diretor quando publicada, ou contagem de estabelecimentos por rua no CNEFE (o arquivo já é usado na geocodificação) como medida de circulação.
- **Proximidade de equipamentos sensíveis** (escola, unidade de saúde) como fator, também pelo CNEFE.
- **Gravidade do caso, não só da categoria**: a IA já lê a descrição e pode estimar o tamanho do problema; a foto pode entrar depois.
- **Correção do sub-relato por bairro**, comparando relatos com população do Censo.
- **Capacidade editável pelo órgão**, com login, e medida pelo histórico de execução, por categoria.
- **Orçamento.** Com o orçamento de zeladoria e o custo típico por categoria, a fila pode mostrar o que cabe no ano e o que fica para o seguinte ("com X de orçamento resolvemos Y ocorrências; a Y+1 não entra neste ano"). Chegou a ser implementado com valores ilustrativos e foi retirado por ora; os números reais viriam da Lei Orçamentária Anual e das atas de registro de preços.
- **Janela em horas**, quando houver ordem de serviço com equipe a caminho.
- **Roteirização** das ocorrências financiadas (#55).

## Fontes

Risco e hierarquia viária:

- UK Roads Liaison Group, [*Well-managed Highway Infrastructure: A Code of Practice*](https://democracy.eastsussex.gov.uk/documents/s20914/LMTE%202018.07.16%20Well%20Managed%20Highway%20Infrastructure%20Code%20of%20Practice%20Appendix%201.doc.pdf) (2016): as 36 recomendações.
- Lancashire County Council, [*Annex A: Detailed definition of defect codes*](https://www.lancashire.gov.uk/media/968593/annex-a-detailed-definition-of-defect-codes-updated-2026_final-14.pdf) (2026): matriz de impacto × hierarquia.
- Oxfordshire County Council, [política de inspeção de vias](https://mycouncil.oxfordshire.gov.uk/documents/s4831/CMDT_FEB1011R04.doc.pdf): risco = impacto × probabilidade.
- [Código de Trânsito Brasileiro, art. 60](https://www.ctbdigital.com.br/comentario/comentario60).

Matriz GUT:

- [Aplicação da Matriz GUT como ferramenta estratégica na gestão pública municipal: revisão de literatura](https://periodicos.ufrn.br/revenspesextgestao/article/view/39737), Revista de Ensino, Pesquisa e Extensão em Gestão, UFRN, 2025.
- [Aplicação da Matriz GUT na gestão integrada de resíduos sólidos da cidade do Recife](https://journals.unam.mx/index.php/aidis/article/download/57757/54159/178287), Revista AIDIS, 2017: registra a subjetividade das notas como limitação.

Viés de relato:

- Kontokosta e Hong, [*Bias in smart city governance: How socio-spatial disparities in 311 complaint behavior impact the fairness of data-driven decisions*](https://par.nsf.gov/servlets/purl/10314387), 2021.
- Kontokosta, Hong e Korsberg, [*Equity in 311 Reporting*](https://arxiv.org/pdf/1710.02452), 2017.
- Agostini, Pierson e Garg, [*A Bayesian Spatial Model to Correct Under-Reporting in Urban Crowdsourcing*](https://arxiv.org/html/2312.11754v1), 2023.
- Boxer e outros, [*Estimating Reporting Bias in 311 Complaint Data*](https://cs.nyu.edu/~neill/papers/AOAS2003.pdf), Annals of Applied Statistics, 2025.

Prazos e cartas de serviço:

- [Lei 13.460/2017](https://planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13460.htm), art. 7º.
- Prefeitura de Porto Alegre, [Carta de Serviços: tapa-buracos](https://prefeitura.poa.br/carta-de-servicos/publica-conservacao-de-vias-com-asfalto-tapa-buracos).
- Prefeitura de Curitiba, [manutenção da iluminação pública](https://www.curitiba.pr.gov.br/noticias/viu-uma-lampada-que-precisa-de-reparo-informe-ao-156/61334).
- NYC DOT, [Preliminary Mayor's Management Report 2024](https://www.nyc.gov/assets/operations/downloads/pdf/pmmr2024/dot.pdf) e [Mayor's Management Report 2024](https://www.nyc.gov/assets/operations/downloads/pdf/mmr2024/dot.pdf).
- NYC OpenData, [311 Service Level Agreements](https://catalog.data.gov/dataset/311-service-level-agreements).
- New York City Council, [311 Service Requests](https://council.nyc.gov/data/311-agency/).
