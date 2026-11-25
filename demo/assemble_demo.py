"""Joins render/shotNN.mp4 with crossfades, lays narration and music, writes
fiscaliz-demo.mp4, demo.en.vtt and the poster."""
import json, subprocess
S = json.load(open("shots.json")); XF = 0.4
def run(*a): subprocess.run(a, check=True)
files = [f"render/shot{i:02d}.mp4" for i in range(len(S))]
inputs = sum([["-i", f] for f in files], [])
fc, last, offset, starts = [], "0:v", 0.0, [0.0]
for i in range(1, len(files)):
    offset += S[i - 1]["dur"] - XF; starts.append(offset)
    fc.append(f"[{last}][{i}:v]xfade=transition=fade:duration={XF}:offset={offset:.3f}[x{i}]"); last = f"x{i}"
total = starts[-1] + S[-1]["dur"]
vf = ";".join(fc) + f";[{last}]fade=in:st=0:d=0.5,fade=out:st={total-0.7:.3f}:d=0.7[v]"
ai, amix, n = [], [], len(files)
vos = [(i, s["vo"], s.get("vo_at", 0.4)) for i, s in enumerate(S) if s.get("vo")]
for k, (i, vo, at) in enumerate(vos):
    ai += ["-i", f"vo/{vo}.mp3"]; ms = round((starts[i] + at) * 1000)
    amix.append(f"[{n+k}:a]aresample=48000,adelay={ms}|{ms}[a{k}]")
ai += ["-stream_loop", "2", "-i", "music.mp3"]; mi = n + len(vos)  # bed from the explainer video
amix.append(f"[{mi}:a]aresample=48000,volume=0.11,atrim=0:{total:.3f},afade=in:st=0:d=1.5,afade=out:st={total-3:.3f}:d=3[m]")
amix.append("".join(f"[a{k}]" for k in range(len(vos))) + f"[m]amix=inputs={len(vos)+1}:normalize=0,alimiter=limit=0.95[a]")
run("ffmpeg", "-y", "-loglevel", "error", *inputs, *ai, "-filter_complex", vf + ";" + ";".join(amix), "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "fiscaliz-demo.mp4")
narr = json.load(open("narration.json"))
def ts(s):
    h, r = divmod(s, 3600); m, s = divmod(r, 60); return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"
cues = []
for i, vo, at in vos:
    for a, b, txt in narr[vo]["cues"]: cues.append((starts[i] + at + a, starts[i] + at + b, txt))
open("demo.en.vtt", "w").write("WEBVTT\n\n" + "\n".join(f"{ts(a)} --> {ts(b)}\n{t}\n" for a, b, t in cues))
run("ffmpeg", "-y", "-loglevel", "error", "-ss", "3.5", "-i", "fiscaliz-demo.mp4", "-frames:v", "1", "-q:v", "3", "fiscaliz-demo-poster.jpg")
print(json.dumps({"total": round(total, 2), "starts": [round(s, 2) for s in starts]}))
