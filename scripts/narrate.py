"""Synthesize every <Say> line in docs/*.mdx with MiniMax T2A.

Writes docs/public/audio/<id>.mp3 and theme/narration/manifest.json (page order, durations).
A line is re-synthesized only when its spoken text or the voice changed; --force <id...> redoes lines.
The API key is read from $MINIMAX_API_KEY or ~/.config/pixel-science-video/minimax.env, never stored here.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
AUDIO = DOCS / "public/audio"
MANIFEST = ROOT / "theme/narration/manifest.json"
API = "https://api.minimaxi.com/v1/t2a_v2"
SHARED_ENV = Path.home() / ".config/pixel-science-video/minimax.env"
VOICE = {"voice_id": "Chinese (Mandarin)_Gentleman", "speed": 1.05, "vol": 1, "pitch": 0}

# Spoken forms for names the voice misreads. Longest keys first so "pi-ai" wins over "pi".
LEXICON = {
    "pi-tui": "派 T U I",
    "pi-ai": "派 A I",
    "agent-core": "agent core",
    "coding-agent": "coding agent",
    "agent-loop.ts": "agent loop 点 T S",
    "anthropic-messages": "anthropic messages",
    "Agent.prompt": "Agent 点 prompt",
    "AgentSession": "Agent Session",
    "streamSimple": "stream simple",
    "runLoop": "run loop",
    "agent_end": "agent end",
    "follow-up": "follow up",
    "JSONL": "JSON L",
}
SAY = re.compile(r'<Say\s+id="([^"]+)"[^>]*>(.*?)</Say>', re.S)


def load_key():
    if os.environ.get("MINIMAX_API_KEY"):
        return os.environ["MINIMAX_API_KEY"]
    if SHARED_ENV.exists():
        for line in SHARED_ENV.read_text().splitlines():
            if line.startswith("MINIMAX_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit(f"MINIMAX_API_KEY not found (env or {SHARED_ENV})")


def spoken(text):
    for k in sorted(LEXICON, key=len, reverse=True):
        text = text.replace(k, LEXICON[k])
    return re.sub(r"\bpi\b", "派", text)


def pages():
    """Page routes in sidebar order, with their narrated lines."""
    order = json.loads((DOCS / "_meta.json").read_text())
    out = []
    for name in order:
        src = (DOCS / f"{name}.mdx").read_text()
        route = "/" if name == "index" else f"/{name}"
        out.append((route, [(m.group(1), " ".join(m.group(2).split())) for m in SAY.finditer(src)]))
    return out


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def synth(key, line_id, text):
    body = {"model": "speech-2.8-hd", "text": text, "stream": False, "voice_setting": VOICE,
            "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1}}
    req = urllib.request.Request(API, data=json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    for attempt in range(6):
        with urllib.request.urlopen(req, timeout=120) as r:
            res = json.loads(r.read())
        code = res.get("base_resp", {}).get("status_code")
        if code != 1002:  # 1002: requests-per-minute limit
            break
        time.sleep(10 * (attempt + 1))
    if code != 0:
        raise RuntimeError(f"{line_id}: {res.get('base_resp')}")
    mp3 = AUDIO / f"{line_id}.mp3"
    mp3.write_bytes(bytes.fromhex(res["data"]["audio"]))
    return duration(mp3)


def main():
    force = [a for a in sys.argv[1:] if not a.startswith("--")]
    AUDIO.mkdir(parents=True, exist_ok=True)
    old = json.loads(MANIFEST.read_text())["lines"] if MANIFEST.exists() else {}
    all_pages = pages()
    lines = {}
    todo = []
    for _, page_lines in all_pages:
        for line_id, text in page_lines:
            if line_id in lines:
                raise SystemExit(f"duplicate line id {line_id}")
            say = spoken(text)
            h = hashlib.sha1(json.dumps([say, VOICE], ensure_ascii=False).encode()).hexdigest()[:12]
            lines[line_id] = {"duration": old.get(line_id, {}).get("duration", 0), "hash": h}
            fresh = old.get(line_id, {}).get("hash") == h and (AUDIO / f"{line_id}.mp3").exists()
            if not fresh or line_id in force:
                todo.append((line_id, say))

    if todo:
        key = load_key()
        with ThreadPoolExecutor(2) as pool:
            for (line_id, say), dur in zip(todo, pool.map(lambda t: synth(key, *t), todo)):
                lines[line_id]["duration"] = dur
                print(f"{line_id} {dur:5.2f}s {say}", flush=True)

    for stale in set(p.stem for p in AUDIO.glob("*.mp3")) - set(lines):
        (AUDIO / f"{stale}.mp3").unlink()
    MANIFEST.write_text(json.dumps({"pages": [r for r, _ in all_pages], "lines": lines}, ensure_ascii=False, indent=1))
    total = sum(v["duration"] for v in lines.values())
    print(f"{len(lines)} lines, {len(todo)} synthesized, total {total / 60:.1f} min")


if __name__ == "__main__":
    main()
