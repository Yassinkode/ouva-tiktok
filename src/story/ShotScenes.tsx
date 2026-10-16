import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, float, kf, lerp, sp, vel } from '../lib';
import { shadowDeep } from '../components/Core';
import { Caption, Disclaimer, Whip, tOr } from './common';
import { Phone3D, SH, SW } from './AppScenes';
import { Seg } from './types';

/* Real (privacy-redacted) captures of the app, in public/screens/.
   Regions are in the 920x2000 reference frame of the captures. */
type Box = [number, number, number, number];
export const SHOTS: Record<string, { file: string; regions: Record<string, Box> }> = {
  home_now: {
    file: 'screens/home_now.png',
    regions: { now: [37, 468, 883, 1018], places: [37, 1060, 883, 1550], header: [30, 170, 890, 450], pause: [64, 895, 856, 990] },
  },
  home_features: {
    file: 'screens/home_features.png',
    regions: { now: [37, 325, 883, 548], objectifs: [38, 676, 882, 894], comparer: [38, 914, 882, 1132], revivre: [38, 1152, 882, 1370], theme: [38, 1390, 882, 1608], features: [38, 600, 882, 1608] },
  },
  places_heatmap: {
    file: 'screens/places_heatmap.png',
    regions: { heat: [200, 720, 690, 1200], legend: [28, 340, 557, 538], places: [28, 1510, 892, 1752], home: [28, 1515, 300, 1750], add: [620, 1515, 890, 1750] },
  },
  day_map: {
    file: 'screens/day_map.png',
    regions: { map: [37, 518, 883, 1137], player: [37, 1200, 883, 1320], timeline: [37, 1340, 883, 1628], download: [37, 1800, 883, 1898] },
  },
  place_stats: {
    file: 'screens/place_stats.png',
    regions: { header: [37, 590, 883, 730], today: [37, 753, 883, 1237], week: [37, 1260, 883, 1583], ring: [640, 780, 845, 990] },
  },
  add_place: {
    file: 'screens/add_place.png',
    regions: { steps: [60, 290, 860, 430], name: [46, 636, 874, 770], category: [46, 840, 860, 960], continue: [46, 995, 874, 1128] },
  },
};

const REF_W = 920;
const REF_H = 2000;

const boxOf = (shot: string, r: any): Box | null => {
  if (!r) return null;
  if (Array.isArray(r)) return r as Box;
  return SHOTS[shot]?.regions[r] ?? null;
};

/** camera (scale + translate) that frames a box inside the phone screen */
const frameFor = (b: Box | null, maxZ = 2.3) => {
  if (!b) return { z: 1, x: 0, y: 0 };
  const sx = SW / REF_W;
  const sy = SH / REF_H;
  const bw = (b[2] - b[0]) * sx;
  const bh = (b[3] - b[1]) * sy;
  const z = Math.min(maxZ, Math.max(1, Math.min((SW * 0.92) / bw, (SH * 0.62) / bh)));
  const cx = ((b[0] + b[2]) / 2) * sx;
  const cy = ((b[1] + b[3]) / 2) * sy;
  // translate so that the box centre goes to the screen centre, clamped to the screenshot edges
  let x = SW / 2 - cx * z;
  let y = SH / 2 - cy * z;
  x = Math.min(0, Math.max(SW - SW * z, x));
  y = Math.min(0, Math.max(SH - SH * z, y));
  return { z, x, y };
};

/** the screenshot with an animated camera + highlight ring */
const ShotView: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const shot = SHOTS[seg.params.shot] ? seg.params.shot : 'home_now';
  const S = SHOTS[shot];
  const r1 = boxOf(shot, seg.params.region);
  const r2 = boxOf(shot, seg.params.region2);
  const tz = tOr(seg, 'zoom', 0.35);
  const tz2 = tOr(seg, 'zoom2', 0.7);
  const F0 = { z: 1, x: 0, y: 0 };
  const F1 = frameFor(r1, seg.params.maxZoom ?? 2.2);
  const F2 = r2 ? frameFor(r2, seg.params.maxZoom ?? 2.2) : F1;
  const cam = (fr: number) => {
    const u1 = kf(fr, [tz, tz + 0.65], [0, 1], EASE.inOut);
    const u2 = r2 ? kf(fr, [tz2, tz2 + 0.65], [0, 1], EASE.inOut) : 0;
    const A = { z: lerp(F0.z, F1.z, u1), x: lerp(F0.x, F1.x, u1), y: lerp(F0.y, F1.y, u1) };
    return { z: lerp(A.z, F2.z, u2), x: lerp(A.x, F2.x, u2), y: lerp(A.y, F2.y, u2) };
  };
  const c = cam(f);
  const blur = Math.min(6, vel((fr) => cam(fr).y + cam(fr).x, f) * 0.15);
  const active = r2 && f / FPS > tz2 + 0.2 ? r2 : r1;
  const hT = active === r2 && r2 ? tz2 + 0.55 : tz + 0.55;
  const h = sp(f, hT, { damping: 12, stiffness: 180 });
  const sx = SW / REF_W;
  const sy = SH / REF_H;
  const label: string | undefined = active === r2 && r2 ? seg.params.label2 : seg.params.label;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0B0F0D' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: SW, height: SH, transformOrigin: '0 0', transform: `translate(${c.x}px, ${c.y}px) scale(${c.z})`, filter: blur > 0.4 ? `blur(${blur}px)` : undefined }}>
        <Img src={staticFile(S.file)} style={{ width: SW, height: SH, objectFit: 'cover', display: 'block' }} />
        {active && seg.params.highlight !== false && h > 0.01 && (
          <div
            style={{
              position: 'absolute',
              left: active[0] * sx - 6,
              top: active[1] * sy - 6,
              width: (active[2] - active[0]) * sx + 12,
              height: (active[3] - active[1]) * sy + 12,
              borderRadius: 26,
              border: `${3 / c.z + 1}px solid ${C.mint}`,
              boxShadow: `0 0 ${18 / c.z}px ${C.mint}, 0 0 0 4000px rgba(5,8,7,${0.45 * clamp01(h)})`,
              opacity: clamp01(h * 1.5),
              transform: `scale(${lerp(1.08, 1, clamp01(h))})`,
            }}
          />
        )}
      </div>
      {label && h > 0.01 && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 70, display: 'flex', justifyContent: 'center', opacity: clamp01(h * 2), transform: `translateY(${(1 - clamp01(h)) * 40}px)` }}>
          <div style={{ padding: '14px 26px', borderRadius: 999, background: C.mint, color: '#06281D', fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 28, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>{label}</div>
        </div>
      )}
    </div>
  );
};

/* 13 ─ a real app screen inside the 3D iPhone, with zoom + highlight */
export const AppScreen: React.FC<{ seg: Seg }> = ({ seg }) => (
  <AbsoluteFill>
    <Phone3D seg={seg} scale={seg.params.big ? 1.12 : 1} cy={seg.params.big ? 1110 : 1080}>
      <ShotView seg={seg} />
    </Phone3D>
    <Caption cap={seg.cap} out={seg.end - 0.3} top={130} size={92} />
    <Disclaimer show text="Capture réelle de l'app" />
  </AbsoluteFill>
);

/* 14 ─ three real screens fanned out, sliding like a carousel */
const MiniPhone: React.FC<{ file: string; w: number }> = ({ file, w }) => {
  const h = w * 2.07;
  const r = w * 0.16;
  return (
    <div style={{ width: w, height: h, borderRadius: r, padding: w * 0.028, background: 'linear-gradient(140deg, #8C9196 0%, #3B3F43 30%, #1C1E20 60%, #6B7075 100%)', boxShadow: shadowDeep, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: r * 0.86, overflow: 'hidden', background: '#000', position: 'relative' }}>
        <Img src={staticFile(file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', top: w * 0.03, left: '50%', width: w * 0.26, height: w * 0.075, marginLeft: -w * 0.13, borderRadius: 99, background: '#000' }} />
      </div>
    </div>
  );
};

export const AppTour: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const shots: string[] = (seg.params.shots ?? ['home_now', 'places_heatmap', 'place_stats']).filter((s: string) => SHOTS[s]).slice(0, 4);
  const n = shots.length;
  const span = seg.end - a - 0.5;
  const times = shots.map((_, i) => (i === 0 ? a : seg.t[`s${i + 1}`] ?? a + 0.2 + (span / n) * i));
  const posFn = (fr: number) => {
    let pos = 0;
    for (let i = 1; i < n; i++) pos += kf(fr, [times[i] - 0.1, times[i] + 0.45], [0, 1], EASE.inOut);
    return pos;
  };
  const pos = posFn(f);
  const v = vel(posFn, f);
  const enter = sp(f, a, { damping: 15, stiffness: 110 });
  return (
    <AbsoluteFill>
      <Whip seg={seg} noEnter>
        <AbsoluteFill style={{ perspective: 2000, transform: `translateY(${(1 - enter) * 600}px)`, opacity: clamp01(enter * 2) }}>
          {shots
            .map((s, i) => ({ s, i, d: i - pos }))
            .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
            .map(({ s, i, d }) => {
              const ad = Math.abs(d);
              const w = 470;
              const x = 540 + d * 540 - w / 2;
              const sc = lerp(1, 0.66, clamp01(ad));
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: 1010 - (w * 2.07) / 2 + float(f, i * 4, 8),
                    transform: `rotateY(${-d * 28}deg) scale(${sc})`,
                    opacity: clamp01(1.6 - ad * 0.7),
                    filter: `brightness(${lerp(1, 0.7, clamp01(ad))}) ${v > 0.01 ? `blur(${Math.min(8, v * 120 * clamp01(ad + 0.3))}px)` : ''}`,
                  }}
                >
                  <MiniPhone file={SHOTS[s].file} w={w} />
                </div>
              );
            })}
        </AbsoluteFill>
      </Whip>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={150} size={96} />
      <Disclaimer show text="Captures réelles de l'app" />
    </AbsoluteFill>
  );
};

export { FONT };
