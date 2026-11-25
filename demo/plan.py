"""Caption cues for each narration line: chunks timed by character share
inside the speech span that faster-whisper finds. Writes narration.json."""
import json, re, subprocess
VO = {
 "n01": "In Apucarana, Brazil, a pothole or a broken streetlight usually means a phone call, a form, and guessing which department is in charge. Fiscaliz.ai removes the guessing.",
 "n02": "A citizen just sends a message on Telegram. No app to install, no sign-up, no form. Here we use the web simulator, which runs the exact same bot. They describe the problem in their own words, typo and all.",
 "n03": "Claude Haiku extracts the problem, the category and the time. The street is matched against the census address file, misspellings included, in milliseconds. The bot only asks for what's missing, then shows a summary to confirm.",
 "n04": "One tap, and it's registered, routed to the right department, and live on the public map.",
 "n05": "Citizens can attach a photo. Before anything is published, a YOLO model blurs every face and license plate, and the original is deleted. Only the anonymized copy goes public.",
 "n06": "When someone else reports the same problem, in different words, there's no duplicate. Nearby open occurrences are candidates, and the AI confirms it's the same issue. The appeal grows instead: now two people are asking for this fix.",
 "n07": "Guardrails come first. An emergency is sent straight to the emergency numbers, and nothing is stored. A water leak goes to the utility company. The AI only fills in data; a tested state machine decides the flow. In our evaluation, it got 53 of 54 messages right, and missed zero emergencies.",
 "n08": "The map is public and real-time: new reports appear without reloading. Each category has its own icon, and you can search and filter by category or department, right in the link. The same interface works on desktop and on the phone.",
 "n09": "For City Hall, each department gets its own queue, ranked by how many people are affected. The reliability page shows the automation in numbers, and the open data downloads as GeoJSON or CSV.",
 "n10": "After the repair, the bot asks the people who reported it whether the problem is really gone. Their answers close the occurrence, or reopen it. The citizen closes the loop.",
 "n11": "Fiscaliz.ai. You point it out. The city fixes it.",
}
from faster_whisper import WhisperModel
m = WhisperModel("small", compute_type="int8")
narr = {}
for k, txt in VO.items():
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"vo/{k}.mp3"]))
    segs, _ = m.transcribe(f"vo/{k}.mp3", language="en", word_timestamps=True)
    words = [w for s in segs for w in s.words]
    s0, s1 = words[0].start, words[-1].end
    parts = re.split(r'(?<=[.;:?!])\s+|(?<=,)\s+(?=\w+\s\w+\s\w+\s\w+)', txt)
    chunks = []
    for p in parts:
        ws = p.split()
        while len(ws) > 12: chunks.append(" ".join(ws[:9])); ws = ws[9:]
        if ws: chunks.append(" ".join(ws))
    merged = []
    for c in chunks:
        if merged and len(merged[-1].split()) + len(c.split()) <= 8: merged[-1] += " " + c
        else: merged.append(c)
    tot = sum(len(c) for c in merged); t = s0; cues = []
    for c in merged:
        span = (s1 - s0) * len(c) / tot; cues.append([round(t, 3), round(t + span + 0.15, 3), c]); t += span
    narr[k] = {"dur": dur, "cues": cues}
    print(k, round(dur, 2), len(cues))
json.dump(narr, open("narration.json", "w"), indent=1)
