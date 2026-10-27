import { Easing, interpolate, spring } from 'remotion';

export const FPS = 60;
export const W = 1080;
export const H = 1920;
export const DURATION_S = 41.5;

/** seconds -> frames */
export const s = (t: number) => Math.round(t * FPS);

export const C = {
  bg: '#F2F2EE',
  bg2: '#E9EAE5',
  ink: '#FFFFFF', // text on the (dark, cinematic) background
  inkSoft: 'rgba(255,255,255,0.74)',
  dark: '#0D1210', // text on light surfaces
  darkSoft: '#5D6662',
  mint: '#52DFAF',
  mintDeep: '#1F9D76',
  mintInk: '#0B3B2D',
  card: '#121715',
  card2: '#1A201E',
  line: 'rgba(255,255,255,0.08)',
  home: '#E0874A',
  homeBg: '#3E2817',
  gym: '#F08A4B',
  gymBg: '#47291A',
  school: '#6E8CF0',
  work: '#52DFAF',
  heatLow: '#3BB59B',
  heatMid: '#E8C64B',
  heatOrange: '#EE8A3B',
  heatHigh: '#E0503F',
  mapBg: '#2C3846',
  mapPark: '#1E5146',
  mapRoad: '#4B5A6C',
  mapRoadMain: '#6D7C8E',
};

export const FONT = "'Inter Variable', 'Inter', system-ui, sans-serif";
export const FONT_TIGHT = "'Inter Tight Variable', 'Inter Variable', system-ui, sans-serif";

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo-ish out
  inOut: Easing.bezier(0.76, 0, 0.24, 1), // strong in-out (whip)
  soft: Easing.bezier(0.45, 0, 0.2, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
};

/** progress 0..1 between two absolute times (seconds) */
export const p = (
  frame: number,
  start: number,
  dur: number,
  ease: (t: number) => number = EASE.out
) =>
  ease(
    interpolate(frame, [s(start), s(start) + Math.max(1, Math.round(dur * FPS))], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

export const sp = (
  frame: number,
  start: number,
  cfg: { damping?: number; stiffness?: number; mass?: number } = {}
) =>
  spring({
    frame: frame - s(start),
    fps: FPS,
    config: { damping: 14, stiffness: 170, mass: 1, ...cfg },
  });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** map value through keyframes in seconds */
export const kf = (
  frame: number,
  times: number[],
  values: number[],
  ease: (t: number) => number = EASE.inOut
) =>
  interpolate(
    frame,
    times.map((t) => t * FPS),
    values,
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease }
  );

/** derivative helper -> magnitude of change per frame */
export const vel = (fn: (f: number) => number, frame: number) =>
  Math.abs(fn(frame + 1) - fn(frame - 1)) / 2;

/** deterministic pseudo random */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** smooth noise for floating motion */
export const float = (frame: number, seed: number, amp = 1, speed = 1) =>
  (Math.sin(frame * 0.021 * speed + seed * 1.7) * 0.6 +
    Math.sin(frame * 0.013 * speed + seed * 4.1) * 0.4) *
  amp;

/** heat color for value 0..1 */
export const heatColor = (v: number) => {
  const stops = [
    [0, C.heatLow],
    [0.42, C.heatMid],
    [0.68, C.heatOrange],
    [1, C.heatHigh],
  ] as const;
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (v <= b) {
      const t = clamp01((v - a) / (b - a));
      const A = hex(ca);
      const B = hex(cb);
      const m = A.map((x, k) => Math.round(lerp(x, B[k], t)));
      return `rgb(${m[0]},${m[1]},${m[2]})`;
    }
  }
  return C.heatHigh;
};

/** camera shake */
export const shake = (frame: number, start: number, dur: number, amp: number) => {
  const t = (frame - s(start)) / (dur * FPS);
  if (t < 0 || t > 1) return { x: 0, y: 0, r: 0 };
  const decay = Math.pow(1 - t, 2);
  return {
    x: Math.sin(frame * 2.3) * amp * decay,
    y: Math.cos(frame * 2.9) * amp * decay * 0.8,
    r: Math.sin(frame * 1.7) * amp * 0.05 * decay,
  };
};
