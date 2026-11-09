"""Hologram video audio: voice (+ hologram FX on chosen spans) + soft digital SFX, no instruments.
Usage: python3 pipeline/holo_audio.py props.json voice.mp3 out.wav"""
import json, os, subprocess, sys
import numpy as np
from pedalboard import Pedalboard, Chorus, PitchShift, Delay, Reverb, HighpassFilter, Bitcrush
sys.path.insert(0, os.path.dirname(__file__))
import soft_sfx as S
import mix_audio as M
SR = S.SR
P = json.load(open(sys.argv[1])); voice, out = sys.argv[2], sys.argv[3]
m = P['m']; N = int(P['end'] * SR)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voice, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, dtype=np.float32).copy()
v = np.pad(v, (0, max(0, N - len(v))))[:N]
v = v * 10 ** ((-16 - M.lufs(v)) / 20)

# hologram voice: chorus + low octave-ish layer + short slap delay + airy reverb
low = Pedalboard([PitchShift(-5), HighpassFilter(120)])(v.astype(np.float32), SR)
fx = Pedalboard([Chorus(rate_hz=0.8, depth=0.35, mix=0.5), Delay(delay_seconds=0.085, feedback=0.22, mix=0.22), Reverb(room_size=0.45, wet_level=0.22, dry_level=0.85), HighpassFilter(150)])((v + 0.38 * low[:N]).astype(np.float32), SR)
fx = fx[:N] * 10 ** ((M.lufs(v) - M.lufs(fx[:N])) / 20)
w = np.zeros(N)
for a, b in P.get('fx', []):
    i, j = int(a * SR), int(min(b, P['end']) * SR); r = int(0.06 * SR)
    w[i:j] = 1
    w[max(0, i - r):i] = np.linspace(0, 1, i - max(0, i - r)); w[j:j + r] = np.linspace(1, 0, len(w[j:j + r]))
voice_out = v * (1 - w) + fx * w

sfx = np.zeros((N, 2))
rng = np.random.default_rng(3)
def place(sig, t, g=1.0, pan=0.0):
    if t is None: return
    i = int(max(0, t) * SR)
    if i >= N: return
    sig = np.asarray(sig)[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    sfx[i:i + len(sig), 0] += sig * g * l; sfx[i:i + len(sig), 1] += sig * g * r
def glitch(dur=0.18):
    n = int(dur * SR); x = np.zeros(n); k = 0
    while k < n:
        L = int(rng.uniform(0.012, 0.035) * SR); f = rng.choice([700, 1100, 1800, 2600, 3400])
        t = np.arange(min(L, n - k)) / SR
        x[k:k + len(t)] = np.sign(np.sin(2 * np.pi * f * t)) * rng.uniform(0.15, 0.4)
        k += L
    x *= np.linspace(1, 0.2, n)
    return Pedalboard([Bitcrush(bit_depth=6)])(x.astype(np.float32), SR) * 0.5
def rise(dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 200 + 1600 * (t / dur) ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15 + rng.normal(0, 0.05, n)
    return S._lp(x * np.minimum(1, t / 0.3) * np.exp(-np.maximum(0, t - dur * 0.8) / 0.08), 3000) if hasattr(S, '_lp') else x
order = [k for k in ['hook', 'create', 'home', 'trip', 'work', 'cafe', 'gym', 'evening', 'auto', 'heat', 'stats', 'replay', 'compare', 'cta'] if k in m]
place(rise(1.3), 0.15, 0.6)
for j, k in enumerate(order[1:], 1):
    a = m[k]
    place(glitch(), a - 0.03, 0.5, (-1) ** j * 0.3); place(S.swish(0.22, j % 2 == 0), a - 0.12, 0.35, (-1) ** j * 0.4)
    if k in ('home', 'trip', 'work', 'cafe', 'gym'):
        place(S.bubble(600, 1300, 0.1), a + 0.08, 0.45)
        for q in range(14): place(S.tick(2400) * 0.5, a + 0.25 + q * 0.11, 0.12)
    if k == 'create': place(S.goo(420, 180, 0.16), a + 0.6, 0.5)
    if k == 'gym':
        for q in range(8): place(S.thud(90, 0.18), a + 0.3 + q * 0.92, 0.25)
        place(S.goo(240, 90, 0.35), m['talk'] - 0.25, 0.7); place(S.ding(990, 0.8), m['talk'] - 0.2, 0.25)
    if k == 'evening':
        for q in range(3): place(S.goo(460 + 70 * q, 190, 0.15), a + 0.5 + q * 0.45, 0.5, (q - 1) * 0.5)
    if k == 'auto':
        for q in range(3): place(S.bubble(600 + 120 * q, 1300, 0.1), a + 0.85 + q * 1.3, 0.5, (q - 1) * 0.5); place(S.ding(1480, 0.5), a + 0.95 + q * 1.3, 0.15)
    if k == 'heat':
        for q in range(6): place(S.goo(300 + 50 * q, 120, 0.2), a + 0.15 + q * 0.12, 0.4, (q % 3 - 1) * 0.5)
    if k == 'stats':
        for key in ('jour', 'semaine', 'mois'): place(S.key(3), m.get(key), 0.6); place(S.bubble(500, 1100, 0.08), (m.get(key) or a) + 0.1, 0.3)
    if k == 'replay':
        place(S.swish(1.2, True), a + 0.1, 0.3); place(S.ding(1320, 0.9), m.get('bilan'), 0.3); place(S.goo(420, 170, 0.16), m.get('bilan'), 0.5)
    if k == 'compare':
        for q in range(2): place(S.goo(380 + 120 * q, 160, 0.16), a + 0.1 + q * 0.35, 0.55)
    if k == 'cta': place(S.goo(300, 110, 0.3), a + 0.05, 0.8); place(S.ding(1320, 1.4), a + 0.4, 0.35)
mix = sfx * 0.5
mix[:, 0] += voice_out; mix[:, 1] += voice_out
mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
mix = np.where(np.abs(mix) > 0.89, np.tanh(mix / 0.89) * 0.89, mix)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out], input=mix.astype(np.float32).tobytes(), check=True)
print('ok', out)
