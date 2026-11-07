"""Voice + soft satisfying SFX for an automated Spot video. Usage: python3 pipeline/spot_audio.py props.json voice.mp3 out.wav"""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import soft_sfx as S
import mix_audio as M
SR = S.SR
P = json.load(open(sys.argv[1])); voice, out = sys.argv[2], sys.argv[3]
m = P['marks']; N = int(P['end'] * SR)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voice, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, dtype=np.float32).copy()[:N]
v = v * 10 ** ((-16 - M.lufs(v)) / 20)
sfx = np.zeros((N, 2))
def place(sig, t, g=1.0, pan=0.0):
    if t is None: return
    i = int(max(0, t) * SR)
    if i >= N: return
    sig = np.asarray(sig)[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    sfx[i:i + len(sig), 0] += sig * g * l; sfx[i:i + len(sig), 1] += sig * g * r
for j, sc in enumerate(P['scenes']):
    a = sc['at']; k = sc['id']
    if j: place(S.swish(0.24, j % 2 == 0), a - 0.12, 0.4, 0.4 if j % 2 else -0.4); place(S.goo(340 + 30 * (j % 4), 140, 0.16), a + 0.05, 0.4)
    if k == 'dream':
        for i in range(6): place(S.goo(440 + 40 * i, 200, 0.12), a + 0.6 + i * 0.12, 0.4, (i % 3 - 1) * 0.4)
    elif k == 'screen':
        for i in range(12): place(S.tick(2500), a + 0.1 + i * 0.09, 0.1)
        place(S.swish(0.25), a + 0.7, 0.5); place(S.swish(0.25, False), a + 0.85, 0.5)
    elif k == 'real':
        for key in ['home', 'work', 'gym']: place(S.bubble(500, 1200, 0.1), m.get(key), 0.45)
    elif k == 'create':
        for i in range(10): place(S.key(20 + i) * 0.5, a + 0.05 + i * 0.1, 0.35, (i % 3 - 1) * 0.3)
    elif k == 'logo':
        for i in range(4): place(S.goo(560 - 40 * i, 220, 0.12), a + 0.15 + i * 0.1, 0.45, (-1) ** i * 0.4)
        place(S.goo(260, 100, 0.3), a + 0.4, 0.8); place(S.ding(1320, 1.2), a + 0.6, 0.35)
    elif k == 'auto':
        for i in range(3): place(S.goo(420 + 60 * i, 170, 0.18), a + 0.25 + i * 0.32, 0.55); place(S.bubble(700, 1300, 0.1), a + 0.3 + i * 0.32, 0.3)
    elif k == 'chrono':
        place(S.ding(1480), a + 0.3, 0.35)
        for i in range(12): place(S.tick(2600), a + 0.25 + i * 0.17, 0.1)
    elif k == 'statsTitle':
        for i in range(5): place(S.bubble(400 + 80 * i, 800 + 120 * i, 0.09), a + 0.1 + i * 0.08, 0.35)
    elif k == 'timeline':
        for i in range(5): place(S.tick(1900), a + 0.4 + i * 0.4, 0.25)
    elif k == 'detailed':
        for key in ['jour', 'semaine', 'mois']: place(S.key(5), m.get(key), 0.6)
    elif k == 'compare':
        for i in range(4): place(S.goo(380 + 50 * i, 160, 0.14), a + 1.0 + i * 0.25, 0.45)
    elif k == 'heat':
        for i in range(8): place(S.bubble(500 + 60 * i, 1000 + 60 * i, 0.07), a + 0.05 + i * 0.07, 0.22)
    elif k in ('widgets', 'streak'):
        for i in range(3): place(S.goo(480 + 60 * i, 200, 0.14), a + 0.15 + i * 0.2, 0.45)
    elif k == 'ticket':
        for q in range(int(1.4 * 38)): place(S.tick(900 + 60 * (q % 3)) * 0.6, a + 0.35 + q / 38, 0.45)
        place(S.goo(240, 90, 0.35), (m.get('douze') or a + 2) + 0.35, 0.55); place(S.goo(520, 200, 0.16), m.get('parle'), 0.6)
    elif k == 'cta':
        place(S.goo(300, 110, 0.3), a + 0.05, 0.8); place(S.ding(1320, 1.4), a + 0.5, 0.4); place(S.goo(480, 200, 0.18), a + 0.9, 0.5)
mix = sfx * 0.5
mix[:len(v), 0] += v; mix[:len(v), 1] += v
mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
mix = np.where(np.abs(mix) > 0.89, np.tanh(mix / 0.89) * 0.89, mix)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out], input=mix.astype(np.float32).tobytes(), check=True)
print('ok', out)
