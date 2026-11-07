"""Energetic voice + quick satisfying SFX on every whip. Usage: python3 pipeline/promo_audio.py public/promo"""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import soft_sfx as S
import mix_audio as M
SR = S.SR
d = sys.argv[1]
P = json.load(open(f'{d}/props.json')); c, m = P['cues'], P['marks']
N = int(P['end'] * SR)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{d}/voice.wav', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, dtype=np.float32).copy()[:N]
v = v * 10 ** ((-16 - M.lufs(v)) / 20)
sfx = np.zeros((N, 2))
def place(sig, t, g=1.0, pan=0.0):
    i = int(max(0, t) * SR)
    if i >= N: return
    sig = np.asarray(sig)[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    sfx[i:i + len(sig), 0] += sig * g * l; sfx[i:i + len(sig), 1] += sig * g * r
order = ['hook', 'chrono', 'replay', 'heat', 'trips', 'stats', 'streak', 'ticket', 'cta']
for j, k in enumerate(order[1:]):
    place(S.swish(0.22, j % 2 == 0), c[k] - 0.12, 0.45, 0.4 if j % 2 else -0.4)
    place(S.goo(340 + 30 * (j % 4), 140, 0.16), c[k] + 0.05, 0.45)
for i in range(4): place(S.goo(420 + 50 * i, 180, 0.13), 0.15 + i * 0.12, 0.5, (-1) ** i * 0.4)
place(S.goo(520, 200, 0.16), 0.4, 0.5)
place(S.ding(1480), c['chrono'] + 0.3, 0.35)
for i in range(10): place(S.tick(2600), c['chrono'] + 0.25 + i * 0.17, 0.12)
for i in range(6): place(S.tick(1800 + 80 * (i % 2)), c['replay'] + 0.3 + i * 0.35, 0.18)
for i in range(8): place(S.bubble(500 + 60 * i, 1000 + 60 * i, 0.07), c['heat'] + 0.05 + i * 0.07, 0.25)
for k in ['semaine', 'mois']: place(S.key(5), m[k], 0.6)
for i in range(3): place(S.goo(480 + 60 * i, 200, 0.14), c['streak'] + 0.15 + i * 0.18, 0.55); place(S.bubble(700, 1500, 0.1), c['streak'] + 0.25 + i * 0.18, 0.3)
for k in range(int(1.0 * 38)): place(S.tick(900 + 60 * (k % 3)) * 0.6, c['ticket'] + 0.35 + k / 38, 0.5)
place(S.goo(240, 90, 0.35), m['douze'] + 0.35, 0.55)
place(S.goo(300, 110, 0.3), c['cta'] + 0.05, 0.8); place(S.ding(1320, 1.4), c['cta'] + 0.5, 0.4); place(S.goo(480, 200, 0.18), c['cta'] + 0.9, 0.5)
mix = sfx * 0.55
mix[:len(v), 0] += v; mix[:len(v), 1] += v
mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
mix = np.where(np.abs(mix) > 0.89, np.tanh(mix / 0.89) * 0.89, mix)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', f'{d}/audio.wav'], input=mix.astype(np.float32).tobytes(), check=True)
print('ok')
