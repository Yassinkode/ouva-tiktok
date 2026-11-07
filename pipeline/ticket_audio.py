"""Voice + soft SFX (receipt printer, gooey pops) for the Ticket video. Usage: python3 pipeline/ticket_audio.py public/ticket"""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import soft_sfx as S
import mix_audio as M
SR = S.SR
d = sys.argv[1]
P = json.load(open(f'{d}/props.json'))
c, m = P['cues'], P['marks']
N = int(P['end'] * SR)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{d}/voice.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, dtype=np.float32).copy()[:N]
v = v * 10 ** ((-16 - M.lufs(v)) / 20)
sfx = np.zeros((N, 2))
rng = np.random.default_rng(3)
def place(sig, t, g=1.0, pan=0.0):
    i = int(max(0, t) * SR)
    if i >= N: return
    sig = np.asarray(sig)[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    sfx[i:i + len(sig), 0] += sig * g * l; sfx[i:i + len(sig), 1] += sig * g * r
def printer(dur):
    """soft thermal-printer purr: fast low ticks + filtered noise"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for k in range(int(dur * 38)):
        i = int(k / 38 * SR); s = S.tick(900 + 60 * (k % 3)) * 0.6
        x[i:i + len(s)] += s[: n - i]
    noise = rng.standard_normal(n); y = np.zeros(n); acc = 0.0; a = np.exp(-2 * np.pi * 1400 / SR)
    for i in range(n): acc = (1 - a) * noise[i] + a * acc; y[i] = acc
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.08)
    return (x + y * 0.5 * (0.7 + 0.3 * np.sin(2 * np.pi * 19 * t))) * env * 0.8
# 1 screen time
place(S.swish(0.3), 0.0, 0.35); place(S.goo(300, 130, 0.22), 0.05, 0.6)
for i in range(16): place(S.tick(2500), 0.1 + i * 0.09, 0.12)
place(S.goo(520, 200, 0.16), 1.4, 0.7); place(S.ding(1560), 1.45, 0.3)
# 2 places
place(S.swish(0.3, False), c['nobody'] - 0.12, 0.35)
for i in range(3): place(S.goo(380 + 50 * i, 170, 0.15), c['nobody'] + 0.25 + i * 0.22, 0.55, (i - 1) * 0.4)
for k in ['home', 'work', 'gym']: place(S.bubble(500, 1200, 0.1), m[k], 0.45)
# 3 logo
place(S.swish(0.35), c['logo'] - 0.15, 0.35)
for i in range(4): place(S.goo(560 - 40 * i, 220, 0.12), c['logo'] + 0.15 + i * 0.1, 0.5, (-1) ** i * 0.4)
place(S.goo(260, 100, 0.3), c['logo'] + 0.4, 0.9); place(S.ding(1320, 1.2), c['logo'] + 0.6, 0.4)
# 4 live
place(S.swish(0.3), c['live'] - 0.12, 0.35); place(S.thud(), c['live'] + 0.3, 0.5)
for i in range(3): place(S.tick(2600), c['live'] + 0.6 + i, 0.2)
place(S.bubble(600, 1400, 0.12), m['chrono'], 0.45)
for i in range(3): place(S.tick(2600), m['chrono'] + 0.8 + i, 0.2)
# 5 ticket
place(S.swish(0.3, False), c['ticket'] - 0.12, 0.35); place(S.thud(90), c['ticket'] + 0.15, 0.6)
place(printer(2.2), c['ticket'] + 0.35, 0.55)
place(S.key(7), c['ticket'] + 2.6, 0.6)
place(S.swish(0.4), m['douze'] - 0.1, 0.3)
place(S.goo(240, 90, 0.35), m['douze'] + 0.35, 0.6)
place(S.goo(520, 200, 0.16), m['parle'], 0.7); place(S.bubble(400, 900, 0.12), m['parle'] + 0.1, 0.35)
# 6 cta
place(S.swish(0.4), c['cta'] - 0.15, 0.35); place(S.goo(300, 110, 0.3), c['cta'] + 0.05, 0.9)
place(S.bubble(600, 1500, 0.14), c['cta'] + 0.45, 0.5); place(S.ding(1320, 1.4), c['cta'] + 0.5, 0.4)
place(S.goo(480, 200, 0.18), c['cta'] + 0.9, 0.6)
mix = sfx * 0.6
mix[:len(v), 0] += v; mix[:len(v), 1] += v
mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
mix = np.where(np.abs(mix) > 0.89, np.tanh(mix / 0.89) * 0.89, mix)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', f'{d}/audio.wav'], input=mix.astype(np.float32).tobytes(), check=True)
print('ok')
