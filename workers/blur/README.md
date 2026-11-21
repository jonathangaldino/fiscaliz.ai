# Worker de fotos (Modal)

Borra rostos e placas das fotos dos relatos antes de publicar ([ADR 0010](../../docs/adr/0010-fotos-anonimizadas.md)).

- `app.py`: app Modal `fiscaliza-blur`, endpoint `BlurWorker.process` (YOLO de rosto e de placa, em CPU).
- `blur.py`: decodificar, borrar e recodificar sem EXIF. Funções puras.
- `test_blur.py`: testes locais, sem Modal e sem os modelos.

## Contrato

`POST` com `Authorization: Bearer <segredo>` e corpo `{ "image_url": "...", "upload_url": "..." }`.

O worker baixa a original pela `image_url` (URL temporária do Convex storage), borra e sobe um JPEG pela `upload_url` (`generateUploadUrl` do Convex). Responde `{ "ok": true, "storageId": "..." }`.

Erros: 401 sem o Bearer certo, 413 com imagem acima de 5 MB, 422 com imagem inválida, 5xx em qualquer outra falha. Em nenhum caso a foto sai sem borrar.

## Deploy

Um app por ambiente, em [Modal environments](https://modal.com/docs/guide/environments) `dev` e `prod`. Cada um tem o seu segredo:

```bash
pip install modal fastapi pydantic
SECRET="$(openssl rand -hex 32)"

modal secret create fiscaliza-blur BLUR_SECRET="$SECRET" --env dev
modal deploy workers/blur/app.py --env dev

# A URL que o deploy imprime e o mesmo segredo vão para o Convex do mesmo ambiente:
npx convex env set MODAL_BLUR_URL https://...modal.run
npx convex env set MODAL_BLUR_SECRET "$SECRET"
```

Para prod, repita com `--env prod` e `npx convex env set --prod`, usando outro segredo.

## Testes

```bash
cd workers/blur
uv run --python 3.11 --with opencv-python-headless --with numpy --with pillow \
  --with pytest --with modal --with fastapi pytest -q
```
