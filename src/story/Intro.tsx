import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, float, kf, lerp, sp } from '../lib';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { LogoIcon } from '../components/Icons';
import { Caption } from './common';
import { Phone3D, SH, SW } from './AppScenes';
import { Seg } from './types';

/* Opening scene of every video (replaces the first beat's plain text):
   the hook line + a moving explainer that makes the app's purpose obvious in the first seconds:
   a real app screen in the 3D iPhone, place cards flying out with live time counters, and the tagline. */

const fmt = (min: number) => {
  const m = Math.floor(min);
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
};

const CHIPS: { k: PlaceKind; x: number; y: number; from: [number, number]; base: number; rate: number; d: number }[] = [
  { k: 'home', x: 36, y: 640, from: [-520, -120], base: 192, rate: 9, d: 0.0 },
  { k: 'work', x: 690, y: 790, from: [560, -80], base: 418, rate: 7, d: 0.12 },
  { k: 'gym', x: 24, y: 1190, from: [-560, 120], base: 62, rate: 11, d: 0.24 },
  { k: 'cafe', x: 700, y: 1360, from: [560, 140], base: 38, rate: 8, d: 0.36 },
];

const Chip: React.FC<{ c: (typeof CHIPS)[number]; t0: number; i: number }> = ({ c, t0, i }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  // already moving at frame 0: each card starts its flight a bit before the video starts
  const e = sp(f, t0 - 0.25 + c.d, { damping: 13, stiffness: 120 });
  const P = PLACE[c.k];
  const minutes = c.base + Math.max(0, t - t0) * c.rate * 0.6; // ticks a few minutes per second
  const fx = lerp(c.from[0], 0, e);
  const fy = lerp(c.from[1], 0, e) + float(f, 3 + i * 5, 10);
  const rot = (1 - e) * (c.from[0] < 0 ? -18 : 18) + Math.sin(t * 1.3 + i) * 2;
  const live = Math.floor(t * 2) % 2 === 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        width: 340,
        padding: '18px 20px',
        borderRadius: 30,
        background: '#0E1311',
        boxShadow: `0 18px 40px ${P.color}55, 0 4px 12px rgba(10,20,16,0.12)`,
        border: `3px solid ${P.color}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transform: `translate(${fx}px, ${fy}px) rotate(${rot}deg) scale(${lerp(0.6, 1, e)})`,
        opacity: clamp01(e * 1.6),
        zIndex: 5,
      }}
    >
      <IconTile kind={c.k} size={70} solid />
      <div style={{ fontFamily: FONT, lineHeight: 1.1 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.inkSoft, display: 'flex', alignItems: 'center', gap: 8 }}>
          {P.name}
          {i === 0 && <span style={{ width: 10, height: 10, borderRadius: 5, background: '#E0503F', opacity: live ? 1 : 0.35 }} />}
        </div>
        <div style={{ fontFamily: FONT_TIGHT, fontSize: 44, fontWeight: 800, color: C.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{fmt(minutes)}</div>
      </div>
    </div>
  );
};

export const IntroHook: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const a = seg.start;
  const pill = sp(f, a + 0.15, { damping: 12, stiffness: 160 });
  // dotted trail connecting the places, drawn progressively
  const trail = kf(f, [a, a + 1.6], [0, 1], EASE.out);
  const zoom = kf(f, [a, seg.end], [1.12, 1.0], EASE.soft);
  const scroll = kf(f, [a + 0.2, seg.end], [0, -60], EASE.inOut);
  const capLen = (seg.cap ?? []).reduce((s, c) => s + c.t.length + 1, 0);
  // the hook words land fast (all on screen within ~1 s), the accent word keeps its spoken time if earlier
  const hook = (seg.cap ?? []).map((c, k) => ({ ...c, at: +Math.min(c.at, a + 0.12 + k * 0.11 + (c.accent ? 0.25 : 0)).toFixed(3) }));
  return (
    <AbsoluteFill>
      {/* the real app, already rising at frame 0 */}
      <Phone3D seg={{ ...seg, start: a - 0.45 }} scale={0.74} cy={1215} pose={seg.index % 2 ? 1 : -1}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <Img src={staticFile('screens/home_now.png')} style={{ width: SW, height: SH, objectFit: 'cover', transform: `translateY(${scroll}px) scale(${zoom})`, transformOrigin: '50% 30%' }} />
        </div>
      </Phone3D>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, zIndex: 4 }}>
        <defs>
          <linearGradient id="trail" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={PLACE.home.color} />
            <stop offset="0.35" stopColor={PLACE.work.color} />
            <stop offset="0.7" stopColor={PLACE.gym.color} />
            <stop offset="1" stopColor={PLACE.cafe.color} />
          </linearGradient>
        </defs>
        <path
          d="M 200 720 C 520 640, 700 760, 860 860 S 520 1120, 190 1260 S 640 1380, 870 1430"
          fill="none"
          stroke="url(#trail)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="2 22"
          pathLength={1000}
          style={{ strokeDashoffset: -t * 60 }}
          opacity={0.9 * trail}
          clipPath="none"
        />
      </svg>
      {CHIPS.map((c, i) => (
        <Chip key={c.k} c={c} t0={a} i={i} />
      ))}
      {/* what the app is, readable in the first second */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: capLen > 34 ? 486 : 430, display: 'flex', justifyContent: 'center', zIndex: 6 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 26px 12px 12px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #0E1512, #17261F)',
            boxShadow: '0 14px 34px rgba(10,30,22,0.30)',
            transform: `scale(${Math.max(0, pill)}) translateY(${(1 - pill) * 30}px)`,
            opacity: clamp01(pill * 2),
          }}
        >
          <LogoIcon size={56} />
          <span style={{ fontFamily: FONT, fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            OùVa <span style={{ color: C.mint }}>· le suivi du temps par lieu</span>
          </span>
        </div>
      </div>
      <div style={{ zIndex: 7, position: 'absolute', inset: 0 }}>
        <Caption cap={hook} out={seg.end - 0.25} top={150} size={98} />
      </div>
    </AbsoluteFill>
  );
};
