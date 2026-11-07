"""Voice (v4 take) + soft satisfying SFX for Promo2. Usage: python3 pipeline/promo2_audio.py public/promo"""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import soft_sfx as S
import mix_audio as M
SR = S.SR
d = sys.argv[1]
P = json.load(open(f'{d}/props2.json')); c, m = P['cues'], P['marks']
N = int(P['end'] * SR)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{d}/v4A.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, dtype=np.float32).copy()[:N]
v = v * 10 ** ((-16 - M.lufs(v)) / 20)
sfx = np.zeros((N, 2))
def place(sig, t, g=1.0, pan=0.0):
    i = int(max(0, t) * SR)
    if i >= N: return
    sig = np.asarray(sig)[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    sfx[i:i + len(sig), 0] += sig * g * l; sfx[i:i + len(sig), 1] += sig * g * r
order = ['dream', 'screen', 'real', 'create', 'logo', 'auto', 'chrono', 'statsTitle', 'timeline', 'detailed', 'compare', 'replay', 'heat', 'trips', 'widgets', 'streak', 'ticket', 'cta']
for j, k in enumerate(order[1:]):
    place(S.swish(0.24, j % 2 == 0), c[k] - 0.12, 0.4, 0.4 if j % 2 else -0.4)
    place(S.goo(340 + 30 * (j % 4), 140, 0.16), c[k] + 0.05, 0.4)
# dream
place(S.goo(300, 120, 0.22), 0.05, 0.6)
for i in range(3): place(S.bubble(500 + 100 * i, 900 + 100 * i, 0.08), 0.2 + i * 0.1, 0.35)
for i in range(6): place(S.goo(440 + 40 * i, 200, 0.12), 0.6 + i * 0.12, 0.4, (i % 3 - 1) * 0.4)
# screen time crossed
for i in range(12): place(S.tick(2500), c['screen'] + 0.1 + i * 0.09, 0.1)
place(S.swish(0.25), c['screen'] + 0.7, 0.5); place(S.swish(0.25, False), c['screen'] + 0.85, 0.5)
for k in ['home', 'work', 'gym']: place(S.bubble(500, 1200, 0.1), m[k], 0.45)
# create: pencil scribbles then fill
for i in range(10): place(S.key(20 + i) * 0.5, c['create'] + 0.05 + i * 0.1, 0.35, (i % 3 - 1) * 0.3)
place(S.ding(1480), c['logo'] - 0.6, 0.3)
# logo
for i in range(4): place(S.goo(560 - 40 * i, 220, 0.12), c['logo'] + 0.15 + i * 0.1, 0.45, (-1) ** i * 0.4)
place(S.goo(260, 100, 0.3), c['logo'] + 0.4, 0.8); place(S.ding(1320, 1.2), c['logo'] + 0.6, 0.35)
# auto-detect
for i in range(3): place(S.goo(420 + 60 * i, 170, 0.18), c['auto'] + 0.25 + i * 0.32, 0.55); place(S.bubble(700, 1300, 0.1), c['auto'] + 0.3 + i * 0.32, 0.3)
place(S.ding(1480), c['chrono'] + 0.3, 0.35)
for i in range(12): place(S.tick(2600), c['chrono'] + 0.25 + i * 0.17, 0.1)
# stats chapter
for i in range(5): place(S.bubble(400 + 80 * i, 800 + 120 * i, 0.09), c['statsTitle'] + 0.1 + i * 0.08, 0.35)
place(S.goo(300, 120, 0.25), c['statsTitle'] + 0.3, 0.6)
for i in range(5): place(S.tick(1900), c['timeline'] + 0.4 + i * 0.4, 0.25)
for k in ['jour', 'semaine', 'mois']: place(S.key(5), m[k], 0.6)
for i in range(4): place(S.goo(380 + 50 * i, 160, 0.14), c['compare'] + 1.0 + i * 0.25, 0.45)
for i in range(8): place(S.bubble(500 + 60 * i, 1000 + 60 * i, 0.07), c['heat'] + 0.05 + i * 0.07, 0.22)
for i in range(2): place(S.goo(480 + 60 * i, 200, 0.14), c['widgets'] + 0.15 + i * 0.2, 0.45)
for i in range(3): place(S.goo(480 + 60 * i, 200, 0.14), c['streak'] + 0.15 + i * 0.18, 0.45)
# ticket
for k in range(int(1.6 * 38)): place(S.tick(900 + 60 * (k % 3)) * 0.6, c['ticket'] + 0.35 + k / 38, 0.45)
place(S.goo(240, 90, 0.35), m['douze'] + 0.35, 0.55); place(S.goo(520, 200, 0.16), m['parle'], 0.6)
place(S.goo(300, 110, 0.3), c['cta'] + 0.05, 0.8); place(S.ding(1320, 1.4), c['cta'] + 0.5, 0.4); place(S.goo(480, 200, 0.18), c['cta'] + 0.9, 0.5)
mix = sfx * 0.5
mix[:len(v), 0] += v; mix[:len(v), 1] += v
mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
mix = np.where(np.abs(mix) > 0.89, np.tanh(mix / 0.89) * 0.89, mix)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', f'{d}/audio2.wav'], input=mix.astype(np.float32).tobytes(), check=True)
print('ok')
