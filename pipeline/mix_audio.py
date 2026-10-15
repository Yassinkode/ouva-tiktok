"""
Voice + synthesised sound design (no music), driven by an events file from build_props.mjs.
Usage: python3 pipeline/mix_audio.py events.json voice.mp3 out.wav
"""
import json, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt

try:
    from pedalboard import Pedalboard, Reverb, Compressor, Limiter
except Exception:  # pedalboard optional
    Pedalboard = None

SR = 48000
rng = np.random.default_rng(11)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def lp(x, f):
    return sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f):
    return sosfilt(butter(2, f, 'highpass', fs=SR, output='sos'), x)


def env(n, a, d, curve=4):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * curve / max(d, 1e-4))


def whoosh(dur=0.45, up=True):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    t = np.linspace(0, 1, n)
    out = np.zeros(n)
    for k in range(24):
        a, b = k * n // 24, (k + 1) * n // 24
        x = t[(a + b) // 2]
        fc = 300 + 3800 * (x if up else 1 - x) ** 1.3
        out[a:b] = bp(noise[max(0, a - 2000):b], fc * 0.6, min(fc * 1.6, 20000))[-(b - a):]
    shape = np.sin(np.pi * t) ** 1.6 * np.where(t < 0.62, (t / 0.62) ** 1.6, 1.0)
    out *= shape
    return out / (np.abs(out).max() + 1e-9)


def pop(freq=520, dur=0.16, drop=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * np.exp(-t * drop * 8) + freq * 0.55
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, dur * 0.35, 3)
    return (s + hp(rng.standard_normal(n), 3000) * env(n, 0.0005, 0.006, 4) * 0.3) * 0.9


def tick(freq=2400, dur=0.03):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) * env(n, 0.0005, dur * 0.3, 5)
    return s + hp(rng.standard_normal(n), 4000) * env(n, 0.0003, 0.004, 5) * 0.4


def blip(freq, dur=0.05):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * freq * t)) * 0.4 + np.sin(2 * np.pi * freq * 2 * t) * 0.3
    return lp(np.round(s * 6) / 6, 6000) * env(n, 0.001, dur * 0.4, 4)


def impact(freq=52, dur=1.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.5 * np.exp(-t * 30))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, dur * 0.45, 3.5)
    trans = lp(rng.standard_normal(n), 1800) * env(n, 0.001, 0.05, 5) * 0.6
    return np.tanh((body + trans) * 1.6)


def riser(dur=0.8):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    for k in range(20):
        a, b = k * n // 20, (k + 1) * n // 20
        fc = 400 + 6000 * t[(a + b) // 2] ** 2
        out[a:b] = bp(noise[max(0, a - 2000):b], fc * 0.7, min(fc * 1.4, 20000))[-(b - a):]
    return out * t ** 2 / (np.abs(out).max() + 1e-9)


def chime(freq, dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2.01 * t) + 0.15 * np.sin(2 * np.pi * freq * 3.98 * t)
    return s * env(n, 0.003, dur * 0.5, 4)


def main(ev_path, voice_path, out_path):
    spec = json.load(open(ev_path))
    dur = spec['duration']
    N = int(SR * dur)
    sfx = np.zeros((N, 2))

    def place(sig, t, gain=1.0, pan=0.0):
        i = int(max(0, t) * SR)
        if i >= N:
            return
        sig = sig[: N - i]
        l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        sfx[i:i + len(sig), 0] += sig * gain * l
        sfx[i:i + len(sig), 1] += sig * gain * r

    for k, e in enumerate(spec['events']):
        ty, t = e['type'], e['t']
        g = e.get('gain', 0.5)
        if ty == 'whoosh':
            place(whoosh(0.45, e.get('up', True)), t, g * 0.55, pan=0.4 if k % 2 else -0.4)
        elif ty == 'pop':
            place(pop(e.get('f', 520)), t, g * 0.5, pan=rng.uniform(-0.3, 0.3))
        elif ty == 'tick':
            place(tick(rng.uniform(1800, 2600)), t, g, pan=rng.uniform(-0.5, 0.5))
        elif ty == 'impact':
            place(impact(e.get('f', 52)), t, g * 0.62)
        elif ty == 'riser':
            place(riser(e.get('d', 0.7)), t, g)
        elif ty == 'blips':
            ts = np.sort(rng.uniform(t, e['to'], e.get('n', 20)))
            for tt in ts:
                place(blip(rng.choice([880, 1046, 1318, 1568, 1760, 2093]), 0.045), tt, 0.06, pan=rng.uniform(-0.7, 0.7))
        elif ty == 'counter':
            n, t1 = e.get('n', 20), e['to']
            for j in range(1, n + 1):
                x = 1 - (1 - j / n) ** (1 / 2.2)
                place(tick(e.get('base', 1500) + j * 25, 0.022), t + (t1 - t) * x, e.get('gain', 0.12), pan=rng.uniform(-0.2, 0.2))
        elif ty == 'chimes':
            for j, fq in enumerate([523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5]):
                place(chime(fq, 1.0), t + j * 0.2, 0.09, pan=-0.5 + j * 0.2)

    if Pedalboard:
        sfx = Pedalboard([Reverb(room_size=0.3, wet_level=0.12, dry_level=0.95)])(sfx.T.astype(np.float32), SR).T

    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voice_path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    voice = np.frombuffer(raw, dtype=np.float32)
    vbuf = np.zeros(N)
    vbuf[: min(N, len(voice))] = voice[:N]
    # normalise voice to a consistent level
    rms = np.sqrt(np.mean(vbuf[np.abs(vbuf) > 1e-4] ** 2)) + 1e-9
    vbuf *= 10 ** (-20 / 20) / rms
    mix = sfx * 0.8
    mix[:, 0] += vbuf
    mix[:, 1] += vbuf
    if Pedalboard:
        mix = Pedalboard([Compressor(threshold_db=-10, ratio=2, attack_ms=10, release_ms=120), Limiter(threshold_db=-1.0)])(mix.T.astype(np.float32), SR).T
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.89
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out_path],
                   input=np.clip(mix, -1, 1).astype(np.float32).tobytes(), check=True)
    print('mix ok', out_path)


if __name__ == '__main__':
    main(*sys.argv[1:4])
