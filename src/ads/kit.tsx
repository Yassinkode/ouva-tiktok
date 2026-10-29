import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, sp } from '../lib';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { LogoIcon } from '../components/Icons';

/* Building blocks for the paid-ads videos (made for silent autoplay: bold readable text, product shown early). */

export const MINT = '#52DFAF';
export const INK = '#07110D';
export const useT = () => useCurrentFrame() / FPS;
export const vf = () => useCurrentFrame();

/** soft moving gradient background */
export const GradientBG: React.FC<{ a: string; b: string; c?: string; dark?: boolean }> = ({ a, b, c, dark }) => {
  const t = useT();
  const x1 = 30 + Math.sin(t * 0.7) * 18;
  const y1 = 25 + Math.cos(t * 0.6) * 12;
  const x2 = 70 + Math.cos(t * 0.5) * 18;
  const y2 = 75 + Math.sin(t * 0.8) * 10;
  return (
    <AbsoluteFill style={{ background: dark ? '#050807' : b }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 45% at ${x1}% ${y1}%, ${a} 0%, transparent 70%), radial-gradient(70% 50% at ${x2}% ${y2}%, ${c ?? a} 0%, transparent 70%)`, opacity: dark ? 0.55 : 0.9 }} />
    </AbsoluteFill>
  );
};

/** words slide up from a mask, one after the other */
export const Title: React.FC<{
  text: string;
  at: number;
  out?: number;
  size?: number;
  color?: string;
  hi?: string[]; // words drawn inside a mint pill
  hiColor?: string;
  top: number;
  align?: 'center' | 'left';
  step?: number;
  weight?: number;
}> = ({ text, at, out, size = 110, color = '#fff', hi = [], hiColor = MINT, top, align = 'center', step = 0.06, weight = 850 }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at - 0.02 || (out !== undefined && t > out + 0.4)) return null;
  const lines = text.split('\n');
  let k = 0;
  const exit = out !== undefined ? kf(f, [out, out + 0.3], [0, 1], EASE.in) : 0;
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top, textAlign: align, fontFamily: FONT_TIGHT, fontWeight: weight, fontSize: size, lineHeight: 1.02, letterSpacing: '-0.04em', color, transform: `translateY(${-exit * 60}px)`, opacity: 1 - exit }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.26}px` }}>
          {line.split(' ').map((w, wi) => {
            const e = sp(f, at + k++ * step, { damping: 16, stiffness: 200 });
            const isHi = hi.includes(w.replace(/[.,!?…]/g, ''));
            return (
              <span key={wi} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.08 }}>
                <span
                  style={{
                    display: 'inline-block',
                    transform: `translateY(${(1 - e) * 110}%) rotate(${(1 - e) * 6}deg)`,
                    ...(isHi ? { background: hiColor, color: INK, padding: `0 ${size * 0.14}px`, borderRadius: size * 0.2 } : {}),
                  }}
                >
                  {w}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** iPhone with a real app screen (crisp CSS 3D), optional screen change */
export const AdPhone: React.FC<{
  screens: { src: string; at: number }[];
  enter: number;
  exit?: number;
  cx?: number;
  cy?: number;
  w?: number;
  rot?: number;
  children?: React.ReactNode;
}> = ({ screens, enter, exit, cx = 540, cy = 1130, w = 560, rot = 0, children }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < enter - 0.05 || (exit !== undefined && t > exit + 0.5)) return null;
  const h = w * 2.07;
  const e = sp(f, enter, { damping: 15, stiffness: 120 });
  const ex = exit !== undefined ? kf(f, [exit, exit + 0.4], [0, 1], EASE.in) : 0;
  const ry = lerp(-28, -8, e) + rot + Math.sin(t * 0.9) * 3;
  const rx = lerp(18, 6, e) + Math.cos(t * 0.7) * 1.5;
  const ty = lerp(900, 0, e) + ex * 1200 + Math.sin(t * 1.2) * 8;
  let cur = 0;
  screens.forEach((s, i) => {
    if (t >= s.at) cur = i;
  });
  const swap = screens[cur] ? sp(f, screens[cur].at, { damping: 18, stiffness: 160 }) : 1;
  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      <div style={{ position: 'absolute', left: cx - w / 2, top: cy - h / 2 + ty, width: w, height: h, transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${lerp(0.85, 1, e)})`, transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: w * 0.16, background: 'linear-gradient(140deg, #9AA0A5 0%, #3B3F43 30%, #1C1E20 60%, #6B7075 100%)', boxShadow: '0 60px 120px rgba(0,0,0,0.45), 0 20px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ position: 'absolute', inset: w * 0.028, borderRadius: w * 0.14, overflow: 'hidden', background: '#000' }}>
            {screens.map((s, i) =>
              i === cur || i === cur - 1 ? (
                <Img
                  key={i}
                  src={staticFile(s.src)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: i === cur && cur > 0 ? `translateX(${(1 - swap) * 100}%)` : i === cur - 1 ? `translateX(${-swap * 30}%)` : undefined, opacity: i === cur - 1 ? 1 - swap * 0.6 : 1 }}
                />
              ) : null,
            )}
            <div style={{ position: 'absolute', top: w * 0.03, left: '50%', width: w * 0.27, height: w * 0.075, marginLeft: -w * 0.135, borderRadius: 99, background: '#000' }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${115 + ry}deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.10) 48%, rgba(255,255,255,0) 60%)` }} />
          </div>
        </div>
        {children}
      </div>
    </AbsoluteFill>
  );
};

const fmt = (min: number) => {
  const m = Math.floor(min);
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
};

/** floating place card with a live timer */
export const PlaceChip: React.FC<{ k: PlaceKind; at: number; x: number; y: number; base: number; rate?: number; out?: number; label?: string; dark?: boolean }> = ({ k, at, x, y, base, rate = 4, out, label, dark = true }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at - 0.02 || (out !== undefined && t > out + 0.4)) return null;
  const e = sp(f, at, { damping: 12, stiffness: 190 });
  const ex = out !== undefined ? kf(f, [out, out + 0.25], [0, 1], EASE.in) : 0;
  const P = PLACE[k];
  return (
    <div style={{ position: 'absolute', left: x, top: y + Math.sin(t * 1.5 + x) * 8, transform: `scale(${Math.max(0, e) * (1 - ex)})`, transformOrigin: '50% 50%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px 16px 16px', borderRadius: 30, background: dark ? '#0E1311' : '#fff', border: `3px solid ${P.color}`, boxShadow: `0 20px 50px ${P.color}55, 0 8px 18px rgba(0,0,0,0.25)`, zIndex: 5 }}>
      <IconTile kind={k} size={72} solid />
      <div style={{ fontFamily: FONT, lineHeight: 1.05 }}>
        <div style={{ fontSize: 27, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.7)' : '#5D6662' }}>{label ?? P.name}</div>
        <div style={{ fontFamily: FONT_TIGHT, fontSize: 46, fontWeight: 850, color: dark ? '#fff' : INK, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{fmt(base + Math.max(0, t - at) * rate)}</div>
      </div>
    </div>
  );
};

/** final call to action */
export const CTA: React.FC<{ at: number; sub?: string }> = ({ at, sub = 'Le suivi du temps, lieu par lieu.' }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at - 0.02) return null;
  const logo = sp(f, at, { damping: 10, stiffness: 160 });
  const btn = sp(f, at + 0.45, { damping: 11, stiffness: 170 });
  const pulse = 1 + Math.max(0, Math.sin((t - at - 1) * 5)) * 0.04;
  return (
    <AbsoluteFill style={{ alignItems: 'center', zIndex: 20 }}>
      <AbsoluteFill style={{ background: 'radial-gradient(90% 60% at 50% 40%, #12382A 0%, #050807 70%)', opacity: clamp01((t - at) / 0.2) }} />
      <div style={{ position: 'absolute', top: 430, transform: `scale(${lerp(0.4, 1, logo)}) rotate(${(1 - logo) * -12}deg)`, opacity: clamp01(logo * 2), filter: 'drop-shadow(0 30px 60px rgba(82,223,175,0.35))' }}>
        <LogoIcon size={280} />
      </div>
      <div style={{ position: 'absolute', top: 760, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 150, color: '#fff', letterSpacing: '-0.05em', opacity: clamp01((t - at - 0.15) / 0.2) }}>OùVa</div>
      <div style={{ position: 'absolute', top: 950, left: 80, right: 80, textAlign: 'center', fontFamily: FONT, fontWeight: 600, fontSize: 46, color: 'rgba(255,255,255,0.8)', opacity: clamp01((t - at - 0.3) / 0.2) }}>{sub}</div>
      <div style={{ position: 'absolute', top: 1090, padding: '30px 64px', borderRadius: 999, background: MINT, color: INK, fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 52, transform: `scale(${Math.max(0, btn) * pulse})`, boxShadow: '0 20px 60px rgba(82,223,175,0.45)' }}>Télécharger gratuitement</div>
      <div style={{ position: 'absolute', top: 1250, fontFamily: FONT, fontWeight: 600, fontSize: 36, color: 'rgba(255,255,255,0.65)', opacity: clamp01((t - at - 0.7) / 0.3) }}>Sur l’App Store · iPhone</div>
    </AbsoluteFill>
  );
};

/** quick white flash used on hard cuts */
export const Flash: React.FC<{ times: number[] }> = ({ times }) => {
  const t = useT();
  const v = times.reduce((m, c) => Math.max(m, t >= c - 0.02 && t < c + 0.14 ? 1 - (t - c + 0.02) / 0.16 : 0), 0);
  return v > 0 ? <AbsoluteFill style={{ background: '#fff', opacity: v * 0.55, zIndex: 30 }} /> : null;
};

/** small "illustrative values" mention */
export const Note: React.FC<{ text: string; show: boolean }> = ({ text, show }) =>
  show ? <div style={{ position: 'absolute', bottom: 330, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 25 }}><span style={{ fontFamily: FONT, fontSize: 24, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 99 }}>{text}</span></div> : null;
