import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, sp } from '../lib';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { LogoIcon } from '../components/Icons';

/* « Lab 2 »: straight into the action. Light pastel world, many objects (map, Dynamic Island, cards, chart, keyboard),
   word-by-word captions, soft satisfying sounds. */

const INK = '#111316';

export type Line = { text: string; at: number; end: number };
export type Lab2Props = {
  audio?: string;
  place: PlaceKind;
  placeName: string;
  minutes: number; // time at the first place
  others: { k: PlaceKind; label: string; minutes: number }[];
  week: { k: PlaceKind; label: string; minutes: number }[];
  typed: string; // place typed on the keyboard
  typedKind: PlaceKind;
  lines: Line[];
};

export const L2 = { b2: 2.35, b3: 3.9, b4: 5.5, b5: 7.4, b6: 10.0, cta: 12.4, end: 14.2 };

export const lab2Default: Lab2Props = {
  audio: 'lab/lab2.wav',
  place: 'gym',
  placeName: 'Salle de sport',
  minutes: 72,
  others: [
    { k: 'work', label: 'Travail', minutes: 460 },
    { k: 'home', label: 'Maison', minutes: 185 },
    { k: 'friends', label: 'Chez les potes', minutes: 140 },
  ],
  week: [
    { k: 'home', label: 'Maison', minutes: 62 * 60 },
    { k: 'work', label: 'Travail', minutes: 31 * 60 + 20 },
    { k: 'friends', label: 'Potes', minutes: 4 * 60 + 20 },
    { k: 'gym', label: 'Salle', minutes: 3 * 60 + 10 },
  ],
  typed: 'Boulangerie',
  typedKind: 'shop',
  lines: [
    { text: 'Tu arrives à la salle…', at: 0.1, end: 1.3 },
    { text: 'et le chrono se lance tout seul.', at: 1.35, end: L2.b3 - 0.1 },
    { text: 'Tu repars : 1 h 12, rangée.', at: L2.b3, end: L2.b4 - 0.1 },
    { text: 'Pareil au taf, chez toi, chez tes potes.', at: L2.b4, end: L2.b5 - 0.1 },
    { text: 'Et chaque semaine, tu vois où passe vraiment ton temps.', at: L2.b5, end: L2.b6 - 0.1 },
    { text: 'Pour ajouter un lieu ? Tu tapes son nom. C’est tout.', at: L2.b6, end: L2.cta - 0.1 },
    { text: 'OùVa. Gratuit sur l’App Store.', at: L2.cta + 0.1, end: L2.end - 0.2 },
  ],
};

const useT = () => useCurrentFrame() / FPS;
const fmt = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return h ? `${h} h ${String(mm).padStart(2, '0')}` : `${mm} min`;
};
/** jelly scale: overshoot + wobble */
const jelly = (f: number, at: number, k = 1) => {
  const e = sp(f, at, { damping: 7, stiffness: 180 * k, mass: 0.8 });
  return e;
};

/* ---------- background ---------- */
const Bg: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: '#F4F2F7' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(55% 40% at ${20 + Math.sin(t * 0.5) * 6}% ${25 + Math.cos(t * 0.4) * 5}%, #FCD5C3 0%, transparent 70%),
                       radial-gradient(60% 45% at ${82 + Math.cos(t * 0.45) * 5}% ${75 + Math.sin(t * 0.5) * 6}%, #D9D6FB 0%, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------- captions: whole line, active word darkens ---------- */
const Captions: React.FC<{ lines: Line[] }> = ({ lines }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const L = lines.find((l) => l.at < L2.cta && t >= l.at - 0.05 && t < l.end + 0.08);
  if (!L) return null;
  const words = L.text.split(' ');
  const dur = Math.max(0.3, L.end - L.at - 0.15);
  const e = sp(f, L.at, { damping: 15, stiffness: 220 });
  return (
    <div style={{ position: 'absolute', top: 210, left: 60, right: 60, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 18px', fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 74, lineHeight: 1.12, letterSpacing: '-0.035em', transform: `translateY(${(1 - e) * 24}px)`, opacity: clamp01(e * 2), zIndex: 50 }}>
      {words.map((w, i) => {
        const wt = L.at + (i / words.length) * dur;
        const on = t >= wt;
        const pe = sp(f, wt, { damping: 10, stiffness: 300 });
        return (
          <span key={i} style={{ color: on ? INK : 'rgba(17,19,22,0.22)', display: 'inline-block', transform: `scale(${on ? lerp(1.12, 1, pe) : 1})` }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/* ---------- beat 1: map, walking dot, pin drop ---------- */
const PATH: [number, number][] = [
  [90, 760],
  [90, 520],
  [330, 520],
  [330, 300],
  [600, 300],
];
const along = (u: number) => {
  const seg = PATH.slice(1).map((p, i) => Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]));
  const tot = seg.reduce((a, b) => a + b, 0);
  let d = u * tot;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const r = d / seg[i];
      return [lerp(PATH[i][0], PATH[i + 1][0], r), lerp(PATH[i][1], PATH[i + 1][1], r)];
    }
    d -= seg[i];
  }
  return PATH[PATH.length - 1];
};

const MapCard: React.FC<{ p: Lab2Props }> = ({ p }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t > L2.b3 + 0.4) return null;
  const e = sp(f, 0, { damping: 18, stiffness: 160 });
  const walk = kf(f, [0.15, 1.25], [0, 1], EASE.soft);
  const [dx, dy] = along(walk);
  const pin = jelly(f, 1.25);
  const ex = kf(f, [L2.b3 - 0.25, L2.b3 + 0.3], [0, 1], EASE.in);
  const P = PLACE[p.place];
  // camera: slight zoom into the pin while the island grows
  const z = kf(f, [1.2, 2.3], [1, 1.08], EASE.inOut);
  return (
    <div style={{ position: 'absolute', left: 70, top: 560, width: 940, height: 940, borderRadius: 56, overflow: 'hidden', background: '#EEF1EC', boxShadow: '0 40px 100px rgba(50,40,90,0.18)', transform: `translateY(${(1 - e) * 600 + ex * 900}px) scale(${lerp(0.9, 1, e) * (1 - ex * 0.15)}) rotate(${ex * 6}deg)`, opacity: 1 - ex * 0.6 }}>
      <svg width={940} height={940} style={{ transform: `scale(${z})`, transformOrigin: '600px 300px' }}>
        {/* blocks */}
        {[
          [0, 0, 60, 480, '#E3E8E1'],
          [130, 0, 170, 480, '#E7EAF0'],
          [130, 560, 170, 380, '#F0E9E1'],
          [370, 0, 900, 260, '#E7EAF0'],
          [370, 340, 190, 600, '#E3E8E1'],
          [640, 340, 300, 600, '#DDEBDD'],
          [0, 800, 60, 140, '#F0E9E1'],
        ].map(([x, y, w, h, c], i) => (
          <rect key={i} x={x as number} y={y as number} width={w as number} height={h as number} rx={22} fill={c as string} />
        ))}
        {/* park */}
        {[...Array(9)].map((_, i) => (
          <circle key={i} cx={700 + (i % 3) * 80} cy={430 + Math.floor(i / 3) * 90} r={26} fill="#BFDDBF" />
        ))}
        {/* streets */}
        {[
          'M90 0 V940',
          'M0 520 H940',
          'M330 0 V940',
          'M0 300 H940',
          'M600 300 V940',
        ].map((d, i) => (
          <path key={i} d={d} stroke="#FFFFFF" strokeWidth={46} fill="none" strokeLinecap="round" />
        ))}
        {/* walked trail */}
        <path d={PATH.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join(' ')} stroke="#6F7BF7" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2000" strokeDashoffset={2000 * (1 - walk)} opacity={0.85} />
        {/* gym building */}
        <rect x={545} y={150} width={110} height={110} rx={26} fill={P.color} opacity={0.18} />
        {/* user dot */}
        <circle cx={dx} cy={dy} r={34 + Math.sin(t * 6) * 3} fill="#6F7BF7" opacity={0.2} />
        <circle cx={dx} cy={dy} r={18} fill="#6F7BF7" stroke="#fff" strokeWidth={7} />
      </svg>
      {/* pin */}
      <div style={{ position: 'absolute', left: 600 - 70, top: 300 - 175, width: 140, transformOrigin: '50% 100%', transform: `translateY(${(1 - Math.min(1, pin)) * -260}px) scale(${Math.max(0, pin)}, ${Math.max(0, 2 - pin)})`, opacity: t > 1.2 ? 1 : 0 }}>
        <div style={{ width: 140, height: 140, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: P.color, boxShadow: '0 16px 30px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: 'rotate(45deg)' }}>
            <P.Icon size={64} color="#fff" />
          </div>
        </div>
      </div>
      {/* ripple */}
      {[0, 1].map((i) => {
        const r = clamp01((t - 1.35 - i * 0.2) / 0.9);
        if (r <= 0 || r >= 1) return null;
        return <div key={i} style={{ position: 'absolute', left: 600 - r * 260, top: 300 - r * 260, width: r * 520, height: r * 520, borderRadius: '50%', border: `5px solid ${P.color}`, opacity: (1 - r) * 0.6 }} />;
      })}
    </div>
  );
};

/* ---------- beat 1b: giant Dynamic Island ---------- */
const BigIsland: React.FC<{ p: Lab2Props }> = ({ p }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const at = 1.5;
  if (t < at || t > L2.b4 + 0.3) return null;
  const e = sp(f, at, { damping: 11, stiffness: 140 });
  // beat 2: the island turns into a white ticket and drops
  const m = kf(f, [L2.b3 - 0.05, L2.b3 + 0.45], [0, 1], EASE.inOut);
  const P = PLACE[p.place];
  const sec = t < L2.b3 ? Math.max(0, t - at - 0.2) * 11 : 0;
  const W = lerp(220, 900, e);
  const H = lerp(70, 210, e);
  const y = lerp(420, 640, m);
  if (m >= 1) return null;
  return (
    <div style={{ position: 'absolute', left: 540 - W / 2, top: y, width: W, height: H, borderRadius: 110, background: '#000', boxShadow: '0 40px 80px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', padding: '0 34px', boxSizing: 'border-box', transform: `scale(${1 - m * 0.3})`, opacity: 1 - m, zIndex: 20 }}>
      <div style={{ opacity: clamp01((e - 0.5) * 3), display: 'flex', alignItems: 'center', gap: 26, width: '100%' }}>
        <IconTile kind={p.place} size={130} solid />
        <div style={{ flex: 1, fontFamily: FONT, color: '#fff', lineHeight: 1.1 }}>
          <div style={{ fontSize: 34, opacity: 0.6 }}>Arrivée détectée</div>
          <div style={{ fontSize: 50, fontWeight: 800 }}>{p.placeName}</div>
        </div>
        <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 84, color: P.color, fontVariantNumeric: 'tabular-nums' }}>{`0:${String(Math.floor(sec)).padStart(2, '0')}`}</div>
      </div>
    </div>
  );
};

/* ---------- beats 2-3: cards stacking ---------- */
const Ticket: React.FC<{ k: PlaceKind; label: string; minutes: number; at: number; y: number; rot: number; count?: boolean }> = ({ k, label, minutes, at, y, rot, count }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at - 0.02) return null;
  const e = jelly(f, at, 1.1);
  const fall = Math.min(1, e);
  const sq = e > 1 ? 1 + (e - 1) * 0.6 : 1;
  const cnt = count ? kf(f, [at + 0.1, at + 0.8], [0, 1], EASE.out) : 1;
  const P = PLACE[k];
  return (
    <div style={{ position: 'absolute', left: 110, right: 110, top: y, height: 170, borderRadius: 44, background: '#fff', boxShadow: '0 24px 60px rgba(50,40,90,0.16)', display: 'flex', alignItems: 'center', gap: 28, padding: '0 34px', boxSizing: 'border-box', transformOrigin: '50% 100%', transform: `translateY(${(1 - fall) * -700}px) rotate(${rot * fall}deg) scale(${1 / sq}, ${sq})`, opacity: clamp01(fall * 3) }}>
      <IconTile kind={k} size={104} solid />
      <div style={{ flex: 1, fontFamily: FONT, fontWeight: 700, fontSize: 46, color: INK }}>{label}</div>
      <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 60, color: INK, fontVariantNumeric: 'tabular-nums' }}>{fmt(minutes * cnt)}</div>
      <div style={{ width: 54, height: 54, borderRadius: 27, background: P.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, transform: `scale(${Math.max(0, jelly(f, at + 0.45))})` }}>✓</div>
    </div>
  );
};

const Stack: React.FC<{ p: Lab2Props }> = ({ p }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < L2.b3 - 0.1 || t > L2.b5 + 0.5) return null;
  const ex = kf(f, [L2.b5 - 0.15, L2.b5 + 0.4], [0, 1], EASE.in);
  // the stack slides up as new cards land on top
  const shift = kf(f, [L2.b4, L2.b4 + 1.2], [0, 1], EASE.inOut);
  return (
    <AbsoluteFill style={{ transform: `translateY(${shift * 120 - ex * 300}px) scale(${1 - ex * 0.2})`, opacity: 1 - ex }}>
      <Ticket k={p.place} label={p.placeName} minutes={p.minutes} at={L2.b3 + 0.2} y={1180} rot={-1.5} count />
      {p.others.map((o, i) => (
        <Ticket key={o.k} k={o.k} label={o.label} minutes={o.minutes} at={L2.b4 + 0.15 + i * 0.42} y={1180 - 200 * (i + 1)} rot={i % 2 ? -2 : 2} />
      ))}
    </AbsoluteFill>
  );
};

/* ---------- beat 4: week chart ---------- */
const Week: React.FC<{ p: Lab2Props }> = ({ p }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < L2.b5 - 0.1 || t > L2.b6 + 0.4) return null;
  const e = sp(f, L2.b5 + 0.1, { damping: 16, stiffness: 150 });
  const ex = kf(f, [L2.b6 - 0.2, L2.b6 + 0.3], [0, 1], EASE.in);
  const max = Math.max(...p.week.map((w) => w.minutes));
  const total = p.week.reduce((a, w) => a + w.minutes, 0);
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 560, borderRadius: 56, background: '#fff', boxShadow: '0 40px 100px rgba(50,40,90,0.16)', padding: '46px 46px 50px', boxSizing: 'border-box', transform: `translateY(${(1 - e) * 500 - ex * 1000}px) scale(${lerp(0.85, 1, e)})`, opacity: clamp01(e * 2) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 34 }}>
        <LogoIcon size={64} />
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color: INK }}>Ta semaine</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 28, color: '#8A8D93' }}>lun. → dim.</div>
      </div>
      {p.week.map((w, i) => {
        const at = L2.b5 + 0.35 + i * 0.22;
        const g = kf(f, [at, at + 0.9], [0, 1], EASE.out);
        const pop = jelly(f, at);
        const P = PLACE[w.k];
        return (
          <div key={w.k} style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 28 }}>
            <div style={{ transform: `scale(${Math.max(0, pop)})` }}>
              <IconTile kind={w.k} size={88} solid />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 32, fontWeight: 700, color: INK, marginBottom: 10 }}>
                <span>{w.label}</span>
                <span style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontVariantNumeric: 'tabular-nums' }}>{Math.round((w.minutes / total) * 100 * g)} %</span>
              </div>
              <div style={{ height: 30, borderRadius: 15, background: '#F0F0F4', overflow: 'hidden' }}>
                <div style={{ width: `${(w.minutes / max) * 100 * g}%`, height: '100%', borderRadius: 15, background: P.color }} />
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 16, fontFamily: FONT, color: '#6B6E75', fontSize: 30, fontWeight: 600, opacity: clamp01((t - L2.b5 - 1.4) / 0.3) }}>
        Le plus : <span style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 52, color: INK }}>{fmt(max)}</span> {p.week[0].label.toLowerCase() === 'maison' ? 'à la maison' : ''}
      </div>
    </div>
  );
};

/* ---------- beat 5: search field + keyboard ---------- */
const ROWS = ['azertyuiop', 'qsdfghjklm', 'wxcvbn'];
const Keyboard: React.FC<{ p: Lab2Props }> = ({ p }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < L2.b6 - 0.1 || t > L2.cta + 0.4) return null;
  const e = sp(f, L2.b6, { damping: 17, stiffness: 150 });
  const ex = kf(f, [L2.cta - 0.2, L2.cta + 0.3], [0, 1], EASE.in);
  const t0 = L2.b6 + 0.45;
  const step = 0.11;
  const n = Math.max(0, Math.min(p.typed.length, Math.floor((t - t0) / step) + 1));
  const typed = t < t0 ? '' : p.typed.slice(0, n);
  const curKey = t >= t0 && n <= p.typed.length && t - t0 - (n - 1) * step < 0.09 ? p.typed[n - 1]?.toLowerCase() : '';
  const doneAt = t0 + p.typed.length * step + 0.15;
  const added = jelly(f, doneAt + 0.25);
  const P = PLACE[p.typedKind];
  const kb = 1080 / 10 - 8;
  return (
    <AbsoluteFill style={{ opacity: 1 - ex, transform: `translateY(${ex * 200}px)` }}>
      {/* search field */}
      <div style={{ position: 'absolute', left: 80, right: 80, top: 560, height: 140, borderRadius: 70, background: '#fff', boxShadow: '0 24px 60px rgba(50,40,90,0.14)', display: 'flex', alignItems: 'center', gap: 22, padding: '0 40px', boxSizing: 'border-box', transform: `scale(${lerp(0.8, 1, e)})`, opacity: clamp01(e * 2) }}>
        <span style={{ fontSize: 50 }}>📍</span>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 56, color: typed ? INK : '#A9ACB2' }}>
          {typed || 'Nom du lieu'}
          {t > t0 && t < doneAt && <span style={{ display: 'inline-block', width: 4, height: 58, marginLeft: 4, background: '#6F7BF7', verticalAlign: 'middle', opacity: Math.sin(t * 18) > 0 ? 1 : 0 }} />}
        </span>
      </div>
      {/* result card */}
      {t > doneAt + 0.2 && (
        <div style={{ position: 'absolute', left: 140, right: 140, top: 740, height: 150, borderRadius: 40, background: '#fff', boxShadow: '0 24px 60px rgba(50,40,90,0.14)', display: 'flex', alignItems: 'center', gap: 24, padding: '0 30px', boxSizing: 'border-box', transform: `scale(${Math.max(0, added)})` }}>
          <IconTile kind={p.typedKind} size={96} solid />
          <div style={{ flex: 1, fontFamily: FONT, lineHeight: 1.1 }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: INK }}>{p.typed}</div>
            <div style={{ fontSize: 28, color: P.color, fontWeight: 700 }}>Lieu ajouté ✓</div>
          </div>
        </div>
      )}
      {/* keyboard */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 760, background: 'rgba(214,216,224,0.92)', borderRadius: '50px 50px 0 0', padding: '40px 10px 0', boxSizing: 'border-box', transform: `translateY(${(1 - e) * 800}px)` }}>
        {ROWS.map((r, ri) => (
          <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
            {r.split('').map((c) => {
              const down = c === curKey;
              return (
                <div key={c} style={{ position: 'relative', width: kb, height: 128, borderRadius: 18, background: down ? '#B8BBC4' : '#fff', boxShadow: down ? 'none' : '0 3px 0 rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 52, color: INK, transform: `translateY(${down ? 3 : 0}px)` }}>
                  {c}
                  {down && (
                    <div style={{ position: 'absolute', bottom: 80, left: -22, width: kb + 44, height: 170, borderRadius: 26, background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 84, fontWeight: 500 }}>{c}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <div style={{ width: 230, height: 128, borderRadius: 18, background: '#AEB1BA' }} />
          <div style={{ width: 520, height: 128, borderRadius: 18, background: '#fff', boxShadow: '0 3px 0 rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 38, color: '#6B6E75' }}>espace</div>
          <div style={{ width: 230, height: 128, borderRadius: 18, background: t > doneAt ? '#6F7BF7' : '#AEB1BA', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 36 }}>OK</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- CTA ---------- */
const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < L2.cta - 0.05) return null;
  const e = jelly(f, L2.cta + 0.05, 0.9);
  const b = jelly(f, L2.cta + 0.45);
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 640, transform: `scale(${Math.max(0, e)})`, filter: 'drop-shadow(0 30px 50px rgba(30,120,80,0.35))' }}>
        <LogoIcon size={280} />
      </div>
      <div style={{ position: 'absolute', top: 970, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 150, color: INK, letterSpacing: '-0.05em', opacity: clamp01((t - L2.cta - 0.15) / 0.2) }}>OùVa</div>
      <div style={{ position: 'absolute', top: 1180, display: 'flex', alignItems: 'center', gap: 18, padding: '22px 40px', borderRadius: 999, background: INK, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 44, transform: `scale(${Math.max(0, b)})` }}>
        Gratuit sur l’App Store
      </div>
    </AbsoluteFill>
  );
};

export const Lab2: React.FC<Lab2Props> = (p) => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <Bg />
    <MapCard p={p} />
    <Stack p={p} />
    <BigIsland p={p} />
    <Week p={p} />
    <Keyboard p={p} />
    <Cta />
    <Captions lines={p.lines} />
    {p.audio && <Audio src={staticFile(p.audio)} />}
  </AbsoluteFill>
);
