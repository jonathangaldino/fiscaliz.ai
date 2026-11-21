import io

import numpy as np
from PIL import Image

from app import authorized
from blur import blur_boxes, decode, encode_jpeg, expand


def jpeg(width, height, orientation=None):
    img = Image.new("RGB", (width, height), (200, 30, 30))
    exif = Image.Exif()
    if orientation:
        exif[0x0112] = orientation
    exif[0x010F] = "PhoneMaker"  # Make: device data that must not survive
    out = io.BytesIO()
    img.save(out, "JPEG", exif=exif.tobytes())
    return out.getvalue()


def test_expand_pads_and_clamps_to_the_image():
    assert expand((10, 10, 30, 20), 0.15, 100, 100) == (7, 8, 33, 22)
    assert expand((0, 0, 100, 100), 0.15, 100, 100) == (0, 0, 100, 100)


def test_blur_changes_only_the_padded_box():
    img = np.zeros((100, 100, 3), np.uint8)
    img[::2, ::2] = 255  # high-frequency pattern the blur must flatten
    before = img.copy()
    blur_boxes(img, [(40, 40, 60, 60)], 0.15)
    assert not np.array_equal(img[45:55, 45:55], before[45:55, 45:55])
    assert np.array_equal(img[:30], before[:30])


def test_decode_applies_exif_rotation():
    img = decode(jpeg(40, 20, orientation=6))  # 90° clockwise
    assert img.shape[:2] == (40, 20)


def test_decode_rejects_garbage():
    assert decode(b"not an image") is None


def test_encoded_jpeg_has_no_exif():
    out = encode_jpeg(decode(jpeg(40, 20, orientation=6)))
    assert out[:2] == b"\xff\xd8"
    assert b"Exif" not in out and b"PhoneMaker" not in out


def test_authorized_requires_the_exact_bearer():
    assert authorized("Bearer s3cret", "s3cret")
    assert not authorized(None, "s3cret")
    assert not authorized("Bearer wrong", "s3cret")
    assert not authorized("s3cret", "s3cret")
    assert not authorized("Bearer ", "")
