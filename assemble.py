"""Assemble the explainer: scenes, crossfades, narration, music, end card, captions."""
import json, subprocess
from PIL import Image, ImageDraw, ImageFont

FPS = 30
XF = 0.4
SCENES = [("ai1.mp4", 7.6), ("out/s2.mp4", 9.4), ("out/s22.mp4", 8.8), ("out/s3.mp4", 10.8), ("out/s4.mp4", 9.3),
          ("out/s5.mp4", 7.6), ("out/s6.mp4", 8.2), ("s7.mp4", 6.5)]
VO_DELAY = [0.6, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 1.6]
LINES = [
    ["Um buraco na rua. Um poste apagado.", "Em Apucarana, quem vê o problema agora tem para quem contar."],
    ["É só mandar uma mensagem para o Fiscaliz.ai no Telegram.", "Escreva ou grave um áudio, do seu jeito, e mande a localização."],
    ["Dá para mandar uma foto também.", "Rostos e placas de carro são borrados automaticamente,", "para proteger quem aparece na imagem."],
    ["A inteligência artificial entende o problema, escolhe a categoria", "e encaminha para o órgão certo da Prefeitura.", "Sem formulário e sem fila de atendimento."],
    ["Na hora, o relato vira um pin no mapa público.", "Quando outras pessoas relatam o mesmo problema, o apoio se soma e o pin cresce."],
    ["A Prefeitura vê tudo organizado:", "cada secretaria com a sua fila, primeiro o que afeta mais gente."],
    ["Depois do conserto, o bot pergunta a quem relatou se o problema acabou mesmo.", "Quem fecha a ocorrência é o cidadão."],
    ["Fiscaliz.ai. Você aponta. A cidade resolve."],
]

def run(*a): subprocess.run(a, check=True)
def dur(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))

# End card overlay (scene 7)
ov = Image.new("RGBA", (1920, 1080))
d = ImageDraw.Draw(ov)
sb = ImageFont.truetype("fonts/Inter-SemiBold.ttf", 84); md = ImageFont.truetype("fonts/Inter-Medium.ttf", 36)
d.text((960, 810), "Você aponta. A cidade resolve.", font=sb, fill=(255, 255, 255, 255), anchor="mm")
ov.save("endcard.png")
run("ffmpeg", "-y", "-loglevel", "error", "-i", "ai7.mp4", "-loop", "1", "-i", "endcard.png", "-filter_complex",
    "[0:v]scale=1920:1080,fps=30,setsar=1[b];[1:v]format=rgba,fade=in:st=1.4:d=0.8:alpha=1[o];[b][o]overlay=0:0:shortest=1,format=yuv420p",
    "-t", "6.5", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "s7.mp4")

# Normalize every scene to 1920x1080@30, exact duration
norm = []
for i, (f, D) in enumerate(SCENES):
    o = f"n{i+1}.mp4"
    run("ffmpeg", "-y", "-loglevel", "error", "-i", f, "-vf",
        f"scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1,tpad=stop_mode=clone:stop_duration=2",
        "-t", str(D), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", o)
    norm.append(o)

# Crossfades
inputs = sum([["-i", f] for f in norm], [])
fc, last, offset, starts = [], "0:v", 0.0, [0.0]
for i in range(1, len(norm)):
    offset += SCENES[i - 1][1] - XF
    starts.append(offset)
    out = f"x{i}"
    fc.append(f"[{last}][{i}:v]xfade=transition=fade:duration={XF}:offset={offset:.3f}[{out}]")
    last = out
total = starts[-1] + SCENES[-1][1]
fc[-1] = fc[-1]  # final label
vf = ";".join(fc) + f";[{last}]fade=in:st=0:d=0.5,fade=out:st={total-0.6:.3f}:d=0.6[v]"

# Audio: narration at scene starts + music bed
ai = []
amix = []
VO = ["vo/s1.mp3", "vo/s2.mp3", "vo/s2b.mp3", "vo/s3.mp3", "vo/s4.mp3", "vo/s5.mp3", "vo/s6.mp3", "vo/s7.mp3"]
N = len(VO)
for i in range(N):
    ai += ["-i", VO[i]]
for i in range(N):
    ms = round((starts[i] + VO_DELAY[i]) * 1000)
    amix.append(f"[{len(norm)+i}:a]aresample=48000,adelay={ms}|{ms},volume=1.0[a{i}]")
ai += ["-i", "music.mp3"]
mi = len(norm) + N
amix.append(f"[{mi}:a]aresample=48000,atempo={dur('music.mp3')/total:.4f},volume=0.16,afade=in:st=0:d=1.5,afade=out:st={total-2.5:.3f}:d=2.5[m]")
amix.append("".join(f"[a{i}]" for i in range(N)) + "[m]" + f"amix=inputs={N+1}:normalize=0,atrim=0:{total:.3f},alimiter=limit=0.95[a]")
run("ffmpeg", "-y", "-loglevel", "error", *inputs, *ai, "-filter_complex", vf + ";" + ";".join(amix),
    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "fiscaliz-explicativo.mp4")

# Captions: split each scene's narration across its lines by character share
def ts(s):
    h, r = divmod(s, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"
cues = []
for i in range(N):
    st = starts[i] + VO_DELAY[i]; d = dur(VO[i])
    total_chars = sum(len(x) for x in LINES[i]); t = st
    for line in LINES[i]:
        span = d * len(line) / total_chars
        cues.append((t, t + span, line)); t += span
vtt = "WEBVTT\n\n" + "\n".join(f"{ts(a)} --> {ts(b)}\n{txt}\n" for a, b, txt in cues)
open("explicativo.pt-BR.vtt", "w").write(vtt)
run("ffmpeg", "-y", "-loglevel", "error", "-ss", f"{starts[-1]+3.2:.2f}", "-i", "fiscaliz-explicativo.mp4", "-frames:v", "1", "-q:v", "3", "fiscaliz-explicativo-poster.jpg")
print(json.dumps({"total": round(total, 2), "starts": [round(s, 2) for s in starts]}))
print(vtt)
