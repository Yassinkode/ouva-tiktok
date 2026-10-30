import React from 'react';
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, rand, sp } from '../lib';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { LogoIcon } from '../components/Icons';

/* « Lab » style: light pastel motion-design explainer (clean UI cards, pill captions, phone wall). */

const INK = '#111316';
const GREEN = '#22B573';
const ORANGE = '#E8743B';
const SCREENS = ['home_now', 'places_heatmap', 'day_map', 'place_stats', 'home_features', 'add_place'].map((s) => `screens/${s}.png`);

export type LabProps = {
  audio?: string;
  hook: [string, string, string]; // before, keyword, after
  s2: [string, string];
  s3: [string, string];
  s4: [string, string];
  s5: [string, string];
  place: PlaceKind; // detected place in the demo
  steps: [string, string][]; // checklist [title, sub]
  stat: { label: string; minutes: number; place: PlaceKind; delta: string };
  feed: { k: PlaceKind; text: string }[];
};

export const labDefault: LabProps = {
  audio: 'lab/sample.wav',
  hook: ["L'appli qui sait", 'où', 'passe ton temps.'],
  s2: ['Tu arrives', 'quelque part.'],
  s3: ['Elle fait', 'tout le boulot.'],
  s4: ['Et te montre', 'la vérité.'],
  s5: ['Chaque lieu.', 'Chaque minute.'],
  place: 'home',
  steps: [
    ['Arrivée détectée', 'Maison · 18:02'],
    ['Chrono lancé', 'dans la Dynamic Island'],
    ['Temps rangé', '+ 2 h 10 aujourd’hui'],
    ['Carte mise à jour', 'nouvelle case colorée'],
  ],
  stat: { label: 'au travail cette semaine', minutes: 31 * 60 + 20, place: 'work', delta: '+12 %' },
  feed: [
    { k: 'gym', text: 'Arrivé · Salle de sport' },
    { k: 'cafe', text: 'Parti · Café · 42 min' },
    { k: 'home', text: 'Arrivé · Maison' },
  ],
};

// timeline (s)
const T = { s2: 2.3, s3: 5.0, s4: 8.1, s5: 11.2, cta: 13.4, end: 15.5 };
export const LAB_DURATION = T.end;

const useF = () => useCurrentFrame();
const fmtHM = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return h ? `${h} h ${String(mm).padStart(2, '0')}` : `${mm} min`;
};

/* ---------- background ---------- */
const Bg: React.FC = () => {
  const t = useF() / FPS;
  return (
    <AbsoluteFill style={{ background: '#F3F1F6' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 45% at ${18 + Math.sin(t * 0.5) * 6}% ${30 + Math.cos(t * 0.4) * 5}%, #FBD3C2 0%, transparent 70%),
                       radial-gradient(60% 50% at ${85 + Math.cos(t * 0.45) * 5}% ${70 + Math.sin(t * 0.5) * 6}%, #D8D6FA 0%, transparent 70%),
                       radial-gradient(40% 30% at 70% 15%, #FFE9DC 0%, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------- caption pill: "before [› keyword]" ---------- */
const Pill: React.FC<{ pre: string; key_: string; at: number; out: number; y?: number; icon?: string }> = ({ pre, key_, at, out, y = 250, icon = '›' }) => {
  const f = useF();
  const t = f / FPS;
  if (t < at - 0.05 || t > out + 0.35) return null;
  const e = sp(f, at, { damping: 16, stiffness: 190 });
  const ex = kf(f, [out, out + 0.3], [0, 1], EASE.in);
  const words = pre.split(' ');
  const kw = sp(f, at + 0.08 + words.length * 0.05, { damping: 13, stiffness: 200 });
  return (
    <div style={{ position: 'absolute', top: y, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30, opacity: 1 - ex, transform: `translateY(${(1 - e) * 30 - ex * 30}px) scale(${lerp(0.92, 1, e)})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px 14px 30px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', boxShadow: '0 18px 50px rgba(60,40,90,0.14), 0 2px 6px rgba(0,0,0,0.06)', fontFamily: FONT_TIGHT, fontWeight: 750, fontSize: 50, color: INK, letterSpacing: '-0.025em' }}>
        {words.map((w, i) => {
          const we = clamp01((t - at - i * 0.05) / 0.22);
          return (
            <span key={i} style={{ opacity: we, filter: `blur(${(1 - we) * 8}px)` }}>
              {w}
            </span>
          );
        })}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 24px 10px 18px', borderRadius: 999, background: INK, color: '#fff', transform: `scale(${lerp(0.6, 1, kw)})`, opacity: clamp01(kw * 2) }}>
          <span style={{ fontSize: 34, opacity: 0.8 }}>{icon}</span>
          {key_}
        </span>
      </div>
    </div>
  );
};

/* ---------- a crisp iPhone ---------- */
const Phone: React.FC<{ src: string; w: number; style?: React.CSSProperties; children?: React.ReactNode; shadow?: boolean }> = ({ src, w, style, children, shadow = true }) => (
  <div style={{ position: 'absolute', width: w, height: w * 2.08, borderRadius: w * 0.155, padding: w * 0.026, background: 'linear-gradient(150deg,#2B2D31,#0D0E10 55%,#3A3C40)', boxShadow: shadow ? `0 ${w * 0.12}px ${w * 0.25}px rgba(40,30,70,0.28), 0 ${w * 0.02}px ${w * 0.05}px rgba(0,0,0,0.25)` : undefined, boxSizing: 'border-box', ...style }}>
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: w * 0.13, overflow: 'hidden', background: '#000' }}>
      <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {children}
    </div>
  </div>
);

/* ---------- scene 1: tilted wall of phones + headline ---------- */
const Wall: React.FC<{ hook: LabProps['hook'] }> = ({ hook }) => {
  const f = useF();
  const t = f / FPS;
  if (t > T.s2 + 0.5) return null;
  const ex = kf(f, [T.s2 - 0.15, T.s2 + 0.35], [0, 1], EASE.inOut);
  const cols = 6;
  const rows = 6;
  const w = 250;
  const gap = 34;
  const drift = t * 38;
  return (
    <AbsoluteFill style={{ opacity: 1 - ex, transform: `scale(${1 + ex * 0.25})` }}>
      <AbsoluteFill style={{ perspective: 2600 }}>
        <div style={{ position: 'absolute', left: 540, top: 960, width: 0, height: 0, transform: `rotateX(38deg) rotateZ(-24deg) translate(${-drift * 0.4}px, ${-drift}px) scale(${kf(f, [0, 2.3], [1.12, 1.0], EASE.out)})`, transformStyle: 'preserve-3d' }}>
          {Array.from({ length: cols * rows }).map((_, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = (c - cols / 2) * (w + gap) + (r % 2) * 40;
            const y = (r - rows / 2) * (w * 2.08 + gap) + (c % 2 ? 120 : 0);
            const d = Math.hypot(c - cols / 2, r - rows / 2);
            const e = sp(f, 0.02 + d * 0.05, { damping: 18, stiffness: 140 });
            return <Phone key={i} src={SCREENS[(i * 5 + r) % SCREENS.length]} w={w} shadow={false} style={{ left: x, top: y, opacity: clamp01(e * 1.5), transform: `translateZ(${(1 - e) * 300}px)`, boxShadow: '0 30px 60px rgba(40,30,70,0.25)' }} />;
          })}
        </div>
      </AbsoluteFill>
      {/* soft veil to keep the headline readable */}
      <AbsoluteFill style={{ background: 'radial-gradient(85% 26% at 50% 50%, rgba(243,241,246,0.96) 0%, rgba(243,241,246,0.75) 55%, rgba(243,241,246,0.15) 100%)' }} />
      <Headline hook={hook} />
    </AbsoluteFill>
  );
};

const Headline: React.FC<{ hook: LabProps['hook'] }> = ({ hook }) => {
  const f = useF();
  const t = f / FPS;
  const [a, k, b] = hook;
  const all = [...a.split(' ').map((w) => ({ w, kw: false })), { w: k, kw: true }, ...b.split(' ').map((w) => ({ w, kw: false }))];
  return (
    <div style={{ position: 'absolute', top: 820, left: 70, right: 70, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '6px 22px', fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 104, lineHeight: 1.08, color: INK, letterSpacing: '-0.045em', textShadow: '0 0 40px rgba(255,255,255,0.9)' }}>
      {all.map((x, i) => {
        const we = clamp01((t - 0.1 - i * 0.07) / 0.25);
        if (x.kw) {
          const e = sp(f, 0.1 + i * 0.07, { damping: 11, stiffness: 190 });
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '0 34px 8px 24px', borderRadius: 999, background: INK, color: '#fff', textShadow: 'none', transform: `scale(${lerp(0.5, 1, e)}) rotate(${(1 - e) * -6}deg)`, opacity: clamp01(e * 2) }}>
              <span style={{ fontSize: 70 }}>📍</span>
              {x.w}
            </span>
          );
        }
        return (
          <span key={i} style={{ opacity: we, filter: `blur(${(1 - we) * 10}px)`, transform: `translateY(${(1 - we) * 20}px)` }}>
            {x.w}
          </span>
        );
      })}
    </div>
  );
};

/* ---------- scene 2: the phone, Dynamic Island wakes up ---------- */
const Island: React.FC<{ at: number; place: PlaceKind; pw: number }> = ({ at, place, pw }) => {
  const k = pw / 560;
  const f = useF();
  const t = f / FPS;
  const e = sp(f, at, { damping: 13, stiffness: 150 });
  const sec = Math.max(0, t - at) * 9;
  const P = PLACE[place];
  const W = lerp(150, 500, e) * k;
  return (
    <div style={{ position: 'absolute', left: '50%', top: 14 * k, width: W, marginLeft: -W / 2, height: lerp(44, 112, e) * k, borderRadius: 60 * k, background: '#000', display: 'flex', alignItems: 'center', padding: `0 ${18 * k}px`, boxSizing: 'border-box', zIndex: 3, border: `2px solid ${t > at ? P.color + '66' : 'transparent'}` }}>
      <div style={{ opacity: clamp01((e - 0.55) * 3), display: 'flex', alignItems: 'center', gap: 12 * k, width: '100%' }}>
        <IconTile kind={place} size={60 * k} solid />
        <div style={{ flex: 1, fontFamily: FONT, color: '#fff', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 20 * k, opacity: 0.65 }}>Arrivée détectée</div>
          <div style={{ fontSize: 28 * k, fontWeight: 700 }}>{P.name}</div>
        </div>
        <div style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 38 * k, color: P.color, fontVariantNumeric: 'tabular-nums' }}>{`0:${String(Math.floor(sec)).padStart(2, '0')}`}</div>
      </div>
    </div>
  );
};

const HeroPhone: React.FC<{ p: LabProps }> = ({ p }) => {
  const f = useF();
  const t = f / FPS;
  if (t < T.s2 - 0.2 || t > T.s4 + 0.6) return null;
  const e = sp(f, T.s2 - 0.1, { damping: 16, stiffness: 110 });
  // scene 3: phone slides right and shrinks to make room for the checklist window
  const m = kf(f, [T.s3 - 0.1, T.s3 + 0.5], [0, 1], EASE.inOut);
  const ex = kf(f, [T.s4 - 0.15, T.s4 + 0.4], [0, 1], EASE.in);
  const w = lerp(560, 420, m);
  const cx = lerp(540, 770, m) + ex * 700;
  const cy = lerp(1130, 1180, m);
  const ry = lerp(-14, -8, m) + Math.sin(t * 0.8) * 3;
  const rz = lerp(3, 4, m);
  return (
    <AbsoluteFill style={{ perspective: 2200 }}>
      <Phone src={SCREENS[0]} w={w} style={{ left: cx - w / 2, top: cy - (w * 2.08) / 2 + (1 - e) * 1200, transform: `rotateY(${ry}deg) rotateZ(${rz * (1 - e) + rz}deg)` }}>
        <Island at={T.s2 + 0.55} place={p.place} pw={w * 0.948} />
      </Phone>
      {/* ripple where the place is "detected" */}
      {[0, 1, 2].map((i) => {
        const r = clamp01((t - T.s2 - 0.55 - i * 0.25) / 1.1);
        if (r <= 0 || r >= 1 || m > 0.2) return null;
        return <div key={i} style={{ position: 'absolute', left: 540 - r * 420, top: 520 - r * 420, width: r * 840, height: r * 840, borderRadius: '50%', border: `4px solid ${PLACE[p.place].color}`, opacity: (1 - r) * 0.5 }} />;
      })}
    </AbsoluteFill>
  );
};

/* ---------- scene 3: dark "live" window with a checklist ticking ---------- */
const Checklist: React.FC<{ p: LabProps }> = ({ p }) => {
  const f = useF();
  const t = f / FPS;
  if (t < T.s3 - 0.1 || t > T.s4 + 0.5) return null;
  const e = sp(f, T.s3 + 0.05, { damping: 16, stiffness: 150 });
  const ex = kf(f, [T.s4 - 0.2, T.s4 + 0.3], [0, 1], EASE.in);
  return (
    <div style={{ position: 'absolute', left: 40, top: 640, width: 530, borderRadius: 34, background: '#1B1C1F', boxShadow: '0 40px 90px rgba(40,30,70,0.35)', padding: '26px 28px 30px', boxSizing: 'border-box', transform: `translateX(${(1 - e) * -700 - ex * 800}px) rotate(${lerp(-4, -1.5, e)}deg)`, zIndex: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
        ))}
        <div style={{ flex: 1 }} />
        <LogoIcon size={30} />
        <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 24, color: 'rgba(255,255,255,0.75)' }}>OùVa · en direct</span>
      </div>
      {p.steps.map(([title, sub], i) => {
        const at = T.s3 + 0.45 + i * 0.55;
        const done = t >= at + 0.35;
        const re = sp(f, at, { damping: 15, stiffness: 200 });
        const ck = sp(f, at + 0.35, { damping: 10, stiffness: 260 });
        if (t < at) return null;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 18, padding: '16px 0', borderTop: i ? '1px solid rgba(255,255,255,0.07)' : undefined, opacity: clamp01(re * 2), transform: `translateY(${(1 - re) * 16}px)` }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, background: done ? GREEN : 'transparent', border: done ? 'none' : `3px solid ${ORANGE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${done ? ck : 1}) rotate(${done ? 0 : t * 360}deg)`, borderTopColor: done ? undefined : 'transparent', boxSizing: 'border-box' }}>
              {done && <span style={{ color: '#fff', fontSize: 26, fontWeight: 900, fontFamily: FONT }}>✓</span>}
            </div>
            <div style={{ fontFamily: FONT, lineHeight: 1.15 }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#fff' }}>{title}</div>
              <div style={{ fontSize: 25, fontWeight: 600, color: ORANGE, marginTop: 4 }}>{sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- scene 4: white stats card, number counts, line draws ---------- */
const StatCard: React.FC<{ p: LabProps }> = ({ p }) => {
  const f = useF();
  const t = f / FPS;
  if (t < T.s4 - 0.1 || t > T.s5 + 0.5) return null;
  const e = sp(f, T.s4 + 0.05, { damping: 17, stiffness: 140 });
  const ex = kf(f, [T.s5 - 0.2, T.s5 + 0.35], [0, 1], EASE.in);
  const cnt = kf(f, [T.s4 + 0.3, T.s4 + 1.9], [0, 1], EASE.out);
  const draw = kf(f, [T.s4 + 0.3, T.s4 + 2.2], [0, 1], EASE.soft);
  const P = PLACE[p.stat.place];
  // chart path
  const pts = [0.08, 0.14, 0.12, 0.28, 0.33, 0.52, 0.47, 0.7, 0.86];
  const CW = 860;
  const CH = 300;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * CW, CH - v * CH] as const);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const len = 1400;
  const idx = draw * (pts.length - 1);
  const i0 = Math.floor(idx);
  const fr = idx - i0;
  const a = xy[Math.min(i0, xy.length - 1)];
  const b = xy[Math.min(i0 + 1, xy.length - 1)];
  const dot = [lerp(a[0], b[0], fr), lerp(a[1], b[1], fr)];
  const days = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
  return (
    <div style={{ position: 'absolute', left: 50, right: 50, top: 560, borderRadius: 40, background: '#fff', boxShadow: '0 40px 100px rgba(40,30,70,0.18)', padding: 40, boxSizing: 'border-box', transform: `translateY(${(1 - e) * 900 + ex * -1200}px) scale(${lerp(0.9, 1, e)})`, zIndex: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <LogoIcon size={70} />
        <div style={{ fontFamily: FONT, lineHeight: 1.1 }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: INK }}>OùVa</div>
          <div style={{ fontSize: 22, color: '#8A8D93' }}>Ta semaine · iPhone</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 999, border: '1.5px solid #ECECEF', fontFamily: FONT, fontWeight: 600, fontSize: 22, color: INK }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#FF3B30', opacity: 0.5 + 0.5 * Math.abs(Math.sin(t * 4)) }} />
          En direct
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: 34 }}>
        <IconTile kind={p.stat.place} size={84} solid />
        <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 132, color: INK, letterSpacing: '-0.05em', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>{fmtHM(p.stat.minutes * cnt)}</div>
        <div style={{ marginBottom: 14, padding: '6px 14px', borderRadius: 12, background: '#FFE9E2', color: '#E5533D', fontFamily: FONT, fontWeight: 700, fontSize: 24, opacity: clamp01((t - T.s4 - 1.6) / 0.3) }}>{p.stat.delta}</div>
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 30, color: '#6B6E75', marginTop: 10 }}>{p.stat.label}</div>
      <svg width={CW} height={CH + 60} style={{ marginTop: 30, overflow: 'visible' }}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={CW} y1={CH * g} y2={CH * g} stroke="#EEEEF2" strokeDasharray="6 8" strokeWidth={2} />
        ))}
        <defs>
          <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={P.color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={P.color} stopOpacity={0} />
          </linearGradient>
          <clipPath id="cp">
            <rect x={0} y={-20} width={dot[0]} height={CH + 40} />
          </clipPath>
        </defs>
        <path d={`${d} L${CW},${CH} L0,${CH} Z`} fill="url(#lg)" clipPath="url(#cp)" />
        <path d={d} fill="none" stroke={P.color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        <circle cx={dot[0]} cy={dot[1]} r={26} fill={P.color} opacity={0.18 + 0.1 * Math.sin(t * 8)} />
        <circle cx={dot[0]} cy={dot[1]} r={12} fill="#fff" stroke={P.color} strokeWidth={6} />
        {days.map((dd, i) => (
          <text key={dd} x={(i / 6) * CW} y={CH + 50} fontFamily="ui-monospace, Menlo, monospace" fontSize={22} fill="#A0A3A9" textAnchor="middle">
            {dd}
          </text>
        ))}
      </svg>
      {/* live feed */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {p.feed.map((it, i) => {
          const at = T.s4 + 0.9 + i * 0.5;
          const fe = sp(f, at, { damping: 14, stiffness: 200 });
          if (t < at) return null;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 20, border: '1.5px solid #EFEFF2', boxShadow: '0 6px 18px rgba(0,0,0,0.04)', transform: `translateX(${(1 - fe) * 120}px)`, opacity: clamp01(fe * 2) }}>
              <IconTile kind={it.k} size={50} solid />
              <div style={{ flex: 1, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: INK }}>{it.text}</div>
              <div style={{ fontFamily: FONT, fontSize: 22, color: '#9A9DA3' }}>à l'instant</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- scene 5: rows of real screens sliding ---------- */
const Rows: React.FC = () => {
  const f = useF();
  const t = f / FPS;
  if (t < T.s5 - 0.2 || t > T.cta + 0.6) return null;
  const e = kf(f, [T.s5 - 0.1, T.s5 + 0.6], [0, 1], EASE.out);
  const ex = kf(f, [T.cta - 0.15, T.cta + 0.45], [0, 1], EASE.inOut);
  const w = 300;
  const row = (dir: number, y: number, seed: number) => (
    <div style={{ position: 'absolute', top: y, left: 0, height: w * 2.08 }}>
      {Array.from({ length: 9 }).map((_, i) => {
        const x = -200 + i * (w + 34) + dir * (t - T.s5) * 160 + dir * (1 - e) * 900;
        return <Phone key={i} src={SCREENS[(i + seed) % SCREENS.length]} w={w} style={{ left: x, top: 0 }} />;
      })}
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - ex, filter: `blur(${ex * 12}px)`, transform: `rotate(-6deg) scale(${1.08 + ex * 0.1})` }}>
      {row(-1, 380, 0)}
      {row(1, 1100, 3)}
    </AbsoluteFill>
  );
};

/* ---------- CTA ---------- */
const Cta: React.FC = () => {
  const f = useF();
  const t = f / FPS;
  if (t < T.cta - 0.05) return null;
  const e = sp(f, T.cta + 0.1, { damping: 12, stiffness: 150 });
  const b = sp(f, T.cta + 0.5, { damping: 12, stiffness: 170 });
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 560, transform: `scale(${lerp(0.4, 1, e)}) rotate(${(1 - e) * -10}deg)`, opacity: clamp01(e * 2), filter: 'drop-shadow(0 30px 50px rgba(30,120,80,0.35))' }}>
        <LogoIcon size={250} />
      </div>
      <div style={{ position: 'absolute', top: 870, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 140, color: INK, letterSpacing: '-0.05em', opacity: clamp01((t - T.cta - 0.2) / 0.25) }}>OùVa</div>
      <div style={{ position: 'absolute', top: 1070, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 30px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', boxShadow: '0 18px 50px rgba(60,40,90,0.14)', fontFamily: FONT_TIGHT, fontWeight: 750, fontSize: 46, color: INK, transform: `scale(${Math.max(0, b)})` }}>
        Tape
        <span style={{ padding: '6px 24px 8px', borderRadius: 999, background: INK, color: '#fff' }}>OùVa</span>
        sur l'App Store
      </div>
      <div style={{ position: 'absolute', top: 1200, fontFamily: FONT, fontWeight: 600, fontSize: 34, color: '#6B6E75', opacity: clamp01((t - T.cta - 0.8) / 0.3) }}>Gratuit · iPhone</div>
    </AbsoluteFill>
  );
};

/* ---------- composition ---------- */
export const Lab: React.FC<LabProps> = (p) => {
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Bg />
      <Wall hook={p.hook} />
      <Rows />
      <HeroPhone p={p} />
      <Checklist p={p} />
      <StatCard p={p} />
      <Cta />
      <Pill pre={p.s2[0]} key_={p.s2[1]} at={T.s2 + 0.1} out={T.s3 - 0.15} />
      <Pill pre={p.s3[0]} key_={p.s3[1]} at={T.s3 + 0.05} out={T.s4 - 0.15} />
      <Pill pre={p.s4[0]} key_={p.s4[1]} at={T.s4 + 0.05} out={T.s5 - 0.15} y={300} />
      <Pill pre={p.s5[0]} key_={p.s5[1]} at={T.s5 + 0.1} out={T.cta - 0.15} y={880} />
      {p.audio && <Audio src={staticFile(p.audio)} />}
    </AbsoluteFill>
  );
};

/** timing exposed for the sound design */
export const LAB_TIMES = { ...T, checks: [0, 1, 2, 3].map((i) => T.s3 + 0.45 + i * 0.55 + 0.35), feed: [0, 1, 2].map((i) => T.s4 + 0.9 + i * 0.5), island: T.s2 + 0.55 };
export const _unused = rand;
