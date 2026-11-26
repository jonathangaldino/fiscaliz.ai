# Roteiro: vídeo da demo (júri do Hack Brasil)

Vídeo da submissão ([inglês, 2:28](https://d2ol7oe51mr4n9.cloudfront.net/user_3IH6s2x6op5CIWGya8iR1hp8f6B/9fd12a51-4a51-409d-9a2b-4cf0c2ec5e6a.mp4); [versão em português, 2:41](https://d2ol7oe51mr4n9.cloudfront.net/user_3IH6s2x6op5CIWGya8iR1hp8f6B/9945b228-86ed-4f57-ac52-6803ae44c46c.mp4)): até **3 minutos**, link HTTPS sem login, de preferência em inglês ([RULES.md](../../RULES.md)). Diferente do [vídeo conceito](./roteiro-video.md), este mostra o produto funcionando de verdade: tudo o que aparece nas telas foi gravado no ambiente de dev (`fiscalizai-dev.vercel.app`), com o bot real respondendo.

- **Público**: avaliadores técnicos. Além do fluxo do cidadão, o vídeo mostra os casos difíceis que o sistema trata e os números que dá para conferir.
- **Idioma**: narração e legendas em inglês. A interface fica em pt-BR; rótulos curtos em inglês explicam cada tela.
- **Estética**: a do vídeo conceito. Fundo claro, tipografia Inter, celular e janela de navegador com sombra suave, a marca 3D na abertura e no encerramento.
- **Voz**: a mesma do vídeo conceito (ElevenLabs no Higgsfield), em inglês.
- **Gravação**: Playwright contra o ambiente de dev, celular de 390 × 844 px e desktop de 1280 × 800 px, ambos a 2x, capturados por screencast do Chrome. As respostas do bot aparecem no tempo real (1 a 2 s); só a espera da foto anonimizada (cerca de 13 s) é acelerada, e o vídeo avisa.

| # | Bloco | Imagem | Narração (EN) |
|---|---|---|---|
| 1 | Abertura | Diorama 3D da rua; entra "Fiscaliz.ai · Live demo". | In Apucarana, Brazil, a pothole or a broken streetlight usually means a phone call, a form, and guessing which department is in charge. Fiscaliz.ai removes the guessing. |
| 2 | Relato do cidadão | Celular no simulador: "o poste da minha rua tá apagado faz uma semana…". O bot pergunta onde; o cidadão escreve "avenida curitba, 1200" (com erro de digitação). | A citizen just sends a message on Telegram. No app to install, no sign-up, no form. Here we use the web simulator, which runs the exact same bot. They describe the problem in their own words, typo and all. |
| 3 | Extração e endereço | O resumo aparece com a rua corrigida ("Av. Curitiba, 1200 - Centro"), a categoria e a hora deduzida de "faz uma semana". | Claude Haiku extracts the problem, the category and the time. The street is matched against the census address file, misspellings included, in milliseconds. The bot only asks for what's missing, then shows a summary to confirm. |
| 4 | Registro | Toque em SIM; "Relato registrado", órgão responsável (Idepplan) e link. | One tap, and it's registered, routed to the right department, and live on the public map. |
| 5 | Foto anonimizada | Outro cidadão manda uma foto e marca o local no mapa. "Foto publicada, com rostos e placas borrados"; a página da ocorrência mostra a foto borrada. | Citizens can attach a photo. Before anything is published, a YOLO model blurs every face and license plate, and the original is deleted. Only the anonymized copy goes public. |
| 6 | Apelo | Um terceiro cidadão relata o mesmo buraco com outras palavras; o bot responde "agora são 2 pessoas". O mapa no desktop atualiza sozinho. | When someone else reports the same problem, in different words, there's no duplicate. Nearby open occurrences are candidates, and the AI confirms it's the same issue. The appeal grows instead: now two people are asking for this fix. |
| 7 | Casos difíceis | "caiu uma árvore em cima dos fios" → Bombeiros 193, nada registrado. "tá vazando água no meio da rua" → Sanepar. Selos com os números do eval. | Guardrails come first. An emergency is sent straight to the emergency numbers, and nothing is stored. A water leak goes to the utility company. The AI only fills in data; a tested state machine decides the flow. In our evaluation, it got fifty-three of fifty-four messages right, and missed zero emergencies. |
| 8 | Mapa público | Desktop: mapa em tempo real, filtro por categoria, busca. Celular: o mesmo mapa responsivo. | The map is public and real-time: new reports appear without reloading. Each category has its own icon, and you can search and filter by category or department, right in the link. The same interface works on desktop and on the phone. |
| 9 | Prefeitura | Fila do órgão ordenada por apelo, página de confiabilidade, GeoJSON aberto. | For City Hall, each department gets its own queue, ranked by how many people are affected. The reliability page shows the automation in numbers, and the open data downloads as GeoJSON or CSV. |
| 10 | Verificação | "Iniciar verificação" na ocorrência do poste; no celular do cidadão chega a pergunta; SIM; a ocorrência vai para Resolvidas. | After the repair, the bot asks the people who reported it whether the problem is really gone. Their answers close the occurrence, or reopen it. The citizen closes the loop. |
| 11 | Encerramento | Marca 3D, slogan em inglês e a stack em uma linha. | Fiscaliz.ai. You point it out. The city fixes it. |

## Números citados

- **Eval da triagem**: 53 de 54 mensagens com o tipo certo e 0 emergência perdida ([docs/eval-triagem.md](../eval-triagem.md)).
- **Confiabilidade**: mediana do tempo até o mapa e acerto de endereço vêm da página `/confiabilidade` no momento da gravação; o vídeo mostra a página, sem repetir os números na fala.

## Produção

- Scripts de gravação (`clips.js`) e montagem (`render_demo.py`, `assemble_demo.py`) no branch `tmp/video-layers`, pasta `demo/`. Cada cena tem um mapa de tempo (trechos em velocidade real, acelerados ou congelados) para casar a tela com a fala.
- Legendas queimadas no vídeo e também em `public/video/demo.en.vtt` e `public/video/demo.pt-BR.vtt`.
- **Versão em português**: as mesmas gravações e mapas de tempo, com narração (mesma voz), legendas e textos de tela em pt-BR. Como as falas em português são mais longas, algumas cenas seguram o último quadro por mais tempo (2:41 no total). Scripts em `demo/pt/` no branch `tmp/video-layers`.
