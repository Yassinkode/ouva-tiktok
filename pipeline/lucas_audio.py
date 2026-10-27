"""
Builds the timeline + full sound design of the one-off "Lucas" video:
voice lines placed on a timeline, special effect on "Alors… nous l'avons fait" (lower pitch, echo, big reverb),
a tape-rewind (reversed, accelerating, then tape-stop), a VHS pause clunk, glitch bursts on "fictif",
riser + boom before the logo, whooshes on every cut, pops on the place pins, a vocals-only background track.
Usage: python3 pipeline/lucas_audio.py data/oneoff/lucas public/lucas
"""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import mix_audio as M
from pedalboard import Pedalboard, PitchShift, Reverb, Delay, LowpassFilter, HighpassFilter

SR = M.SR
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
lines = {l['k']: l for l in json.load(open(f'{src}/lines_out.json'))}


def load(path, ch=1):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    return x.reshape(-1, ch) if ch > 1 else x


def trim(x):
    idx = np.where(np.abs(x) > 0.01)[0]
    if not len(idx):
        return x, 0.0
    a = max(0, idx[0] - int(0.02 * SR))
    b = min(len(x), idx[-1] + int(0.08 * SR))
    return x[a:b], a / SR


voice = {}
for k, l in lines.items():
    x, off = trim(load(f'{src}/{k}.mp3'))
    rms = np.sqrt(np.mean(x[np.abs(x) > 1e-3] ** 2)) + 1e-9
    voice[k] = x * (10 ** (-20 / 20) / rms)
    l['_off'] = off

# special voice effect for l6: deeper, echo, big hall
fx6 = Pedalboard([PitchShift(semitones=-4), Delay(delay_seconds=0.26, feedback=0.32, mix=0.28), Reverb(room_size=0.9, damping=0.35, wet_level=0.38, dry_level=0.85)])
v6 = np.concatenate([voice['l6'], np.zeros(int(1.4 * SR))]).astype(np.float32)
voice['l6fx'] = fx6(v6[None, :], SR)[0] * 1.15
# "Attends…": a little room, like a thought
voice['l4'] = Pedalboard([Reverb(room_size=0.35, wet_level=0.18, dry_level=0.95)])(voice['l4'][None, :].astype(np.float32), SR)[0]

dur = lambda k: len(voice[k]) / SR
T = {}
T['l1'] = 0.30
T['l2'] = T['l1'] + dur('l1') + 0.12
T['l3'] = T['l2'] + dur('l2') + 0.12
r0 = T['l3'] + dur('l3') + 0.40
r1 = r0 + 1.6
T['l4'] = r1 + 0.35
T['l5'] = T['l4'] + dur('l4') + 0.18
T['l6'] = T['l5'] + dur('l5') + 0.75
T['l7'] = T['l6'] + dur('l6') + 1.05
T['l8'] = T['l7'] + dur('l7') + 0.08
T['l9'] = T['l8'] + dur('l8') + 0.18
total = T['l9'] + dur('l9') + 2.2
N = int(total * SR)

# ---- word timings (absolute) for the video
props_lines = {}
for k, l in lines.items():
    ws = l.get('words') or []
    off = l['_off']
    words = [{'w': w['w'], 's': round(T[k] + max(0, w['s'] - off), 3), 'e': round(T[k] + max(0, w['e'] - off), 3)} for w in ws]
    props_lines[k] = {'k': k, 'text': l['text'], 'at': round(T[k], 3), 'end': round(T[k] + dur(k), 3), 'words': words}


def word_at(k, w, fb):
    n = lambda s: ''.join(ch for ch in s.lower() if ch.isalnum())
    for x in props_lines[k]['words']:
        if n(x['w']).startswith(n(w)):
            return x['s']
    return fb


# ---- voice track
vtrack = np.zeros(N)
for k in ['l1', 'l2', 'l3', 'l4', 'l5', 'l7', 'l8', 'l9']:
    i = int(T[k] * SR)
    v = voice[k][: N - i]
    vtrack[i:i + len(v)] += v
i = int(T['l6'] * SR)
v = voice['l6fx'][: N - i]
vtrack[i:i + len(v)] += v

# ---- background (vocals-only track chosen by Yassine), ducked under the voice
bg = M.load_bg('assets/bg/arches.mp3', 11.4, N)
venv = np.convolve(np.abs(vtrack), np.ones(int(SR * 0.25)) / int(SR * 0.25), mode='same')
speech = np.clip(venv / (np.percentile(venv, 90) + 1e-9), 0, 1)
L_v = M.lufs(vtrack[np.abs(venv) > 0.2 * np.percentile(venv, 90)])
bg = bg * 10 ** ((L_v - 12 - M.lufs(bg)) / 20)
gain = 10 ** ((-5.5 * np.clip(np.maximum(speech, np.convolve(speech, np.ones(int(SR * .35)) / int(SR * .35), 'same')) * 1.3, 0, 1)) / 20)
tt = np.arange(N) / SR
# muffled + quieter during the pause / "fictif" part, back to full on the logo
muff = ((tt >= r1) & (tt < T['l6'])).astype(float)
muff = np.convolve(muff, np.ones(int(SR * 0.2)) / int(SR * 0.2), 'same')
bg_l = Pedalboard([LowpassFilter(cutoff_frequency_hz=500)])(bg.T.astype(np.float32), SR).T
bg = bg * (1 - muff)[:, None] + bg_l * 0.55 * muff[:, None]
bg *= gain[:, None]
# little silence just before the logo for impact
hole = 1 - 0.85 * np.clip((tt - (T['l6'] - 0.6)) / 0.15, 0, 1) * np.clip((T['l6'] + 0.05 - tt) / 0.05, 0, 1)
bg *= hole[:, None]
fade = np.minimum(1, np.minimum(tt / 0.4, (total - tt) / 1.5))
bg *= fade[:, None]

mix = bg.copy()
mix[:, 0] += vtrack
mix[:, 1] += vtrack

# ---- sound effects
sfx = np.zeros((N, 2))


def place(sig, t, g=1.0, pan=0.0):
    i = int(max(0, t) * SR)
    if i >= N:
        return
    sig = np.asarray(sig)
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        sig = np.stack([sig * l, sig * r], 1)
    sig = sig[: N - i]
    sfx[i:i + len(sig)] += sig * g


# VHS "play" clunk at the start
place(M.impact(48, 0.5), 0.0, 0.35)
place(M.tick(), 0.02, 0.4)
# pins
for w, fb, pan in [('lui', T['l2'] + 2.2, -0.4), ('travail', T['l2'] + 2.9, 0.3), ('salle', T['l2'] + 3.5, 0.5)]:
    place(M.pop(), word_at('l2', w, fb), 0.55, pan)
place(M.whoosh(0.4, True), T['l2'] + 0.15, 0.4)
place(M.sparkle(1.0), T['l3'] + 0.9, 0.5)

# ---- tape rewind: the last seconds played backwards, accelerating, then a tape stop
src_len = min(r0, 6.0)
seg = mix[int((r0 - src_len) * SR):int(r0 * SR)][::-1]
n_out = int((r1 - r0) * SR)
u = np.linspace(0, 1, n_out)
pos = (u ** 1.6) * (len(seg) - 1)  # accelerating read head
rew = np.stack([np.interp(pos, np.arange(len(seg)), seg[:, c]) for c in range(2)], 1)
rew = Pedalboard([HighpassFilter(cutoff_frequency_hz=180)])(rew.T.astype(np.float32), SR).T * 0.8
# scratch noise sweeps on top
scr = M.riser(r1 - r0) * 0.25
rew[:, 0] += scr
rew[:, 1] += scr
# remove the original audio during the rewind and put the rewind in its place
i0, i1 = int(r0 * SR), int(r0 * SR) + n_out
mix[i0:i1] = 0
mix[i0:i1] += rew[: i1 - i0]
place(M.tick(1200, 0.05), r0 - 0.02, 0.6)
# tape stop + pause clunk
place(M.impact(40, 0.6), r1, 0.5)
place(M.tick(), r1 + 0.01, 0.5)

# "fictif": glitch stutter
gf = word_at('l5', 'fictif', T['l5'] + 0.6)
for j in range(9):
    place(M.noise_burst(0.05, 800 + 400 * (j % 3), 6000, 0.001, 0.02, 4), gf + j * 0.065, 0.35, (-1) ** j * 0.5)
# riser + boom + sparkle for the logo
place(M.riser(0.9), T['l6'] - 0.95, 0.55)
place(M.impact(38, 1.4), T['l6'] - 0.02, 1.0)
place(M.sparkle(1.3), T['l6'] + 0.25, 0.6)
# presentation: whoosh on every cut
cuts = [T['l7'], word_at('l8', 'détecte', T['l8']), word_at('l8', 'compte', T['l8'] + 1.3), word_at('l8', 'montre', T['l8'] + 2.3), word_at('l8', 'carte', T['l8'] + 3.0)]
for j, c in enumerate(cuts):
    place(M.whoosh(0.35, j % 2 == 0), c - 0.12, 0.5, 0.3 if j % 2 else -0.3)
    place(M.pop(), c, 0.35)
place(M.whoosh(0.45, False), T['l9'] - 0.2, 0.5)
place(M.impact(46, 0.9), T['l9'] - 0.05, 0.6)

mix += sfx * 0.8
mix = mix * 10 ** ((-14.0 - M.lufs(mix)) / 20)
from scipy.ndimage import maximum_filter1d, minimum_filter1d
env = maximum_filter1d(np.abs(mix).max(1), size=int(SR * 0.005))
g = np.minimum(1.0, 10 ** (-1.5 / 20) / (env + 1e-9))
g = minimum_filter1d(g, size=int(SR * 0.004))
k = int(SR * 0.06)
g = np.minimum(g, np.convolve(g, np.ones(k) / k, mode='same'))
mix *= g[:, None]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', f'{out}/audio.wav'],
               input=np.clip(mix, -1, 1).astype(np.float32).tobytes(), check=True)
props = {'audio': 'lucas/audio.wav', 'duration': round(total, 3), 'rew': [round(r0, 3), round(r1, 3)], 'lines': props_lines}
json.dump(props, open(f'{out}/props.json', 'w'), ensure_ascii=False, indent=1)
print('ok', round(total, 2), 's  rewind', round(r0, 2), '->', round(r1, 2), ' logo', round(T['l6'], 2))
