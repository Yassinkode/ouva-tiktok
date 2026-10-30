"""Sound for « Lab » videos: soft vocals-only bg + clean UI sound design (no voice, no instruments).
Usage: python3 pipeline/lab_audio.py out.wav [bg_name] [bg_start]"""
import os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import mix_audio as M
SR = M.SR
out = sys.argv[1]
bgn = sys.argv[2] if len(sys.argv) > 2 else 'arches'
st = float(sys.argv[3]) if len(sys.argv) > 3 else 11.4
T = dict(s2=2.3, s3=5.0, s4=8.1, s5=11.2, cta=13.4, end=15.5)
checks = [T['s3'] + 0.45 + i * 0.55 + 0.35 for i in range(4)]
feed = [T['s4'] + 0.9 + i * 0.5 for i in range(3)]
N = int(T['end'] * SR)
bg = M.load_bg(f'assets/bg/{bgn}.mp3', st, N)
bg = bg * 10 ** ((-21 - M.lufs(bg)) / 20)
sfx = np.zeros((N, 2))
def place(sig, t, g=1.0, pan=0.0):
    i = int(max(0, t) * SR)
    if i >= N: return
    sig = np.asarray(sig)
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        sig = np.stack([sig * l, sig * r], 1)
    sig = sig[: N - i]
    sfx[i:i + len(sig)] += sig * g
# intro: wall of phones pops in
for j in range(8):
    place(M.tick(1800 + 200 * (j % 3), 0.025), 0.05 + j * 0.06, 0.25, (-1) ** j * 0.5)
place(M.pop(620), 0.55, 0.5)  # keyword pill
for c in [T['s2'], T['s3'], T['s4'], T['s5'], T['cta']]:
    place(M.whoosh(0.4, True), c - 0.2, 0.5)
place(M.riser(0.5), T['s2'] + 0.05, 0.25)
place(M.pop(480), T['s2'] + 0.55, 0.6)  # island
place(M.sparkle(0.8), T['s2'] + 0.7, 0.35)
for i, c in enumerate(checks):
    place(M.blip(900 + 120 * i, 0.06), c, 0.45)
    place(M.tick(), c, 0.3)
for i in range(30):  # counter ticking
    place(M.tick(2600, 0.015), T['s4'] + 0.3 + i * 0.05, 0.12)
for i, c in enumerate(feed):
    place(M.pop(560 + 50 * i), c, 0.4, 0.4)
place(M.impact(42, 1.0), T['cta'] + 0.1, 0.7)
place(M.sparkle(1.1), T['cta'] + 0.5, 0.45)
tt = np.arange(N) / SR
bg *= np.minimum(1, np.minimum(tt / 0.2, (T['end'] - tt) / 0.8))[:, None]
mix = bg + sfx * 0.7
mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
mix = np.where(np.abs(mix) > 0.85, np.tanh(mix / 0.85) * 0.85, mix)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out], input=mix.astype(np.float32).tobytes(), check=True)
print('ok', out)
