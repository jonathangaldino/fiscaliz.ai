# Demo video

Recording and assembly of the 2:28 jury demo (script: `docs/marca/roteiro-demo.md` on `dev`).
Run in the Higgsfield sandbox (Playwright, ffmpeg, Pillow, faster-whisper).

1. `node clips.js A` … `H` records each scene against the dev environment (CDP screencast, 2x).
   `foto-buraco.jpg` is the synthetic report photo (Higgsfield job 945708b1, same image as the explainer's scene 2b).
2. Narration: Text to Speech V2 (ElevenLabs) on Higgsfield, voice `75e72cd5-011b-4130-a474-e8b1ab341f04`, one file per line in `vo/n01.mp3` … `n11.mp3` (texts in `plan.py`).
3. `python3 plan.py` writes the caption cues; `python3 shots.py` writes the shot list.
4. `python3 render_demo.py <i>` renders each shot (run them in parallel), then `python3 assemble_demo.py`.

`ai1.mp4`, `ai7.mp4` and `music.mp3` are the explainer's opening, closing and music bed (see `../assemble.py`).
