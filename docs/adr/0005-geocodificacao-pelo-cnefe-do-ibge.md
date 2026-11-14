# Geocodificação de endereços em texto pelo CNEFE do IBGE, com o Google como reserva

O cidadão escreve o endereço do jeito que fala: "R ítalo fontanini 40" para a Rua Ítalo Ado Fontanini. O Google Geocoding não completa uma palavra que falta no meio do nome. Ele responde com `partial_match` e chuta outra rua ("R. Italiano", em outro bairro) ou um estabelecimento da mesma rua em outro número (um lava-jato no 455). O #33 passou a recusar esses chutes. Com isso o bot pede o pin, o que é seguro mas atrapalha o cidadão.

Decidimos geocodar endereço em texto primeiro pelo **CNEFE do Censo 2022**, o cadastro de endereços do IBGE, que traz a coordenada de cada número ([dados-ibge.md](../dados-ibge.md)). O fluxo:

1. Procurar a **única** rua de Apucarana que contém todas as palavras do nome que o cidadão escreveu. Números antes do nome contam como parte dele ("13" em "Rua 13 de Maio").
2. Achada a rua, o ponto é o do número no IBGE. Se o número não existir, o ponto fica entre os números vizinhos do mesmo lado da rua. É **preciso** quando o número existe ou quando os vizinhos estão a até 200 m um do outro. Sem número, ou além do fim da rua, não é preciso.
3. Sem rua, ou com mais de uma, vale o Google Geocoding com a regra do #33: `partial_match` só passa se tiver todas as palavras do nome, e nunca como preciso.

A forma de guardar o CNEFE (arquivo no servidor, não tabela) está no [ADR 0006](./0006-cnefe-em-arquivo-no-servidor.md).

## Testes que embasaram a decisão

Todos feitos contra os serviços reais em 13/11/2026.

**Só o Google falha com nome incompleto.** Os mesmos endereços com variações:

| Entrada | Google Geocoding |
|---|---|
| `Rua Ítalo Ado Fontanini, 40` (nome completo) | nº 40, Vila São Carlos, exato |
| `Rua Italo Fontanini 40` (sem acento) | lava-jato no **nº 455**, Vila São Paulo (outro bairro) |
| `Rua Ítalo Fontanini 40` (com acento) | R. Italiano, outra rua |
| `R Italo Fontanini 40` | R. Roque Guizeline, outra rua |

**A Places API (New) também falha:**
- **Text Search** devolve estabelecimentos. Para "R ítalo fontanini 40" o primeiro resultado foi um clube em outra avenida.
- **Autocomplete**, filtrado por `route` e `street_address`, não devolveu nada para "ítalo fontanini".

**O nome oficial resolve.** Com o nome completo tirado de uma lista de ruas, o Google acerta o nº 40 exato. Testamos duas listas, comparando só o nome, sem tipo nem título:

| | IBGE (CNEFE 2022) | OpenStreetMap |
|---|---|---|
| Ruas | 1.743 | 1.265 |
| Só nesta lista | 751 ruas, 14.678 endereços (22% da cidade) | 285, em geral praças, vias com nome em inglês ("Guaira lane") e grafias diferentes |
| Coordenada por número | sim, coletada em campo | não |
| Licença | dado aberto do governo, citando a fonte | ODbL, com compartilhamento obrigatório |

**O CNEFE dispensa o Google quando acha a rua:**
- **Precisão só com o CNEFE.** Tiramos 2.738 endereços da base, um de cada vez, e estimamos cada um pelos números vizinhos. Erro mediano de **15 m**, p75 de 44 m, e **77% a até 50 m**. É uma medida pessimista, porque na vida real o número muitas vezes existe na base e o erro é zero.
- **O Google com o nome oficial**, em 40 endereços reais: só 32 vieram precisos, 11 vieram com `partial_match`, e a mediana ficou a **14 m** do ponto do IBGE. O Google não é mais preciso que o CNEFE.
- **Tempo:** o Google leva ~220 ms por chamada (p50), e o CNEFE ~3 ms (ADR 0006).

**Resultado final com o código novo:**

| Entrada | Antes | Agora |
|---|---|---|
| `R ítalo fontanini 40` | R. Italiano (errado), depois pin | Rua Italo Ado Fontanini, 40, preciso, 3 ms |
| `Rua Italo Fontanini 40` | lava-jato no 455 | Rua Italo Ado Fontanini, 40, preciso |
| `rua ari barroso 10` | Google | Rua Ari Barroso, 10 (CNEFE) |
| `Av. Curitiba, 100` | Google | Google (o IBGE tem Rua e Avenida Curitiba, então é ambíguo) |
| `Rua 13 de Maio, 250` | Google, pin | pin (a rua não existe em Apucarana em nenhuma das três fontes) |

Consideramos e descartamos:

- **Places API (New)**, Text Search e Autocomplete: falharam nos testes acima.
- **Normalizar o texto** (tirar acento, trocar "R" por "Rua"): o melhor caso cai no lava-jato do 455.
- **Baixar as ruas pelo Google:** não existe API do Google que liste as ruas de uma cidade, e os termos de uso proíbem guardar os dados em massa.
- **Lista de ruas do OSM** com o Google como geocoder: cobre menos ruas, não tem a coordenada do número e continua pagando o tempo do Google.
- **Só o CNEFE, sem Google:** falharia em rua aberta depois de 2022 e em endereço por ponto de referência.

## Consequências

- O endereço exibido vem do nome do IBGE com iniciais maiúsculas e sem acento ("Rua Italo Ado Fontanini, 40") e sem bairro. O Google dava acento e bairro.
- O CNEFE é uma foto de 2022 e só é refeito no próximo censo. Rua nova cai no Google.
- Nome ambíguo ("Curitiba" é Rua e Avenida) ou texto com o bairro junto ("Ítalo Fontanini, Vila São Carlos") não casa com nenhuma rua e vai para o Google.
- Erro de digitação no nome ("Osvaldo" por "Oswaldo") é tolerado pela distância de Damerau-Levenshtein, só quando não há match exato ([ADR 0007](./0007-damerau-levenshtein-no-nome-da-rua.md)).
- Os dados vêm do IBGE e precisam citar a fonte ([dados-ibge.md](../dados-ibge.md)).
- O CSV original fica em `data/cnefe/`, e `scripts/cnefe.mjs` baixa e regenera. Para outras cidades, veja o ADR 0006.
