"""
Voice + synthesised sound design (noise-based foley, no pitched note) + a vocals-only background track chosen per video, driven by an events file from build_props.mjs.
Usage: python3 pipeline/mix_audio.py events.json voice.mp3 out.wav
"""
import json, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt

try:
    import pyloudnorm
except Exception:  # optional, falls back to RMS
    pyloudnorm = None

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


# All sounds below are built from filtered noise only: no pitch, no notes, no instrument.

def noise_burst(dur, lo, hi, attack, decay, curve=4):
    n = int(dur * SR)
    return bp(rng.standard_normal(n), lo, min(hi, 20000)) * env(n, attack, decay, curve)


def pop(freq=520, dur=0.12, drop=2.2):
    """soft finger tap: short band-limited noise click + a little low noise body"""
    n = int(dur * SR)
    c = noise_burst(dur, 1500, 6000, 0.0005, 0.008, 5)
    body = lp(rng.standard_normal(n), 500) * env(n, 0.002, 0.03, 4) * 1.4
    s = c + body
    return s / (np.abs(s).max() + 1e-9) * 0.8


def tick(freq=2400, dur=0.03):
    """dry click (like a key or a switch)"""
    return noise_burst(dur, 2500, 9000, 0.0003, 0.004, 5)


def blip(freq, dur=0.05):
    """tiny keyboard-like click"""
    c = rng.uniform(1800, 5000)
    s = noise_burst(dur, c * 0.6, c * 1.6, 0.0004, 0.006, 5)
    return s / (np.abs(s).max() + 1e-9) * 0.6


def impact(freq=52, dur=1.0):
    """deep thud made of low-passed noise whose cutoff falls (no tone)"""
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    seg = 16
    for k in range(seg):
        a, b = k * n // seg, (k + 1) * n // seg
        fc = 60 + 900 * np.exp(-k * 0.9)
        out[a:b] = lp(noise[max(0, a - 2000):b], fc)[-(b - a):]
    out *= env(n, 0.002, dur * 0.3, 4)
    out = out / (np.abs(out).max() + 1e-9)
    return np.tanh(out * 1.8) * 0.9


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


def sparkle(dur=1.2):
    """airy swell + a few micro clicks, replaces the old musical chimes"""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    air = hp(rng.standard_normal(n), 5000) * np.sin(np.pi * t) ** 2 * 0.35
    for _ in range(10):
        i = int(rng.uniform(0, 0.7) * n)
        c = noise_burst(0.02, 4000, 12000, 0.0003, 0.004, 5)
        air[i:i + len(c)] += c[: n - i] * rng.uniform(0.3, 0.7)
    return air


def ambience(N):
    """very soft room/air tone under the voice (filtered noise, slowly breathing)"""
    t = np.arange(N) / SR
    base = lp(hp(rng.standard_normal(N), 90), 900) * 0.6 + lp(hp(rng.standard_normal(N), 1500), 5000) * 0.12
    breath = 0.75 + 0.25 * np.sin(2 * np.pi * t / 7.3) * np.sin(2 * np.pi * t / 3.1 + 1)
    out = base * breath
    return out / (np.sqrt(np.mean(out ** 2)) + 1e-9)


def load_bg(path, start, N):
    """background track from `start`, looped with a crossfade if the video is longer"""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    if len(x) < SR:
        return None
    out = x[:N].copy()
    xf = int(SR * 1.5)
    while len(out) < N:  # loop: crossfade the end into the beginning again
        a = np.linspace(0, 1, xf)[:, None]
        tail = out[-xf:] * (1 - a) + x[:xf] * a
        out = np.concatenate([out[:-xf], tail, x[xf:]])[:N] if len(out) > xf else np.concatenate([out, x])[:N]
    return out


def lufs(x):
    """integrated loudness (LUFS, K-weighted); RMS-based fallback"""
    x = np.asarray(x, dtype=np.float64)
    if pyloudnorm is not None and len(x) > SR:
        v = pyloudnorm.Meter(SR).integrated_loudness(x)
        if np.isfinite(v):
            return float(v)
    return float(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9) - 0.7)


# background level, in LU relative to the voice
BG_UNDER_VOICE = -17.0  # while the voice speaks (clearly behind, still felt)
BG_IN_GAPS = -11.0  # pauses and end card
BG_PHONE_MIN = -19.0  # what's left on a phone speaker (no bass) must stay audible


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
                place(blip(0, 0.04), tt, 0.08, pan=rng.uniform(-0.7, 0.7))
        elif ty == 'counter':
            n, t1 = e.get('n', 20), e['to']
            for j in range(1, n + 1):
                x = 1 - (1 - j / n) ** (1 / 2.2)
                place(tick(e.get('base', 1500) + j * 25, 0.022), t + (t1 - t) * x, e.get('gain', 0.12), pan=rng.uniform(-0.2, 0.2))
        elif ty == 'chimes':
            place(sparkle(1.2), t, 0.35)

    if Pedalboard:
        sfx = Pedalboard([Reverb(room_size=0.3, wet_level=0.12, dry_level=0.95)])(sfx.T.astype(np.float32), SR).T

    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voice_path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    voice = np.frombuffer(raw, dtype=np.float32)
    vbuf = np.zeros(N)
    vbuf[: min(N, len(voice))] = voice[:N]
    # normalise voice to a consistent level
    loud = vbuf[np.abs(vbuf) > 1e-4]
    if len(loud) > SR:  # (guard: a silent voice track must not be amplified into noise)
        rms = np.sqrt(np.mean(loud ** 2)) + 1e-9
        vbuf *= 10 ** (-20 / 20) / rms
    else:
        vbuf[:] = 0
    mix = sfx * 0.8
    venv = np.convolve(np.abs(vbuf), np.ones(int(SR * 0.25)) / int(SR * 0.25), mode='same')
    speech = np.clip(venv / (np.percentile(venv, 90) + 1e-9), 0, 1)
    bgspec = spec.get('bg')
    bg = load_bg(bgspec['file'], bgspec.get('start', 0), N) if bgspec else None
    if bg is not None:
        # background track (vocals only, chosen per video), level set on perceived loudness, not on raw RMS:
        # a bass-heavy track sounds much quieter on a phone, so we also look at it without its low end.
        L_voice = lufs(vbuf[np.abs(venv) > 0.2 * np.percentile(venv, 90)]) if np.any(vbuf) else -20.0
        L_full = lufs(bg)
        L_phone = lufs(hp(hp(bg.mean(1), 180), 180))
        g_db = L_voice + BG_IN_GAPS - L_full  # nominal level (in the gaps)
        if L_phone + g_db < L_voice + BG_PHONE_MIN:  # would vanish on a phone speaker: lift it a little
            g_db = min(g_db + 4.0, L_voice + BG_PHONE_MIN - L_phone)
        bg = bg * 10 ** (g_db / 20)
        # smooth ducking (fast attack, slow release) while the voice speaks
        sm = np.convolve(speech, np.ones(int(SR * 0.35)) / int(SR * 0.35), mode='same')
        duck_db = (BG_UNDER_VOICE - BG_IN_GAPS) * np.clip(np.maximum(speech, sm) * 1.3, 0, 1)
        fade = np.minimum(1, np.minimum(np.arange(N) / (SR * 0.4), (N - np.arange(N)) / (SR * 1.5)))
        bg = bg * (10 ** (duck_db / 20) * fade)[:, None]
        # make room for the voice: carve the 1-4 kHz band of the music a bit
        bg = bg - 0.3 * np.stack([bp(bg[:, 0], 1000, 4000), bp(bg[:, 1], 1000, 4000)], 1) * np.clip(sm, 0, 1)[:, None]
        mix += bg
        print(f'bg level: voice {L_voice:.1f} LUFS, bg {L_full + g_db:.1f} LUFS in gaps ({L_full + g_db - L_voice:+.1f} LU), '
              f'phone-weighted {L_phone + g_db - L_voice:+.1f} LU')
    else:
        # soft non-musical room tone when no track is available
        amb = ambience(N) * 10 ** (-41 / 20)
        fade = np.minimum(1, np.minimum(np.arange(N) / (SR * 0.6), (N - np.arange(N)) / (SR * 1.0)))
        amb *= (1 - 0.45 * speech) * fade
        mix[:, 0] += amb
        mix[:, 1] += amb
    mix[:, 0] += vbuf
    mix[:, 1] += vbuf
    # final loudness: -14 LUFS (TikTok / Reels standard), then a transparent look-ahead peak limiter
    # (no make-up gain, so the loudness target is kept)
    mix = mix * 10 ** ((-14.0 - lufs(mix)) / 20)
    from scipy.ndimage import maximum_filter1d, minimum_filter1d
    ceiling = 10 ** (-1.5 / 20)
    env = maximum_filter1d(np.abs(mix).max(1), size=int(SR * 0.005))
    g = np.minimum(1.0, ceiling / (env + 1e-9))
    g = minimum_filter1d(g, size=int(SR * 0.004))
    k = int(SR * 0.06)
    g = np.minimum(g, np.convolve(g, np.ones(k) / k, mode='same'))
    mix = mix * g[:, None]
    peak = np.abs(mix).max()
    if peak > 0.95:
        mix = mix / peak * 0.95
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', out_path],
                   input=np.clip(mix, -1, 1).astype(np.float32).tobytes(), check=True)
    print('mix ok', out_path)


if __name__ == '__main__':
    main(*sys.argv[1:4])
