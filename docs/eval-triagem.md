# Eval da triagem

Execuções do eval da triagem (`npm run eval`, script em [`evals/run.ts`](../evals/run.ts), fixtures em [`evals/fixtures.jsonl`](../evals/fixtures.jsonl)) contra a API real do Claude. Issue #27.

Em todas as rodadas:

- **Data:** 2026-11-14
- **Modelo:** `claude-haiku-5-5` (`MODEL` em [`convex/bot/extract.ts`](../convex/bot/extract.ts)), `effort: "low"`, saída estruturada
- **Prompt:** o mesmo nas duas medições; nenhuma mudança em `extract.ts`.

| Medição | Fixtures | Tipo certo | Categoria certa | Emergência perdida |
|---|---|---|---|---|
| 1. Base | 32 | 32/32 | 15/15 | 0 |
| 2. 17 categorias | 54 | 53/54 | 34/36 | 0 |

## 1. Base: 32 fixtures

- **Fixtures:** 32 (8 emergência, 15 urbano, 5 fora de escopo, 4 inválido), cobrindo 10 das 17 categorias.
- **Rodadas:** 2, com o mesmo código e as mesmas fixtures. A primeira saída foi capturada por um filtro de terminal que tirou as linhas em branco; a segunda foi rodada sem filtro para guardar a saída bruta. As duas deram o mesmo resultado.

### Acerto por tipo

| Tipo | Acertos | % |
|---|---|---|
| emergency | 8/8 | 100% |
| urban | 15/15 | 100% |
| out_of_scope | 5/5 | 100% |
| invalid | 4/4 | 100% |

### Acerto por categoria (só fixtures `urban`)

| Categoria | Acertos | % |
|---|---|---|
| tree_removal | 2/2 | 100% |
| tree_assessment | 2/2 | 100% |
| street_lighting | 2/2 | 100% |
| traffic_light | 2/2 | 100% |
| pavement | 2/2 | 100% |
| drainage | 1/1 | 100% |
| urban_cleaning | 1/1 | 100% |
| traffic_signs | 1/1 | 100% |
| public_spaces | 1/1 | 100% |
| construction | 1/1 | 100% |

O órgão de emergência (`emergencyTarget`) e a concessionária (`outOfScopeTarget`) também bateram em todas as fixtures que os definem: o script lista qualquer divergência nesses campos como erro, e a lista veio vazia.

### Falhas

Nenhuma. **Emergência classificada como urbano: 0.**

### Saída bruta (segunda rodada)

```

> fiscaliz-ai@0.1.0 eval
> tsx evals/run.ts

Model: claude-haiku-5-5 · 32 fixtures

Acerto por tipo
  emergency          8/8  100%
  urban              15/15  100%
  out_of_scope       5/5  100%
  invalid            4/4  100%

Acerto por categoria
  tree_removal       2/2  100%
  tree_assessment    2/2  100%
  street_lighting    2/2  100%
  traffic_light      2/2  100%
  pavement           2/2  100%
  drainage           1/1  100%
  urban_cleaning     1/1  100%
  traffic_signs      1/1  100%
  public_spaces      1/1  100%
  construction       1/1  100%

Sem erros.
```

## 2. As 17 categorias: 54 fixtures

Foram acrescentadas 22 fixtures: 2 para cada uma das 7 categorias que não tinham nenhuma (3 para `risk_area` e `environmental`), mais uma para cada categoria que só tinha uma, e uma emergência de deslizamento. Total: 9 emergência, 36 urbano, 5 fora de escopo, 4 inválido. Toda categoria tem pelo menos 2 fixtures.

As novas foram escritas como mensagem de WhatsApp (minúscula, sem pontuação, "ta", "qd", concordância solta), com o rótulo tirado do [COMPETENCIAS.md](../COMPETENCIAS.md), não do prompt. Elas miram as fronteiras onde um erro se esconderia:

| Fronteira | Fixtures |
|---|---|
| Estrada rural × pavimento urbano | buraco na estrada de terra do Pirapó (`rural_roads`) contra os buracos no asfalto já existentes (`pavement`) |
| Área de risco × emergência | encosta rachando, erosão, alagamento recorrente (`risk_area`) contra "o morro ta descendo agora" (`emergency`, `civil_defense`) |
| Ambiental × limpeza urbana | queima de lixo no quintal, descarte no fundo de vale perto do córrego (`environmental`) contra entulho de obra no meio da rua (`urban_cleaning`) |
| Ambiental × polícia | som alto do bar de madrugada: o COMPETENCIAS põe barulho em Ambiental (`environmental`) |
| Transporte × praças | banco quebrado no terminal urbano (`public_transport`) contra banco quebrado na praça (`public_spaces`) |
| Cemitério × limpeza urbana | cemitério com mato alto (`cemeteries`) |
| Área rural × estrada rural | doença no gado, praga no café (`rural_area`) |
| Outros | carro abandonado, carro estacionado sobre a calçada (`other`) |

Casos deixados de fora por serem ambíguos no COMPETENCIAS:

- **Coleta de lixo.** O COMPETENCIAS diz que é da Costa Oeste, empresa terceirizada, e a lista em "Fora do escopo", mas o sistema não tem `out_of_scope` para ela (só Sanepar e Copel). Não há rótulo certo para escrever.
- **`other` contra fora de escopo.** Os candidatos (internet de operadora caída, fio de telefone pendurado, buraco deixado pela Sanepar no asfalto) não têm dono claro no COMPETENCIAS: nem a prefeitura, nem Sanepar ou Copel. Qualquer rótulo seria escolha nossa, não da fonte.

### Acerto por tipo

| Tipo | Acertos | % |
|---|---|---|
| emergency | 9/9 | 100% |
| urban | 35/36 | 97% |
| out_of_scope | 5/5 | 100% |
| invalid | 4/4 | 100% |

### Acerto por categoria (só fixtures `urban`)

| Categoria | Fixtures | Acertos | % |
|---|---|---|---|
| tree_removal | 2 | 2 | 100% |
| tree_assessment | 2 | 2 | 100% |
| street_lighting | 2 | 2 | 100% |
| traffic_light | 2 | 2 | 100% |
| pavement | 2 | 2 | 100% |
| drainage | 2 | 2 | 100% |
| urban_cleaning | 2 | 2 | 100% |
| traffic_signs | 2 | 2 | 100% |
| public_spaces | 2 | 2 | 100% |
| construction | 2 | 2 | 100% |
| rural_roads | 2 | 2 | 100% |
| public_transport | 2 | 2 | 100% |
| risk_area | 3 | 2 | 67% |
| environmental | 3 | 3 | 100% |
| cemeteries | 2 | 2 | 100% |
| rural_area | 2 | 2 | 100% |
| other | 2 | 1 | 50% |

### Falhas e leitura

**Emergência não classificada como emergência: 0.** As 9 emergências vieram como emergência, com o órgão certo.

1. **"a encosta atras de casa ta com umas rachadura e cada chuva desce mais terra"**: esperado `urban`/`risk_area`, veio `emergency`.
   Leitura: **fixture ambígua, erro do lado seguro.** O COMPETENCIAS põe "encosta" em Área de risco, então o rótulo tem base. Mas "cada chuva desce mais terra" descreve uma encosta se mexendo, e não dá para afirmar pela fonte que isso não é risco agora. O erro manda o cidadão para a Defesa Civil em vez de abrir ocorrência, o que é o lado seguro. O prompt não foi mexido: ensinar o modelo a rebaixar encostas que se movem troca um erro seguro por um perigoso. A fixture fica como está, marcada aqui como ambígua.

2. **"todo dia estacionam em cima da calçada na frente da escola e as criança tem q andar na rua"**: esperado `other`, veio `public_spaces`.
   Leitura: **fixture ambígua, rótulo meu discutível.** Praças, parques e calçadas públicas trata de conservação (calçada danificada); carro sobre a calçada é fiscalização de trânsito (Segtran), que não tem categoria própria, daí `other`. Mas a mensagem fala de calçada, e o COMPETENCIAS não diz onde cai fiscalização de estacionamento. A resposta do modelo é defensável. Não é erro claro do modelo nem lacuna clara do prompt; a fixture fica, marcada como ambígua.

Nenhuma das duas falhas é erro claro do modelo. Com o mesmo prompt, as fronteiras estrada rural × asfalto, ambiental × limpeza, terminal × praça e área de risco × deslizamento agora acertaram.

### Saída bruta

Rodada uma vez, sem filtro (`rtk proxy npm run eval`), antes da correção do script descrita abaixo. A correção não muda nenhum número desta rodada: não houve falha de API nem emergência perdida.

```

> fiscaliz-ai@0.1.0 eval
> tsx evals/run.ts

Model: claude-haiku-5-5 · 54 fixtures

Acerto por tipo
  emergency          9/9  100%
  urban              35/36   97%
  out_of_scope       5/5  100%
  invalid            4/4  100%

Acerto por categoria
  tree_removal       2/2  100%
  tree_assessment    2/2  100%
  street_lighting    2/2  100%
  traffic_light      2/2  100%
  pavement           2/2  100%
  drainage           2/2  100%
  urban_cleaning     2/2  100%
  traffic_signs      2/2  100%
  public_spaces      2/2  100%
  construction       2/2  100%
  rural_roads        2/2  100%
  public_transport   2/2  100%
  risk_area          2/3   67%
  environmental      3/3  100%
  cemeteries         2/2  100%
  rural_area         2/2  100%
  other              1/2   50%

Erros:
  kind  "a encosta atras de casa ta com umas rachadura e cada chuva desce mais terra": esperado urban, veio emergency
  cat   "a encosta atras de casa ta com umas rachadura e cada chuva desce mais terra": esperado risk_area, veio null
  cat   "todo dia estacionam em cima da calçada na frente da escola e as criança tem q andar na rua": esperado other, veio public_spaces
```

## Conclusão sobre o modelo

**Manter o Haiku 5.5.** O critério do [ADR 0003](./adr/0003-arquitetura-v1.md) era trocar de modelo se ele errasse emergência. Nas duas medições ele não deixou passar nenhuma das emergências (8, depois 9), inclusive árvore sobre fiação, sobre casa e bloqueando a via, e o deslizamento acontecendo agora. O único erro de tipo foi o oposto: tratar como emergência uma encosta que o COMPETENCIAS chama de área de risco.

Limites desta medição:

- **Amostra pequena.** 54 fixtures, 2 ou 3 por categoria e 9 emergências. Um erro em 9 emergências já seria 89%; o resultado mostra que o modelo acerta os casos escritos, não que acerta sempre.
- **Mensagens escritas por nós.** As novas fixtures imitam o WhatsApp, mas não são mensagens reais. Faltam áudio transcrito, várias mensagens picadas, mistura de dois problemas e emergência descrita com calma ("tem um fio no chão desde ontem").
- **`other` é mal definido.** O COMPETENCIAS não descreve o que cai em Outros; os rótulos `other` são os menos firmes do conjunto.
- **Só a primeira mensagem.** O eval chama `extract` com rascunho vazio; não mede a conversa com várias mensagens nem a de-duplicação (`isSameOccurrence`).

## Correções no script do eval

Dois pontos do script que enganariam no primeiro erro foram corrigidos. A lógica de contagem saiu de `run.ts` para [`evals/score.ts`](../evals/score.ts), testada sem API em [`evals/score.test.ts`](../evals/score.test.ts) (que roda no `npm test`).

- **Emergência perdida.** Antes, só emergência classificada como urbano contava no alerta e no código de saída 2; emergência classificada como `out_of_scope` (ex.: árvore sobre fiação mandada para a Copel) ou `invalid` saía com 0. Agora qualquer fixture de emergência que volta com outro tipo dispara o alerta e o código 2, e a mensagem diz para qual tipo cada uma foi (ex.: `urban: 1, invalid: 1`).
- **Falha de API.** Antes, a fixture com falha na chamada (linha `ERRO`) contava como erro no acerto por tipo, mas ficava fora do acerto por categoria, que saía inflado. Agora conta como erro nos dois.

## Próximos passos sugeridos

- Trocar fixtures escritas por mensagens reais (anonimizadas) assim que o bot receber tráfego, principalmente emergências ambíguas.
- Decidir com a equipe onde caem fiscalização de estacionamento e coleta de lixo, e registrar no COMPETENCIAS.
- Rodar de novo a cada mudança no prompt de `extract.ts`, no `MODEL` ou no `effort`.
