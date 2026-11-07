import React from 'react';
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, sp } from '../lib';
import { IconTile, PlaceKind } from '../components/UI';

/* « Le ticket de ta semaine » — warm palette, new OùVa logo + stopwatch mascot, real new screens, receipt printing. */

const GREEN = '#23A26D';
const PAPER = '#FBF8F1';
const RED = '#E5372B';
const INK = '#141414';

export type Word = { w: string; s: number; e: number };
export type TicketProps = { audio: string; words: Word[]; cues: Record<string, number>; marks: Record<string, number>; hi: string[]; end: number };

const jelly = (f: number, at: number, k = 1) => sp(f, at, { damping: 8, stiffness: 190 * k, mass: 0.8 });
const useT = () => useCurrentFrame() / FPS;

/* ---------- warm backdrop (same mood as the App Store screenshots) ---------- */
export const Warm: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #B89076 0%, #9A5F48 38%, #6E3A30 66%, #3A2131 100%)' }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 40% at ${50 + Math.sin(t * 0.5) * 10}% ${30 + Math.cos(t * 0.4) * 6}%, rgba(255,226,196,0.35) 0%, transparent 70%)` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(20,8,12,0.45) 100%)' }} />
    </AbsoluteFill>
  );
};

/* ---------- mascot: the logo stopwatch, alive ---------- */
/* premium stopwatch object (from the logo): glossy, no face — replaces the old cartoon mascot */
export const Chrono: React.FC<{ x: number; y: number; s: number; mood?: 'happy' | 'wow' | 'facepalm'; walk?: boolean; hand?: number }> = ({ x, y, s }) => {
  const t = useT();
  const float = Math.sin(t * 1.6) * 8;
  const tilt = Math.sin(t * 0.9) * 4;
  const min = t * 120;
  const hr = t * 10;
  return (
    <svg width={320 * s} height={340 * s} viewBox="-160 -180 320 340" style={{ position: 'absolute', left: x - 160 * s, top: y - 180 * s, overflow: 'visible' }}>
      <defs>
        <radialGradient id="wface" cx="38%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#E6EEEA" />
          <stop offset="100%" stopColor="#B9C9C1" />
        </radialGradient>
        <linearGradient id="wrim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4F6F5" />
          <stop offset="50%" stopColor="#9DA7A2" />
          <stop offset="100%" stopColor="#E9EDEB" />
        </linearGradient>
        <radialGradient id="wglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#23A26D" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#23A26D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={150} rx={90 - float} ry={12} fill="rgba(0,0,0,0.28)" />
      <circle cx={0} cy={0} r={175} fill="url(#wglow)" />
      <g transform={`translate(0 ${float - 10}) rotate(${tilt})`}>
        <rect x={-24} y={-158} width={48} height={34} rx={10} fill="url(#wrim)" />
        <rect x={-12} y={-130} width={24} height={14} rx={4} fill="#A9B3AE" />
        <rect x={60} y={-128} width={30} height={26} rx={8} fill="url(#wrim)" transform="rotate(40 75 -115)" />
        <circle cx={0} cy={0} r={120} fill="url(#wrim)" />
        <circle cx={0} cy={0} r={106} fill="url(#wface)" />
        {[...Array(12)].map((_, i) => {
          const a = (i * Math.PI) / 6;
          const r1 = i % 3 ? 88 : 80;
          return <line key={i} x1={Math.sin(a) * r1} y1={-Math.cos(a) * r1} x2={Math.sin(a) * 96} y2={-Math.cos(a) * 96} stroke="#10241A" strokeOpacity={0.55} strokeWidth={i % 3 ? 3 : 6} strokeLinecap="round" />;
        })}
        <path d="M0 0 A70 70 0 0 1 60.6 35" stroke="#23A26D" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.9} />
        <line x1={0} y1={0} x2={0} y2={-52} stroke="#10241A" strokeWidth={11} strokeLinecap="round" transform={`rotate(${hr})`} />
        <line x1={0} y1={0} x2={0} y2={-80} stroke="#10241A" strokeWidth={7} strokeLinecap="round" transform={`rotate(${min})`} />
        <circle cx={0} cy={0} r={9} fill="#23A26D" stroke="#10241A" strokeWidth={3} />
        <ellipse cx={-40} cy={-55} rx={46} ry={22} fill="#fff" opacity={0.55} transform="rotate(-30 -40 -55)" />
      </g>
    </svg>
  );
};

/* ---------- a crisp phone ---------- */
export const Phone: React.FC<{ x: number; y: number; w: number; rot?: number; src?: string; children?: React.ReactNode; z?: number; ox?: number; oy?: number }> = ({ x, y, w, rot = 0, src, children, z = 1, ox = 50, oy = 50 }) => (
  <div style={{ position: 'absolute', left: x - w / 2, top: y - w * 1.09, width: w, height: w * 2.18, borderRadius: w * 0.16, background: '#0B0B0C', padding: w * 0.025, boxSizing: 'border-box', transform: `rotate(${rot}deg)`, boxShadow: '0 50px 100px rgba(20,6,10,0.55), 0 0 0 3px #2A2A2C' }}>
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: w * 0.14, overflow: 'hidden', background: '#0D0F0E' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: `${ox}% ${oy}%` }}>
        {src && <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 'auto' }} />}
        {children}
      </div>
      <div style={{ position: 'absolute', top: w * 0.025, left: '50%', width: w * 0.3, height: w * 0.085, marginLeft: -w * 0.15, borderRadius: 99, background: '#000' }} />
    </div>
  </div>
);

type SP = { at: number; out: number };
const useScene = ({ at, out }: SP) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  return { f, t, on: t >= at - 0.02 && t < out + 0.02, e: sp(f, at, { damping: 17, stiffness: 160 }), lt: t - at, push: kf(f, [at, out], [1, 1.05], (x: number) => x) };
};

/* 1 — screen time */
export const SceneScreenTime: React.FC<SP> = (p) => {
  const { f, t, on, e, push } = useScene(p);
  if (!on) return null;
  const cnt = kf(f, [p.at, p.at + 1.6], [0, 1], EASE.out);
  const apps = [
    { n: 'TikTok', m: 134, c: '#111', ic: '♪' },
    { n: 'Instagram', m: 71, c: '#C13584', ic: '◎' },
    { n: 'YouTube', m: 38, c: '#E53935', ic: '▶' },
  ];
  const total = 134 + 71 + 38;
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 300, borderRadius: 50, background: '#121212', padding: '46px 50px', boxShadow: '0 50px 100px rgba(20,6,10,0.5)', transform: `translateY(${(1 - e) * 400}px) rotate(${lerp(-6, -2, e)}deg)`, opacity: clamp01(e * 2) }}>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 34, color: 'rgba(255,255,255,0.55)' }}>Temps d’écran · aujourd’hui</div>
        <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 150, color: '#fff', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
          {Math.floor((total * cnt) / 60)} h {String(Math.floor((total * cnt) % 60)).padStart(2, '0')}
        </div>
        {apps.map((a, i) => {
          const g = kf(f, [p.at + 0.2 + i * 0.15, p.at + 1.2 + i * 0.15], [0, 1], EASE.out);
          return (
            <div key={a.n} style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 26 }}>
              <div style={{ width: 76, height: 76, borderRadius: 20, background: a.c, border: '2px solid #333', color: '#fff', fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a.ic}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontWeight: 700, fontSize: 34, color: '#fff' }}>
                  <span>{a.n}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.floor((a.m * g) / 60)} h {String(Math.floor((a.m * g) % 60)).padStart(2, '0')}</span>
                </div>
                <div style={{ marginTop: 10, height: 18, borderRadius: 9, background: '#262626' }}>
                  <div style={{ width: `${(a.m / 134) * 100 * g}%`, height: '100%', borderRadius: 9, background: i ? '#5E5E5E' : '#fff' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* "it knows" check stamp */}
      <div style={{ position: 'absolute', right: 70, top: 250, width: 150, height: 150, borderRadius: 75, background: GREEN, color: '#fff', fontSize: 90, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${Math.max(0, jelly(f, p.at + 1.4))}) rotate(-12deg)`, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>✓</div>
      {t < 0 && null}
    </AbsoluteFill>
  );
};

/* 2 — but nobody tells you: places with scrambling "?" timers */
export const SceneNobody: React.FC<SP & { m: number[] }> = (p) => {
  const { f, t, on, push } = useScene(p);
  if (!on) return null;
  const items: { k: PlaceKind; n: string }[] = [
    { k: 'home', n: 'Chez toi' },
    { k: 'work', n: 'Au taf' },
    { k: 'gym', n: 'À la salle' },
  ];
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      {items.map((it, i) => {
        const at = p.at + 0.25 + i * 0.22;
        if (t < at - 0.02) return null;
        const hit = p.m[i] ?? at;
        const j = jelly(f, at) * (t > hit ? 1 + 0.12 * Math.exp(-(t - hit) * 6) * Math.cos((t - hit) * 30) : 1);
        const lit = t > hit;
        const scr = Math.floor(t * 23 + i * 7);
        return (
          <div key={it.k} style={{ position: 'absolute', left: 110 + (i % 2) * 60, right: 170 - (i % 2) * 60, top: 300 + i * 230, height: 190, borderRadius: 46, background: '#121212', opacity: lit ? 1 : 0.55, outline: lit ? `5px solid #FFB199` : 'none', display: 'flex', alignItems: 'center', gap: 30, padding: '0 40px', boxSizing: 'border-box', transform: `scale(${Math.max(0, j)}) rotate(${(i - 1) * 3}deg)`, boxShadow: '0 30px 60px rgba(20,6,10,0.45)' }}>
            <IconTile kind={it.k} size={110} solid />
            <div style={{ flex: 1, fontFamily: FONT, fontWeight: 800, fontSize: 52, color: '#fff' }}>{it.n}</div>
            <div style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 70, color: '#FFB199', fontVariantNumeric: 'tabular-nums' }}>
              {'?'} h {String(scr % 60).padStart(2, '0').replace(/\d/, '?')}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* 3 — logo build: dashed square draws, corners pop, stopwatch drops and comes alive */
export const SceneLogo: React.FC<SP> = (p) => {
  const { f, t, on } = useScene(p);
  if (!on) return null;
  const draw = kf(f, [p.at, p.at + 0.55], [0, 1], EASE.out);
  const sw = jelly(f, p.at + 0.35, 0.9);
  const alive = t > p.at + 0.9;
  const word = sp(f, p.at + 0.5, { damping: 14, stiffness: 160 });
  const rot = -6 + Math.sin(t * 1.5) * 2;
  const C = [
    [-250, -250],
    [250, -260],
    [235, 255],
    [-265, 240],
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 540, top: 700, transform: `rotate(${rot}deg)` }}>
        <svg width={700} height={700} viewBox="-350 -350 700 700" style={{ position: 'absolute', left: -350, top: -350, overflow: 'visible' }}>
          <path d={`M${C.map((c) => c.join(' ')).join(' L')} Z`} fill="rgba(20,40,32,0.75)" stroke={GREEN} strokeWidth={30} strokeDasharray="70 45" strokeDashoffset={-t * 80} strokeLinecap="round" pathLength={2000} style={{ strokeDasharray: `${draw * 2000} 2000` }} />
          <path d={`M${C.map((c) => c.join(' ')).join(' L')} Z`} fill="none" stroke={GREEN} strokeWidth={30} strokeDasharray="60 40" strokeDashoffset={-t * 120} strokeLinecap="round" opacity={draw >= 1 ? 1 : 0} />
          {C.map((c, i) => {
            const j = jelly(f, p.at + 0.15 + i * 0.1);
            return <circle key={i} cx={c[0]} cy={c[1]} r={42 * Math.max(0, j)} fill="#fff" stroke="#151515" strokeWidth={16} />;
          })}
        </svg>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${(1 - Math.min(1, sw)) * -500}px) scale(${Math.max(0, sw)})` }}>
          {alive ? <Chrono x={0} y={10} s={1.25} mood="happy" /> : <Chrono x={0} y={10} s={1.25} mood="wow" />}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1090, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 170, color: '#fff', letterSpacing: '-0.05em', transform: `translateY(${(1 - word) * 60}px)`, opacity: clamp01(word * 2), textShadow: '0 10px 40px rgba(0,0,0,0.35)' }}>OùVa</div>
    </AbsoluteFill>
  );
};

/* 4 — real home screen, live "tu es ici depuis" */
const SceneLive: React.FC<SP & { m: number }> = (p) => {
  const { f, t, on, e } = useScene(p);
  if (!on) return null;
  const z = kf(f, [p.m, p.m + 0.8], [1, 1.9], EASE.inOut);
  const sec = 2 * 3600 + 36 * 60 + 49 + Math.floor(Math.max(0, t - p.at) * 1);
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  const W = 600;
  return (
    <AbsoluteFill>
      <Phone x={540} y={900 + (1 - e) * 900} w={W} rot={lerp(8, -3, e)} src="screens2/home.png" z={z} ox={50} oy={34}>
        {/* live counter patched over the screenshot pill (screenshot coords: x 505-598, y 1033-1062 on a 620-wide crop starting at 150,378) */}
        <div style={{ position: 'absolute', left: ((505 - 150) / 620) * W * 0.95, top: ((1031 - 378) / 620) * W * 0.95, width: ((95) / 620) * W * 0.95, height: (32 / 620) * W * 0.95, background: '#0E1210', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: (19 / 620) * W * 0.95, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
          {`${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`}
        </div>
      </Phone>
      <div style={{ transform: `scale(${Math.max(0, jelly(f, p.at + 0.5))})`, transformOrigin: '900px 300px' }}>
        <Chrono x={900} y={290} s={0.6} mood="happy" walk />
      </div>
    </AbsoluteFill>
  );
};

/* 5-6 — receipt printing, then the red circle on "salle" */
const LINES: [string, string][] = [
  ['MAISON', '62 h 05'],
  ['TRAVAIL', '31 h 20'],
  ['BIBLIOTHÈQUE', '6 h 15'],
  ['TRANSPORTS', '9 h 40'],
  ['CHEZ LES POTES', '4 h 20'],
  ['SALLE DE SPORT', '0 h 12'],
];
export const SceneTicket: React.FC<SP & { circleAt: number; laughAt: number; printDur?: number }> = (p) => {
  const { f, t, on, e } = useScene(p);
  if (!on) return null;
  const printDur = p.printDur ?? 2.2;
  const pr = kf(f, [p.at + 0.35, p.at + 0.35 + printDur], [0, 1], (x: number) => x);
  const fullH = 1180;
  const visible = pr * fullH;
  // zoom onto the gym line for the punchline
  const zc = kf(f, [p.circleAt - 0.1, p.circleAt + 0.6], [0, 1], EASE.inOut);
  const circ = kf(f, [p.circleAt + 0.1, p.circleAt + 0.7], [0, 1], EASE.out);
  const sticker = jelly(f, p.laughAt);
  return (
    <AbsoluteFill style={{ transform: `scale(${lerp(1, 1.3, zc)}) translate(${lerp(0, -20, zc)}px, ${lerp(0, -230, zc)}px)`, transformOrigin: '50% 50%' }}>
      {/* printer */}
      <div style={{ position: 'absolute', left: 120, right: 120, top: 150, height: 150, borderRadius: 40, background: 'linear-gradient(180deg,#2A2A2C,#141415)', boxShadow: '0 30px 60px rgba(20,6,10,0.5)', transform: `translateY(${(1 - e) * -400}px)`, zIndex: 3 }}>
        <div style={{ position: 'absolute', left: 60, right: 60, bottom: 24, height: 16, borderRadius: 8, background: '#000' }} />
        <div style={{ position: 'absolute', right: 50, top: 34, width: 22, height: 22, borderRadius: 11, background: pr > 0 && pr < 1 ? GREEN : '#444', boxShadow: pr > 0 && pr < 1 ? `0 0 20px ${GREEN}` : undefined }} />
        <img src={staticFile('screens2/logo.png')} style={{ position: 'absolute', left: 40, top: 26, width: 70, height: 70, borderRadius: 16 }} />
      </div>
      {/* paper */}
      <div style={{ position: 'absolute', left: 190, right: 190, top: 285, height: visible, overflow: 'hidden', zIndex: 2 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: fullH, background: PAPER, padding: '50px 44px', boxSizing: 'border-box', fontFamily: '"Courier New", ui-monospace, monospace', color: INK, boxShadow: '0 20px 40px rgba(0,0,0,0.25)', WebkitMaskImage: 'linear-gradient(180deg, #000 0, #000 calc(100% - 22px), transparent calc(100% - 22px))' }}>
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 52, fontFamily: FONT_TIGHT, letterSpacing: '-0.02em' }}>OùVa</div>
          <div style={{ textAlign: 'center', fontSize: 26, marginTop: 6 }}>TICKET DE TA SEMAINE</div>
          <div style={{ textAlign: 'center', fontSize: 24, opacity: 0.6, marginBottom: 24 }}>03.11 → 09.11</div>
          <div style={{ borderTop: '3px dashed #999', margin: '10px 0 22px' }} />
          {LINES.map(([n, v], i) => (
            <div key={n} style={{ position: 'relative', display: 'flex', fontSize: 34, fontWeight: 700, margin: '20px 0' }}>
              <span>{n}</span>
              <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', opacity: 0.4 }}>{' ................................'}</span>
              <span>{v}</span>
              {i === LINES.length - 1 && circ > 0 && (
                <svg width={300} height={110} style={{ position: 'absolute', right: -40, top: -30, overflow: 'visible' }}>
                  <path d="M150 10 C 270 0, 300 60, 230 92 C 160 115, 30 105, 15 60 C 0 20, 90 5, 175 14" fill="none" stroke={RED} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - circ} />
                </svg>
              )}
            </div>
          ))}
          <div style={{ borderTop: '3px dashed #999', margin: '26px 0 18px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 40, fontWeight: 900 }}>
            <span>TOTAL</span>
            <span>113 h 52</span>
          </div>
          <div style={{ textAlign: 'center', fontSize: 24, marginTop: 30, opacity: 0.7 }}>Merci d’être passé :)</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 24, height: 80 }}>
            {[...Array(46)].map((_, i) => (
              <div key={i} style={{ width: (i * 7) % 3 ? 4 : 8, background: INK }} />
            ))}
          </div>
        </div>
      </div>
      {/* punchline sticker + mascot */}
      {t > p.laughAt && (
        <div style={{ position: 'absolute', left: 610, top: 1020, padding: '12px 26px', borderRadius: 18, background: RED, color: '#fff', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 40, transform: `rotate(-8deg) scale(${Math.max(0, sticker)})`, zIndex: 5 }}>On en parle ? 💀</div>
      )}
      {zc > 0.2 && (
        <div style={{ transform: `scale(${Math.max(0, jelly(f, p.circleAt + 0.2))})`, transformOrigin: '330px 1180px', zIndex: 6, position: 'absolute', inset: 0 }}>

        </div>
      )}
    </AbsoluteFill>
  );
};

/* 7 — CTA */
export const SceneCta: React.FC<SP> = (p) => {
  const { f, t, on } = useScene(p);
  if (!on) return null;
  const e = jelly(f, p.at + 0.05, 0.9);
  const b = jelly(f, p.at + 0.45);
  const c = jelly(f, p.at + 0.9);
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 290, width: 330, height: 330, borderRadius: 76, overflow: 'hidden', transform: `scale(${Math.max(0, e)}) rotate(${Math.sin(t * 2) * 3}deg)`, boxShadow: '0 40px 80px rgba(20,6,10,0.5)' }}>
        <Img src={staticFile('screens2/logo.png')} style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', top: 660, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 170, color: '#fff', letterSpacing: '-0.05em', opacity: clamp01((t - p.at - 0.15) / 0.2), textShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>OùVa</div>
      <div style={{ position: 'absolute', top: 890, padding: '24px 50px', borderRadius: 999, background: '#111', color: '#fff', fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 52, transform: `scale(${Math.max(0, b)})`, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 18, height: 18, borderRadius: 9, background: GREEN }} />
        Gratuit sur l’App Store
      </div>
      <div style={{ position: 'absolute', top: 1060, textAlign: 'center', transform: `scale(${Math.max(0, c)})` }}>
        <div style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 92, color: '#fff' }}>ABONNE-TOI</div>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 38, color: 'rgba(255,255,255,0.85)' }}>
          pour voir <span style={{ color: '#9FF0C9' }}>le ticket du mois</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions ---------- */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
export const Captions: React.FC<{ words: Word[]; hi: string[]; stopAt: number }> = ({ words, hi, stopAt }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t >= stopAt - 0.05) return null;
  const chunks: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w) => {
    cur.push(w);
    if (cur.length >= 3 || /[.,?!:…]$/.test(w.w)) {
      chunks.push(cur);
      cur = [];
    }
  });
  if (cur.length) chunks.push(cur);
  const i = chunks.findIndex((c, k) => t >= c[0].s - 0.05 && (k === chunks.length - 1 || t < chunks[k + 1][0].s - 0.05));
  if (i < 0) return null;
  const c = chunks[i];
  const e = sp(f, c[0].s - 0.05, { damping: 12, stiffness: 260 });
  return (
    <div style={{ position: 'absolute', top: 1330, left: 50, right: 150, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 22px', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 92, lineHeight: 1.02, letterSpacing: '-0.02em', textTransform: 'uppercase', transform: `scale(${lerp(0.8, 1, e)})`, zIndex: 40 }}>
      {c.map((w, k) => {
        const isHi = hi.some((h) => norm(w.w).startsWith(norm(h)));
        const said = t >= w.s - 0.03;
        return (
          <span key={k} style={{ color: '#fff', opacity: said ? 1 : 0.55, WebkitTextStroke: '12px rgba(28,12,14,0.75)', paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.4)', ...(isHi ? { background: GREEN, padding: '0 14px', borderRadius: 16 } : {}) }}>
            {w.w.replace(/[,:]$/, '')}
          </span>
        );
      })}
    </div>
  );
};

/* ---------- composition ---------- */
export const Ticket: React.FC<TicketProps> = ({ audio, words, cues, marks, hi, end }) => {
  const order = ['screen', 'nobody', 'logo', 'live', 'ticket', 'cta'];
  const S = (id: string) => {
    const i = order.indexOf(id);
    return { at: cues[id], out: i + 1 < order.length ? cues[order[i + 1]] : end };
  };
  const t = useT();
  const flash = order.reduce((m, id) => Math.max(m, t >= cues[id] && t < cues[id] + 0.1 ? 1 - (t - cues[id]) / 0.1 : 0), 0);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Warm />
      <SceneScreenTime {...S('screen')} />
      <SceneNobody {...S('nobody')} m={[marks.home, marks.work, marks.gym]} />
      <SceneLogo {...S('logo')} />
      <SceneLive {...S('live')} m={marks.chrono} />
      <SceneTicket {...S('ticket')} circleAt={marks.douze} laughAt={marks.parle} />
      <SceneCta {...S('cta')} />
      <Captions words={words} hi={hi} stopAt={cues.cta} />
      {flash > 0 && <AbsoluteFill style={{ background: '#FFF4E8', opacity: flash * 0.3 }} />}
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
