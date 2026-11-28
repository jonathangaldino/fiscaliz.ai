# Fiscaliz.ai

Automação do fluxo de triagem e roteamento de demandas urbanas de Apucarana, PR: do aviso do cidadão até o órgão municipal responsável.

## Language

**Cidadão**:
Pessoa que avisa a prefeitura de um problema urbano. Nunca é identificada no mapa.
_Avoid_: Usuário, denunciante, reportante

**Relato**:
O aviso de um único cidadão sobre um problema urbano, com local, descrição e data/hora.
_Avoid_: Denúncia, reclamação, report, ocorrência (para a mensagem individual)

**Ocorrência**:
Um problema urbano único em um local, que agrupa todos os relatos sobre ele.
_Avoid_: Chamado, ticket, incidente, problema

**Apelo**:
Quantidade de cidadãos distintos com relato em uma ocorrência. Conta pessoas, não mensagens.
_Avoid_: Upvote, voto, curtida, prioridade

**Verificação**:
Consulta aos cidadãos de uma ocorrência sobre se o problema foi corrigido. A ocorrência só é dada como resolvida quando ao menos 30% deles confirmam.
_Avoid_: Validação, fechamento, votação

**Aberta / Verificando / Resolvida**:
Estados de uma ocorrência: aguardando correção; em verificação; correção confirmada pelos cidadãos (sai do mapa, permanece no histórico).
_Avoid_: Pendente, fechada, concluída, corrigida (como estado)

**Fora de escopo**:
Problema que cabe a uma concessionária (Sanepar, Copel) e não à prefeitura. Como a emergência, não vira relato: o cidadão é redirecionado e só um registro anônimo é contado.

**Emergência**:
Situação com risco à vida, saúde ou segurança. Não vira relato nem ocorrência: o cidadão é redirecionado aos canais de emergência e só um registro anônimo (tipo e data/hora) é contado.
_Avoid_: Urgência, ocorrência grave

**Foto do relato**:
Imagem que o cidadão manda junto com o relato. Só vai ao painel depois de anonimizada (rostos e placas borrados), e a ocorrência mostra só a primeira.
_Avoid_: Anexo, mídia, evidência

**Categoria**:
Tipo de problema urbano de uma ocorrência, escolhido de uma lista fechada. Determina o órgão responsável.
_Avoid_: Tipo, tag, assunto

**Órgão responsável**:
Secretaria ou autarquia municipal a quem cabe resolver as ocorrências de uma categoria.
_Avoid_: Departamento, setor, responsável (sozinho)

**Pedido de recolhimento**:
Pedido de um cidadão para a Secretaria de Serviços Públicos recolher na calçada móveis, colchões, sofás, eletrodomésticos ou eletroeletrônicos que ele mesmo descarta. Não é relato: não aponta um problema e não conta apelo. Móvel largado por terceiros na rua continua sendo relato.
_Avoid_: Cata-móveis, chamado, agendamento, relato (para o pedido)

**Ponto de recolhimento**:
Endereço (logradouro e número, sem complemento) que agrupa os pedidos de recolhimento ainda não recolhidos. É o que aparece no mapa; números diferentes na mesma rua são pontos diferentes.
_Avoid_: Lixeira, coleta, ocorrência (para o ponto)

**Aguardando / Recolhido / Expirado**:
Estados de um ponto de recolhimento: esperando o caminhão; recolhimento confirmado por ao menos um solicitante; 15 dias sem confirmação. Recolhido e expirado saem do mapa.
_Avoid_: Aberta, resolvida, pendente (para o ponto)

**Protocolo**:
Número que o Fiscaliz.ai dá a cada pedido de recolhimento, no formato número/ano. Fica só na conversa com o cidadão, nunca no mapa, e não é um protocolo oficial da Prefeitura.
_Avoid_: Ticket, código, número do chamado

## Nomes no código

O código é só em inglês. Cada termo acima tem um único nome no código:

| Termo | Código |
|---|---|
| Cidadão | `citizen` |
| Relato | `report` |
| Ocorrência | `occurrence` |
| Apelo | `appeal` |
| Verificação | `verification` |
| Aberta / Verificando / Resolvida | `open` / `verifying` / `resolved` |
| Fora de escopo | `out_of_scope` |
| Emergência | `emergency` |
| Foto do relato | `photo` |
| Categoria | `category` |
| Órgão responsável | `agency` |
| Pedido de recolhimento | `pickup_request` |
| Ponto de recolhimento | `pickup_point` |
| Aguardando / Recolhido / Expirado | `waiting` / `collected` / `expired` |
| Protocolo | `protocol` |
| Conversa | `conversation` |
