import React from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import { FPS, clamp01, rand } from '../lib';
import { IconTile, PLACE, PlaceKind } from './UI';

/* Cinematic flat-vector night city (noir poster look): deep duotone sky, huge moon, layered skylines with
   lit windows, an elevated train crossing, rain, fog and floating place pins over the roofs.
   Several colour moods; the mood changes with the scene (cross-fade). Everything moves (parallax). */

export type Mood = { sky: [string, string, string]; moon: string; glow: string; far: string; mid: string; near: string; win: string; rain: string; fog: string };

export const MOODS: Mood[] = [
  // crimson
  { sky: ['#1A0306', '#6E0A12', '#C5161F'], moon: '#FF4A36', glow: 'rgba(255,74,54,0.55)', far: '#5C0A12', mid: '#2A060B', near: '#0E0507', win: '#FFC45C', rain: 'rgba(255,190,190,0.25)', fog: 'rgba(197,22,31,0.35)' },
  // midnight blue / violet with red moon
  { sky: ['#070A22', '#1D2160', '#4A3192'], moon: '#FF5240', glow: 'rgba(255,82,64,0.45)', far: '#24286A', mid: '#13153D', near: '#06071A', win: '#FFD36E', rain: 'rgba(190,200,255,0.28)', fog: 'rgba(74,49,146,0.35)' },
  // emerald (brand)
  { sky: ['#02100B', '#063A28', '#0F6B48'], moon: '#9BFFD7', glow: 'rgba(82,223,175,0.5)', far: '#0B3A2A', mid: '#05201A', near: '#020B08', win: '#7DF5C2', rain: 'rgba(170,255,220,0.22)', fog: 'rgba(15,107,72,0.35)' },
  // dusk orange / plum
  { sky: ['#160822', '#5B1F4C', '#E8703A'], moon: '#FFD27A', glow: 'rgba(255,190,90,0.55)', far: '#4E1D44', mid: '#2A0F2A', near: '#100613', win: '#FFB35C', rain: 'rgba(255,220,190,0.22)', fog: 'rgba(232,112,58,0.30)' },
];

type B = { x: number; w: number; h: number; ant: boolean; seed: number };
const skyline = (n: number, seed: number, minH: number, maxH: number, minW: number, maxW: number): B[] => {
  const out: B[] = [];
  let x = -120;
  let i = 0;
  while (x < 1400 && i < n) {
    const w = minW + rand(seed + i * 3.1) * (maxW - minW);
    const h = minH + Math.pow(rand(seed + i * 7.7), 1.4) * (maxH - minH);
    out.push({ x, w, h, ant: rand(seed + i * 5.3) > 0.72, seed: seed + i * 11 });
    x += w + 4 + rand(seed + i * 2.2) * 14;
    i++;
  }
  return out;
};
const FAR = skyline(40, 11, 380, 900, 70, 150);
const MID = skyline(30, 37, 300, 760, 110, 200);
const NEAR = skyline(16, 73, 220, 620, 170, 300);
const GROUND = 1560;

/* ---- static layers, drawn once per mood as SVG images, then only moved (fast to render) ---- */
const svgUrl = (w: number, h: number, body: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;

const buildingsSvg = (list: B[], color: string, win: string | null, litRatio: number, winSize: number, raw = false): string => {
  let out = '';
  list.forEach((b, i) => {
    const top = GROUND - b.h;
    out += `<rect x="${b.x + 120}" y="${top}" width="${b.w}" height="${b.h + 400}" fill="${color}"/>`;
    if (b.ant) out += `<rect x="${b.x + 120 + b.w / 2 - 3}" y="${top - 70}" width="6" height="70" fill="${color}"/>`;
    if (win) {
      const cols = Math.max(2, Math.floor((b.w - 24) / (winSize * 2.2)));
      const rows = Math.floor((b.h - 60) / (winSize * 2.4));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const sd = b.seed + r * 13.7 + c * 5.1;
          if (rand(sd) >= litRatio) continue;
          out += `<rect x="${(b.x + 134 + c * winSize * 2.2).toFixed(1)}" y="${(top + 34 + r * winSize * 2.4).toFixed(1)}" width="${winSize}" height="${(winSize * 1.3).toFixed(1)}" fill="${win}" opacity="0.85"/>`;
        }
    }
  });
  return raw ? out : svgUrl(1320, 2000, out);
};


const trainSvg = (m: Mood) => {
  let out = '';
  for (let c = 0; c < 3; c++) {
    out += `<rect x="${c * 250}" y="0" width="240" height="74" rx="10" fill="${m.near}"/>`;
    for (let w = 0; w < 6; w++) out += `<rect x="${c * 250 + 16 + w * 37}" y="18" width="26" height="26" rx="3" fill="${m.win}"/>`;
  }
  return svgUrl(750, 74, out);
};


const RAIN = (() => {
  // one tile of rain streaks, moved down and repeated
  const cache: Record<string, string> = {};
  return (col: string) =>
    (cache[col] ??= svgUrl(
      1200,
      2000,
      [...Array(100)]
        .map((_, k) => {
          const x = rand(k * 3.3) * 1200;
          const y = rand(k * 5.9) * 2000;
          return `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 9).toFixed(0)}" y2="${(y + 46).toFixed(0)}" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`;
        })
        .join(''),
    ));
})();

/* everything static in ONE image (sky, moon, skylines, track, fog, vignette): one layer to composite per frame */
const sceneSvg = (m: Mood) => {
  let track = `<rect x="-120" y="1318" width="1320" height="16" fill="${m.near}"/>`;
  for (let k = 0; k < 10; k++) track += `<rect x="${-80 + k * 150}" y="1334" width="16" height="320" fill="${m.near}"/>`;
  return svgUrl(
    1080,
    1920,
    `<defs>
      <linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.sky[0]}"/><stop offset="0.55" stop-color="${m.sky[1]}"/><stop offset="1" stop-color="${m.sky[2]}"/></linearGradient>
      <radialGradient id="g"><stop offset="0" stop-color="${m.glow}"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>
      <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="${m.fog}"/></linearGradient>
      <radialGradient id="v" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.55)"/></radialGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#s)"/>
    <circle cx="700" cy="540" r="520" fill="url(#g)"/><circle cx="700" cy="540" r="250" fill="${m.moon}"/>
    <g transform="translate(-180 0)">${buildingsSvg(FAR, m.far, null, 0, 6, true)}${buildingsSvg(MID, m.mid, m.win, 0.16, 7, true)}</g>
    ${track}
    <g transform="translate(-180 0)">${buildingsSvg(NEAR, m.near, m.win, 0.1, 9, true)}</g>
    <rect x="0" y="${GROUND - 200}" width="1080" height="${1920 - GROUND + 200}" fill="url(#f)"/>
    <rect width="1080" height="1920" fill="url(#v)"/>`,
  );
};
type Layers = { scene: string; train: string };
const LAYERS: Record<number, Layers> = {};
const layersFor = (i: number, m: Mood) => (LAYERS[i] ??= { scene: sceneSvg(m), train: trainSvg(m) });

/* SVG images are re-rasterised on every paint (slow in headless Chrome): convert each one ONCE to a PNG bitmap */
const PNG: Record<string, string> = {};
const PENDING: Record<string, Promise<string>> = {};
const toPng = (svg: string, w: number, h: number) =>
  (PENDING[svg] ??= new Promise<string>((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => res((PNG[svg] = b ? URL.createObjectURL(b) : svg)), 'image/png');
    };
    img.onerror = () => res((PNG[svg] = svg));
    img.src = svg;
  }));
const useBitmap = (svg: string, w: number, h: number) => {
  const [url, setUrl] = React.useState<string | null>(PNG[svg] ?? null);
  const [handle] = React.useState(() => (PNG[svg] ? null : delayRender('city bitmap')));
  React.useEffect(() => {
    if (PNG[svg]) {
      setUrl(PNG[svg]);
      if (handle !== null) continueRender(handle);
      return;
    }
    let alive = true;
    toPng(svg, w, h).then((u) => {
      if (alive) setUrl(u);
      if (handle !== null) continueRender(handle);
    });
    return () => {
      alive = false;
    };
  }, [svg]);
  return url ?? PNG[svg] ?? svg;
};

const abs: React.CSSProperties = { position: 'absolute', left: 0, top: 0, display: 'block' };

const City: React.FC<{ m: Mood; mi: number; t: number; seed: number }> = ({ m, mi, t, seed }) => {
  const L = layersFor(mi, m);
  const scene = useBitmap(L.scene, 1080, 1920);
  const train = useBitmap(L.train, 750, 74);
  const rain = useBitmap(RAIN(m.rain), 1200, 2000);
  // slow "camera" (zoom + drift) on the whole picture, plus a few live elements: clouds, train, antenna lights, rain
  const zoom = 1.06 + 0.05 * Math.sin(t * 0.35 + seed);
  const px = Math.sin(t * 0.5 + seed) * 30;
  const trainX = ((t * 520 + seed * 300) % 2600) - 1300;
  const rainY = (t * 2100) % 2000;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: m.sky[1] }}>
      <AbsoluteFill style={{ transform: `translateX(${px}px) scale(${zoom})`, transformOrigin: '50% 70%' }}>
        <img src={scene} style={abs} />
        {[0, 1].map((k) => {
          const x = ((t * (14 + k * 8) + k * 520) % 1700) - 400;
          return <div key={k} style={{ position: 'absolute', left: 0, top: 0, width: 340 + k * 120, height: 14, borderRadius: 7, background: m.sky[1], opacity: 0.85, transform: `translate(${x}px, ${480 + k * 110}px)` }} />;
        })}
        <img src={train} style={{ ...abs, transform: `translate(${trainX}px, 1240px)` }} />
        {NEAR.filter((b) => b.ant).slice(0, 5).map((b, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: 10, height: 10, borderRadius: 5, background: '#FF4A36', opacity: Math.sin(t * 3 + i) > 0 ? 1 : 0.2, transform: `translate(${b.x + b.w / 2 - 65}px, ${GROUND - b.h - 77}px)` }} />
        ))}
      </AbsoluteFill>
      <img src={rain} style={{ ...abs, left: -60, transform: `translateY(${rainY - 2000}px)` }} />
      <img src={rain} style={{ ...abs, left: -60, transform: `translateY(${rainY}px)` }} />
    </AbsoluteFill>
  );
};

/** cross-fades between moods as scenes change */
export const CinemaBackdrop: React.FC<{ mood: number; prevMood: number; blend: number }> = ({ mood, prevMood, blend }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ia = ((prevMood % MOODS.length) + MOODS.length) % MOODS.length;
  const ib = ((mood % MOODS.length) + MOODS.length) % MOODS.length;
  const a = MOODS[ia];
  const b = MOODS[ib];
  return (
    <AbsoluteFill style={{ background: '#050505' }}>
      {blend < 1 && <City m={a} mi={ia} t={t} seed={1} />}
      <AbsoluteFill style={{ opacity: blend }}>
        <City m={b} mi={ib} t={t} seed={1} />
      </AbsoluteFill>

    </AbsoluteFill>
  );
};

/* Place pins floating above the roofs: the app's idea (time per place) living in the city. */
const PINS: { k: PlaceKind; x: number; y: number; ph: number }[] = [
  { k: 'home', x: 120, y: 1050, ph: 0 },
  { k: 'work', x: 930, y: 900, ph: 1.3 },
  { k: 'cafe', x: 330, y: 1180, ph: 2.1 },
  { k: 'gym', x: 760, y: 1150, ph: 3.4 },
];
export const RoofPins: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
      {PINS.map((p, i) => {
        const pop = clamp01((t - i * 0.12) / 0.35);
        const y = p.y + Math.sin(t * 1.6 + p.ph) * 12;
        const col = PLACE[p.k].color;
        return (
          <div key={p.k} style={{ position: 'absolute', left: p.x - 34, top: y - 34, transform: `scale(${0.4 + 0.6 * pop})`, opacity: 0.85 * pop }}>
            <div style={{ position: 'absolute', left: -26, top: -26, width: 120, height: 120, borderRadius: 60, background: `radial-gradient(closest-side, ${col}66, ${col}00)` }} />
            <IconTile kind={p.k} size={68} solid />
            <div style={{ position: 'absolute', left: 30, top: 66, width: 8, height: 40, borderRadius: 4, background: `linear-gradient(${col}, ${col}00)` }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
