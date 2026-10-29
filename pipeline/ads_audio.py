"""Sound for the paid ads (no voice, no instruments): vocals-only bg track + noise SFX on every cut.
Usage: python3 pipeline/ads_audio.py"""
import os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import mix_audio as M
SR = M.SR

ADS = {
    # name: (duration, bg track, bg start, cuts, pops, impact times, cta)
    'adA': (15, 'blinded', 20.0, [2.1, 4.1, 6.0, 7.9, 9.8, 11.8], [6.45, 6.75, 8.3, 10.2], [4.1], 11.8),
    'adB': (15, 'arches', 11.4, [1.7, 3.8, 5.9, 8.0, 10.1, 12.6], [1.85, 3.95, 6.05, 8.15], [1.7], 12.6),
    'adC': (13, 'losing', 8.0, [3.3, 5.4, 7.6, 10.2], [1.1, 1.35, 1.6, 7.9], [3.3], 10.2),
}

for name, (dur, bgn, st, cuts, pops, imps, cta) in ADS.items():
    N = int(dur * SR)
    bg = M.load_bg(f'assets/bg/{bgn}.mp3', st, N)
    bg = bg * 10 ** ((-20 - M.lufs(bg)) / 20)
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

    place(M.whoosh(0.4, True), 0.0, 0.5)
    for j, c in enumerate(cuts):
        place(M.whoosh(0.35, j % 2 == 0), c - 0.15, 0.55, 0.3 if j % 2 else -0.3)
    for j, c in enumerate(pops):
        place(M.pop(480 + 60 * j), c, 0.45, (-1) ** j * 0.4)
    for c in imps:
        place(M.riser(0.7), c - 0.75, 0.4)
        place(M.impact(44, 1.0), c, 0.8)
    place(M.riser(0.6), cta - 0.65, 0.35)
    place(M.impact(40, 1.2), cta, 0.9)
    place(M.sparkle(1.2), cta + 0.45, 0.55)
    tt = np.arange(N) / SR
    bg *= np.minimum(1, np.minimum(tt / 0.3, (dur - tt) / 1.0))[:, None]
    mix = bg + sfx * 0.7
    mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
    pk = np.abs(mix).max()
    if pk > 0.89:  # soft clip only the peaks
        mix = np.tanh(mix / 0.89) * 0.89
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', f'public/ads/{name}.wav'],
                   input=mix.astype(np.float32).tobytes(), check=True)
    print(name, 'ok', round(M.lufs(mix), 1), 'LUFS')
