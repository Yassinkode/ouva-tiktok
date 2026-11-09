import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Cam, Chip, HoloWorld, Human, LineBox, Pose, Prop, useXbot } from './Holo3D';
import { FONT, FONT_TIGHT } from '../lib';

/* « Hologramme » charter video: a glowing hologram human lives the day, a timer counts above
   his head at each place, the founder voice explains the app. */

type Word = { w: string; s: number; e: number };
export type HoloProps = { audio: string; words: Word[]; m: Record<string, number>; end: number };

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const smooth = (x: number) => {
  const k = clamp(x);
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const orbit = (ang: number, r: number, h: number, c: [number, number, number] = [0, 0, 0]): [number, number, number] => [
  c[0] + Math.sin((ang * Math.PI) / 180) * r,
  h,
  c[2] + Math.cos((ang * Math.PI) / 180) * r,
];
const hms = (sec: number) => {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

/* textures for the floating holo screens */
const texCache = new Map<string, THREE.Texture>();
const useTextures = (names: string[]) => {
  const [ok, setOk] = React.useState(false);
  const [h] = React.useState(() => delayRender('tex'));
  React.useEffect(() => {
    Promise.all(
      names.map(
        (n) =>
          texCache.get(n) ??
          new Promise<THREE.Texture>((res) =>
            new THREE.TextureLoader().load(staticFile(n), (tx) => {
              tx.colorSpace = THREE.SRGBColorSpace;
              texCache.set(n, tx);
              res(tx);
            }),
          ),
      ),
    ).then(() => {
      setOk(true);
      continueRender(h);
    });
  }, []);
  return ok ? names.map((n) => texCache.get(n)!) : null;
};

const Screen: React.FC<{ tx: THREE.Texture; pos: [number, number, number]; rotY: number; w: number; aspect: number; o: number }> = ({ tx, pos, rotY, w, aspect, o }) => {
  const h = w * aspect;
  return (
    <group position={pos} rotation={[0, rotY, 0]} scale={[mix(0.6, 1, o), mix(0.2, 1, o), 1]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tx} transparent opacity={0.92 * o} toneMapped={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[w + 0.08, h + 0.08]} />
        <meshBasicMaterial color="#3F8CFF" transparent opacity={0.35 * o} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      <LineBox size={[w + 0.04, h + 0.04, 0.001]} pos={[0, 0, 0.005]} color="#9CD2FF" opacity={o} />
    </group>
  );
};

/* rising scan ring used when the hologram materialises */
const ScanRing: React.FC<{ y: number; o: number }> = ({ y, o }) => (
  <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[0.38, 0.46, 64]} />
    <meshBasicMaterial color="#9CD2FF" transparent opacity={o} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
  </mesh>
);

/* glowing location pin on the floor */
const Pin: React.FC<{ pos: [number, number, number]; o: number; t: number }> = ({ pos, o, t }) => (
  <group position={pos} scale={[1, Math.max(0.001, o), 1]}>
    <mesh position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.025, 0.025, 1.2, 8]} />
      <meshBasicMaterial color="#9CD2FF" transparent opacity={0.9 * o} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
    <mesh position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 1.2, 16, 1, true]} />
      <meshBasicMaterial color="#2F7BFF" transparent opacity={0.18 * o} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {[0.25, 0.45].map((r, i) => (
      <mesh key={i} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * (1 + 0.08 * Math.sin(t * 4 + i)) - 0.03, r * (1 + 0.08 * Math.sin(t * 4 + i)), 48]} />
        <meshBasicMaterial color="#7DC0FF" transparent opacity={(i ? 0.4 : 0.9) * o} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    ))}
  </group>
);

/* heat blob texture (white core -> cyan -> blue -> transparent) */
let heatTex: THREE.CanvasTexture | null = null;
const getHeat = () => {
  if (heatTex) return heatTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(140,235,255,0.95)');
  gr.addColorStop(0.45, 'rgba(47,123,255,0.6)');
  gr.addColorStop(1, 'rgba(20,40,160,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 256, 256);
  heatTex = new THREE.CanvasTexture(c);
  return heatTex;
};
const Heat: React.FC<{ pos: [number, number]; r: number; o: number }> = ({ pos, r, o }) => (
  <mesh position={[pos[0], 0.02, pos[1]]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[r * 2, r * 2]} />
    <meshBasicMaterial map={getHeat()} transparent opacity={o} blending={THREE.AdditiveBlending} depthWrite={false} />
  </mesh>
);

/* holographic bar chart standing on the floor */
const Bars: React.FC<{ vals: number[]; pos: [number, number, number]; o: number; w?: number; gap?: number; color?: string; rotY?: number }> = ({ vals, pos, o, w = 0.13, gap = 0.07, color = '#4FA3FF', rotY = 0 }) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    {vals.map((v, i) => {
      const h = Math.max(0.01, v * o);
      const x = (i - (vals.length - 1) / 2) * (w + gap);
      return (
        <group key={i}>
          <mesh position={[x, h / 2, 0]}>
            <boxGeometry args={[w, h, w]} />
            <meshBasicMaterial color={color} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <LineBox size={[w, h, w]} pos={[x, h / 2, 0]} color="#BFE3FF" opacity={0.9} />
        </group>
      );
    })}
  </group>
);

/* glowing route drawn progressively through points */
const Route: React.FC<{ pts: [number, number][]; k: number }> = ({ pts, k }) => {
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0.04, z))), [pts]);
  const kk = Math.max(0.01, Math.min(1, k));
  const geo = React.useMemo(() => {
    const sub = curve.getPoints(120).slice(0, Math.max(2, Math.round(121 * kk)));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sub), 120, 0.03, 8, false);
  }, [curve, kk]);
  const head = curve.getPoint(kk);
  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#8FD4FF" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[head.x, 0.08, head.z]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <Heat pos={[head.x, head.z]} r={0.35} o={0.9} />
    </group>
  );
};

type Scene = { id: string; at: number; out: number };

export const Holo: React.FC<HoloProps> = ({ audio, words, m, end }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const g = useXbot();
  const tex = useTextures(['screens2/timeline.png', 'screens2/stats.png', 'screens2/home.png', 'screens2/logo.png']);

  const order = ['hook', 'create', 'home', 'trip', 'work', 'cafe', 'gym', 'auto', 'heat', 'stats', 'replay', 'compare', 'cta'].filter((id) => m[id] !== undefined);
  const scenes: Scene[] = order.map((id, i) => ({ id, at: m[id], out: i + 1 < order.length ? m[order[i + 1]] : end }));
  const sc = [...scenes].reverse().find((s) => t >= s.at) ?? scenes[0];
  const u = t - sc.at; // seconds into scene
  const d = sc.out - sc.at;
  const k = u / d;

  let cam: Cam = { pos: [0, 1.4, 4], look: [0, 1, 0], fov: 42 };
  let pose: Pose = 'idle';
  let hpos: [number, number, number] = [0, 0, 0];
  let rotY = 0;
  let lie = false;
  let prop: React.ReactNode = null;
  let chip: { label: string; time: string; live?: boolean; dy?: number; s?: number; o?: number } | undefined;
  let extra: React.ReactNode = null;
  let rings: [number, number, number][] = [[0, 0, 0]];
  let appear = 1;
  let clock = '';

  const count = (label: string, target: number, until = 0.9) => {
    const v = target * ease(u / (d * until));
    return { label, time: hms(v + (u > d * until ? (u - d * until) * 1 : 0)), o: ease(u / 0.35), s: mix(0.6, 1, ease(u / 0.35)) };
  };

  switch (sc.id) {
    case 'hook': {
      appear = smooth((u - 0.2) / 1.1);
      const z = mix(10, 3.6, ease(u / d));
      cam = { pos: [mix(-1.2, 0.4, k), mix(0.5, 1.35, ease(k)), z], look: [0, 1.0, 0], fov: 40, roll: mix(-0.06, 0, ease(k)) };
      extra = appear < 1 && <ScanRing y={appear * 1.85} o={1 - appear * 0.6} />;
      break;
    }
    case 'create': {
      pose = 'phone';
      cam = { pos: orbit(mix(40, 8, smooth(k)), mix(4.2, 3.6, k), 1.6), look: [0.25, 1.35, 0], fov: 42 };
      if (tex) extra = <Screen tx={tex[3]} pos={[0.62, 2.05 + Math.sin(t * 2) * 0.03, 0.2]} rotY={-0.2} w={0.5} aspect={1} o={ease((u - 0.6) / 0.5)} />;
      break;
    }
    case 'home': {
      pose = 'sleep';
      lie = true;
      hpos = [0, 0.43, 0.88];
      prop = <Prop kind="bed" pos={[0, 0, 0]} />;
      cam = { pos: orbit(mix(20, 50, k), 2.9, 3.6, [0, 0, 0.1]), look: [0, 0.55, 0], fov: 44 };
      chip = { ...count('Maison', 8 * 3600 + 3 * 60), dy: 0.35 };
      clock = '07:12';
      break;
    }
    case 'trip': {
      pose = 'walk';
      rotY = Math.PI / 2;
      const x = -1.4 + u * 1.25;
      hpos = [x, 0, 0];
      rings = [];
      prop = <Prop kind="door" pos={[3.2, 0, -0.6]} rotY={0.3} t={t} />;
      cam = { pos: [x + mix(1.6, 0.6, k), 1.45, mix(4.6, 4.0, k)], look: [x + 0.15, 1.15, 0], fov: 42 };
      chip = count('Trajet', 24 * 60);
      clock = '08:05';
      break;
    }
    case 'work': {
      pose = 'type';
      prop = <Prop kind="desk" pos={[0, 0, 0]} />;
      cam = { pos: orbit(mix(-50, -25, smooth(k)), mix(4.0, 3.3, k), mix(2.0, 1.7, k)), look: [0, 1.0, 0.2], fov: 42 };
      chip = count('Bureau', 6 * 3600 + 40 * 60);
      clock = '09:00';
      break;
    }
    case 'cafe': {
      pose = 'drink';
      prop = <Prop kind="cafe" pos={[0, 0, 0]} />;
      cam = { pos: orbit(mix(40, 15, smooth(k)), 3.3, mix(0.8, 1.1, k)), look: [0, 1.05, 0.2], fov: 44 };
      chip = count('Café', 20 * 60);
      clock = '16:10';
      break;
    }
    case 'gym': {
      const talk = (m.talk ?? sc.at + d * 0.65) - sc.at;
      const stopped = u >= talk - 0.25;
      pose = stopped ? 'idle' : 'lift';
      const v = Math.min(12 * 60, 12 * 60 * ease(u / Math.max(0.5, talk - 0.3)));
      chip = { label: 'Salle', time: hms(v), live: !stopped, o: ease(u / 0.35), s: stopped ? 1 + 0.12 * Math.exp(-(u - talk + 0.25) * 6) : mix(0.6, 1, ease(u / 0.35)) };
      const zoom = smooth((u - talk + 0.3) / 0.35);
      cam = { pos: orbit(mix(-20, 0, smooth(k)), mix(3.8, 2.4, zoom), mix(1.4, 1.7, zoom)), look: [0, mix(1.1, 1.6, zoom), 0], fov: 42 };
      clock = '18:30';
      break;
    }
    case 'auto': {
      pose = 'walk';
      rotY = Math.PI / 2;
      const x = -0.9 + u * 0.6;
      hpos = [x, 0, 0];
      rings = [];
      const P: [string, number][] = [['Bureau', -0.5], ['Salle', 0.8], ['Café', 2.1]];
      extra = (
        <>
          {P.map(([name, px], i) => {
            const o = ease((x - px + 0.7) / 0.35);
            return (
              <group key={i}>
                <Pin pos={[px, 0, -0.7]} o={o} t={t} />
                {o > 0.01 && <Chip pos={[px, 1.55, -0.7]} label="Détecté auto" time={name} live o={o} s={mix(0.6, 1.15, o)} />}
              </group>
            );
          })}
        </>
      );
      cam = { pos: [mix(0.6, 1.0, k), 2.1, 7.0], look: [mix(0.6, 1.0, k), 0.9, -0.3], fov: 44 };
      break;
    }
    case 'heat': {
      pose = 'idle';
      hpos = [0, 0, 0];
      rings = [];
      const B: [number, number, number][] = [[0, 0, 1.5], [1.4, -0.9, 1.0], [-1.3, -0.6, 0.85], [0.9, 1.2, 0.7], [-1.0, 1.3, 0.55], [2.2, 0.6, 0.45]];
      extra = (
        <>
          {B.map(([bx, bz, r], i) => (
            <Heat key={i} pos={[bx, bz]} r={r * (1 + 0.05 * Math.sin(t * 3 + i))} o={ease((u - 0.15 - i * 0.12) / 0.4) * 0.95} />
          ))}
        </>
      );
      cam = { pos: orbit(mix(10, 50, k), mix(2.4, 1.6, k), mix(6.5, 5.6, k)), look: [0.2, 0, 0.1], fov: 46 };
      break;
    }
    case 'stats': {
      pose = 'phone';
      hpos = [-0.45, 0, 0.2];
      const tab = t >= (m.mois ?? 1e9) ? 2 : t >= (m.semaine ?? 1e9) ? 1 : 0;
      const V = [
        [0.3, 0.6, 0.9, 0.5, 0.75, 0.4, 0.2, 0.55],
        [0.8, 0.7, 0.95, 0.85, 0.6, 0.35, 0.5],
        [0.5, 0.7, 0.6, 0.9, 0.75, 0.85, 0.65, 0.8, 0.95, 0.7, 0.6, 0.8],
      ][tab];
      const tAt = [m.jour ?? sc.at + 0.6, m.semaine ?? sc.at + 1.2, m.mois ?? sc.at + 1.8][tab];
      const grow = ease((t - tAt) / 0.4) * ease(u / 0.5);
      extra = (
        <>
          <Bars vals={V.map((v) => v * 1.4)} pos={[0.42, 0, -0.1]} o={grow} w={tab === 2 ? 0.07 : 0.1} gap={tab === 2 ? 0.035 : 0.05} rotY={-0.2} />
          <Chip pos={[0.38, 1.85, -0.1]} label="Stats avancées" time={['Jour', 'Semaine', 'Mois'][tab]} live o={ease(u / 0.35)} s={0.85} />
          {tex && <Screen tx={tex[1]} pos={[-1.05, 1.75, -0.6]} rotY={0.35} w={0.5} aspect={1769 / 812} o={ease((u - 0.3) / 0.4)} />}
        </>
      );
      cam = { pos: orbit(mix(18, 4, smooth(k)), mix(3.9, 3.5, k), 1.55), look: [0.05, 1.15, 0], fov: 44 };
      break;
    }
    case 'replay': {
      pose = 'couch';
      prop = <Prop kind="sofa" pos={[0, 0, -0.6]} />;
      hpos = [0, 0, -0.6];
      rings = [];
      const pts: [number, number][] = [[-1.4, 1.6], [-0.6, 0.9], [0.4, 1.3], [1.3, 0.6], [0.8, -0.1], [1.6, -0.3]];
      const bilan = (m.bilan ?? sc.at + d * 0.6) - sc.at;
      extra = (
        <>
          <Route pts={pts} k={ease(u / Math.max(0.8, bilan))} />
          {[pts[0], pts[2], pts[3], pts[5]].map((p, i) => (
            <Pin key={i} pos={[p[0], 0, p[1]]} o={ease((u - 0.1 - i * 0.35) / 0.3) * 0.7} t={t} />
          ))}
          {tex && <Screen tx={tex[0]} pos={[-0.95, 1.35 + Math.sin(t * 1.6) * 0.03, -0.9]} rotY={0.3} w={0.55} aspect={2622 / 1206} o={ease((u - bilan + 0.1) / 0.4)} />}
          {u > bilan - 0.1 && <Chip pos={[0.55, 1.45, -0.9]} label="Ton bilan" time="Prêt" live o={ease((u - bilan + 0.1) / 0.3)} s={0.85} />}
        </>
      );
      cam = { pos: orbit(mix(-15, 15, k), mix(4.6, 4.2, k), mix(3.4, 2.4, smooth(k))), look: [0.1, 0.6, 0.2], fov: 46 };
      clock = '21:45';
      break;
    }
    case 'compare': {
      pose = 'idle';
      hpos = [0, 0, -1.0];
      const g1 = ease((u - 0.1) / 0.5);
      const g2 = ease((u - 0.45) / 0.5);
      extra = (
        <>
          <Bars vals={[0.5, 0.7, 0.4, 0.6, 0.55, 0.3, 0.45].map((v) => v * 1.3)} pos={[-0.45, 0, 0.2]} o={g1} w={0.06} gap={0.03} color="#3A5FB8" rotY={0.25} />
          <Bars vals={[0.8, 0.9, 0.7, 1.0, 0.85, 0.6, 0.75].map((v) => v * 1.3)} pos={[0.45, 0, 0.2]} o={g2} w={0.06} gap={0.03} rotY={-0.25} />
          <Chip pos={[-0.45, 1.2, 0.2]} label="Semaine dernière" time="21 h" live={false} o={g1} s={0.75} />
          <Chip pos={[0.45, 1.62, 0.2]} label="Cette semaine" time="28 h ↑" live o={g2} s={0.75} />
        </>
      );
      cam = { pos: orbit(mix(-8, 8, k), mix(4.0, 3.6, k), 1.4), look: [0, 0.95, -0.2], fov: 44 };
      break;
    }
    case 'evening': {
      pose = 'couch';
      prop = <Prop kind="sofa" pos={[0, 0, 0]} />;
      const back = smooth(k * 1.6);
      cam = { pos: orbit(mix(10, -6, k), mix(2.8, 4.5, back), mix(1.3, 1.8, back)), look: [0, mix(0.95, 1.65, back), 0], fov: 44 };
      if (tex) {
        const mk = (i: number) => ease((u - 0.5 - i * 0.45) / 0.45);
        extra = (
          <>
            <Screen tx={tex[0]} pos={[-0.62, 2.0 + Math.sin(t * 1.6) * 0.03, -0.2]} rotY={0.3} w={0.48} aspect={2622 / 1206} o={mk(0)} />
            <Screen tx={tex[1]} pos={[0, 2.5 + Math.sin(t * 1.6 + 1) * 0.03, -0.45]} rotY={0} w={0.48} aspect={1769 / 812} o={mk(1)} />
            <Screen tx={tex[2]} pos={[0.62, 2.0 + Math.sin(t * 1.6 + 2) * 0.03, -0.2]} rotY={-0.3} w={0.48} aspect={1769 / 812} o={mk(2)} />
          </>
        );
      }
      clock = '21:45';
      break;
    }
    case 'cta': {
      pose = 'cheer';
      cam = { pos: orbit(mix(-12, 12, k), mix(4.8, 4.2, k), 1.7), look: [0, 1.55, 0], fov: 44 };
      if (tex) extra = <Screen tx={tex[3]} pos={[0, 2.5 + Math.sin(t * 2) * 0.03, 0]} rotY={0} w={0.8} aspect={1} o={ease(u / 0.5)} />;
      break;
    }
  }

  // glitch on every cut
  const sinceCut = Math.min(...scenes.filter((s) => s.at > 0).map((s) => (t >= s.at ? t - s.at : 99)));
  const gl = sinceCut < 0.2 ? 1 - sinceCut / 0.2 : 0;
  const seed = Math.floor(f / 2);
  const rnd = (i: number) => {
    const x = Math.sin(seed * 91.7 + i * 17.3) * 43758.5;
    return x - Math.floor(x);
  };

  // captions: 1-3 word chunks
  const chunks: { text: string; s: number; e: number }[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) chunks.push({ text: cur.map((w) => w.w).join(' '), s: cur[0].s, e: cur[cur.length - 1].e });
    cur = [];
  };
  for (const w of words) {
    if (/^[?!.,:…]+$/.test(w.w)) {
      if (cur.length) cur[cur.length - 1] = { ...cur[cur.length - 1], w: cur[cur.length - 1].w + '\u00a0' + w.w };
      else if (chunks.length) chunks[chunks.length - 1] = { ...chunks[chunks.length - 1], text: chunks[chunks.length - 1].text + '\u00a0' + w.w, e: w.e };
      continue;
    }
    if (cur.length && cur.map((x) => x.w).join(' ').length + w.w.length > 15) flush();
    cur.push(w);
    if (cur.length >= 3 || /[.,:?!…]$/.test(w.w)) flush();
  }
  flush();
  const ci = chunks.findIndex((c, i) => t >= c.s - 0.05 && t < (chunks[i + 1]?.s ?? c.e + 0.6) - 0.05);
  const cap = sc.id !== 'cta' && ci >= 0 ? chunks[ci] : null;
  const capPop = cap ? ease((t - cap.s + 0.05) / 0.12) : 0;
  const HI = /(ouva|maison|trajet|bureau|café|salle|douze|vingt|six|quarante|stats|fil|semaine|temps|chrono)/i;

  return (
    <AbsoluteFill style={{ background: '#020617', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: gl ? `translateX(${(rnd(1) - 0.5) * 40 * gl}px)` : undefined }}>
        <ThreeCanvas width={1080} height={1920} linear={false}>
          <HoloWorld t={t} cam={cam} rings={rings.map((r) => [r[0] + (sc.id === 'trip' ? 0 : 0), 0, r[2]] as [number, number, number])}>
            {g && <Human g={g} t={t} pose={pose} pos={hpos} rotY={rotY} lie={lie} chip={chip} o={appear} />}
            {prop}
            {extra}
          </HoloWorld>
        </ThreeCanvas>
      </AbsoluteFill>

      {/* scanlines + vignette */}
      <AbsoluteFill style={{ background: 'repeating-linear-gradient(0deg, rgba(120,180,255,0.05) 0px, rgba(120,180,255,0.05) 2px, transparent 2px, transparent 6px)', mixBlendMode: 'screen' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,4,20,0.75) 100%)' }} />

      {/* HUD */}
      <div style={{ position: 'absolute', top: 250, left: 80, right: 200, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT_TIGHT, color: '#BFE0FF', textShadow: '0 0 18px #2F7BFF' }}>
        <div style={{ fontWeight: 800, fontSize: 44, letterSpacing: '0.02em' }}>OùVa<span style={{ color: '#5CFFB0' }}> ●</span></div>
        {clock && <div style={{ fontWeight: 700, fontSize: 44, fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>{clock}</div>}
      </div>

      {/* captions */}
      {cap && (
        <div style={{ position: 'absolute', left: 70, right: 200, top: 1200, textAlign: 'center', transform: `scale(${mix(0.85, 1, capPop)})`, opacity: capPop }}>
          {cap.text.split(' ').map((w, i) => [
            <span key={i} style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 80, lineHeight: 1.1, textTransform: 'uppercase', color: HI.test(w) ? '#7FD8FF' : '#FFFFFF', textShadow: '0 0 22px rgba(47,123,255,0.95), 0 4px 0 rgba(0,10,40,0.8)', display: 'inline-block', margin: '0 12px' }}>
              {w}
            </span>,
            ' ',
          ])}
        </div>
      )}

      {/* CTA text */}
      {sc.id === 'cta' && (
        <div style={{ position: 'absolute', left: 70, right: 200, top: 1130, textAlign: 'center', opacity: ease((u - 0.3) / 0.4), transform: `translateY(${(1 - ease((u - 0.3) / 0.4)) * 40}px)` }}>
          <div style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 104, color: '#fff', textShadow: '0 0 30px #2F7BFF' }}>OùVa</div>
          <div style={{ display: 'inline-block', marginTop: 24, padding: '22px 46px', borderRadius: 60, border: '3px solid #7DC0FF', background: 'rgba(10,30,90,0.6)', fontFamily: FONT, fontWeight: 800, fontSize: 50, color: '#DDF0FF', boxShadow: '0 0 40px rgba(47,123,255,0.6)' }}>
            Gratuit sur l’App Store
          </div>
        </div>
      )}

      {/* glitch slices + flash */}
      {gl > 0 && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: rnd(i + 5) * 1920, height: 20 + rnd(i + 9) * 90, background: i % 2 ? 'rgba(90,168,255,0.35)' : 'rgba(255,255,255,0.18)', transform: `translateX(${(rnd(i + 2) - 0.5) * 160 * gl}px)`, mixBlendMode: 'screen' }} />
          ))}
          <AbsoluteFill style={{ background: '#5AA8FF', opacity: gl * 0.22, mixBlendMode: 'screen' }} />
        </>
      )}
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
