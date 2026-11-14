# Dados do IBGE: CNEFE do Censo 2022

O geocoding de endereços em texto usa o **Cadastro Nacional de Endereços para Fins Estatísticos (CNEFE)** do Censo Demográfico 2022, publicado pelo IBGE. Este documento explica de onde vêm os dados, por que podemos usá-los e como atualizá-los. A decisão de usar o CNEFE está no [ADR 0005](./adr/0005-geocodificacao-pelo-cnefe-do-ibge.md), e a forma de guardá-lo no [ADR 0006](./adr/0006-cnefe-em-arquivo-no-servidor.md).

## O que é

É a lista de todos os endereços visitados no Censo 2022: domicílios, estabelecimentos, igrejas, escolas e outros. Cada linha traz o tipo, o título e o nome da rua, o número, o bairro ou localidade, o CEP e a **latitude e longitude** coletadas em campo. Apucarana tem 67.906 endereços em 1.743 ruas.

O cadastro não tem dado pessoal: não há morador, nome de pessoa ou CPF. O único texto livre é o nome de estabelecimentos, que já é público. Por isso o uso não conflita com a regra 9 do regulamento (dados pessoais reais).

## É aberto

O CNEFE 2022 é **dado aberto publicado pelo próprio IBGE**, para uso em pesquisas, políticas públicas e geocodificação. O download no FTP do IBGE é o caminho oficial de distribuição, não uma brecha:

- `ftp.ibge.gov.br` é o repositório público de downloads do IBGE. As páginas do site do IBGE apontam para ele para baixar malhas, censos e pesquisas. O limite do município em `convex/lib/apucarana.geo.json` vem da mesma fonte.
- O acesso é anônimo e só de leitura, por HTTPS, sem login, chave ou cadastro.
- O IBGE publica junto o dicionário das colunas (`Dicionario_CNEFE_Censo_2022.xls`), o que confirma que os arquivos foram feitos para uso externo.
- Como órgão federal, o IBGE segue a Lei de Acesso à Informação (Lei 12.527/2011) e a Política de Dados Abertos do Executivo federal (Decreto 8.777/2016).

**Como citar:** "Fonte: IBGE, Censo Demográfico 2022, Cadastro Nacional de Endereços para Fins Estatísticos (CNEFE)". A citação fica no cabeçalho do módulo gerado e neste documento.

> Pendente: não conseguimos abrir a página do CNEFE no site do IBGE, que bloqueou o acesso automatizado com HTTP 403. Vale abrir no navegador e colocar aqui o link da página e do termo de uso.

## De onde baixamos

```
https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/41_PR/4101408_APUCARANA.zip
```

O caminho segue o padrão `.../CSV/Municipio/<código da UF>_<sigla>/<código IBGE do município>_<NOME>.zip`. O código IBGE do município vem da API pública de localidades do IBGE (`https://servicodados.ibge.gov.br/api/v1/localidades/estados/<UF>/municipios`).

O zip de Apucarana tem 1,6 MB, com um CSV de 11 MB em Latin-1, separado por `;`.

## O que usamos

O CSV original fica no repositório em `data/cnefe/4101408_APUCARANA.csv`, sem alteração. `scripts/cnefe.mjs build` lê esse CSV e gera `convex/cnefe/4101408.ts` só com o necessário, cerca de 1,2 MB:

| Coluna do CNEFE | Uso |
|---|---|
| `NOM_TIPO_SEGLOGR`, `NOM_TITULO_SEGLOGR`, `NOM_SEGLOGR` | nome completo da rua: `RUA` + `DOUTOR` + `OSWALDO CRUZ` |
| `NUM_ENDERECO` | número. Endereços sem número (0) ficam de fora |
| `LATITUDE`, `LONGITUDE` | o ponto do número |
| `NV_GEO_COORD` | só os níveis 1 a 3 |

Os níveis de `NV_GEO_COORD`, segundo o dicionário do IBGE:

| Nível | Significado | Usamos? |
|---|---|---|
| 1 | Endereço: coordenada original do Censo 2022 | sim |
| 2 | Endereço: coordenada modificada (apartamentos no mesmo número) | sim |
| 3 | Endereço: coordenada estimada (sem coordenada ou com coordenada inválida na coleta) | sim |
| 4 | Face de quadra | não, impreciso demais |
| 5 | Localidade | não, impreciso demais |

Apartamentos repetem o número, e guardamos só o primeiro ponto de cada número. O resultado são 1.500 ruas e cerca de 46 mil números.

## Como atualizar ou adicionar uma cidade

Use a skill `/cnefe` do projeto, ou rode na mão:

```bash
node scripts/cnefe.mjs download "Apucarana, PR"   # baixa o zip e grava data/cnefe/<código>_<NOME>.csv
node scripts/cnefe.mjs build "Apucarana, PR"      # gera convex/cnefe/<código>.ts
npm run codegen && npm test
```

O CNEFE é uma foto de 2022. O IBGE só publica um novo junto com o próximo censo, e as ruas abertas depois disso caem no Google (ADR 0005).

**Limitações dos nomes:** vêm em maiúsculas, sem acento ("ITALO", não "Ítalo"), às vezes abreviados ("IGRECIO V CARVALHO") e com números por extenso ("SETE DE SETEMBRO"). O bot mostra o nome com as iniciais maiúsculas, sem acento.
