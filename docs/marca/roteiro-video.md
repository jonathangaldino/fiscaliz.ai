# Roteiro: vídeo explicativo

Vídeo curto (cerca de 1 minuto, 16:9) para a landing page. Mostra o caminho de um relato, do WhatsApp à confirmação de que o problema foi resolvido, com os elementos visuais do próprio projeto: ícones das categorias, pins do mapa, card da ocorrência, fila do órgão e a marca.

- **Tom**: confiante, próximo e direto. Frases curtas, sem jargão técnico. Profissional, sem cara de propaganda gritada.
- **Voz**: narração feminina em português do Brasil, ritmo calmo.
- **Trilha**: sem música; os sons de interface do painel (`lib/sound.ts`) marcam as ações na tela.
- **Legendas**: sempre ligadas na landing (`public/video/explicativo.pt-BR.vtt`), para quem assiste sem som.

| # | Tempo | Imagem | Narração |
|---|---|---|---|
| 1 | 0–7 s | Diorama 3D de uma rua de Apucarana: casas, árvore, poste, um buraco com cone. A câmera se aproxima devagar. Os pins aparecem flutuando sobre a quadra. | Um buraco na rua. Um poste apagado. Em Apucarana, quem vê o problema agora tem para quem contar. |
| 2 | 7–16 s | O celular entra pela direita com a conversa do WhatsApp. As mensagens sobem uma a uma: o relato, a localização, o resumo com SIM e NÃO. | É só mandar uma mensagem para o Fiscaliz.ai no WhatsApp. Escreva ou grave um áudio, do seu jeito, e mande a localização. |
| 3 | 16–25 s | Os ícones das categorias se espalham em grade; um deles (buraco) acende e uma linha leva até "Secretaria de Serviços Públicos". | A inteligência artificial entende o problema, escolhe a categoria e encaminha para o órgão certo da Prefeitura. Sem formulário e sem fila de atendimento. |
| 4 | 25–34 s | O mapa do painel. Pins caem no mapa; um deles cresce enquanto o contador de apelo sobe de 1 para 14. | Na hora, o relato vira um pin no mapa público. Quando outras pessoas relatam o mesmo problema, o apoio se soma e o pin cresce. |
| 5 | 34–42 s | A fila da Secretaria de Serviços Públicos, ordenada por apelo. | A Prefeitura vê tudo organizado: cada secretaria com a sua fila, primeiro o que afeta mais gente. |
| 6 | 42–51 s | O card da ocorrência passa de "Aberta" para "Verificando" e depois para "Resolvida", com o check verde. | Depois do conserto, o bot pergunta a quem relatou se o problema acabou mesmo. Quem fecha a ocorrência é o cidadão. |
| 7 | 51–60 s | A marca em 3D gira de leve sobre o azul. Entram o slogan e o número do WhatsApp. | Fiscaliz.ai. Você aponta. A cidade resolve. |

## Produção

- **Cenas 1 e 7**: animação gerada no Higgsfield (MiniMax H3) a partir das ilustrações 3D da landing (`public/landing/`).
- **Cenas 2 a 6**: motion graphics montados com as telas e os componentes reais do painel.
- **Narração**: Text to Speech V2 (ElevenLabs) no Higgsfield, uma fala por cena, para casar o tempo de cada cena com a fala.
- **Montagem**: Higgsedit no Higgsfield; a saída fica no CDN do Higgsfield e a landing aponta para ela.
