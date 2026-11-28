# Prioridade por critérios objetivos, não só por apelo

A fila de cada órgão era ordenada só pelo apelo. Isso premia quem reclama mais, não o que é mais grave, e para a prefeitura o painel vira uma vitrine de reclamações em vez de uma ferramenta de gestão. A pesquisa e as fontes estão em [docs/priorizacao.md](../priorizacao.md).

## Decisão

- **Cada ocorrência tem uma prioridade de 0 a 100**, soma de cinco fatores: gravidade da categoria (30), tempo em aberto contra um prazo de referência (25), circulação no local pela classe da via (20), apelo (15) e tendência de piora (10).
- **Base na matriz GUT e na abordagem por risco** do código de prática britânico de manutenção viária. Gravidade e tendência são notas fixas por categoria; a urgência é calculada pela idade.
- **Soma, não produto.** A GUT clássica multiplica as notas. A soma permite mostrar quantos pontos vieram de cada fator, e o órgão consegue explicar a ordem.
- **Apelo com retorno decrescente** (logaritmo, teto em 50 pessoas), por causa do viés de relato documentado nos sistemas 311.
- **Classe da via deduzida do endereço** (avenida → arterial, praça → coletora, estrada → rural, resto → local). Apucarana não publica a hierarquia viária como dado.
- **Calculada na leitura, não gravada.** A prioridade muda com o passar dos dias. `computePriority` em `convex/lib/priority.ts` é uma função pura, usada pelo painel, pela exportação e pela previsão. Não há campo novo na tabela.
- **Apelo e prioridade são coisas diferentes** no vocabulário ([GLOSSARY](../../GLOSSARY.md)): apelo é quantas pessoas pedem; prioridade é a ordem sugerida de atendimento.

## Consequências

- A fila do órgão passa a abrir por prioridade. A ordem por apelo e por data continua disponível.
- As queries do Convex continuam ordenando por apelo, e o corte de 1.000 itens é feito por apelo. Com mais de 1.000 ocorrências abertas num órgão, uma ocorrência prioritária com apelo baixo poderia ficar de fora; até lá, não é problema.
- Os números são propostas. Mudar um peso ou uma nota é mudar uma constante, e os testes de `priority.test.ts` descrevem o que não pode quebrar (avenida acima de rua, antiga acima de nova, apelo não vence gravidade sozinho).
- A dedução da classe da via erra em avenidas de bairro e em ruas comerciais. A correção, com dado do CNEFE ou do Plano Diretor, está nos próximos passos do documento de pesquisa.
- A gravidade é da categoria, não do caso: dois buracos têm a mesma nota, qualquer que seja o tamanho.
