"""Soft, satisfying UI sounds (no instruments): gooey pops, bubbles, key taps, soft thuds, airy swishes, glassy dings."""
import numpy as np
SR = 48000
rng = np.random.default_rng(7)

def _env(n, a, d):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e

def _lp(x, fc):
    # one-pole low-pass, applied twice
    a = np.exp(-2 * np.pi * fc / SR)
    for _ in range(2):
        y = np.zeros_like(x); acc = 0.0
        for i in range(len(x)):
            acc = (1 - a) * x[i] + a * acc; y[i] = acc
        x = y
    return x

def goo(f0=320, f1=140, dur=0.16, wet=0.6):
    """gooey 'bloop': sine with fast downward pitch bend + a tiny upper bubble"""
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / (dur * 0.25))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * _env(n, 0.004, dur * 0.28)
    x += 0.25 * wet * np.sin(ph * 2.01) * _env(n, 0.002, dur * 0.12)
    return x * 0.9

def bubble(f0=500, f1=1100, dur=0.09):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / dur) ** 0.6
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.003, dur * 0.35) * 0.7

def key(seed=0):
    """soft phone keyboard tap"""
    n = int(0.05 * SR)
    r = np.random.default_rng(seed)
    x = r.standard_normal(n) * _env(n, 0.0008, 0.006)
    x = _lp(x, 3500) * 3.0
    t = np.arange(n) / SR
    x += 0.35 * np.sin(2 * np.pi * (1500 + 120 * (seed % 5)) * t) * _env(n, 0.001, 0.01)
    return x * 0.6

def thud(f=110, dur=0.22):
    """soft card landing"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (f + 40 * np.exp(-t / 0.03)) * t) * _env(n, 0.002, 0.06)
    x += _lp(rng.standard_normal(n), 900) * _env(n, 0.001, 0.02) * 1.5
    return x * 0.8

def swish(dur=0.35, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    fc = np.linspace(600, 2600, n) if up else np.linspace(2600, 600, n)
    y = np.zeros(n); acc = 0.0
    for i in range(n):
        a = np.exp(-2 * np.pi * fc[i] / SR); acc = (1 - a) * x[i] + a * acc; y[i] = acc
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return y * env * 0.9

def ding(f=1320, dur=0.9):
    """soft glassy ding (partials, quick decay)"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (dur * d)) for a, m, d in [(1, 1, 0.35), (0.35, 2.76, 0.12), (0.18, 5.4, 0.06)])
    return x * _env(n, 0.002, 10) * 0.35

def tick(f=2200):
    n = int(0.02 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * _env(n, 0.0005, 0.004) * 0.5
