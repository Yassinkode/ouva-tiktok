import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, sp } from '../lib';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { Captions, Chrono, Phone, SceneCta, SceneTicket, Warm, Word } from './Ticket';

/* Fast feature tour: one feature per ~1 s shot, whip transitions, energetic voice. */

const GREEN = '#23A26D';
export type PromoProps = { audio: string; words: Word[]; cues: Record<string, number>; marks: Record<string, number>; hi: string[]; end: number };
const ORDER = ['hook', 'detect', 'chrono', 'replay', 'heat', 'trips', 'stats', 'widgets', 'streak', 'ticket', 'cta'];
const jelly = (f: number, at: number, k = 1) => sp(f, at, { damping: 8, stiffness: 190 * k, mass: 0.8 });
type SP = { at: number; out: number };

/** whip: each shot slides in fast from the side with a slight blur, alternating direction */
const Shot: React.FC<SP & { i: number; children: React.ReactNode }> = ({ at, out, i, children }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at - 0.02 || t > out + 0.12) return null;
  const inn = kf(f, [at - 0.02, at + 0.16], [1, 0], EASE.out);
  const ex = kf(f, [out - 0.02, out + 0.12], [0, 1], EASE.in);
  const dir = i % 2 ? 1 : -1;
  const push = kf(f, [at, out], [1, 1.06], (x: number) => x);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(inn * 1100 - ex * 1100) * dir}px) scale(${push}) rotate(${(inn - ex) * 4 * dir}deg)`, filter: inn > 0.05 || ex > 0.05 ? `blur(${(inn + ex) * 14}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

/* hook: real home screen + place chips orbiting with live timers */
const Hook: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const e = sp(f, at, { damping: 15, stiffness: 150 });
  const chips: { k: PlaceKind; m: number; a: number }[] = [
    { k: 'home', m: 860, a: 0 },
    { k: 'work', m: 465, a: 90 },
    { k: 'gym', m: 102, a: 180 },
    { k: 'cafe', m: 42, a: 270 },
  ];
  return (
    <>
      <Phone x={540} y={760 + (1 - e) * 700} w={480} rot={Math.sin(t * 2) * 3} src="screens2/home.png" />
      {chips.map((c, i) => {
        const j = jelly(f, at + 0.15 + i * 0.12);
        const ang = ((c.a + t * 40) * Math.PI) / 180;
        const x = 540 + Math.cos(ang) * 420 - 150;
        const y = 740 + Math.sin(ang) * 480 - 50;
        const m = c.m + Math.max(0, t - at) * 30;
        const P = PLACE[c.k];
        return (
          <div key={c.k} style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px 12px 12px', borderRadius: 26, background: '#111', border: `3px solid ${P.color}`, transform: `scale(${Math.max(0, j)})`, boxShadow: '0 20px 40px rgba(20,6,10,0.4)' }}>
            <IconTile kind={c.k} size={64} solid />
            <div style={{ fontFamily: FONT, lineHeight: 1.05 }}>
              <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{P.name}</div>
              <div style={{ fontFamily: FONT_TIGHT, fontSize: 40, fontWeight: 850, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{`${Math.floor(m / 60)} h ${String(Math.floor(m % 60)).padStart(2, '0')}`}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};

/* giant Dynamic Island */
const Island: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const isl = sp(f, at + 0.05, { damping: 11, stiffness: 150 });
  const sec = Math.max(0, t - at - 0.2) * 6;
  const P = PLACE.library;
  return (
    <>
      <Phone x={540} y={830} w={500} src="screens2/home.png" z={1.6} ox={50} oy={34} />
      <div style={{ position: 'absolute', left: 540 - lerp(160, 480, isl), top: lerp(380, 250, isl), width: lerp(320, 960, isl), height: lerp(90, 220, isl), borderRadius: 120, background: '#000', boxShadow: `0 0 0 3px ${GREEN}66, 0 30px 80px rgba(0,0,0,0.5)`, display: 'flex', alignItems: 'center', gap: 26, padding: '0 40px', boxSizing: 'border-box' }}>
        <div style={{ opacity: clamp01((isl - 0.5) * 3), display: 'flex', alignItems: 'center', gap: 26, width: '100%' }}>
          <IconTile kind="library" size={130} solid />
          <div style={{ flex: 1, fontFamily: FONT, color: '#fff', lineHeight: 1.1 }}>
            <div style={{ fontSize: 34, opacity: 0.6 }}>Arrivée détectée</div>
            <div style={{ fontSize: 52, fontWeight: 800 }}>{P.name}</div>
          </div>
          <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 90, color: GREEN, fontVariantNumeric: 'tabular-nums' }}>{`0:${String(Math.floor(sec)).padStart(2, '0')}`}</div>
        </div>
      </div>
    </>
  );
};

/* 3D map: day replay (route drawing, moving dot) or heatmap */
const ROUTE: [number, number][] = [
  [160, 820],
  [160, 560],
  [420, 560],
  [420, 300],
  [760, 300],
  [760, 620],
];
const Map3D: React.FC<SP & { mode: 'replay' | 'heat' }> = ({ at, out, mode }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const prog = kf(f, [at, out - 0.1], [0, 1], EASE.inOut);
  const segs = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
  const tot = segs.reduce((a, b) => a + b, 0);
  let d = prog * tot;
  let pos = ROUTE[0];
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) {
      const r = d / segs[i];
      pos = [lerp(ROUTE[i][0], ROUTE[i + 1][0], r), lerp(ROUTE[i][1], ROUTE[i + 1][1], r)];
      break;
    }
    d -= segs[i];
    pos = ROUTE[i + 1];
  }
  const tilt = mode === 'replay' ? 52 : 38;
  const rz = mode === 'replay' ? -18 + prog * 14 : 10 - prog * 8;
  return (
    <AbsoluteFill style={{ perspective: 1800 }}>
      <div style={{ position: 'absolute', left: 90, top: 380, width: 900, height: 900, borderRadius: 50, overflow: 'hidden', background: '#2A3442', transform: `rotateX(${tilt}deg) rotateZ(${rz}deg) scale(${mode === 'replay' ? 1.15 : 1.05})`, boxShadow: '0 60px 120px rgba(20,6,10,0.55)' }}>
        <svg width={900} height={900}>
          {[
            [0, 0, 110, 500],
            [210, 0, 160, 500],
            [470, 0, 430, 250],
            [210, 610, 500, 290],
            [470, 350, 240, 210],
            [810, 350, 90, 550],
            [0, 610, 110, 290],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx={16} fill={i % 3 ? '#344155' : '#3A3550'} />
          ))}
          {['M160 0 V900', 'M0 560 H900', 'M420 0 V900', 'M0 300 H900', 'M760 0 V900'].map((dd, i) => (
            <path key={i} d={dd} stroke="#1E2632" strokeWidth={44} fill="none" />
          ))}
          {mode === 'heat' &&
            [...Array(81)].map((_, i) => {
              const cx = (i % 9) * 100 + 50;
              const cy = Math.floor(i / 9) * 100 + 50;
              const dd = Math.hypot(cx - 600, cy - 380);
              const v = clamp01(1 - dd / 420);
              const appear = clamp01((t - at - dd / 900) / 0.25);
              if (v <= 0.05) return null;
              const col = v > 0.7 ? '#E5372B' : v > 0.45 ? '#F28C28' : v > 0.25 ? '#F2C94C' : '#5BC07A';
              return <rect key={i} x={cx - 46} y={cy - 46} width={92} height={92} rx={12} fill={col} opacity={0.75 * appear} />;
            })}
          {mode === 'replay' && (
            <>
              <path d={ROUTE.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')} stroke="#fff" strokeWidth={10} strokeDasharray="4 22" strokeLinecap="round" fill="none" opacity={0.35} />
              <path d={ROUTE.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')} stroke={GREEN} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - prog} />
              <circle cx={pos[0]} cy={pos[1]} r={40 + 6 * Math.sin(t * 8)} fill={GREEN} opacity={0.25} />
              <circle cx={pos[0]} cy={pos[1]} r={22} fill="#fff" stroke={GREEN} strokeWidth={8} />
            </>
          )}
        </svg>
        {mode === 'replay' &&
          ([
            ['home', 160, 820],
            ['library', 420, 300],
            ['gym', 760, 620],
          ] as [PlaceKind, number, number][]).map(([k, x, y]) =>
            k in PLACE ? (
              <div key={k} style={{ position: 'absolute', left: x - 44, top: y - 44, transform: `rotateZ(${-rz}deg) rotateX(-${tilt}deg) translateY(-40px)`, transformOrigin: '50% 100%' }}>
                <IconTile kind={k} size={88} solid />
              </div>
            ) : null,
          )}
      </div>
      {mode === 'replay' && (
        <div style={{ position: 'absolute', left: 340, top: 300, padding: '12px 26px', borderRadius: 999, background: '#111', color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 34, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: GREEN }}>▶</span> Revivre ma journée
        </div>
      )}
    </AbsoluteFill>
  );
};

/* places screen with the trips (map already blurred) */
const Trips: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const e = sp(f, at, { damping: 15, stiffness: 160 });
  return <Phone x={540} y={780} w={500} rot={lerp(-8, -2, e)} src="screens2/places.png" z={kf(f, [at, at + 1.2], [1.05, 1.25], EASE.out)} ox={55} oy={40} />;
};

/* stats screen, tab underline jumps Jour → Semaine → Mois on the words */
const Stats: React.FC<SP & { tabs: number[] }> = ({ at, tabs }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const e = sp(f, at, { damping: 15, stiffness: 160 });
  const W = 500;
  let k = 0;
  tabs.forEach((x, i) => {
    if (t >= x) k = i;
  });
  const sx = sp(f, tabs[k] ?? at, { damping: 14, stiffness: 220 });
  const prev = Math.max(0, k - 1);
  const pos = lerp(prev, k, k ? sx : 1);
  const iw = W * 0.95;
  return (
    <Phone x={540} y={780} w={W} rot={lerp(8, 2, e)} src="screens2/stats.png">
      {/* moving highlight over the tabs (screenshot: tabs at y≈510, 3 columns from x 172 to 748 on a 620-wide crop starting at 150) */}
      <div style={{ position: 'absolute', left: ((172 - 150) / 620) * iw + pos * ((192 / 620) * iw), top: ((485 - 378) / 620) * iw, width: (190 / 620) * iw, height: (52 / 620) * iw, borderRadius: 14, border: `4px solid ${GREEN}`, boxShadow: `0 0 24px ${GREEN}88` }} />
    </Phone>
  );
};

/* profile: streak flame + badges popping */
const Streak: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const e = sp(f, at, { damping: 15, stiffness: 160 });
  const badges = [
    { c: '#4CC38A', s: '🏁', n: 'Premier pas' },
    { c: '#5B8DEF', s: '⏱️', n: '100 h suivies' },
    { c: '#F2A33A', s: '🔥', n: '14 jours' },
  ];
  return (
    <>
      <Phone x={300} y={800} w={450} rot={lerp(-10, -5, e)} src="screens2/profile.png" />
      {badges.map((b, i) => {
        const j = jelly(f, at + 0.15 + i * 0.18);
        return (
          <div key={b.n} style={{ position: 'absolute', left: 600, top: 420 + i * 250, width: 400, height: 200, borderRadius: 36, background: '#141414', display: 'flex', alignItems: 'center', gap: 22, padding: '0 26px', boxSizing: 'border-box', transform: `scale(${Math.max(0, j)}) rotate(${(i - 1) * 4}deg)`, boxShadow: '0 30px 60px rgba(20,6,10,0.45)' }}>
            <div style={{ width: 120, height: 120, borderRadius: 60, background: b.c, border: '6px solid #E9B98A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 58 }}>{b.s}</div>
            <div style={{ fontFamily: FONT, lineHeight: 1.1 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#fff' }}>{b.n}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: GREEN }}>Débloqué ✓</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 90, top: 250, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 110, color: '#fff', textShadow: '0 10px 30px rgba(0,0,0,0.35)', transform: `scale(${Math.max(0, jelly(f, at + 0.1))}) rotate(-6deg)` }}>
        🔥 {Math.round(kf(f, [at + 0.1, at + 0.8], [1, 14], EASE.out))} <span style={{ fontSize: 60 }}>jours</span>
      </div>
      {t < 0 && null}
    </>
  );
};


/* places detected automatically: pins pop + notification banners */
const Detect: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const e = sp(f, at, { damping: 16, stiffness: 160 });
  const pins: { k: PlaceKind; x: number; y: number }[] = [
    { k: 'library', x: 300, y: 330 },
    { k: 'gym', x: 640, y: 250 },
    { k: 'cafe', x: 520, y: 560 },
  ];
  return (
    <>
      <div style={{ position: 'absolute', left: 110, top: 420, width: 860, height: 820, borderRadius: 50, overflow: 'hidden', transform: `scale(${lerp(0.9, 1, e)})`, boxShadow: '0 50px 100px rgba(20,6,10,0.5)' }}>
        <Img src={staticFile('screens2/places.png')} style={{ position: 'absolute', left: -60, top: -60, width: 980, filter: 'blur(10px) brightness(0.9)' }} />
        {[0, 1].map((i) => {
          const r = ((t - at) * 0.9 + i * 0.5) % 1;
          return <div key={i} style={{ position: 'absolute', left: 430 - r * 420, top: 410 - r * 420, width: r * 840, height: r * 840, borderRadius: '50%', border: `4px solid ${GREEN}`, opacity: (1 - r) * 0.6 }} />;
        })}
        {pins.map((p, i) => {
          const j = jelly(f, at + 0.25 + i * 0.32);
          if (t < at + 0.25 + i * 0.32) return null;
          return (
            <div key={p.k} style={{ position: 'absolute', left: p.x - 60, top: p.y - 60, transform: `translateY(${(1 - Math.min(1, j)) * -120}px) scale(${Math.max(0, j)})` }}>
              <IconTile kind={p.k} size={120} solid />
            </div>
          );
        })}
      </div>
      {pins.map((p, i) => {
        const a = at + 0.3 + i * 0.32;
        if (t < a) return null;
        const j = sp(f, a, { damping: 14, stiffness: 200 });
        return (
          <div key={p.k} style={{ position: 'absolute', left: 70, right: 70, top: 120 + i * 0, height: 120, borderRadius: 34, background: 'rgba(30,30,32,0.92)', display: 'flex', alignItems: 'center', gap: 20, padding: '0 24px', boxSizing: 'border-box', transform: `translateY(${(1 - j) * -200 + i * 22}px) scale(${1 - (2 - i) * 0.04})`, opacity: i < 2 && t > at + 0.3 + (i + 1) * 0.32 ? 0.5 : 1, boxShadow: '0 20px 40px rgba(0,0,0,0.35)', zIndex: 10 + i }}>
            <Img src={staticFile('screens2/logo.png')} style={{ width: 76, height: 76, borderRadius: 18 }} />
            <div style={{ fontFamily: FONT, lineHeight: 1.15 }}>
              <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>OùVa · maintenant</div>
              <div style={{ fontSize: 34, color: '#fff', fontWeight: 700 }}>Nouveau lieu détecté : {PLACE[p.k].name}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};

/* real "Revivre ma journée" recording, tilted in 3D */
const Replay: React.FC<SP> = ({ at, out }) => {
  const f = useCurrentFrame();
  const e = sp(f, at, { damping: 15, stiffness: 150 });
  const rz = kf(f, [at, out], [-6, 3], EASE.inOut);
  return (
    <AbsoluteFill style={{ perspective: 1800 }}>
      <div style={{ position: 'absolute', left: 60, top: 360, width: 960, height: 824, borderRadius: 50, overflow: 'hidden', transform: `rotateX(${lerp(40, 22, e)}deg) rotateZ(${rz}deg) scale(1.05)`, boxShadow: '0 60px 120px rgba(20,6,10,0.55)' }}>
        <Sequence from={Math.round(at * FPS)} layout="none">
          <OffthreadVideo src={staticFile('promo/replay.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Sequence>
      </div>
      <div style={{ position: 'absolute', left: 300, top: 250, padding: '14px 30px', borderRadius: 999, background: '#111', color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 36, display: 'flex', alignItems: 'center', gap: 12, transform: `scale(${Math.max(0, jelly(f, at + 0.1))})` }}>
        <span style={{ color: GREEN }}>▶</span> Revivre ma journée
      </div>
    </AbsoluteFill>
  );
};

/* iOS home screen with OùVa widgets */
const Widgets: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const e = sp(f, at, { damping: 15, stiffness: 160 });
  const w1 = jelly(f, at + 0.15);
  const w2 = jelly(f, at + 0.35);
  const rows: { k: PlaceKind; m: number }[] = [
    { k: 'home', m: 552 },
    { k: 'library', m: 150 },
    { k: 'gym', m: 102 },
  ];
  const sec = 2 * 3600 + 36 * 60 + 49 + Math.floor(Math.max(0, t - at));
  const icons = ['#3A6FD8', '#F2A33A', '#2FB36B', '#E5372B', '#8A5CF6', '#14B8A6', '#F472B6', '#64748B'];
  return (
    <div style={{ position: 'absolute', left: 140, top: 230, width: 800, height: 1100, borderRadius: 90, overflow: 'hidden', background: 'linear-gradient(160deg,#C9A27F 0%,#8E4E3B 55%,#3E2233 100%)', transform: `translateY(${(1 - e) * 600}px) rotate(${lerp(6, 2, e)}deg)`, boxShadow: '0 60px 120px rgba(20,6,10,0.55), 0 0 0 16px #0B0B0C' }}>
      <div style={{ position: 'absolute', left: 50, top: 70, width: 330, height: 330, borderRadius: 50, background: 'rgba(16,18,17,0.92)', padding: 30, boxSizing: 'border-box', transform: `scale(${Math.max(0, w1)})`, fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: GREEN, fontWeight: 700, fontSize: 24 }}>● En direct</div>
        <div style={{ marginTop: 20 }}>
          <IconTile kind="library" size={84} solid />
        </div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 34, marginTop: 16 }}>Bibliothèque</div>
        <div style={{ color: GREEN, fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 52, fontVariantNumeric: 'tabular-nums' }}>{`${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`}</div>
      </div>
      <div style={{ position: 'absolute', left: 420, top: 70, display: 'grid', gridTemplateColumns: 'repeat(2, 130px)', gap: 40 }}>
        {icons.slice(0, 4).map((c, i) => (
          <div key={i} style={{ width: 130, height: 130, borderRadius: 32, background: c, opacity: 0.9 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 440, height: 330, borderRadius: 50, background: 'rgba(16,18,17,0.92)', padding: '30px 34px', boxSizing: 'border-box', transform: `scale(${Math.max(0, w2)})`, fontFamily: FONT }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: 26, fontWeight: 600 }}>
          <span>Aujourd’hui</span>
          <span style={{ color: GREEN }}>OùVa</span>
        </div>
        {rows.map((r, i) => {
          const g = kf(f, [at + 0.45 + i * 0.12, at + 1.1 + i * 0.12], [0, 1], EASE.out);
          return (
            <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 20 }}>
              <IconTile kind={r.k} size={56} solid />
              <div style={{ flex: 1, height: 18, borderRadius: 9, background: '#2A2C2B' }}>
                <div style={{ width: `${(r.m / 552) * 100 * g}%`, height: '100%', borderRadius: 9, background: PLACE[r.k].color }} />
              </div>
              <div style={{ width: 140, textAlign: 'right', color: '#fff', fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 34 }}>{`${Math.floor(r.m / 60)} h ${String(r.m % 60).padStart(2, '0')}`}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 60, top: 820, display: 'grid', gridTemplateColumns: 'repeat(4, 130px)', gap: 50 }}>
        {icons.map((c, i) => (
          <div key={i} style={{ width: 130, height: 130, borderRadius: 32, background: c, opacity: 0.85 }} />
        ))}
      </div>
    </div>
  );
};

export const Promo: React.FC<PromoProps> = ({ audio, words, cues, marks, hi, end }) => {
  const S = (id: string) => {
    const i = ORDER.indexOf(id);
    return { at: cues[id], out: i + 1 < ORDER.length ? cues[ORDER[i + 1]] : end };
  };
  const f = useCurrentFrame();
  const t = f / FPS;
  const flash = ORDER.reduce((m, id) => Math.max(m, t >= cues[id] && t < cues[id] + 0.08 ? 1 - (t - cues[id]) / 0.08 : 0), 0);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Warm />
      <Shot {...S('hook')} i={0}>
        <Hook {...S('hook')} />
      </Shot>
      <Shot {...S('detect')} i={1}>
        <Detect {...S('detect')} />
      </Shot>
      <Shot {...S('chrono')} i={2}>
        <Island {...S('chrono')} />
      </Shot>
      <Shot {...S('replay')} i={3}>
        <Replay {...S('replay')} />
      </Shot>
      <Shot {...S('heat')} i={4}>
        <Map3D {...S('heat')} mode="heat" />
      </Shot>
      <Shot {...S('trips')} i={5}>
        <Trips {...S('trips')} />
      </Shot>
      <Shot {...S('stats')} i={6}>
        <Stats {...S('stats')} tabs={[cues.stats, cues.stats + 0.35, cues.stats + 0.7]} />
      </Shot>
      <Shot {...S('widgets')} i={7}>
        <Widgets {...S('widgets')} />
      </Shot>
      <Shot {...S('streak')} i={8}>
        <Streak {...S('streak')} />
      </Shot>
      <SceneTicket {...S('ticket')} circleAt={marks.douze} laughAt={marks.douze + 0.6} printDur={1.0} />
      <SceneCta {...S('cta')} />
      {t > cues.hook + 0.4 && t < cues.detect && (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${Math.max(0, jelly(f, cues.hook + 0.4))})`, transformOrigin: '880px 1180px' }}>
          <Chrono x={880} y={1180} s={0.55} mood="wow" />
        </div>
      )}
      <Captions words={words} hi={hi} stopAt={cues.cta} />
      {flash > 0 && <AbsoluteFill style={{ background: '#FFF4E8', opacity: flash * 0.35 }} />}
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
export const _img = Img;
