"""Lab2 sound: only soft satisfying SFX (+ optional voice). Usage: python3 pipeline/lab2_audio.py out.wav [voice.mp3] [voice_offset]"""
import os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import soft_sfx as S
import mix_audio as M
SR = S.SR
out = sys.argv[1]
voice = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '-' else None
voff = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
L2 = dict(b2=2.35, b3=3.9, b4=5.5, b5=7.4, b6=10.0, cta=12.4, end=14.2)
typed = sys.argv[4] if len(sys.argv) > 4 else 'Boulangerie'
N = int(L2['end'] * SR)
sfx = np.zeros((N, 2))
def place(sig, t, g=1.0, pan=0.0):
    i = int(max(0, t) * SR)
    if i >= N: return
    sig = np.asarray(sig)[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    sfx[i:i + len(sig), 0] += sig * g * l
    sfx[i:i + len(sig), 1] += sig * g * r
# beat 1: map slides in, footsteps-like soft ticks, pin bloops down
place(S.swish(0.3), 0.0, 0.35)
for i in range(6): place(S.tick(1800 + 90 * (i % 2)), 0.25 + i * 0.17, 0.25, (-1) ** i * 0.3)
place(S.goo(420, 150, 0.2), 1.25, 0.9)
place(S.bubble(400, 900), 1.42, 0.35)
# island grows + timer
place(S.goo(260, 120, 0.25), 1.5, 0.6)
for i in range(18): place(S.tick(2600), 1.75 + i * 0.09, 0.12)
place(S.ding(1480), 1.9, 0.45)
# beat 2: ticket lands, check
place(S.swish(0.3, False), L2['b3'] - 0.1, 0.3)
place(S.thud(), L2['b3'] + 0.35, 0.8)
place(S.bubble(700, 1400), L2['b3'] + 0.65, 0.5)
# beat 3: three cards
for i in range(3):
    place(S.thud(120 + 10 * i), L2['b4'] + 0.3 + i * 0.42, 0.7, (-1) ** i * 0.25)
    place(S.goo(380 + 40 * i, 200, 0.12), L2['b4'] + 0.6 + i * 0.42, 0.45)
# beat 4: chart, bars fill with rising bubbles
place(S.swish(0.35), L2['b5'] - 0.1, 0.3)
for i in range(4):
    place(S.goo(300 + 60 * i, 160, 0.14), L2['b5'] + 0.35 + i * 0.22, 0.55, -0.3 + i * 0.2)
    place(S.bubble(500 + 120 * i, 1000 + 160 * i, 0.12), L2['b5'] + 0.6 + i * 0.22, 0.25)
# beat 5: keyboard
place(S.swish(0.35), L2['b6'] - 0.05, 0.3)
t0 = L2['b6'] + 0.45
for i in range(len(typed)): place(S.key(i), t0 + i * 0.11, 0.9, ((i % 3) - 1) * 0.3)
done = t0 + len(typed) * 0.11 + 0.15
place(S.key(99), done, 0.9)
place(S.goo(480, 180, 0.2), done + 0.25, 0.8)
place(S.ding(1760), done + 0.3, 0.35)
# CTA
place(S.swish(0.4), L2['cta'] - 0.15, 0.3)
place(S.goo(300, 110, 0.3), L2['cta'] + 0.05, 1.0)
place(S.bubble(600, 1500, 0.14), L2['cta'] + 0.45, 0.5)
place(S.ding(1320, 1.4), L2['cta'] + 0.5, 0.4)
mix = sfx.copy()
if voice:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voice, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).copy()
    i = int(voff * SR); v = v[: max(0, N - i)]
    v = v * 10 ** ((-16 - M.lufs(v)) / 20)
    mix[i:i + len(v), 0] += v; mix[i:i + len(v), 1] += v
    sfx_gain = 0.55
else:
    sfx_gain = 1.0
mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
mix = np.where(np.abs(mix) > 0.85, np.tanh(mix / 0.85) * 0.85, mix)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out], input=mix.astype(np.float32).tobytes(), check=True)
print('ok', out)
