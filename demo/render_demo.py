"""Fiscaliz.ai demo video: composes the screencast recordings into scenes.
Usage: python3 render_demo.py <shot-index> -> render/shotNN.mp4"""
import bisect, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1920, 1080, 30
FONTS = os.environ.get("FONTS", "../fonts/")
def font(weight, size): return ImageFont.truetype(f"{FONTS}Inter-{weight}.ttf", size)
INK, MUTED, ACCENT = (11, 13, 12), (70, 77, 73), (11, 95, 198)

def ease_out(t): t = max(0, min(1, t)); return 1 - (1 - t) ** 3
def seg(t, a, b): return 0 if t <= a else 1 if t >= b else (t - a) / (b - a)

def radial(c1, c2):
    mask = Image.radial_gradient("L").resize((W, H))
    return Image.composite(Image.new("RGB", (W, H), c2), Image.new("RGB", (W, H), c1), mask).convert("RGBA")
BG = radial((255, 255, 255), (220, 229, 238))

# ------------------------------------------------------------ recordings
class Clip:
    """Screencast frames arrive only when the page changes: frame at t = last one before t."""
    def __init__(self, name):
        d = json.load(open(f"out/{name}/frames.json"))
        fr = sorted((ts - d["t0"], p) for p, ts in d["frames"])
        self.t0, self.times, self.paths = d["t0"], [t for t, _ in fr], [p for _, p in fr]
    def path(self, t):
        i = max(0, bisect.bisect_right(self.times, t) - 1); return self.paths[i]
_img = {}
def load(path, size):
    key = (path, size)
    if key not in _img:
        if len(_img) > 40: _img.clear()
        _img[key] = Image.open(path).convert("RGB").resize(size, Image.LANCZOS).convert("RGBA")
    return _img[key]

def rounded_mask(size, r):
    m = Image.new("L", size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255); return m

def shadow(size, r, blur=40, alpha=70, dy=24):
    w, h = size; pad = blur * 2
    s = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle((pad, pad + dy, pad + w, pad + h + dy), r, fill=(16, 40, 80, alpha))
    return s.filter(ImageFilter.GaussianBlur(blur)), pad

# Phone mock: 780x1688 screencast -> 440x952 screen in a dark frame.
PH_SCREEN = (440, 952); PH_PAD = 13; PH_R = 62
_ph_parts = {}
def phone(screen_img):
    if not _ph_parts:
        size = (PH_SCREEN[0] + 2 * PH_PAD, PH_SCREEN[1] + 2 * PH_PAD)
        body = Image.new("RGBA", size, (0, 0, 0, 0))
        ImageDraw.Draw(body).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), PH_R, fill=(22, 24, 27, 255))
        ImageDraw.Draw(body).rounded_rectangle((2, 2, size[0] - 3, size[1] - 3), PH_R - 2, outline=(70, 74, 80, 255), width=2)
        _ph_parts.update(body=body, mask=rounded_mask(PH_SCREEN, PH_R - PH_PAD), shadow=shadow(size, PH_R))
    out = _ph_parts["body"].copy()
    scr = screen_img.copy(); scr.putalpha(_ph_parts["mask"])
    out.alpha_composite(scr, (PH_PAD, PH_PAD))
    return out

# Browser window: 2560x1600 screencast -> content (w, w*10/16) under a 40 px bar.
_win = {}
def window(content, url, w=1360):
    h = round(w * 10 / 16); bar = 40
    key = (w, url)
    if key not in _win:
        frame = Image.new("RGBA", (w, h + bar), (0, 0, 0, 0)); d = ImageDraw.Draw(frame)
        d.rounded_rectangle((0, 0, w - 1, h + bar - 1), 16, fill=(236, 239, 243, 255))
        for i, col in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
            d.ellipse((18 + i * 22, 14, 30 + i * 22, 26), fill=col + (255,))
        pw = min(560, w - 240); px = (w - pw) // 2
        d.rounded_rectangle((px, 8, px + pw, 32), 12, fill=(255, 255, 255, 255))
        d.text((w // 2, 20), url, font=font("Medium", 15), fill=(90, 96, 104, 255), anchor="mm")
        cm = Image.new("L", (w, h + bar), 0); ImageDraw.Draw(cm).rounded_rectangle((0, 0, w - 1, h + bar - 1), 16, fill=255)
        _win[key] = (frame, cm, shadow((w, h + bar), 16, blur=36, alpha=60))
    frame, cm, sh = _win[key]
    out = frame.copy(); out.alpha_composite(content, (0, bar))
    out.putalpha(cm)
    return out, sh

def place(canvas, im, cx, cy, alpha=1.0, sh=None):
    x, y = round(cx - im.width / 2), round(cy - im.height / 2)
    if sh is not None:
        s, pad = sh
        if alpha < 1: s = s.copy(); s.putalpha(s.getchannel("A").point(lambda v: round(v * alpha)))
        canvas.alpha_composite(s, (x - pad, y - pad))
    if alpha < 0.999:
        im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: round(v * alpha)))
    canvas.alpha_composite(im, (x, y))

def text(canvas, s, x, y, f, color=INK, alpha=1.0, anchor="la", dy=0):
    if alpha <= 0: return
    layer = Image.new("RGBA", (W, H)); ImageDraw.Draw(layer).text((x, y + dy), s, font=f, fill=color + (round(255 * alpha),), anchor=anchor)
    canvas.alpha_composite(layer)

def text_block(canvas, t, kicker, title, sub, x=150, y=300):
    a = ease_out(seg(t, 0.1, 0.7))
    text(canvas, kicker.upper(), x, y, font("SemiBold", 24), ACCENT, a, dy=(1 - a) * 20)
    lines = title.split("\n")
    for i, line in enumerate(lines):
        b = ease_out(seg(t, 0.2 + 0.08 * i, 0.8 + 0.08 * i))
        text(canvas, line, x, y + 44 + i * 78, font("SemiBold", 66), INK, b, dy=(1 - b) * 24)
    c = ease_out(seg(t, 0.45, 1.05))
    yy = y + 44 + len(lines) * 78 + 18
    for i, line in enumerate(sub.split("\n")):
        text(canvas, line, x, yy + i * 44, font("Medium", 32), MUTED, c, dy=(1 - c) * 20)
    return yy + len(sub.split("\n")) * 44 + 40

CHIP_COLORS = {"info": ((255, 255, 255, 235), ACCENT), "ok": ((231, 246, 236, 240), (22, 128, 61)),
               "warn": ((255, 243, 214, 240), (161, 98, 7)), "stat": ((11, 95, 198, 240), (255, 255, 255))}
def chip(canvas, t, t_in, label, x, y, kind="info"):
    a = ease_out(seg(t, t_in, t_in + 0.5))
    if a <= 0: return
    f = font("SemiBold", 28); tw = f.getlength(label)
    bg, fg = CHIP_COLORS[kind]
    w, h = round(tw + 64), 58
    layer = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    d.rounded_rectangle((20, 24, 20 + w, 24 + h), 29, fill=(16, 40, 80, 40)); layer = layer.filter(ImageFilter.GaussianBlur(8))
    d = ImageDraw.Draw(layer); d.rounded_rectangle((20, 20, 20 + w, 20 + h), 29, fill=bg)
    d.ellipse((40, 20 + h // 2 - 6, 52, 20 + h // 2 + 6), fill=fg + (255,))
    d.text((62, 20 + h // 2), label, font=f, fill=fg + (255,), anchor="lm")
    if a < 1: layer.putalpha(layer.getchannel("A").point(lambda v: round(v * a)))
    canvas.alpha_composite(layer, (round(x - 20 + (1 - a) * -24), round(y - 20)))

def ring(canvas, t, t_in, cx, cy, r, label):
    a = ease_out(seg(t, t_in, t_in + 0.5))
    if a <= 0: return
    layer = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(layer)
    rr = r * (1.25 - 0.25 * a)
    d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(255, 196, 0, round(255 * a)), width=5)
    f = font("SemiBold", 24); tw = f.getlength(label)
    d.rounded_rectangle((cx + r + 10, cy - 20, cx + r + 34 + tw, cy + 20), 20, fill=(17, 24, 39, round(220 * a)))
    d.text((cx + r + 22, cy), label, font=f, fill=(255, 255, 255, round(255 * a)), anchor="lm")
    canvas.alpha_composite(layer)

# ------------------------------------------------------------ captions
NARR = json.load(open("narration.json"))
def caption(canvas, shot, t):
    vo = shot.get("vo") or shot.get("cap_vo")  # cap_vo: a line that started in the previous shot
    if not vo or shot.get("no_captions"): return
    start = shot.get("vo_at", 0.4) if shot.get("vo") else shot["cap_at"]; cues = NARR[vo]["cues"]
    cur = next((c for c in cues if start + c[0] <= t < start + c[1]), None)
    if not cur: return
    f = font("Medium", 34); words = cur[2].split(); lines, line = [], ""
    for w_ in words:
        test = (line + " " + w_).strip()
        if f.getlength(test) > (980 if shot["kind"] == "phone" else 1380) and line: lines.append(line); line = w_
        else: line = test
    lines.append(line)
    bw = max(f.getlength(l) for l in lines) + 56; bh = 50 * len(lines) + 24
    y1 = 1052; y0 = y1 - bh
    cx = W / 2 if shot["kind"] != "phone" else 150 + bw / 2  # phone scenes: left column, clear of the phone
    layer = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(layer)
    d.rounded_rectangle((cx - bw / 2, y0, cx + bw / 2, y1), 22, fill=(17, 24, 39, 215))
    for i, l in enumerate(lines): d.text((cx, y0 + 12 + 25 + i * 50), l, font=f, fill=(255, 255, 255, 255), anchor="mm")
    canvas.alpha_composite(layer)

# ------------------------------------------------------------ time mapping
def src_time(segs, t):
    acc = 0.0
    for a, b, d in segs:
        if t < acc + d or [a, b, d] == segs[-1]:
            u = min(1.0, max(0.0, (t - acc) / d)) if d > 0 else 0
            return a + (b - a) * u
        acc += d
    return segs[-1][1]

def url_for(shot, st, key="urls"):
    url = shot[key][0][1]
    for at, u in shot[key]:
        if st >= at: url = u
    return url

SHOTS = json.load(open("shots.json"))
CLIPS = {}
def clip(name):
    if name not in CLIPS: CLIPS[name] = Clip(name)
    return CLIPS[name]

_mov = {}
def movie_frame(path, t, speed):
    if path not in _mov:
        d = f"render/frames_{os.path.basename(path)}"
        if not os.path.isdir(d):
            os.makedirs(d); subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", "scale=1920:1080,fps=30", f"{d}/%04d.png"], check=True)
        _mov[path] = sorted(os.listdir(d)), d
    files, d = _mov[path]
    i = min(len(files) - 1, int(t * speed * 30))
    return Image.open(f"{d}/{files[i]}").convert("RGBA")

def draw(shot, t):
    k = shot["kind"]
    if k in ("intro", "outro"):
        c = movie_frame(shot["movie"], t, shot["speed"])
        if k == "intro":  # the explainer's diorama on the right, feathered into the background
            m = c.resize((1344, 756), Image.LANCZOS)
            m.putalpha(Image.radial_gradient("L").resize((1344, 756)).point(lambda v: 255 if v < 70 else max(0, 255 - (v - 70) * 2.6)))
            c = BG.copy(); c.alpha_composite(m, (W - 1344 - 20, 150))
            text_block(c, t, "Live demo · Hack Brasil 2026", "Fiscaliz.ai", "Urban problems, reported in a chat\nand routed to the right department.", x=150, y=330)
            chip(c, t, 1.6, "Track 07 · Logistics and automation", 150, 640, "info")
        else:
            a = ease_out(seg(t, 1.0, 1.8))
            text(c, "You point it out. The city fixes it.", W / 2, 930, font("SemiBold", 72), (255, 255, 255), a, "mm")
            b = ease_out(seg(t, 1.8, 2.6))
            text(c, "Next.js · Convex · Claude Haiku · ElevenLabs Scribe · YOLO on Modal · IBGE census addresses · Telegram Bot API", W / 2, 70, font("Medium", 26), (255, 255, 255), b * 0.9, "mm")
            text(c, "github.com/jonathangaldino/fiscaliz.ai", W / 2, 1020, font("Medium", 30), (255, 255, 255), b * 0.9, "mm")
        caption(c, shot, t); return c
    c = BG.copy()
    if k == "phone":
        cl = clip(shot["clip"]); st = src_time(shot["segs"], t)
        scr = load(cl.path(st), PH_SCREEN)
        a = ease_out(seg(t, 0.0, 0.8)); cx = shot.get("phone_x", 1330) + (1 - a) * 300
        place(c, phone(scr), cx, 540, a, _ph_parts.get("shadow"))
        for r in shot.get("rings", []):  # [t_in, x, y, radius, label], x/y in the 390x844 css px of the screen
            sx = cx - PH_SCREEN[0] / 2 + r[1] * PH_SCREEN[0] / 390; sy = 540 - PH_SCREEN[1] / 2 + r[2] * PH_SCREEN[1] / 844
            ring(c, t, r[0], sx, sy, r[3], r[4])
        y = text_block(c, t, shot["kicker"], shot["title"], shot["sub"])
        for i, (ti, lab, kind) in enumerate(shot.get("chips", [])):
            chip(c, t, ti, lab, 150, y + i * 76, kind)
    elif k == "desk":
        cl = clip(shot["clip"]); st = src_time(shot["segs"], t)
        w = 1360; content = load(cl.path(st), (w, round(w * 10 / 16)))
        win, sh = window(content, url_for(shot, st), w)
        a = ease_out(seg(t, 0.0, 0.7))
        place(c, win, W / 2, 595 + (1 - a) * 40, a, sh)
        ka = ease_out(seg(t, 0.1, 0.7))
        text(c, shot["kicker"].upper(), 280, 52, font("SemiBold", 22), ACCENT, ka)
        text(c, shot["title"], 280, 84, font("SemiBold", 40), INK, ka)
        f = font("SemiBold", 28)
        for i, (ti, lab, kind) in enumerate(shot.get("chips", [])):  # right-aligned row in the title line
            right = 1640 - sum(f.getlength(x[1]) + 84 for x in shot["chips"][i + 1:])
            chip(c, t, ti, lab, right - (f.getlength(lab) + 64), 60, kind)
    elif k == "split":  # phone on the left, desktop on the right, on the same wall clock
        dk = clip(shot["desk"]); ph = clip(shot["clip"])
        st = src_time(shot["segs"], t); abs_t = clip(shot["master"]).t0 + st
        ph_t = min(abs_t - ph.t0, shot.get("phone_max", 1e9)); dk_t = abs_t - dk.t0
        w = 1180; content = load(dk.path(dk_t), (w, round(w * 10 / 16)))
        win, sh = window(content, url_for(shot, dk_t, "desk_urls"), w)
        a = ease_out(seg(t, 0.0, 0.8))
        place(c, win, 1250, 560 + (1 - a) * 40, a, sh)
        place(c, phone(load(ph.path(ph_t), PH_SCREEN)), 420 - (1 - a) * 200, 540, a, _ph_parts.get("shadow"))
        if shot.get("inset"):  # magnified crop of the desktop page (css px of the 1280x800 viewport)
            ins = shot["inset"]; x0, y0, x1, y1 = ins["css"]
            src = Image.open(dk.path(dk_t)).convert("RGBA").crop((x0 * 2, y0 * 2, x1 * 2, y1 * 2))
            sc = ins["scale"]; src = src.resize((round((x1 - x0) * sc), round((y1 - y0) * sc)), Image.LANCZOS)
            src.putalpha(rounded_mask(src.size, 18))
            ia = ease_out(seg(t, ins["at"], ins["at"] + 0.6))
            place(c, src, ins["cx"], ins["cy"], ia, shadow(src.size, 18, blur=24, alpha=80))
            text(c, ins["label"], ins["cx"] - src.width / 2, ins["cy"] - src.height / 2 - 40, font("SemiBold", 26), ACCENT, ia)
        ka = ease_out(seg(t, 0.1, 0.7))
        text(c, shot["kicker"].upper(), 660, 70, font("SemiBold", 22), ACCENT, ka)
        text(c, shot["title"], 660, 102, font("SemiBold", 40), INK, ka)
    caption(c, shot, t)
    return c

if __name__ == "__main__":
    i = int(sys.argv[1]); shot = SHOTS[i]
    n = round(shot["dur"] * FPS); out = f"render/shot{i:02d}.mp4"
    os.makedirs("render", exist_ok=True)
    proc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                             "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for f in range(n):
        proc.stdin.write(draw(shot, f / FPS).convert("RGB").tobytes())
    proc.stdin.close(); proc.wait(); print(out, n)
