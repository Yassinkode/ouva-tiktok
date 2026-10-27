import React from 'react';
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, sp } from '../lib';
import { Cam, HOUSES, LucasPose, PlaceId, World } from './World';
import { IconTile, PLACE } from '../components/UI';
import { LogoIcon } from '../components/Icons';
import { Phone3D, SH, SW } from '../story/AppScenes';
import { Seg } from '../story/types';

export const PIX = "'Pixelify Sans', monospace";

export type Word = { w: string; s: number; e: number };
export type Line = { k: string; text: string; at: number; end: number; words: Word[] };
export type LucasProps = { audio: string; duration: number; lines: Record<string, Line>; rew: [number, number] };

const ease = (x: number) => EASE.inOut(clamp01(x));
const wordAt = (L: Line | undefined, w: string, fb: number) => {
  if (!L) return fb;
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const hit = L.words.find((x) => n(x.w) === n(w));
  return hit ? hit.s : fb;
};

/* ---------------- camera path of the story (story time) ---------------- */
const lerp3 = (a: [number, number, number], b: [number, number, number], u: number): [number, number, number] => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

/** camera key-frames: each key holds from its time; moving to it takes `dur` (fast whip-like ease) */
type CamKey = { at: number; cam: (st: number) => Cam; dur?: number };
const camAt = (st: number, keys: CamKey[]): Cam => {
  let i = 0;
  keys.forEach((k, j) => {
    if (st >= k.at) i = j;
  });
  const cur = keys[i].cam(st);
  if (i === 0) return cur;
  const u = clamp01((st - keys[i].at) / (keys[i].dur ?? 0.24));
  if (u >= 1) return cur;
  const prev = keys[i - 1].cam(keys[i].at);
  const e = ease(u);
  return { pos: lerp3(prev.pos, cur.pos, e), look: lerp3(prev.look, cur.look, e), fov: lerp(prev.fov, cur.fov, e) };
};

const houseCam = (id: PlaceId, push: number): Cam => {
  const h = HOUSES.find((x) => x.id === id)!;
  return { pos: [h.x + 3, h.h * 0.6 + 2.2, h.z + 14 - push], look: [h.x, h.h * 0.65 + 1.4, h.z], fov: 46 };
};

const storyShot = (st: number, P: LucasProps, pinT: [PlaceId, number][]): { cam: Cam; lucas: LucasPose } => {
  const l1 = P.lines.l1, l2 = P.lines.l2, l3 = P.lines.l3;
  // Lucas walks along the quay toward his home, then stops to look at his phone
  const walkEnd = l2.at + 0.3;
  const u = clamp01(st / walkEnd);
  const lx = lerp(6, -2.5, u);
  let lucas: LucasPose = { x: lx, z: 2, rotY: -Math.PI / 2 + 0.45, walk: st < walkEnd ? 1 : 0, phone: 0, jump: 0, smile: 0 };
  if (st >= walkEnd && st < l3.at) lucas = { ...lucas, rotY: 0.25, walk: 0, phone: clamp01((st - walkEnd) / 0.3) };
  if (st >= l3.at) {
    lucas = { ...lucas, rotY: 0.2, walk: 0, phone: 1 - clamp01((st - l3.at) / 0.3), smile: clamp01((st - l3.at - 0.4) / 0.2), jump: Math.max(0, Math.sin(clamp01((st - l3.at - 0.7) / 0.45) * Math.PI)) * 0.9 };
  }
  const L = lucas;
  const keys: CamKey[] = [
    // tracking shot: low, moon and houses behind him
    { at: 0, cam: (s) => { const x = lerp(6, -2.5, clamp01(s / walkEnd)); return { pos: [x + 0.9, 1.3 + s * 0.06, 9.5 - s * 0.35], look: [x + 0.1, 3.3, -3], fov: 50 }; } },
    // over the shoulder, close on the phone (the real app slides in as an overlay)
    { at: walkEnd, cam: (s) => ({ pos: [L.x + 1.7 + (s - walkEnd) * 0.15, 3.6, L.z + 3.6], look: [L.x - 0.2, 2.0, L.z - 0.5], fov: 44 }), dur: 0.3 },
    // one fast whip per place, the pin pops when we land on it
    ...pinT.map(([id, at]) => ({ at: at - 0.2, cam: (s: number) => houseCam(id, (s - at) * 1.2), dur: 0.22 })),
    // "sans rien faire": fast orbit around him
    { at: l3.at, cam: (s) => { const k = clamp01((s - l3.at) / 2.0); const a = lerp(-0.7, 0.8, ease(k)); return { pos: [L.x + Math.sin(a) * 7.5, 2.8 + k, L.z + Math.cos(a) * 7.5], look: [L.x, 2.1, L.z], fov: 46 }; }, dur: 0.25 },
  ];
  return { cam: camAt(st, keys), lucas };
};

/* project a 3D point to screen pixels for a given camera */
const project = (cam: Cam, p: [number, number, number]) => {
  const c = new THREE.PerspectiveCamera(cam.fov, 1080 / 1920, 0.1, 1000);
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.look));
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return { x: (v.x * 0.5 + 0.5) * 1080, y: (-v.y * 0.5 + 0.5) * 1920, vis: v.z < 1 };
};

/* ---------------- 2D overlays ---------------- */
const fmt = (min: number) => {
  const m = Math.floor(min);
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
};
const PIN_INFO: Record<PlaceId, { label: string; base: number }> = {
  home: { label: 'Maison', base: 212 },
  work: { label: 'Travail', base: 431 },
  gym: { label: 'Salle de sport', base: 74 },
  cafe: { label: 'Café', base: 38 },
};
const PinChip: React.FC<{ id: PlaceId; x: number; y: number; at: number; t: number }> = ({ id, x, y, at, t }) => {
  const vf = t * FPS;
  const e = sp(vf, at, { damping: 11, stiffness: 190 });
  if (t < at - 0.02) return null;
  const P = PLACE[id];
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -100%) scale(${Math.max(0, e) * 1.55})`, transformOrigin: '50% 100%', zIndex: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px 12px 12px', borderRadius: 22, background: '#0E1311', border: `4px solid ${P.color}`, boxShadow: `0 0 0 4px #0E1311, 0 12px 30px ${P.color}66` }}>
        <IconTile kind={id} size={58} solid />
        <div style={{ fontFamily: PIX, fontVariantLigatures: 'none', lineHeight: 1.05 }}>
          <div style={{ fontSize: 26, color: '#C8D3CE' }}>{PIN_INFO[id].label}</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#fff' }}>{fmt(PIN_INFO[id].base + Math.max(0, t - at) * 3)}</div>
        </div>
      </div>
      <div style={{ width: 8, height: 46, margin: '0 auto', background: `linear-gradient(${P.color}, ${P.color}00)` }} />
    </div>
  );
};

/** retro game dialogue box with typewriter text */
const Dialog: React.FC<{ L?: Line; t: number; name?: string; top?: number }> = ({ L, t, name = 'NARRATEUR', top = 1330 }) => {
  if (!L || t < L.at - 0.05 || t > L.end + 0.35) return null;
  // reveal the written line (with its punctuation) at the pace of the spoken words
  const toks = L.text.split(/\s+/);
  const spoken = L.words.filter((w) => w.s <= t + 0.05).length;
  const shown = toks.slice(0, Math.round((spoken / Math.max(1, L.words.length)) * toks.length)).join(' ');
  const inP = clamp01((t - L.at + 0.05) / 0.12);
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top, transform: `translateY(${(1 - inP) * 30}px)`, opacity: inP, zIndex: 8 }}>
      <div style={{ display: 'inline-block', padding: '6px 16px', background: '#F3E39A', color: '#151A3A', fontFamily: PIX, fontVariantLigatures: 'none', fontWeight: 700, fontSize: 28, border: '4px solid #151A3A', marginBottom: -4, marginLeft: 20 }}>{name}</div>
      <div style={{ background: 'rgba(12,16,48,0.92)', border: '6px solid #F3E39A', boxShadow: '0 0 0 6px #151A3A', padding: '22px 30px', minHeight: 130, fontFamily: PIX, fontSize: 56, color: '#fff', lineHeight: 1.18, fontVariantLigatures: 'none' }}>
        {shown}
        <span style={{ opacity: Math.floor(t * 4) % 2 ? 1 : 0 }}>▮</span>
      </div>
    </div>
  );
};

const OSD: React.FC<{ text: string; t: number; blink?: boolean; color?: string }> = ({ text, t, blink, color = '#fff' }) => (
  <div style={{ position: 'absolute', left: 70, top: 150, fontFamily: PIX, fontVariantLigatures: 'none', fontWeight: 700, fontSize: 64, color, textShadow: '4px 4px 0 #000', opacity: blink && Math.floor(t * 3) % 2 ? 0.25 : 1, zIndex: 9 }}>{text}</div>
);

const VHS: React.FC<{ t: number; amount: number }> = ({ t, amount }) => {
  if (amount <= 0.01) return null;
  const bars = [...Array(5)].map((_, i) => {
    const y = ((t * (700 + i * 230) + i * 400) % 2100) - 100;
    return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 18 + (i % 3) * 22, background: 'rgba(255,255,255,0.18)', mixBlendMode: 'screen', transform: `translateX(${Math.sin(t * 40 + i) * 30}px)` }} />;
  });
  return (
    <AbsoluteFill style={{ opacity: amount, zIndex: 7, pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 3px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 7px)' }} />
      {bars}
    </AbsoluteFill>
  );
};

const SCREENS = ['screens/home_now.png', 'screens/add_place.png', 'screens/place_stats.png', 'screens/places_heatmap.png', 'screens/day_map.png'];

/* ---------------- main composition ---------------- */
export const LucasVideo: React.FC<LucasProps> = (P) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const vf = f; // composition runs at 60 fps like the rest of the project
  const L = P.lines;
  const [r0, r1] = P.rew;
  const inRew = t >= r0 && t < r1;
  // story time: plays normally, then rewinds fast, then stays frozen (pause)
  const storyEnd = r0;
  let st = t;
  if (inRew) st = storyEnd * (1 - Math.pow((t - r0) / (r1 - r0), 0.8));
  else if (t >= r1) st = 0.55;
  // pins appear on the places named in line 2 (only during the story)
  const pinTimes: [PlaceId, number][] = [
    ['home', wordAt(L.l2, 'lui', L.l2.at + 2.2)],
    ['work', wordAt(L.l2, 'travail', L.l2.at + 2.9)],
    ['gym', wordAt(L.l2, 'salle', L.l2.at + 3.5)],
  ];
  const { cam: sCam, lucas: sLucas } = storyShot(Math.min(st, storyEnd), P, pinTimes);

  // ---- phases after the rewind
  const pauseOn = t >= r1 && t < L.l6.at - 0.05;
  const fictif = wordAt(L.l5, 'fictif', L.l5.at + 0.6);
  const personne = wordAt(L.l5, 'Personne', L.l5.at + 1.4);
  const dissolve = clamp01((t - fictif) / 0.6);
  const dark = clamp01((t - personne) / 0.5) * (t < L.l6.at ? 1 : 0);
  const logoT = L.l6.at;
  const appT = L.l7.at;

  // camera after the story: frozen frame (slow push), then fly toward the moon for the presentation
  let cam = sCam;
  let lucas = sLucas;
  if (t >= r1) {
    const k = clamp01((t - r1) / (logoT - r1));
    cam = { ...sCam, pos: lerp3(sCam.pos, [sCam.pos[0] - 1.5, sCam.pos[1] + 0.3, sCam.pos[2] - 3.5], ease(k)), fov: sCam.fov - 4 * k };
    lucas = { ...sLucas, opacity: 1 - dissolve * 0.0, scatter: dissolve * 1.2 };
  }
  if (t >= logoT) {
    const k = clamp01((t - logoT) / (P.duration - logoT));
    cam = { pos: [lerp(10, 6, k), lerp(3, 7, k), lerp(16, -50, k)], look: [-2, 40, -170], fov: 52 };
    lucas = { ...lucas, opacity: 0, scatter: 3 };
  }
  // shake
  const shakeAmt = Math.max(0, 1 - Math.abs(t - logoT - 0.05) / 0.45) * (t >= logoT - 0.05 ? 1 : 0);
  const shx = Math.sin(t * 90) * 26 * shakeAmt;
  const shy = Math.cos(t * 77) * 20 * shakeAmt;

  const showPins = st >= L.l2.at && st < L.l3.at + 2.2 && t < r1 + 0.01;

  // phone close-up during line 2 ("son téléphone sait exactement")
  const phoneIn = L.l2.at + 0.25;
  const phoneOut = pinTimes[0][1] - 0.15;
  const phoneSeg: Seg = { index: 1, type: 'app_screen', start: phoneIn, end: Math.max(phoneOut, phoneIn + 1.5), params: {}, t: {}, cap: [] } as any;
  const showPhone = !inRew && t >= phoneIn - 0.05 && t < phoneOut + 0.15;

  const desat = pauseOn ? 0.75 : 0;
  const worldFilter = `${desat ? `saturate(${1 - desat}) ` : ''}${inRew ? 'hue-rotate(-12deg) contrast(1.15) ' : ''}brightness(${1 - dark * 0.75})`;

  // presentation: fast cuts through real screens, synced to line 8 words
  const cuts = [appT, wordAt(L.l8, 'détecte', L.l8.at), wordAt(L.l8, 'compte', L.l8.at + 1.3), wordAt(L.l8, 'montre', L.l8.at + 2.3), wordAt(L.l8, 'carte', L.l8.at + 3)];
  let cutI = -1;
  cuts.forEach((c, i) => {
    if (t >= c - 0.05) cutI = i;
  });
  const endT = L.l9.at - 0.1;
  const inApp = t >= appT - 0.1 && t < endT;
  const cutStart = cutI >= 0 ? cuts[cutI] : appT;
  const flash = cuts.reduce((m, c) => Math.max(m, t >= c - 0.03 && t < c + 0.14 ? 1 - (t - c + 0.03) / 0.17 : 0), 0);
  const appSeg: Seg = { index: cutI + 2, type: 'app_screen', start: cutStart, end: Math.max((cuts[cutI + 1] ?? endT) + 0.05, cutStart + 1.5), params: {}, t: {}, cap: [] } as any;

  const titleFor = ['Le suivi du temps, lieu par lieu.', 'Détection automatique', 'Ton temps, compté', 'Ta carte de chaleur', 'Ta journée, rejouée'];

  return (
    <AbsoluteFill style={{ background: '#0B1240', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${shx}px, ${shy}px)` }}>
        {/* 3D pixel world */}
        <AbsoluteFill style={{ filter: worldFilter }}>
          <ThreeCanvas width={1080} height={1920} dpr={0.42} style={{ imageRendering: 'pixelated' }}>
            <World t={t >= r1 && t < logoT ? 0.55 + (t - r1) * 0.05 : t >= logoT ? t : st} cam={cam} lucas={lucas} moonGlow={t >= logoT ? 1 + 0.6 * Math.max(0, 1 - (t - logoT) / 1.2) : 1} dim={dark} />
          </ThreeCanvas>
        </AbsoluteFill>

        {/* places with live timers above the houses */}
        {showPins &&
          pinTimes.map(([id, at], i) => {
            // a pin is shown while the camera is on its place
            const next = pinTimes[i + 1]?.[1] ?? L.l3.at;
            if (st < at - 0.25 || st > next - 0.05) return null;
            const h = HOUSES.find((x) => x.id === id)!;
            const pr = project(cam, [h.x, h.h + 2.4, h.z]);
            return pr.vis ? <PinChip key={id} id={id} x={pr.x} y={pr.y} at={at} t={st} /> : null;
          })}

        {/* phone close-up with the real app */}
        {showPhone && (
          <Phone3D seg={phoneSeg} scale={0.78} cy={1040} pose={1}>
            <Img src={staticFile('screens/home_now.png')} style={{ width: SW, height: SH, objectFit: 'cover' }} />
          </Phone3D>
        )}

        {/* "fictif": everything glitches away */}
        {t >= fictif && t < logoT && (
          <AbsoluteFill style={{ zIndex: 6, pointerEvents: 'none' }}>
            {[...Array(14)].map((_, i) => {
              const y = (i * 137 + Math.floor(t * 20) * 53) % 1920;
              return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 10 + (i % 4) * 14, background: i % 2 ? 'rgba(82,223,175,0.35)' : 'rgba(255,74,54,0.35)', opacity: dissolve * (Math.sin(t * 50 + i) > 0 ? 1 : 0.2), transform: `translateX(${Math.sin(t * 33 + i) * 60}px)` }} />;
            })}
          </AbsoluteFill>
        )}

        {/* the logo drop: "Alors… nous l'avons fait." */}
        {t >= logoT - 0.02 && t < appT + 0.25 && (() => {
          const e = sp(vf, logoT + 0.02, { damping: 9, stiffness: 160 });
          const out = clamp01((t - appT + 0.15) / 0.3);
          const ring = clamp01((t - logoT) / 0.7);
          const toks6 = L.l6.text.split(/\s+/);
          const words = toks6.slice(0, Math.round((L.l6.words.filter((w) => w.s <= t + 0.04).length / Math.max(1, L.l6.words.length)) * toks6.length));
          return (
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 7, opacity: 1 - out }}>
              <div style={{ position: 'absolute', width: 300 + ring * 1500, height: 300 + ring * 1500, borderRadius: '50%', border: `${24 * (1 - ring)}px solid ${C.mint}`, opacity: 1 - ring }} />
              <div style={{ transform: `translateY(-120px) scale(${lerp(3, 1, Math.min(1, e))})`, opacity: clamp01(e * 3), filter: 'drop-shadow(0 0 40px rgba(82,223,175,0.6))' }}>
                <LogoIcon size={300} />
              </div>
              <div style={{ position: 'absolute', top: 1180, left: 60, right: 60, textAlign: 'center', fontFamily: PIX, fontVariantLigatures: 'none', fontWeight: 700, fontSize: 92, color: '#fff', textShadow: '6px 6px 0 #0B1240, 0 0 30px rgba(82,223,175,0.7)' }}>{words.join(' ')}</div>
            </AbsoluteFill>
          );
        })()}

        {/* presentation: fast cuts through the real app */}
        {inApp && cutI >= 0 && (
          <>
            <Phone3D seg={appSeg} scale={0.82} cy={1110} pose={cutI % 2 ? 1 : -1}>
              <Img src={staticFile(SCREENS[Math.min(cutI, SCREENS.length - 1)])} style={{ width: SW, height: SH, objectFit: 'cover' }} />
            </Phone3D>
            <div style={{ position: 'absolute', left: 50, right: 50, top: 150, textAlign: 'center', fontFamily: PIX, fontVariantLigatures: 'none', fontWeight: 700, fontSize: cutI === 0 ? 74 : 86, color: '#fff', lineHeight: 1.05, textShadow: '6px 6px 0 #0B1240', transform: `scale(${lerp(1.25, 1, clamp01((t - cutStart) / 0.18))})`, zIndex: 8 }}>
              {cutI === 0 && <div style={{ fontSize: 120, color: C.mint, marginBottom: 10 }}>OùVa</div>}
              {titleFor[cutI]}
            </div>
          </>
        )}

        {/* end card */}
        {t >= endT && (() => {
          const e = sp(vf, endT + 0.05, { damping: 11, stiffness: 150 });
          return (
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `rgba(8,12,40,${0.55 * clamp01(e * 2)})`, zIndex: 9 }}>
              <div style={{ transform: `translateY(-120px) scale(${lerp(0.3, 1, e)})`, opacity: clamp01(e * 2) }}>
                <LogoIcon size={240} />
              </div>
              <div style={{ position: 'absolute', top: 1060, fontFamily: PIX, fontVariantLigatures: 'none', fontWeight: 700, fontSize: 120, color: '#fff', textShadow: '6px 6px 0 #0B1240' }}>OùVa</div>
              <div style={{ position: 'absolute', top: 1220, fontFamily: FONT, fontWeight: 600, fontSize: 42, color: 'rgba(255,255,255,0.85)' }}>Disponible sur l’App Store</div>
              <div style={{ position: 'absolute', top: 1300, padding: '14px 34px', borderRadius: 999, background: '#2F7BF6', fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 40, color: '#fff', transform: `scale(${sp(vf, endT + 0.5, { damping: 10 })})` }}>lien en bio</div>
            </AbsoluteFill>
          );
        })()}
      </AbsoluteFill>

      {/* overlays: dialogue, VHS OSD */}
      <Dialog L={L.l1} t={t} />
      <Dialog L={L.l2} t={showPhone ? -1 : t} top={1420} />
      <Dialog L={L.l3} t={t} />
      <Dialog L={L.l4} t={t} name="TOI" />
      <Dialog L={L.l5} t={t} name="TOI" />
      {t < Math.min(1.6, r0) && <OSD text="▶ PLAY" t={t} />}
      {inRew && <OSD text="◀◀ REW" t={t} blink />}
      {pauseOn && <OSD text="❚❚ PAUSE" t={t} blink color="#F3E39A" />}
      <VHS t={t} amount={inRew ? 1 : pauseOn ? 0.45 : t < 1.6 ? 0.35 : 0} />
      {flash > 0 && <AbsoluteFill style={{ background: '#fff', opacity: flash * 0.6, zIndex: 10 }} />}
      {inRew && <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(255,0,60,0.12), rgba(0,200,255,0.12))', mixBlendMode: 'screen', zIndex: 7 }} />}
      {P.audio && <Audio src={staticFile(P.audio)} />}
    </AbsoluteFill>
  );
};
