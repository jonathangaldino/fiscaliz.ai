# Por que não LangGraph: máquina de estados do bot como função pura e tipada

O fluxo do bot (coletando → confirmando → registrado, com saídas para emergência, fora de escopo e recusa) é uma função pura `nextStep(state, extraction): Step` sobre uniões discriminadas em TypeScript, chamada dentro da mutation do Convex. A IA só preenche a `Extraction`; quem decide o fluxo é o código.

Consideramos LangGraph e o descartamos:

- **O bot reage a eventos e não roda em loop.** Cada mensagem do WhatsApp chega isolada, às vezes horas depois da anterior, e cada execução avança um único passo. O ponto forte do LangGraph (pausar e retomar um agente no meio da execução) já é coberto pelo estado salvo em `conversations`.
- **O estado ficaria em dois lugares.** O LangGraph persiste estado via checkpointers (Postgres, SQLite, Redis), e não há um para Convex. Com estado fora do Convex, perdemos a atomicidade: a mesma mutation que muda o estado cria o relato e soma o apelo. Separados, uma falha entre os dois passos pode duplicar relato.
- **Exagero para três estados.** Traz LangChain core e adaptadores por cima do SDK oficial da Anthropic, sem ganho de controle. No critério "escolha e uso de tecnologias", isso pesa contra.
- **Prazo.** Curva de aprendizado e depuração de checkpointer saem dos 13 dias até a entrega da V1.

XState v5 também foi considerado e descartado pelo mesmo motivo de tamanho. O `switch` exaustivo do TypeScript já impede transição não tratada em tempo de compilação.

## Consequences

- Cada linha da tabela de transições vira um caso de teste no Vitest, sem chamar a IA.
- O diagrama do fluxo (Mermaid) no README é mantido à mão a partir da mesma tabela.
- Revisitar se o bot virar um agente aberto, com várias ferramentas e caminho decidido pelo modelo. A verificação da V2 (um disparo e um contador de respostas) não muda essa decisão.
