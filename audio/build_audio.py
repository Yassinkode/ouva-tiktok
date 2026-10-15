"""
Sound design + music for the OùVa ad, fully synthesised (no third-party samples).
Outputs public/mix.wav (voice + music + sfx), plus stems in audio/stems/.
Usage: python3 audio/build_audio.py path/to/voice.mp3
"""
import subprocess, sys, os
import numpy as np
from scipy.signal import butter, sosfilt
from pedalboard import Pedalboard, Reverb, Compressor, Limiter, HighpassFilter, LowpassFilter, Delay, Chorus

SR = 48000
DUR = 41.5
N = int(SR * DUR)
rng = np.random.default_rng(7)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(ROOT, 'audio/stems'), exist_ok=True)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)


def place(buf, sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    if sig.ndim == 1:
        buf[i : i + len(sig), 0] += sig * gain * l * 1.414
        buf[i : i + len(sig), 1] += sig * gain * r * 1.414
    else:
        buf[i : i + len(sig)] += sig * gain


def env(n, a, d, curve=4):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * curve / max(d, 1e-4))
    return e


# ---------------------------------------------------------------- SFX
def whoosh(dur=0.45, up=True, bright=1.0):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    t = np.linspace(0, 1, n)
    # moving band-pass via chunks
    out = np.zeros(n)
    chunks = 24
    for k in range(chunks):
        a, b = k * n // chunks, (k + 1) * n // chunks
        x = t[(a + b) // 2]
        fc = (300 + 3800 * (x if up else 1 - x) ** 1.3) * bright
        seg = bp(noise[max(0, a - 2000) : b], fc * 0.6, min(fc * 1.6, 20000))[-(b - a) :]
        out[a:b] = seg
    shape = np.sin(np.pi * np.clip(t, 0, 1)) ** 1.6
    shape *= np.where(t < 0.62, (t / 0.62) ** 1.6, 1.0)
    out = out * shape
    return out / (np.abs(out).max() + 1e-9)


def pop(freq=520, dur=0.16, drop=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * np.exp(-t * drop * 8) + freq * 0.55
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env(n, 0.002, dur * 0.35, 3)
    click = hp(rng.standard_normal(n), 3000) * env(n, 0.0005, 0.006, 4) * 0.3
    return (s + click) * 0.9


def tick(freq=2400, dur=0.03):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) * env(n, 0.0005, dur * 0.3, 5)
    s += hp(rng.standard_normal(n), 4000) * env(n, 0.0003, 0.004, 5) * 0.4
    return s


def blip(freq, dur=0.05):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * freq * t)) * 0.4 + np.sin(2 * np.pi * freq * 2 * t) * 0.3
    s = np.round(s * 6) / 6  # bitcrush
    return lp(s, 6000) * env(n, 0.001, dur * 0.4, 4)


def impact(freq=52, dur=1.1, gain=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.5 * np.exp(-t * 30))
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env(n, 0.003, dur * 0.45, 3.5)
    trans = lp(rng.standard_normal(n), 1800) * env(n, 0.001, 0.05, 5) * 0.6
    return np.tanh((body + trans) * 1.6) * gain


def riser(dur=0.8):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    chunks = 20
    for k in range(chunks):
        a, b = k * n // chunks, (k + 1) * n // chunks
        fc = 400 + 6000 * t[(a + b) // 2] ** 2
        out[a:b] = bp(noise[max(0, a - 2000) : b], fc * 0.7, min(fc * 1.4, 20000))[-(b - a) :]
    return out * t ** 2 / (np.abs(out).max() + 1e-9)


def chime(freq, dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2.01 * t) + 0.15 * np.sin(2 * np.pi * freq * 3.98 * t))
    return s * env(n, 0.003, dur * 0.5, 4)


sfx = np.zeros((N, 2))
W = [
    (0.0, 0.5, 0.55, True),
    (2.62, 0.55, 0.7, True),
    (5.0, 0.6, 0.75, False),
    (10.12, 0.55, 0.55, False),
    (15.78, 0.42, 0.7, True),
    (20.55, 0.5, 0.55, True),
    (21.6, 0.42, 0.8, True),
    (23.05, 0.42, 0.7, False),
    (28.42, 0.42, 0.7, True),
    (32.9, 0.6, 0.5, False),
    (36.66, 0.4, 0.6, True),
    (38.82, 0.6, 0.6, False),
]
for i, (t0, d, g, up) in enumerate(W):
    place(sfx, whoosh(d, up), t0, g * 0.55, pan=(-0.4 if i % 2 else 0.4))

POPS = [(3.42, 480, 1.0), (4.05, 640, 0.7), (10.9, 420, 0.7), (14.5, 560, 0.6), (15.98, 600, 0.5), (16.02, 700, 0.45),
        (17.08, 900, 0.75), (20.72, 620, 0.45), (20.82, 700, 0.45), (20.92, 780, 0.45), (24.0, 620, 0.5), (24.25, 700, 0.5),
        (24.5, 780, 0.5), (27.3, 880, 0.5), (27.6, 990, 0.5), (27.85, 1100, 0.5), (29.95, 520, 0.5), (30.1, 600, 0.6),
        (31.7, 420, 0.8), (33.12, 520, 0.6), (33.72, 700, 0.45), (36.05, 980, 0.75), (39.05, 520, 0.9), (40.3, 760, 0.35)]
for t0, fq, g in POPS:
    place(sfx, pop(fq), t0, g * 0.5, pan=rng.uniform(-0.3, 0.3))

CLICKS = [1.2, 1.5, 1.85, 11.0, 11.25, 15.98, 16.1, 16.32, 24.75, 24.92, 25.1, 26.2, 26.3, 26.4, 26.6, 35.55, 35.72, 35.85,
          36.0, 37.9, 38.12, 38.3, 38.55, 39.22, 39.28, 39.34, 39.4, 39.7] + [28.8 + i * 0.045 for i in range(5)] + \
         [8.55 + i * 0.03 for i in range(0, 11, 2)] + [22.02 + i * 0.028 for i in range(0, 10, 2)]
for t0 in CLICKS:
    place(sfx, tick(rng.uniform(1800, 2600)), t0, 0.16, pan=rng.uniform(-0.5, 0.5))


def counter_ticks(t0, t1, n_steps, ease_pow=2.2, base=1500, gain=0.12):
    for k in range(1, n_steps + 1):
        x = 1 - (1 - k / n_steps) ** (1 / ease_pow)  # time of k-th integer for ease-out curve (approx)
        place(sfx, tick(base + k * 25, 0.022), t0 + (t1 - t0) * x, gain, pan=rng.uniform(-0.2, 0.2))


counter_ticks(5.3, 6.55, 30)
counter_ticks(12.36, 13.5, 31, base=1300)
counter_ticks(30.15, 31.2, 14, base=1100, gain=0.16)
counter_ticks(26.25, 28.2, 22, base=2200, gain=0.07)

# digital heat-map cells
for t0, t1, cnt in [(0.3, 1.6, 22), (5.4, 7.3, 34)]:
    ts = np.sort(rng.uniform(t0, t1, cnt))
    for k, tt in enumerate(ts):
        fq = rng.choice([880, 1046, 1318, 1568, 1760, 2093])
        place(sfx, blip(fq, 0.045), tt, 0.06, pan=rng.uniform(-0.7, 0.7))

for t0, f0, g in [(1.55, 58, 0.9), (13.45, 50, 0.75), (17.1, 70, 0.35), (18.93, 55, 0.85), (22.05, 46, 0.9), (31.72, 52, 0.8), (39.05, 42, 1.0)]:
    place(sfx, impact(f0, 1.1, g), t0, 0.62)

place(sfx, riser(0.75), 38.2, 0.18)
place(sfx, riser(0.6), 21.1, 0.12)
# cool-down shimmer (cells turning green)
for k, fq in enumerate([523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5]):
    place(sfx, chime(fq, 1.0), 37.6 + k * 0.2, 0.09, pan=-0.5 + k * 0.2)
# laugh beat: tiny playful boing
place(sfx, pop(300, 0.25, 0.8), 9.7, 0.3)

# ---------------------------------------------------------------- MUSIC
BPM = 104
beat = 60 / BPM
bar = beat * 4
music = np.zeros((N, 2))


def note_hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def kick(dur=0.45):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t * 35)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * env(n, 0.001, 0.22, 3.5) * 1.8)


def clap(dur=0.25):
    n = int(dur * SR)
    noise = bp(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for off in [0, 0.011, 0.022]:
        i = int(off * SR)
        e[i:] += env(n - i, 0.0005, 0.02, 5)
    e += env(n, 0.03, 0.12, 4) * 0.5
    return noise * e * 0.6


def hat(open_=False):
    dur = 0.18 if open_ else 0.05
    n = int(dur * SR)
    return hp(rng.standard_normal(n), 7000) * env(n, 0.0005, dur * 0.4, 5) * 0.5


def pad(freqs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for fq in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = fq * 2 ** (det / 12)
            # soft saw (few harmonics)
            for h in range(1, 6):
                s += np.sin(2 * np.pi * ff * h * t + rng.uniform(0, 6.28)) / (h ** 1.5)
    a = np.minimum(1, t / 0.35) * np.minimum(1, (dur - t) / 0.4)
    return lp(s, 2200) * a / (len(freqs) * 6)


def pluck(fq, dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * fq * t) + 0.4 * np.sin(2 * np.pi * fq * 2 * t) + 0.15 * np.sin(2 * np.pi * fq * 3 * t)
    return s * env(n, 0.002, 0.12, 4)


def bass(fq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * fq * t) + 0.25 * np.sin(2 * np.pi * fq * 2 * t)
    a = np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.05)
    return np.tanh(s * 1.3) * a


# progression (A minor-ish, warm & positive): Fmaj7 - G6 - Am9 - Em7
PROG = [
    (53, [65, 69, 72, 76]),  # F
    (55, [67, 71, 74, 76]),  # G6
    (57, [64, 67, 71, 72]),  # Am9 (no root)
    (52, [62, 67, 71, 74]),  # Em7
]
# brighter section (goal): Fmaj7 - G - C/E - Am
PROG2 = [
    (53, [65, 69, 72, 76]),
    (55, [67, 71, 74, 79]),
    (52, [64, 67, 72, 76]),
    (57, [64, 69, 72, 76]),
]

nbars = int(np.ceil(DUR / bar))
drums_on = lambda t: (5.05 <= t < 21.65) or (23.3 <= t < 39.0)
bass_on = lambda t: (5.05 <= t < 21.65) or (23.3 <= t < 39.0)
for b in range(nbars):
    t0 = b * bar
    prog = PROG2 if t0 >= 32.5 else PROG
    root, chord = prog[b % 4]
    place(music, pad([note_hz(m) for m in chord], bar + 0.4), t0, 0.5)
    for k in range(8):  # 8th notes
        tt = t0 + k * beat / 2
        if tt >= 39.0:
            break
        # plucked arpeggio from 2.0s on
        if tt > 2.0 and k % 2 == 0 or (tt > 23.3 and k % 2 == 1 and k != 7):
            m = chord[(k // 2 + b) % 4] + (12 if k % 4 == 2 else 0)
            place(music, pluck(note_hz(m)), tt, 0.10, pan=0.35 if k % 2 else -0.35)
        if drums_on(tt):
            if k in (0, 5):
                place(music, kick(), tt, 0.55)
            if k in (2, 6):
                place(music, clap(), tt, 0.22)
            place(music, hat(open_=(k == 7)), tt + (0.018 if k % 2 else 0), 0.10 if k % 2 else 0.14, pan=0.25)
        if bass_on(tt) and k in (0, 3, 5):
            place(music, bass(note_hz(root - 12), beat * 0.9), tt, 0.32)
    if 0 < t0 < 5.0 or 21.65 <= t0 < 23.3:
        # sparse hats in intro / breakdown
        for k in range(4):
            place(music, hat(), t0 + k * beat + beat / 2, 0.06, pan=-0.25)

# final ringing chord + sub on the logo
final = pad([note_hz(m) for m in [60, 64, 67, 71, 76]], 2.6)
place(music, final, 39.05, 0.9)
place(music, bass(note_hz(36), 1.6) * env(int(1.6 * SR), 0.005, 0.9, 2.5), 39.05, 0.4)
for k, m in enumerate([72, 76, 79, 83]):
    place(music, pluck(note_hz(m), 0.6), 39.05 + k * 0.09, 0.09)

board = Pedalboard([HighpassFilter(35), Chorus(rate_hz=0.4, depth=0.15, mix=0.2), Reverb(room_size=0.55, wet_level=0.18, dry_level=0.85, width=1.0), Compressor(threshold_db=-14, ratio=2.5)])
music = board(music.T.astype(np.float32), SR).T
# filter breakdown during the mint wipe
i0, i1 = int(21.65 * SR), int(23.3 * SR)
music[i0:i1] = lp(music[i0:i1].T, 900).T * 0.9

# fade out tail
fade = np.ones(N)
fs = int(40.6 * SR)
fade[fs:] = np.linspace(1, 0, N - fs) ** 1.5
music *= fade[:, None]

sfx_board = Pedalboard([Reverb(room_size=0.3, wet_level=0.12, dry_level=0.95)])
sfx = sfx_board(sfx.T.astype(np.float32), SR).T

# ---------------------------------------------------------------- VOICE + ducking
voice_path = sys.argv[1]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voice_path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
voice = np.frombuffer(raw, dtype=np.float32).copy()
vbuf = np.zeros(N)
vbuf[: min(N, len(voice))] = voice[:N]
# envelope follower for sidechain
ve = np.abs(vbuf)
win = int(0.05 * SR)
ve = np.convolve(ve, np.ones(win) / win, mode='same')
ve = ve / (ve.max() + 1e-9)
duck = 1 - 0.55 * np.clip(ve * 4, 0, 1)
# smooth ducking
sm = int(0.12 * SR)
duck = np.convolve(duck, np.ones(sm) / sm, mode='same')

def lufs_ish(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)

vr = lufs_ish(vbuf[vbuf != 0])
mr = lufs_ish(music.mean(1))
music_gain = 10 ** ((vr - 15 - mr) / 20)  # music ~15 dB under the voice (pre-duck)
sfx_gain = 1.0

mix = np.zeros((N, 2))
if os.environ.get('MUSIC', '0') == '1':  # music disabled by default
    mix += music * music_gain * duck[:, None]
mix += sfx * sfx_gain * 0.8
mix[:, 0] += vbuf
mix[:, 1] += vbuf

master = Pedalboard([Compressor(threshold_db=-10, ratio=2, attack_ms=10, release_ms=120), Limiter(threshold_db=-1.0)])
mix = master(mix.T.astype(np.float32), SR).T
# normalise to about -1 dBTP peak and target loudness
peak = np.abs(mix).max()
mix = mix / peak * 0.89


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', path],
                   input=x.astype(np.float32).tobytes(), check=True)


write_wav(os.path.join(ROOT, 'public/mix.wav'), mix)
write_wav(os.path.join(ROOT, 'audio/stems/music.wav'), music * music_gain / max(1e-9, np.abs(music * music_gain).max()) * 0.8)
write_wav(os.path.join(ROOT, 'audio/stems/sfx.wav'), sfx / max(1e-9, np.abs(sfx).max()) * 0.8)
print('ok', 'voice rms dB', round(vr, 1), 'music gain', round(music_gain, 3))
