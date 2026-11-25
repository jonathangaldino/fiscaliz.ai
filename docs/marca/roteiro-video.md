# Roteiro: vídeo explicativo

Vídeo curto (cerca de 1 minuto, 16:9) para a landing page. Mostra o caminho de um relato, do Telegram à confirmação de que o problema foi resolvido, com os elementos visuais do próprio projeto: ícones das categorias, pins do mapa, card da ocorrência, fila do órgão e a marca.

- **Tom**: confiante, próximo e direto. Frases curtas, sem jargão técnico. Profissional, sem cara de propaganda gritada.
- **Voz**: narração feminina em português do Brasil, ritmo calmo.
- **Trilha**: sem música; os sons de interface do painel (`lib/sound.ts`) marcam as ações na tela.
- **Legendas**: sempre ligadas na landing (`public/video/explicativo.pt-BR.vtt`), para quem assiste sem som.

| # | Tempo | Imagem | Narração |
|---|---|---|---|
| 1 | 0–7 s | Diorama 3D de uma rua de Apucarana: casas, árvore, poste, um buraco com cone. A câmera se aproxima devagar. Os pins aparecem flutuando sobre a quadra. | Um buraco na rua. Um poste apagado. Em Apucarana, quem vê o problema agora tem para quem contar. |
| 2 | 7–16 s | O celular entra pela direita com a conversa com o bot no Telegram. As mensagens sobem uma a uma: o relato, a localização, o resumo com SIM e NÃO. | É só mandar uma mensagem para o Fiscaliz.ai no Telegram. Escreva ou grave um áudio, do seu jeito, e mande a localização. |
| 2b | 16–25 s | A foto do relato (rua com buraco, carro estacionado e um pedestre). Uma linha de varredura desce, o rosto e a placa ficam borrados com as etiquetas "Rosto" e "Placa", e entra o selo "Anonimizada". | Dá para mandar uma foto também. Rostos e placas de carro são borrados automaticamente, para proteger quem aparece na imagem. |
| 3 | 25–35 s | Os ícones das categorias se espalham em grade; um deles (buraco) acende e uma linha leva até "Secretaria de Serviços Públicos". | A inteligência artificial entende o problema, escolhe a categoria e encaminha para o órgão certo da Prefeitura. Sem formulário e sem fila de atendimento. |
| 4 | 35–44 s | O mapa do painel. Pins caem no mapa; um deles cresce enquanto o contador de apelo sobe de 1 para 14. | Na hora, o relato vira um pin no mapa público. Quando outras pessoas relatam o mesmo problema, o apoio se soma e o pin cresce. |
| 5 | 44–51 s | A fila da Secretaria de Serviços Públicos, ordenada por apelo. | A Prefeitura vê tudo organizado: cada secretaria com a sua fila, primeiro o que afeta mais gente. |
| 6 | 51–59 s | O card da ocorrência passa de "Aberta" para "Verificando" e depois para "Resolvida", com o check verde. | Depois do conserto, o bot pergunta a quem relatou se o problema acabou mesmo. Quem fecha a ocorrência é o cidadão. |
| 7 | 59–65 s | A marca em 3D gira de leve sobre o azul. Entra o slogan. | Fiscaliz.ai. Você aponta. A cidade resolve. |

## Produção

- **Cenas 1 e 7**: animação gerada no Higgsfield (MiniMax H3) a partir das ilustrações 3D da landing (`public/landing/`).
- **Cenas 2 a 6**: motion graphics montados com as telas e os componentes reais do painel. A foto da cena 2b foi gerada no Higgsfield (é sintética: o rosto e a placa não são de ninguém).
- **Narração**: Text to Speech V2 (ElevenLabs) no Higgsfield, uma fala por cena, para casar o tempo de cada cena com a fala.
- **Montagem**: Higgsedit no Higgsfield; a saída fica no CDN do Higgsfield e a landing aponta para ela. O código das cenas e da montagem (`render.py`, `assemble.py`) e as camadas ficam no branch `tmp/video-layers`.

## Canal e contato

O vídeo cita o canal (Telegram), mas não mostra número, @ do bot nem link: o contato aparece no site e pode mudar. Se o WhatsApp voltar, basta regravar a fala da cena 2 ("no Telegram ou no WhatsApp"), trocar o título da cena ("Mande pelo Telegram") e remontar; as outras cenas não mudam.
