"""Image helpers for the blur worker. Pure functions, tested without Modal."""

import cv2
import numpy as np


def decode(data: bytes):
    """Bytes → BGR image, rotated per EXIF so the blur hits the right spot. None if invalid."""
    # IMREAD_COLOR applies the EXIF orientation (tested in test_blur.py).
    return cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)


def expand(box, padding: float, width: int, height: int):
    """Grows a box by `padding` on each side and clamps it to the image."""
    x1, y1, x2, y2 = box
    dx, dy = (x2 - x1) * padding, (y2 - y1) * padding
    return (
        max(0, int(x1 - dx)),
        max(0, int(y1 - dy)),
        min(width, int(x2 + dx + 0.999)),
        min(height, int(y2 + dy + 0.999)),
    )


def blur_boxes(img, boxes, padding: float) -> None:
    """Blurs each box in place, strong enough that a plate or face is unreadable."""
    height, width = img.shape[:2]
    for box in boxes:
        x1, y1, x2, y2 = expand(box, padding, width, height)
        roi = img[y1:y2, x1:x2]
        if roi.size == 0:
            continue
        # Kernel grows with the box; must be odd.
        k = max(31, ((x2 - x1) // 2) | 1)
        img[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (k, k), 0)


def encode_jpeg(img) -> bytes:
    """Re-encodes as JPEG. OpenCV writes no EXIF, so GPS and device data are gone."""
    ok, buffer = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok:
        raise ValueError("JPEG encoding failed")
    return buffer.tobytes()
