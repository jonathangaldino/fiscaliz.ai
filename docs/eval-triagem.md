# Eval da triagem: primeira rodada

Primeira execução do eval da triagem (`npm run eval`, script em [`evals/run.ts`](../evals/run.ts), fixtures em [`evals/fixtures.jsonl`](../evals/fixtures.jsonl)) contra a API real do Claude. Issue #27.

- **Data:** 2026-11-14
- **Modelo:** `claude-haiku-5-5` (`MODEL` em [`convex/bot/extract.ts`](../convex/bot/extract.ts)), `effort: "low"`, saída estruturada
- **Fixtures:** 32 (8 emergência, 15 urbano, 5 fora de escopo, 4 inválido)
- **Rodadas:** 2, com o mesmo código e as mesmas fixtures. A primeira saída foi capturada por um filtro de terminal que tirou as linhas em branco; a segunda foi rodada sem filtro para guardar a saída bruta. As duas deram o mesmo resultado.

## Resultado

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

Como não houve erro, nenhuma fixture precisou ser julgada (modelo errado ou rótulo errado), e nenhuma fixture, rótulo ou prompt foi alterado.

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

## Conclusão sobre o modelo

**Manter o Haiku 5.5.** O critério do [ADR 0003](./adr/0003-arquitetura-v1.md) era trocar de modelo se ele errasse emergência. Ele acertou as 8 emergências nas duas rodadas, inclusive os casos de fronteira com árvore (árvore sobre fiação, sobre casa, bloqueando a via, contra árvore caída no gramado) e o par fio/transformador da Copel contra lâmpada de poste do Idepplan.

O 100% diz menos do que parece. Limites desta medição:

- **Amostra pequena.** 32 fixtures, 1 a 2 por categoria. Um erro em 8 emergências já seria 88%; o resultado mostra que o modelo acerta os casos escritos, não que acerta sempre.
- **Mensagens limpas.** As fixtures são frases curtas e bem escritas. Faltam mensagens reais de WhatsApp: erro de digitação, áudio transcrito, várias mensagens picadas, mistura de dois problemas, emergência descrita com calma ("tem um fio no chão desde ontem").
- **Categorias sem fixture.** 7 das 17 categorias não têm nenhuma: `rural_roads`, `public_transport`, `risk_area`, `environmental`, `cemeteries`, `rural_area` e `other`. A fronteira entre `risk_area` (urbano) e `civil_defense` (emergência) é a que mais importa testar.
- **Só a primeira mensagem.** O eval chama `extract` com rascunho vazio; não mede a conversa com várias mensagens nem a de-duplicação (`isSameOccurrence`).

## Pontos do script do eval

Nada quebrou nas rodadas, então o script não foi alterado. Dois pontos que podem enganar quando aparecer o primeiro erro:

- Só emergência classificada como **urbano** conta no alerta e no código de saída 2. Emergência classificada como `out_of_scope` (ex.: árvore sobre fiação mandada para a Copel) ou `invalid` é tão grave quanto, mas aparece só na lista de erros e o script sai com 0.
- Quando a chamada à API falha (linha `ERRO`), a fixture conta como erro no acerto por tipo, mas não entra no acerto por categoria, que fica inflado.

## Próximos passos sugeridos

- Acrescentar fixtures para as 7 categorias sem cobertura e mensagens no estilo real de WhatsApp, principalmente emergências ambíguas.
- Rodar de novo a cada mudança no prompt de `extract.ts`, no `MODEL` ou no `effort`.
