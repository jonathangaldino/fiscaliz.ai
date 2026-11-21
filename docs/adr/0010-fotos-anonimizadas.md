# Foto no relato, publicada só depois de anonimizada

O cidadão pode mandar **uma foto** junto com o relato, pelo Telegram ou pelo simulador. A foto ajuda a prefeitura a entender o problema, mas foto de rua mostra rostos, placas de carro e, às vezes, metadados com GPS do celular. Como o painel é todo público, a foto só pode aparecer depois de anonimizada.

## Decisão

- **Pública, mas borrada.** Rostos e placas são borrados por um worker no [Modal](https://modal.com) com dois modelos YOLOv11 (`workers/blur/`). Só a cópia borrada vai para o painel. Ela é recodificada em JPEG sem EXIF, o que remove o GPS e o modelo do aparelho.
- **Conservador.** O worker usa confiança 0,25 e aumenta cada caixa em 15%. Borrar demais não é problema; vazar uma placa é. Se um modelo não carrega ou qualquer passo falha, o worker responde erro, nunca a foto sem borrar.
- **Uma foto por relato.** Uma foto nova substitui a anterior no rascunho. A ocorrência mostra só a primeira foto que chegou. Se ela já tem foto, ou se uma está em processamento, a foto de um relato novo é descartada sem chamar o Modal.
- **A IA não lê a foto, por enquanto.** A foto é só anexo. A legenda entra no fluxo como texto comum.
- **A original não fica guardada.**
  - Telegram: o rascunho guarda só o `file_id`, e quem hospeda a original é o Telegram.
  - Simulador: o upload fica no Convex storage até o SIM.
  - No SIM a original é copiada para o storage, entregue ao worker e apagada logo depois, dando certo ou errado.
  - Conversa cancelada ou expirada também apaga o upload.
- **Anonimização no SIM, não na chegada.** Enquanto conversa, o cidadão vê a própria foto. No SIM o relato é registrado na hora e a ocorrência fica com `photo: { status: "processing" }`. A página mostra "Foto em processamento" e o bot avisa que a foto aparece em instantes. Quando o worker termina, a foto aparece sozinha na página, porque o Convex é reativo, e o bot manda o link. Se falhar, o campo some e o bot avisa que o relato ficou sem foto.
- **O token do Telegram não sai do Convex.** A URL da original no Telegram contém o token do bot. Por isso o Convex baixa a foto antes e passa ao worker só uma URL temporária do próprio storage.
- **A foto fica depois da resolução.** Ela serve de "antes" na página da ocorrência resolvida.
- **Só na página da ocorrência.** Mapa, lista, CSV e GeoJSON continuam sem foto.

## Worker síncrono, não fila

Para o hackathon, o worker é uma **API HTTP síncrona**: uma action do Convex, agendada no SIM com `ctx.scheduler`, faz `POST` no endpoint `BlurWorker.process` e espera a resposta. O timeout é de 90 s, para cobrir o cold start, com 1 nova tentativa. A chamada é autenticada com `Authorization: Bearer <MODAL_BLUR_SECRET>`, comparado em tempo constante no worker.

Isso basta para o volume de uma demo, mas não escala:

- cada foto prende uma action do Convex enquanto o worker processa;
- um pico de fotos vira um pico de containers no Modal, sem controle de vazão;
- se o worker cair, as fotos daquele momento se perdem: a ocorrência fica sem foto e não há reprocessamento;
- a nova tentativa é só uma, imediata, sem backoff.

**Para escalar, o caminho é uma fila de mensagens.** O SIM publicaria um job (`occurrenceId`, foto) numa fila, por exemplo uma `modal.Queue`, ou uma tabela de jobs no Convex com um worker que consome. O worker processaria no ritmo dele, com retry e backoff, e avisaria o Convex por um webhook quando terminasse. O contrato da foto continuaria o mesmo (URL da original de entrada, `storageId` da borrada de saída), então a troca fica restrita a `convex/bot/photo.ts` e `workers/blur/app.py`.

## Consequências

- Fornecedor novo: Modal, rodando em CPU (`cpu=2`, `memory=2048`). Com YOLO nano, CPU basta e o cold start fica menor que com GPU.
- Dois segredos por ambiente: `MODAL_BLUR_URL` e `MODAL_BLUR_SECRET`, mais uma exceção à regra de variáveis iguais do [ADR 0008](./0008-ambientes-dev-e-prod.md). O worker é publicado nos environments `dev` e `prod` do Modal, cada um com o seu `modal.Secret` `fiscaliza-blur`.
- Detector erra. Uma placa ou um rosto podem escapar, mesmo com o limiar baixo. A política de privacidade avisa que fotos são publicadas com rosto e placa borrados.
- Uploads do simulador que nunca viram mensagem ficam no storage. Se o simulador público for abusado, a saída é uma limpeza periódica de arquivos sem referência.
- Licenças:
  - `ultralytics`: AGPL-3.0. Rodar como serviço exige oferecer o código, e o código do worker está neste repositório público.
  - Pesos de rosto [`AdamCodd/YOLOv11n-face-detection`](https://huggingface.co/AdamCodd/YOLOv11n-face-detection): Apache-2.0.
  - Pesos de placa [`felipedutrain/placa-br-yolov11`](https://huggingface.co/felipedutrain/placa-br-yolov11): MIT, treinados em placas brasileiras.
