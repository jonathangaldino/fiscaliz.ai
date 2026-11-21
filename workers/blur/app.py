"""
Blurs faces and license plates in report photos (ADR 0010).

Convex calls `BlurWorker.process` with a temporary URL of the original and a
one-shot upload URL. The worker downloads the original, blurs every detection
and uploads a re-encoded JPEG (no EXIF) straight to Convex storage.

Synchronous HTTP on purpose: fine for a hackathon, a queue is the way to scale
(see the ADR).
"""

import hmac
import os

import modal
from fastapi import Header, HTTPException
from pydantic import BaseModel

FACE_MODEL = ("AdamCodd/YOLOv11n-face-detection", "model.pt")
PLATE_MODEL = ("felipedutrain/placa-br-yolov11", "best.pt")

# Conservative on purpose: blurring too much is fine, leaking a plate is not.
CONFIDENCE = 0.25
BOX_PADDING = 0.15
MAX_PHOTO_BYTES = 5 * 1024 * 1024


def download_models():
    from huggingface_hub import hf_hub_download

    for repo, filename in (FACE_MODEL, PLATE_MODEL):
        hf_hub_download(repo, filename)


# Weights are baked into the image at build time, so cold starts skip the download.
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install(
        "fastapi[standard]",
        "ultralytics",
        "huggingface_hub",
        "opencv-python-headless",
        "requests",
        "numpy",
    )
    .run_function(download_models)
    .add_local_python_source("blur")
)

app = modal.App("fiscaliza-blur", image=image)


class BlurRequest(BaseModel):
    image_url: str
    upload_url: str


def authorized(header: str | None, secret: str) -> bool:
    """Constant-time check of `Authorization: Bearer <secret>`."""
    if not secret or not header:
        return False
    return hmac.compare_digest(header.encode(), f"Bearer {secret}".encode())


@app.cls(cpu=2, memory=2048, scaledown_window=60, secrets=[modal.Secret.from_name("fiscaliza-blur")])
class BlurWorker:
    @modal.enter()
    def load_models(self):
        from huggingface_hub import hf_hub_download
        from ultralytics import YOLO

        # A model that fails to load raises here: the worker never answers
        # with an unblurred photo.
        self.models = [YOLO(hf_hub_download(repo, name)) for repo, name in (FACE_MODEL, PLATE_MODEL)]

    @modal.fastapi_endpoint(method="POST")
    def process(self, req: BlurRequest, authorization: str | None = Header(default=None)):
        import requests

        from blur import blur_boxes, decode, encode_jpeg

        if not authorized(authorization, os.environ.get("BLUR_SECRET", "")):
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = requests.get(req.image_url, timeout=15)
        resp.raise_for_status()
        if len(resp.content) > MAX_PHOTO_BYTES:
            raise HTTPException(status_code=413, detail="Image too large")
        img = decode(resp.content)
        if img is None:
            raise HTTPException(status_code=422, detail="Invalid image")

        boxes = []
        for model in self.models:
            result = model.predict(img, conf=CONFIDENCE, verbose=False)[0]
            boxes.extend(tuple(map(float, box)) for box in result.boxes.xyxy)
        blur_boxes(img, boxes, BOX_PADDING)

        upload = requests.post(
            req.upload_url,
            headers={"Content-Type": "image/jpeg"},
            data=encode_jpeg(img),
            timeout=15,
        )
        upload.raise_for_status()
        return {"ok": True, "storageId": upload.json()["storageId"], "detections": len(boxes)}
