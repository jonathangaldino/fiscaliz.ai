# Erro de digitação no nome da rua: Damerau-Levenshtein, só depois do match exato

O CNEFE ([ADR 0005](./0005-geocodificacao-pelo-cnefe-do-ibge.md)) acha a rua quando cada palavra que o cidadão escreveu aparece igual no nome da rua. Um erro de digitação ("Osvaldo" por "Oswaldo", "fotnanini" por "fontanini") quebrava o match. O endereço ia para o Google, que também não acha nome errado, e o bot acabava pedindo o pin.

Decidimos tolerar erro de digitação com a **distância de Damerau-Levenshtein**, na variante *optimal string alignment* (OSA). Ela conta o número mínimo de letras inseridas, apagadas, trocadas ou **invertidas com a vizinha** que transformam uma palavra em outra. As regras, em `pickStreet` (`convex/lib/streets.ts`):

1. **Match exato primeiro.** Se alguma rua contém todas as palavras, vale a regra de antes: uma rua é o resultado, duas ou mais são ambiguidade. A distância nunca troca um acerto exato por um parecido ("maria" acha Rua Maria, e não Rua Mário).
2. **Distância só sem match exato.** Cada palavra pode diferir da palavra da rua em até:
   - **0 letras** com até 3 letras ("ana" ≠ "ane"), porque uma letra muda o nome;
   - **1 letra** de 4 a 7 letras;
   - **2 letras** com 8 ou mais.

   Números nunca têm tolerância ("13 de Maio" ≠ "14 de Maio").
3. **Rua única.** Se o erro serve para duas ruas, ninguém é escolhido e o caso vai para o Google, como antes.

Na mesma mudança, as palavras de cada rua passaram a ser separadas uma única vez, quando o módulo carrega (`indexStreets`). Antes, cada busca normalizava os 1.500 nomes de novo.

## Benchmark

Reproduza com `npm run bench:streets`. O código está em `scripts/bench/streetMatch.ts` e roda o `pickStreet` de produção trocando só a função de distância. Os dados são gerados de forma determinística (semente 42) a partir das 1.500 ruas reais do CNEFE de Apucarana.

### Como os endereços foram gerados

São 1.600 endereços no estilo do cidadão: `rua <nome> <número>` ou `<nome> <número>`, em minúsculas. São 200 por grupo:

| Grupo | O que muda no nome | Exemplo | Resultado esperado |
|---|---|---|---|
| `sem_erro` | nada | `wenceslau braz 100` | a rua |
| `troca` | uma letra trocada por outra qualquer | `erwin scbindler` | a rua |
| `falta` | uma letra apagada | `maua da srra` | a rua |
| `sobra` | uma letra a mais | `osvaldo otavio pereiara` | a rua |
| `invertidas` | duas letras vizinhas trocadas de lugar | `nsasau` | a rua |
| `fonetico` | v↔w, s↔z, i↔y, h inicial, letra dobrada | `xawantes` | a rua |
| `dois_erros` | letra apagada e letra trocada, palavra com 8 ou mais letras | `fivuera` | a rua |
| `nao_existe` | nome de uma rua com sobrenome de outra | `joaquim terra` | **nenhuma** rua |

O erro nunca cai na primeira letra, que raramente se erra num teclado de celular.

### Acertos

"Certo" é a rua esperada, "errado" é outra rua, "nada" é nenhuma rua (vai para o Google).

| Grupo | Exato (antes) | Levenshtein | **Damerau-Levenshtein** |
|---|---|---|---|
| `sem_erro` | 185 certo, 15 nada | 185 certo, 15 nada | 185 certo, 15 nada |
| `troca` | 200 nada | 176 certo, 24 nada | 176 certo, 24 nada |
| `falta` | 200 nada | 149 certo, 51 nada | 149 certo, 51 nada |
| `sobra` | 200 nada | 172 certo, 28 nada | 172 certo, 28 nada |
| `invertidas` | 200 nada | **47 certo, 2 errado**, 151 nada | **171 certo**, 29 nada |
| `fonetico` | 200 nada | 180 certo, 20 nada | 180 certo, 20 nada |
| `dois_erros` | 200 nada | 88 certo, 112 nada | 88 certo, 112 nada |
| `nao_existe` | 200 nada (certo) | 3 errado, 197 nada | 3 errado, 197 nada |
| **Ruas que existem (1.400)** | **185 (13%)** | 997 (71%), 2 errado | **1.121 (80%), 0 errado** |

Por grupo:
- Os 15 "nada" de `sem_erro` são nomes ambíguos, como "Curitiba", que é Rua e Avenida. É o comportamento desejado.
- Em `invertidas` está toda a diferença entre os dois algoritmos. O Levenshtein conta a inversão como 2 operações e passa da tolerância em palavras curtas. Nas duas vezes em que coube na tolerância, achou a rua errada: "maato" virou Avenida Mato Grosso em vez de Rua Matão, e "livtoti" virou Rua Leterio Livoti em vez de Rua Leterio Livotti. O Damerau-Levenshtein conta 1.
- Os "nada" dos grupos com erro são palavras que ficaram ambíguas ou passaram da tolerância. Esses casos caem no Google, como antes.

### Rua errada achada (o risco)

Nos dois algoritmos, 3 dos 200 nomes inexistentes (1,5%) caíram numa rua parecida:

| Cidadão escreveu | Rua achada | Por quê |
|---|---|---|
| `rua joaquim terra` | Rua Serra São Joaquim | terra ≈ serra (1 letra) |
| `rua serra maia` | Travessa Mauá da Serra | maia ≈ maua (1 letra) |
| `rua maria marques` | Rua Mário Mendes Marques | maria ≈ mario (1 letra) |

Aceitamos esse risco. O grupo `nao_existe` é o pior caso possível, montado com palavras que existem em outras ruas. Na vida real, o mais comum é a rua existir e o nome vir com erro. Mesmo assim, o bot mostra o endereço achado e o cidadão confirma antes de registrar.

Uma regra extra reduziria esse risco: no caminho da distância, exigir que o cidadão escreva todas as palavras do nome da rua. Ela elimina 2 dos 3 casos ("Serra **São** Joaquim", "Mário **Mendes** Marques"), mas o custo em acertos não foi medido. Fica para avaliar com endereços reais.

### Tempo

Medido no runtime do Convex (deployment de dev, 13/11/2026), com uma action temporária rodando o mesmo `scripts/bench/streetMatch.ts`. É o tempo total de uma busca: match do nome + distância + posição do número (`locate`).

| Variante | Todas (p50 / p95 / máx) | Só sem erro | Com erro ou rua inexistente |
|---|---|---|---|
| `pickStreet` sem índice (antes deste ADR)¹ | 4,1 / ~5 / 8,9 ms | 4,0 ms p50 | 4,1 ms p50 |
| Exato com índice | 0,3 / 0,4 / 1,3 ms | 0,1 / 0,2 / 0,6 ms | 0,3 / 0,4 / 1,3 ms |
| Levenshtein | 2,6 / 3,7 / 6,2 ms | 0,1 / 0,2 / 0,3 ms | 2,6 / 3,7 / 6,2 ms |
| **Damerau-Levenshtein** | 2,6 / 3,9 / 7,0 ms | **0,1 / 0,2 / 0,4 ms** | **2,6 / 3,9 / 7,0 ms** |

¹ Medido com a primeira versão do benchmark, que tinha os mesmos grupos e outra semente, antes de o código ganhar o índice.

No Node local (`npm run bench:streets`), o Damerau-Levenshtein fica em 0,9 ms p50 e 1,3 ms p95. O runtime do Convex é cerca de 3x mais lento nessa conta.

O que os números dizem:
- Endereço sem erro ficou **40x mais rápido** que antes (4 ms → 0,1 ms), por causa do índice. A distância nem roda.
- A distância só custa quando não há match exato: ~2,6 ms p50 e 7 ms no pior caso. Os ~220 ms do Google, que é para onde esses casos iam antes, são bem mais.
- Damerau-Levenshtein e Levenshtein custam praticamente o mesmo (+0,2 ms no p95).

## Alternativas descartadas

- **Levenshtein puro:** mesmo custo e mesmos acertos em todos os grupos, menos `invertidas`, onde acerta 124 a menos e acha 2 ruas erradas.
- **Damerau-Levenshtein completo (sem a restrição OSA):** só difere quando a mesma letra é editada mais de uma vez ("ca" → "abc"). Com tolerância de 1 ou 2 letras isso quase não acontece, e o código é bem maior.
- **Algoritmo fonético (Soundex, Metaphone):** pensados para nomes em inglês. Pegariam v/w e s/z, mas não letra faltando ou invertida, que são os erros de digitação.
- **Busca no Google com o nome errado:** o Google não acha nome incompleto (ADR 0005), muito menos nome errado.

## Consequências

- Mais endereços resolvidos no CNEFE sem o Google: 80% dos nomes com erro, contra 0%.
- O próprio CNEFE às vezes grava a mesma rua com duas grafias: "RUA VEREADOR OSVALDO ZATONI" e "RUA VEREADOR OSWALDO ZATTONI". Quem escreve "osvaldo zattoni" fica a 1 letra de cada uma, então o caso é ambíguo e vai para o Google, que acerta. Escrita igual a uma das duas, a rua é achada pelo match exato.
- ~1,5% de risco de rua parecida quando o nome não existe. O cidadão vê o endereço e confirma.
- Para mudar a tolerância (`typosAllowed`) ou a regra de match, rode `npm run bench:streets` antes e depois e atualize as tabelas deste ADR.
- Os erros do benchmark são sintéticos. Quando houver endereços reais de cidadãos, eles devem entrar no benchmark como mais um grupo.
