# CNEFE em arquivo no servidor, não em tabela do Convex

O geocoding pelo CNEFE ([ADR 0005](./0005-geocodificacao-pelo-cnefe-do-ibge.md)) precisa achar a rua pelo nome e ler os números dela a cada mensagem com endereço. Os dados podiam ficar numa tabela do Convex com índice de busca, ou num módulo TypeScript gerado do CSV e empacotado com as funções. Nas duas opções os dados ficam no servidor e o navegador nunca os recebe. No Fiscaliza.i, tempo de resposta conta: cada milissegundo entra na espera do cidadão no WhatsApp.

Decidimos pelo **arquivo no servidor**: `scripts/cnefe.mjs build` gera `convex/cnefe/<código IBGE>.ts` a partir do CSV em `data/cnefe/`, e `geocode.ts` o importa direto. A busca não toca o banco.

## Benchmark

Rodamos as duas abordagens no deployment de dev do Convex em 13/11/2026, com o mesmo código de match (`convex/lib/streets.ts`) e 201 endereços tirados do próprio CNEFE: metade sem o tipo da rua, metade com número que não existe na base, mais "R ítalo fontanini 40".

| | Arquivo no servidor | Tabela + índice de busca |
|---|---|---|
| Tempo por busca, medido dentro da action, p50 / p95 / máx | **2,9 / 3,8 / 5,9 ms** | 26 / 66 / 86 ms |
| Acertos | 186/201 | 186/201 |
| Primeira chamada num isolate novo | ~+200 ms para carregar o módulo de 1,2 MB | sem custo extra |
| I/O de banco por busca | nenhum | ~20 ruas candidatas, ~15–30 KB |

Detalhes:
- Uma `runQuery` vazia, chamada de dentro de uma action, custa 1,5 ms. Quase todo o tempo da tabela vem do índice de busca do Convex.
- Uma variante só com os nomes (busca numa tabela leve e depois `db.get` da rua escolhida) não melhorou: 30 ms p50.
- Medido do cliente, de ponta a ponta, a rede (~170 ms até o Convex) esconde a diferença. Mas dentro do bot a busca roda na action, então o ganho de ~23 ms por mensagem é real.
- Referência: o Google Geocoding leva ~220 ms p50.

O formato da tabela testada era um documento por rua, com `ibgeCode`, `name` e arrays paralelos `numbers`, `lats` e `lngs`, e índice de busca em `name` filtrado por `ibgeCode`. A maior rua de Apucarana (Avenida Aviação) tem 435 números, bem abaixo do limite de 8.192 itens por array do Convex.

## Custos e limites de cada opção

**Tabela no Convex:**
- **Custo fixo de armazenamento:** ~1,1 MB de dados por cidade do tamanho de Apucarana e **~5 MB com os índices**, porque o Convex cobra cada índice como mais uma cópia da tabela. O **plano grátis tem 0,5 GB** no total, o que dá umas 100 cidades desse porte se a tabela fosse sozinha. Cidade grande pesa mais: o CSV de Ponta Grossa tem 27 MB, contra 11 MB de Apucarana.
- **I/O:** cada busca lê ~15–30 KB. O plano grátis tem 1 GB/mês, ou ~35–70 mil buscas.
- Cadastrar uma cidade é só carregar dados, sem deploy.

**Arquivo no servidor:**
- Sem I/O de banco e sem armazenamento no Convex.
- Cada cidade ocupa memória no isolate. O runtime do Convex dá **64 MiB de RAM** por action, e o módulo de Apucarana tem 1,2 MB de código. Algumas cidades cabem; dezenas não.
- Pacote das funções maior. O limite é de 230 MB por deployment, então isso não preocupa.
- Cadastrar ou atualizar uma cidade exige gerar o módulo, commit e deploy.

## Consequências

- O CSV original fica versionado em `data/cnefe/`, e o módulo gerado também, porque o deploy e o CI precisam dele. Depois de rodar `build`, roda-se `npm run codegen`, já que o módulo aparece em `convex/_generated/api.d.ts`.
- O primeiro geocoding em cada isolate novo paga ~200 ms para carregar o módulo. Ainda é mais rápido que uma chamada ao Google.
- A V1 atende uma cidade, e `geocode.ts` importa `convex/cnefe/4101408.ts` direto.

## Quando virar multi-cidade

Revisitar esta decisão quando:
- passar de umas 5 cidades do porte de Apucarana, ou de uma cidade grande, para não pressionar os 64 MiB de RAM, ou
- cadastrar cidade sem deploy virar requisito.

Caminhos, do menor para o maior:

1. **Um módulo por cidade, carregado sob demanda.** Escolher o módulo pelo código IBGE da conversa, para cada isolate carregar só a cidade que usa. Depende de o bundler do Convex aceitar `import()` dinâmico, o que não foi testado.
2. **Tabela `streets`**, no formato do benchmark acima, carregada por `convex import` a partir do mesmo CSV. Assume os ~25 ms por busca e os custos de armazenamento e I/O listados. O código de match em `convex/lib/streets.ts` não muda; só muda de onde vêm as ruas candidatas.
3. **Tabela + cache em memória.** A action lê as ruas da cidade uma vez por isolate e guarda numa variável do módulo. Fica rápido como o arquivo e sem deploy por cidade, mas paga uma leitura grande a cada isolate novo e pode servir dados antigos até o isolate ser reciclado.

Em qualquer caminho, junto com as ruas, também passam a depender da cidade o limite do município (`apucarana.geo.json`), o `components` do Google Geocoding e os órgãos do `COMPETENCIAS.md`.
