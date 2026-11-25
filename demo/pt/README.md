# Demo video, pt-BR

Same recordings (`../out/`) and time maps as the English cut; only the narration, captions and on-screen text change.

1. Narration: same voice, texts in `plan.py` (pt-BR `VO`, transcribed with `language="pt"`), files in `vo/n01.mp3` … `n11.mp3`.
2. `python3 shots.py` builds `shots.json` from `../shots.json` with Portuguese texts; shots hold their last frame when a line is longer.
3. `render_demo.py` here is `../render_demo.py` reading frames from `../out/` and with the intro and outro texts in Portuguese.
4. `python3 assemble_demo.py` writes `fiscaliz-demo-pt.mp4` and `demo.pt-BR.vtt`.
