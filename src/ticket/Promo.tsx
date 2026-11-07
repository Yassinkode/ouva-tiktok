import React from 'react';
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, sp } from '../lib';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { Captions, Chrono, Phone, SceneCta, SceneTicket, Warm, Word } from './Ticket';

/* Fast feature tour: one feature per ~1 s shot, whip transitions, energetic voice. */

const GREEN = '#23A26D';
export type PromoProps = { audio: string; words: Word[]; cues: Record<string, number>; marks: Record<string, number>; hi: string[]; end: number };
const ORDER = ['hook', 'chrono', 'replay', 'heat', 'trips', 'stats', 'streak', 'ticket', 'cta'];
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
      <Shot {...S('chrono')} i={1}>
        <Island {...S('chrono')} />
      </Shot>
      <Shot {...S('replay')} i={2}>
        <Map3D {...S('replay')} mode="replay" />
      </Shot>
      <Shot {...S('heat')} i={3}>
        <Map3D {...S('heat')} mode="heat" />
      </Shot>
      <Shot {...S('trips')} i={4}>
        <Trips {...S('trips')} />
      </Shot>
      <Shot {...S('stats')} i={5}>
        <Stats {...S('stats')} tabs={[cues.stats, marks.semaine, marks.mois]} />
      </Shot>
      <Shot {...S('streak')} i={6}>
        <Streak {...S('streak')} />
      </Shot>
      <SceneTicket {...S('ticket')} circleAt={marks.douze} laughAt={marks.douze + 0.6} printDur={1.0} />
      <SceneCta {...S('cta')} />
      {t > cues.hook + 0.4 && t < cues.chrono && (
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
