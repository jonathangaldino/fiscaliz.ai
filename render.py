"""Fiscaliz.ai explainer: motion-graphics scenes 2-6 + assembly.
Run in the Higgsfield sandbox. Layers come from the tmp/video-layers branch."""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1920, 1080, 30
L = "layers"
FONT_SB = "fonts/Inter-SemiBold.ttf"
FONT_MD = "fonts/Inter-Medium.ttf"

def ease_out(t): t = max(0, min(1, t)); return 1 - (1 - t) ** 3
def ease_io(t): t = max(0, min(1, t)); return t * t * (3 - 2 * t)
def spring(t):
    t = max(0, min(1, t))
    return 1 - math.exp(-6 * t) * math.cos(9 * t) if t < 1 else 1
def seg(t, a, b): return 0 if t <= a else 1 if t >= b else (t - a) / (b - a)

_cache = {}
def img(name, scale=1.0):
    key = (name, scale)
    if key not in _cache:
        im = Image.open(f"{L}/{name}").convert("RGBA")
        if scale != 1.0:
            im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
        _cache[key] = im
    return _cache[key]

def place(canvas, im, cx, cy, s=1.0, alpha=1.0):
    if alpha <= 0.003 or s <= 0.01: return
    if abs(s - 1) > 0.002:
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.BILINEAR)
    if alpha < 0.999:
        a = im.getchannel("A").point(lambda v: round(v * alpha))
        im = im.copy(); im.putalpha(a)
    canvas.alpha_composite(im, (round(cx - im.width / 2), round(cy - im.height / 2)))

def radial(c1, c2):
    base = Image.new("RGB", (W, H), c2)
    mask = Image.radial_gradient("L").resize((W, H))
    return Image.composite(Image.new("RGB", (W, H), c2), Image.new("RGB", (W, H), c1), mask).convert("RGBA")

BG_LIGHT = radial((255, 255, 255), (220, 229, 238))

def text(canvas, s, x, y, size, color=(11, 13, 12), font=FONT_SB, alpha=1.0, anchor="la", dy=0):
    if alpha <= 0: return
    layer = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(layer)
    d.text((x, y + dy), s, font=ImageFont.truetype(font, size), fill=color + (round(255 * alpha),), anchor=anchor)
    canvas.alpha_composite(layer)

def title(canvas, t, line1, line2, x=150, y=380, start=0.2):
    a = ease_out(seg(t, start, start + 0.6))
    text(canvas, line1, x, y, 76, alpha=a, dy=(1 - a) * 30)
    b = ease_out(seg(t, start + 0.15, start + 0.75))
    text(canvas, line2, x, y + 100, 38, color=(70, 77, 73), font=FONT_MD, alpha=b, dy=(1 - b) * 30)

# ----------------------------------------------------------------- scenes
def scene2(t, D):
    c = BG_LIGHT.copy()
    title(c, t, "Mande pelo WhatsApp", "Texto, áudio ou localização.")
    a = ease_out(seg(t, 0.0, 0.9))
    cx = 1330 + (1 - a) * 500
    # phone state by time
    times = [0.6, 2.0, 3.3, 4.6, 6.0, 7.0]
    k = sum(1 for x in times if t >= x)
    k = max(1, k)
    ph = img(f"phone-{k}.png", 0.66)
    place(c, ph, cx, 560, 1.0, a)
    if k > 1 and t - times[k - 1] < 0.25:  # quick crossfade from previous state
        place(c, img(f"phone-{k-1}.png", 0.66), cx, 560, 1.0, a * (1 - (t - times[k - 1]) / 0.25))
    return c

CATS = ["pavement", "rural_roads", "drainage", "urban_cleaning", "public_spaces", "street_lighting",
        "traffic_light", "traffic_signs", "public_transport", "risk_area", "tree_assessment",
        "tree_removal", "environmental", "construction", "cemeteries", "rural_area"]
def scene3(t, D):
    c = BG_LIGHT.copy()
    cols, cell = 8, 150
    focus = seg(t, 3.6, 4.6)
    for i, k in enumerate(CATS):
        r, q = divmod(i, cols)
        x = W / 2 + (q - (cols - 1) / 2) * cell
        y = 470 + r * cell
        appear = spring(seg(t, 0.15 + i * 0.07, 0.75 + i * 0.07))
        if k == "pavement":
            tx, ty = 560, 560
            x = x + (tx - x) * ease_io(focus); y = y + (ty - y) * ease_io(focus)
            s = appear * (1 + 1.4 * ease_io(focus))
            place(c, img(f"{k}.webp", 0.85), x, y, s, min(1, appear))
        else:
            alpha = min(1, appear) * (1 - ease_io(focus))
            place(c, img(f"{k}.webp", 0.85), x, y, appear, alpha)
    a = ease_out(seg(t, 4.4, 5.0))
    place(c, img("ai.png", 0.8), 1240, 470 + (1 - a) * 30, 1.0, a)
    b = ease_out(seg(t, 5.6, 6.3))
    place(c, img("agency.png", 0.8), 1260, 650 + (1 - b) * 30, 1.0, b)
    if b > 0:  # connector
        layer = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(layer)
        d.line([(760, 560), (760 + 90 * b, 560)], fill=(11, 95, 198, round(160 * b)), width=4)
        c.alpha_composite(layer)
    ta = 1 - ease_out(seg(t, 3.2, 3.8))
    text(c, "A IA entende e encaminha", W / 2, 120, 64, alpha=min(ease_out(seg(t, 0.1, 0.7)), 1) * (1 - ease_io(seg(t, 3.4, 4.0))), anchor="ma")
    return c

MAP = None
PINS = [("drainage", 560, 420), ("street_lighting", 820, 300), ("traffic_light", 1180, 330),
        ("tree_removal", 1560, 640), ("urban_cleaning", 760, 760), ("public_spaces", 1300, 800),
        ("traffic_signs", 460, 680), ("construction", 1600, 330)]
def scene4(t, D):
    global MAP
    if MAP is None: MAP = Image.open(f"{L}/map.png").convert("RGBA")
    z = 1 + 0.05 * (t / D)
    m = MAP.resize((round(W * z), round(H * z)), Image.BILINEAR)
    c = Image.new("RGBA", (W, H)); c.alpha_composite(m, (-(m.width - W) // 2, -(m.height - H) // 2))
    for i, (k, x, y) in enumerate(PINS):
        p = seg(t, 0.4 + i * 0.18, 0.9 + i * 0.18)
        place(c, img(f"pin-{k}.png", 0.5), x, y - (1 - ease_out(p)) * 80 - 74, spring(p) if p > 0 else 0, min(1, p * 2))
    # hero pin grows with appeal
    g = seg(t, 2.6, 7.0)
    appear = seg(t, 1.6, 2.2)
    s = (0.5 + 0.45 * ease_io(g)) * spring(appear)
    place(c, img("pin-pavement.png", 1.0), 980, 640 - 150 * s, s, min(1, appear * 2))
    n = 1 + round(13 * ease_io(g))
    if appear > 0:
        pill = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(pill)
        x0, y0 = 1060 + 90 * s, 520 - 120 * s
        d.rounded_rectangle([x0, y0, x0 + 330, y0 + 84], 42, fill=(255, 255, 255, round(235 * min(1, appear * 2))))
        c.alpha_composite(pill)
        text(c, f"{n}", x0 + 34, y0 + 42, 46, anchor="lm", alpha=min(1, appear * 2))
        nw = ImageFont.truetype(FONT_SB, 46).getlength(str(n))
        text(c, "pessoas pedindo" if n > 1 else "pessoa pedindo", x0 + 34 + nw + 12, y0 + 46, 26,
             color=(70, 77, 73), font=FONT_MD, anchor="lm", alpha=min(1, appear * 2))
    return c

def scene5(t, D):
    global MAP
    if MAP is None: MAP = Image.open(f"{L}/map.png").convert("RGBA")
    c = MAP.filter(ImageFilter.GaussianBlur(14)) if not hasattr(scene5, "bg") else scene5.bg
    scene5.bg = c
    c = c.copy()
    veil = Image.new("RGBA", (W, H), (238, 241, 238, 120)); c.alpha_composite(veil)
    a = ease_out(seg(t, 0.1, 0.9))
    place(c, img("queue.png", 0.6), 1390, 560 + (1 - a) * 120, 1.0, a)
    title(c, t, "Uma fila por órgão", "Primeiro, o que afeta mais gente.", x=130, y=420, start=0.4)
    return c

def scene6(t, D):
    c = BG_LIGHT.copy()
    st = "card-open.png" if t < 2.6 else "card-verifying.png" if t < 5.4 else "card-resolved.png"
    a = ease_out(seg(t, 0.0, 0.7))
    pulse = 1 + 0.04 * math.exp(-8 * min(abs(t - 2.6), abs(t - 5.4)))
    place(c, img(st, 0.8), 1390, 540 + (1 - a) * 60, pulse, a)
    if 2.6 <= t < 2.9: place(c, img("card-open.png", 0.8), 1390, 540, 1, 1 - (t - 2.6) / 0.3)
    if 5.4 <= t < 5.7: place(c, img("card-verifying.png", 0.8), 1390, 540, 1, 1 - (t - 5.4) / 0.3)
    l1, l2 = ("Resolvido de verdade", "Quem fecha é o cidadão.")
    title(c, t, l1, l2, x=130, y=410, start=0.3)
    if t >= 5.4:
        g = ease_out(seg(t, 5.4, 6.2))
        layer = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(layer)
        r = 60 + 340 * g
        d.ellipse([1390 - r, 540 - r, 1390 + r, 540 + r], outline=(22, 163, 74, round(120 * (1 - g))), width=6)
        c.alpha_composite(layer)
    return c

SCENES = {2: scene2, 3: scene3, 4: scene4, 5: scene5, 6: scene6}

if __name__ == "__main__":
    n, D = int(sys.argv[1]), float(sys.argv[2])
    out = f"out/s{n}.mp4"
    os.makedirs("out", exist_ok=True)
    proc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                             "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast",
                             "-crf", "18", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    frames = round(D * FPS)
    for f in range(frames):
        if len(sys.argv) > 3 and f % int(sys.argv[3]): continue
        im = SCENES[n](f / FPS, D).convert("RGB")
        proc.stdin.write(im.tobytes())
    proc.stdin.close(); proc.wait()
    print(out, frames)
