import React, { useId, useMemo } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, FONT_TIGHT, EASE, FPS, clamp01, float, heatColor, lerp, p, rand, s } from '../lib';

/* ------------------------------------------------------------------ */
/* Directional (motion) blur                                           */
/* ------------------------------------------------------------------ */
export const MBlur: React.FC<{
  x?: number;
  y?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x = 0, y = 0, style, children }) => {
  const id = useId().replace(/:/g, '');
  const bx = Math.min(80, Math.abs(x));
  const by = Math.min(80, Math.abs(y));
  const active = bx > 0.35 || by > 0.35;
  return (
    <div style={{ position: 'absolute', inset: 0, filter: active ? `url(#${id})` : undefined, ...style }}>
      {active && (
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Background + grain                                                  */
/* ------------------------------------------------------------------ */
export const Backdrop: React.FC<{ mint?: number; dark?: number }> = ({ mint = 0, dark = 0 }) => {
  const frame = useCurrentFrame();
  const gx = 50 + Math.sin(frame * 0.006) * 12;
  const gy = 38 + Math.cos(frame * 0.005) * 8;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at ${gx}% ${gy}%, #FFFFFF 0%, ${C.bg} 55%, ${C.bg2} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: mint,
          background: `radial-gradient(110% 70% at 50% 40%, #E6FBF2 0%, #CFF5E6 55%, #B5ECD7 100%)`,
        }}
      />
      <AbsoluteFill style={{ opacity: dark, background: '#0A0E0C' }} />
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  const i = Math.floor(frame / 2) % 4;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity }}>
      <Img src={staticFile(`grain${i}.png`)} style={{ width: '100%', height: '100%', imageRendering: 'auto' }} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Soft floating card shell                                            */
/* ------------------------------------------------------------------ */
export const shadowLight =
  '0 2px 4px rgba(16,24,20,0.04), 0 12px 24px rgba(16,24,20,0.07), 0 40px 80px rgba(16,24,20,0.12)';
export const shadowDeep =
  '0 4px 8px rgba(0,0,0,0.10), 0 24px 48px rgba(10,20,16,0.20), 0 70px 120px rgba(10,20,16,0.28)';

/* ------------------------------------------------------------------ */
/* Odometer counter                                                    */
/* ------------------------------------------------------------------ */
export const Odometer: React.FC<{
  value: number;
  digits?: number;
  size: number;
  color?: string;
  weight?: number;
  speedBlur?: number;
  font?: string;
}> = ({ value, digits, size, color = C.ink, weight = 800, speedBlur = 0, font = FONT_TIGHT }) => {
  const v = Math.max(0, value);
  const n = digits ?? Math.max(1, String(Math.floor(v + 0.0001)).length);
  const h = size * 1.0;
  const cols = [];
  for (let k = n - 1; k >= 0; k--) {
    const pow = Math.pow(10, k);
    const base = Math.floor(v / pow) % 10;
    let roll = 0;
    if (k === 0) roll = v - Math.floor(v);
    else {
      const rem = v % pow;
      if (rem > pow - 1) roll = rem - (pow - 1);
    }
    const pos = base + roll;
    // hide leading zeros
    const leading = k > 0 && v < pow;
    cols.push(
      <div
        key={k}
        style={{
          height: h,
          overflow: 'hidden',
          width: leading ? 0 : size * 0.6,
          transition: 'none',
          position: 'relative',
        }}
      >
        <div
          style={{
            transform: `translateY(${-pos * h}px)`,
            filter: speedBlur > 0.3 ? `blur(${Math.min(8, speedBlur)}px)` : undefined,
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
            <div
              key={i}
              style={{ height: h, lineHeight: `${h}px`, textAlign: 'center', fontSize: size, fontWeight: weight }}
            >
              {d}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: font,
        color,
        letterSpacing: '-0.04em',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {cols}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Progress ring                                                       */
/* ------------------------------------------------------------------ */
export const Ring: React.FC<{
  size: number;
  stroke: number;
  progress: number;
  color?: string;
  track?: string;
  glow?: boolean;
}> = ({ size, stroke, progress, color = C.mint, track = 'rgba(255,255,255,0.08)', glow }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pr = clamp01(progress);
  const ang = -Math.PI / 2 + pr * Math.PI * 2;
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c * pr} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={glow ? { filter: `drop-shadow(0 0 ${stroke * 0.8}px ${color})` } : undefined}
      />
      {pr > 0.01 && (
        <circle cx={size / 2 + Math.cos(ang) * r} cy={size / 2 + Math.sin(ang) * r} r={stroke * 0.32} fill="#fff" />
      )}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Kinetic words (reference: "you've got options")                    */
/* ------------------------------------------------------------------ */
export type Word = { t: string; at: number; accent?: boolean; color?: string };
export const KineticLine: React.FC<{
  words: Word[];
  size: number;
  color?: string;
  accent?: string;
  out?: number; // exit time (s)
  weight?: number;
  italic?: boolean;
  align?: 'center' | 'left';
  gap?: number;
  font?: string;
  tracking?: string;
}> = ({
  words,
  size,
  color = C.ink,
  accent = C.mint,
  out,
  weight = 760,
  italic,
  align = 'center',
  gap = 0.26,
  font = FONT_TIGHT,
  tracking = '-0.035em',
}) => {
  const frame = useCurrentFrame();
  const exitT = out !== undefined ? p(frame, out, 0.35, EASE.in) : 0;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        flexWrap: 'wrap',
        columnGap: size * gap,
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: tracking,
        lineHeight: 1.04,
        fontStyle: italic ? 'italic' : 'normal',
      }}
    >
      {words.map((w, i) => {
        const t = p(frame, w.at, 0.55, EASE.out);
        const tb = p(frame, w.at, 0.3, EASE.out);
        const blur = (1 - tb) * 18 + exitT * 30;
        const ex = exitT * (-260 - i * 40);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              color: w.color ?? (w.accent ? accent : color),
              opacity: clamp01(t * 1.6) * (1 - exitT),
              transform: `translate(${(1 - t) * 70 + ex}px, ${(1 - t) * 10}px) scale(${lerp(0.94, 1, t)}, 1)`,
              filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
              whiteSpace: 'pre',
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Procedural stylized map (no real place)                             */
/* ------------------------------------------------------------------ */
const MAP = 2000;
type Road = { d: string; w: number; main?: boolean };
const buildMap = (variant = 0) => {
  const roads: Road[] = [];
  const parks: string[] = [];
  let seed = 3 + variant * 101;
  const r = () => rand(seed++);
  // minor street blocks: jittered grid in 3 rotated districts
  const jit = (k: number) => (variant === 0 ? 0 : (rand(variant * 7 + k) - 0.5));
  const districts = [
    { cx: 1300 + jit(1) * 300, cy: 700 + jit(2) * 300, ang: -0.45 + jit(3), n: 9, step: 92 },
    { cx: 650 + jit(4) * 300, cy: 1250 + jit(5) * 300, ang: 0.3 + jit(6), n: 10, step: 86 },
    { cx: 1350 + jit(7) * 300, cy: 1450 + jit(8) * 200, ang: 0.08 + jit(9), n: 8, step: 100 },
    { cx: 500 + jit(10) * 200, cy: 450 + jit(11) * 200, ang: 0.62 + jit(12), n: 7, step: 110 },
  ];
  for (const d of districts) {
    const ca = Math.cos(d.ang);
    const sa = Math.sin(d.ang);
    const tr = (x: number, y: number) => [d.cx + x * ca - y * sa, d.cy + x * sa + y * ca];
    const half = (d.n * d.step) / 2;
    for (let i = 0; i <= d.n; i++) {
      const off = -half + i * d.step + (r() - 0.5) * 24;
      const a0 = -half * (0.5 + r() * 0.5);
      const a1 = half * (0.5 + r() * 0.5);
      const [x0, y0] = tr(off, a0);
      const [x1, y1] = tr(off + (r() - 0.5) * 30, a1);
      roads.push({ d: `M${x0} ${y0}L${x1} ${y1}`, w: 7 });
      const [u0, v0] = tr(a0, off);
      const [u1, v1] = tr(a1, off + (r() - 0.5) * 30);
      if (r() > 0.25) roads.push({ d: `M${u0} ${v0}L${u1} ${v1}`, w: 7 });
    }
  }
  // parks
  for (let i = 0; i < 9; i++) {
    const cx = r() * MAP;
    const cy = r() * MAP;
    const pts = [];
    const k = 6 + Math.floor(r() * 4);
    const rad = 90 + r() * 170;
    for (let j = 0; j < k; j++) {
      const a = (j / k) * Math.PI * 2;
      const rr = rad * (0.65 + r() * 0.5);
      pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
    }
    parks.push(pts.join(' '));
  }
  // main roads
  roads.push({ d: 'M-50 380 C 500 520, 900 820, 1100 1080 S 1700 1700, 2100 1820', w: 20, main: true });
  roads.push({ d: 'M180 -50 C 300 600, 260 1200, 420 2100', w: 16, main: true });
  roads.push({ d: 'M-50 1500 C 600 1350, 1200 1200, 2100 900', w: 16, main: true });
  roads.push({ d: 'M1500 -50 C 1450 500, 1700 900, 1650 2100', w: 13, main: true });
  return { roads, parks, river: 'M-50 1100 C 300 1000, 600 1150, 800 1600 S 1000 2050, 1100 2100' };
};
const MAPCACHE: Record<number, ReturnType<typeof buildMap>> = {};
const getMap = (v: number) => (MAPCACHE[v] ??= buildMap(v));

export const StyledMap: React.FC<{ size?: number; dim?: number; seed?: number }> = ({ size = MAP, dim = 0, seed = 0 }) => {
  const MAPDATA = getMap(seed);
  return (
  <svg width={size} height={size} viewBox={`0 0 ${MAP} ${MAP}`} style={{ display: 'block' }}>
    <rect width={MAP} height={MAP} fill={C.mapBg} />
    {MAPDATA.parks.map((pt, i) => (
      <polygon key={i} points={pt} fill={C.mapPark} opacity={0.9} />
    ))}
    <path d={MAPDATA.river} stroke="#2B4F7A" strokeWidth={26} fill="none" strokeLinecap="round" />
    {MAPDATA.roads
      .filter((r) => !r.main)
      .map((r, i) => (
        <path key={i} d={r.d} stroke={C.mapRoad} strokeWidth={r.w} fill="none" strokeLinecap="round" />
      ))}
    {MAPDATA.roads
      .filter((r) => r.main)
      .map((r, i) => (
        <g key={i}>
          <path d={r.d} stroke="#26313D" strokeWidth={r.w + 8} fill="none" strokeLinecap="round" />
          <path d={r.d} stroke={C.mapRoadMain} strokeWidth={r.w} fill="none" strokeLinecap="round" />
        </g>
      ))}
    {dim > 0 && <rect width={MAP} height={MAP} fill="#0B0F0D" opacity={dim} />}
  </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Heat grid                                                            */
/* ------------------------------------------------------------------ */
export const GRID_N = 17;
const buildHeat = (variant = 0) => {
  const cells: { i: number; j: number; v: number; d: number; r: number }[] = [];
  const c = (GRID_N - 1) / 2;
  for (let j = 0; j < GRID_N; j++)
    for (let i = 0; i < GRID_N; i++) {
      const dx = i - c;
      const dy = (j - c - 0.6) * (1.05 + (variant ? (rand(variant) - 0.5) * 0.3 : 0));
      const d = Math.sqrt(dx * dx + dy * dy);
      const n = rand(i * 31 + j * 7 + variant * 1009);
      const v = Math.exp(-(d * d) / (2 * 2.6 * 2.6)) * 1.06 + (n - 0.5) * 0.12;
      const edge = d + (n - 0.5) * 1.6;
      if (edge > 7.4) continue;
      cells.push({ i, j, v: clamp01(v), d, r: n });
    }
  return cells;
};
export const HEAT = buildHeat();
const HEATCACHE: Record<number, ReturnType<typeof buildHeat>> = { 0: HEAT };
export const getHeat = (v: number) => (HEATCACHE[v] ??= buildHeat(v));

/**
 * appear: 0..1 cascade from centre outward
 * boost: pushes values toward red (0..1)
 * cool: pushes high values toward green for the ending (0..1)
 */
export const HeatGrid: React.FC<{
  cell: number;
  appear: number;
  boost?: number;
  cool?: number;
  opacity?: number;
  pixelGlow?: boolean;
  seed?: number;
}> = ({ cell, appear, boost = 0, cool = 0, opacity = 0.82, pixelGlow, seed = 0 }) => {
  const HEAT = getHeat(seed);
  const frame = useCurrentFrame();
  const size = cell * GRID_N;
  return (
    <svg width={size} height={size} style={{ overflow: 'visible', display: 'block' }}>
      {HEAT.map((h, k) => {
        const local = clamp01((appear * 1.35 - (h.d / 8) * 0.9 - h.r * 0.25) * 2.2);
        if (local <= 0) return null;
        const sc = EASE.out(local);
        const breathe = Math.sin(frame * 0.05 + h.r * 9) * 0.035;
        let v = clamp01(h.v * (0.55 + 0.45 * sc) + breathe + boost * Math.sqrt(h.v) * 0.42);
        // cool down: cells shift in a wave
        const coolLocal = clamp01(cool * 1.6 - h.r * 0.6);
        v = lerp(v, Math.min(v, 0.08 + h.v * 0.25), EASE.soft(coolLocal));
        const s2 = cell * (0.25 + 0.75 * sc);
        const x = h.i * cell + (cell - s2) / 2;
        const y = h.j * cell + (cell - s2) / 2;
        return (
          <rect
            key={k}
            x={x}
            y={y}
            width={s2}
            height={s2}
            fill={heatColor(v)}
            opacity={opacity * clamp01(local * 3)}
            stroke="rgba(10,14,12,0.35)"
            strokeWidth={1.4}
            style={pixelGlow && v > 0.8 ? { filter: `drop-shadow(0 0 ${cell * 0.35}px rgba(224,80,63,0.6))` } : undefined}
          />
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Small label chip (dark pill like the app)                           */
/* ------------------------------------------------------------------ */
export const Pill: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; light?: boolean }> = ({
  children,
  style,
  light,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 14,
      padding: '16px 30px',
      borderRadius: 999,
      background: light ? 'rgba(255,255,255,0.78)' : 'rgba(16,20,18,0.92)',
      color: light ? C.dark : '#fff',
      fontFamily: FONT,
      fontWeight: 650,
      fontSize: 34,
      letterSpacing: '-0.01em',
      boxShadow: light ? shadowLight : '0 10px 30px rgba(0,0,0,0.3)',
      backdropFilter: light ? 'blur(18px)' : undefined,
      border: light ? '1px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.06)',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* Disclaimer for illustrative data                                    */
/* ------------------------------------------------------------------ */
export const Illustrative: React.FC<{ opacity?: number; dark?: boolean; text?: string }> = ({
  opacity = 1,
  dark,
  text = 'Données illustratives',
}) => (
  <div
    style={{
      position: 'absolute',
      bottom: 64,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily: FONT,
      fontSize: 22,
      fontWeight: 500,
      letterSpacing: '0.02em',
      color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(13,18,16,0.38)',
      opacity,
    }}
  >
    {text}
  </div>
);

export const useFloat = (seed: number, amp = 8) => {
  const frame = useCurrentFrame();
  return { x: float(frame, seed, amp), y: float(frame, seed + 10, amp * 1.2), r: float(frame, seed + 20, 0.6) };
};

export { FPS, s };
