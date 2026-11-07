"""Voice + soft satisfying SFX for the Lucas2 story video. Usage: python3 pipeline/story2_audio.py public/story2"""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import soft_sfx as S
import mix_audio as M
SR = S.SR
d = sys.argv[1]
P = json.load(open(f'{d}/props.json'))
cue = {c['id']: c['at'] for c in P['cues']}
N = int(P['end'] * SR)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{d}/voice.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, dtype=np.float32).copy()[:N]
v = v * 10 ** ((-16 - M.lufs(v)) / 20)
sfx = np.zeros((N, 2))
def place(sig, t, g=1.0, pan=0.0):
    i = int(max(0, t) * SR)
    if i >= N: return
    sig = np.asarray(sig)[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    sfx[i:i + len(sig), 0] += sig * g * l; sfx[i:i + len(sig), 1] += sig * g * r
for k in ['evenings', 'question', 'install', 'work', 'chrono', 'places', 'counted', 'work31', 'gym12', 'tomorrow', 'cta']:
    place(S.swish(0.28), cue[k] - 0.14, 0.35)
place(S.goo(300, 130, 0.22), 0.02, 0.6)
place(S.goo(520, 200, 0.16), 0.37, 0.7)                     # name sticker
for i in range(28): place(S.bubble(500 + 15 * i, 900 + 15 * i, 0.05), cue['evenings'] + 0.2 + i * 0.035, 0.12, ((i % 7) - 3) / 4)
for i in range(3): place(S.goo(420 + 60 * i, 200, 0.14), cue['question'] + 0.25 + i * 0.22, 0.5)
for i in range(12): place(S.tick(2400), cue['question'] + i * 0.12, 0.12)
place(S.goo(460, 180, 0.2), cue['install'] + 0.35, 0.7)
place(S.key(3), cue['install'] + 0.9, 0.9); place(S.ding(1560), cue['install'] + 0.95, 0.35)
for i in range(7): place(S.tick(1700 + 100 * (i % 2)), cue['work'] + 0.15 + i * 0.18, 0.2, (-1) ** i * 0.3)
place(S.goo(280, 120, 0.25), cue['chrono'] + 0.2, 0.7); place(S.ding(1480), cue['chrono'] + 0.45, 0.4)
for t in P['pins']: place(S.goo(420, 160, 0.2), t, 0.75); place(S.bubble(600, 1200), t + 0.12, 0.3)
place(S.thud(), cue['counted'] + 0.25, 0.6); place(S.bubble(700, 1400), cue['counted'] + 0.85, 0.35)
for k in ['work31', 'gym12']:
    place(S.goo(360, 140, 0.2), cue[k] + 0.1, 0.7)
    for i in range(14): place(S.tick(2600), cue[k] + 0.05 + i * 0.045, 0.12)
place(S.goo(200, 90, 0.35), cue['gym12'] + 0.75, 0.5)          # "aïe"
for i in range(8): place(S.tick(1700 + 100 * (i % 2)), cue['tomorrow'] + 0.15 + i * 0.18, 0.2)
place(S.goo(300, 110, 0.3), cue['cta'] + 0.05, 0.9); place(S.bubble(600, 1500, 0.14), cue['cta'] + 0.5, 0.45); place(S.ding(1320, 1.4), cue['cta'] + 0.55, 0.4)
place(S.goo(480, 200, 0.18), cue['cta'] + 1.0, 0.6)
mix = sfx * 0.6
mix[:len(v), 0] += v; mix[:len(v), 1] += v
mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
mix = np.where(np.abs(mix) > 0.89, np.tanh(mix / 0.89) * 0.89, mix)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', f'{d}/audio.wav'], input=mix.astype(np.float32).tobytes(), check=True)
print('ok')
