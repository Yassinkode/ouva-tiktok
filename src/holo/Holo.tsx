import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Cam, HoloWorld, Human, LineBox, Pose, Prop, useXbot } from './Holo3D';
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

type Scene = { id: string; at: number; out: number };

export const Holo: React.FC<HoloProps> = ({ audio, words, m, end }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const g = useXbot();
  const tex = useTextures(['screens2/timeline.png', 'screens2/stats.png', 'screens2/home.png', 'screens2/logo.png']);

  const order = ['hook', 'create', 'home', 'trip', 'work', 'cafe', 'gym', 'evening', 'cta'];
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
      if (tex) extra = <Screen tx={tex[3]} pos={[0, 2.75 + Math.sin(t * 2) * 0.03, 0]} rotY={0} w={0.95} aspect={1} o={ease(u / 0.5)} />;
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
      <div style={{ position: 'absolute', top: 120, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT_TIGHT, color: '#BFE0FF', textShadow: '0 0 18px #2F7BFF' }}>
        <div style={{ fontWeight: 800, fontSize: 44, letterSpacing: '0.02em' }}>OùVa<span style={{ color: '#5CFFB0' }}> ●</span></div>
        {clock && <div style={{ fontWeight: 700, fontSize: 44, fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>{clock}</div>}
      </div>

      {/* captions */}
      {cap && (
        <div style={{ position: 'absolute', left: 60, right: 60, top: 1470, textAlign: 'center', transform: `scale(${mix(0.85, 1, capPop)})`, opacity: capPop }}>
          {cap.text.split(' ').map((w, i) => (
            <span key={i} style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 92, lineHeight: 1.1, textTransform: 'uppercase', color: HI.test(w) ? '#7FD8FF' : '#FFFFFF', textShadow: '0 0 22px rgba(47,123,255,0.95), 0 4px 0 rgba(0,10,40,0.8)', marginRight: 22 }}>
              {w}
            </span>
          ))}
        </div>
      )}

      {/* CTA text */}
      {sc.id === 'cta' && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1420, textAlign: 'center', opacity: ease((u - 0.3) / 0.4), transform: `translateY(${(1 - ease((u - 0.3) / 0.4)) * 40}px)` }}>
          <div style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 120, color: '#fff', textShadow: '0 0 30px #2F7BFF' }}>OùVa</div>
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
