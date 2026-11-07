import React from 'react';
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, sp } from '../lib';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { LogoIcon } from '../components/Icons';

/* Story video in the flat-illustration night style: a character (Lucas), one idea per shot, big two-tone captions. */

const MINT = '#3DDC97';
const BG1 = '#0A1C1F';
const BG2 = '#103230';
const SKIN = '#C88B5F';

export type Word = { w: string; s: number; e: number };
export type Cue = { id: string; at: number };
export type Lucas2Props = { audio: string; words: Word[]; cues: Cue[]; pins: number[]; hi: string[]; end: number };

const useT = () => useCurrentFrame() / FPS;
const jelly = (f: number, at: number, k = 1) => sp(f, at, { damping: 8, stiffness: 190 * k, mass: 0.8 });

/* ---------------- character ---------------- */
type Pose = { walk?: number; armL?: number; armR?: number; head?: number; bag?: boolean; facepalm?: number; arms?: number };
export const Guy: React.FC<{ x: number; y: number; s: number; pose?: Pose; flip?: boolean }> = ({ x, y, s, pose = {}, flip }) => {
  const w = pose.walk ?? 0; // phase in radians, 0 = standing
  const walking = pose.walk !== undefined;
  const legA = walking ? Math.sin(w) * 24 : 0;
  const bob = walking ? Math.abs(Math.cos(w)) * -6 : 0;
  const aL = pose.armL ?? (walking ? -Math.sin(w) * 22 : 6);
  const aR = pose.armR ?? (walking ? Math.sin(w) * 22 : -6);
  const fp = pose.facepalm ?? 0;
  const up = pose.arms ?? 0;
  return (
    <svg x={0} y={0} width={400 * s} height={760 * s} viewBox="-200 -40 400 760" style={{ position: 'absolute', left: x - 200 * s, top: y - 720 * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined }}>
      <ellipse cx={0} cy={705} rx={95} ry={16} fill="rgba(0,0,0,0.35)" />
      <g transform={`translate(0 ${bob})`}>
        {/* legs */}
        {[legA, -legA].map((a, i) => (
          <g key={i} transform={`rotate(${a} ${i ? 18 : -18} 420)`}>
            <rect x={(i ? 18 : -18) - 24} y={410} width={48} height={250} rx={22} fill="#1E2A44" />
            <rect x={(i ? 18 : -18) - 30} y={640} width={74} height={38} rx={19} fill="#F4F4F2" />
          </g>
        ))}
        {/* back arm */}
        <g transform={`rotate(${lerp(aR, -150, up)} 62 175)`}>
          <rect x={44} y={165} width={44} height={210} rx={22} fill="#E9E6DF" />
          <circle cx={66} cy={378} r={20} fill={SKIN} />
        </g>
        {/* hoodie body */}
        <path d="M-92 170 Q-100 150 -70 140 L70 140 Q100 150 92 170 L100 430 Q100 452 78 452 L-78 452 Q-100 452 -100 430 Z" fill="#F2EFE8" />
        <rect x={-58} y={330} width={116} height={64} rx={20} fill="#E2DED5" />
        <path d="M-40 140 Q0 190 40 140" stroke="#DCD7CC" strokeWidth={10} fill="none" />
        {/* bag */}
        {pose.bag && (
          <g>
            <path d="M60 240 Q120 230 130 330" stroke="#1B1B1B" strokeWidth={10} fill="none" />
            <rect x={95} y={320} width={110} height={80} rx={20} fill={PLACE.gym.color} />
          </g>
        )}
        {/* neck + head */}
        <rect x={-20} y={100} width={40} height={50} rx={14} fill={SKIN} />
        <g transform={`rotate(${pose.head ?? 0} 0 100)`}>
          <ellipse cx={0} cy={45} rx={66} ry={74} fill={SKIN} />
          <path d="M-68 30 Q-66 -38 0 -36 Q66 -38 68 26 Q40 0 -10 8 Q-50 12 -68 30 Z" fill="#1C1410" />
          <ellipse cx={-62} cy={52} rx={12} ry={18} fill="#B57A50" />
        </g>
        {/* front arm (can facepalm) */}
        <g transform={`rotate(${lerp(lerp(aL, 150, up), -155, fp)} -62 175)`}>
          <rect x={-88} y={165} width={44} height={210} rx={22} fill="#F7F5F0" />
          <circle cx={-66} cy={378} r={20} fill={SKIN} />
        </g>
      </g>
    </svg>
  );
};

/* ---------------- background ---------------- */
const Night: React.FC<{ glow?: string }> = ({ glow = MINT }) => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${BG1} 0%, ${BG2} 70%, #143A35 100%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 35% at 50% ${42 + Math.sin(t * 0.6) * 2}%, ${glow}22 0%, transparent 70%)` }} />
      {[...Array(26)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', left: (i * 397) % 1080, top: (i * 263) % 900, width: 4, height: 4, borderRadius: 2, background: '#fff', opacity: 0.15 + 0.25 * Math.abs(Math.sin(t * 1.3 + i)) }} />
      ))}
    </AbsoluteFill>
  );
};

/* ---------------- scenes ---------------- */
type SP = { at: number; out: number };
const useScene = ({ at, out }: SP) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const on = t >= at - 0.02 && t < out + 0.02;
  const e = sp(f, at, { damping: 17, stiffness: 170 });
  const zoom = kf(f, [at, out], [1, 1.06], (x: number) => x);
  return { f, t, on, e, zoom, lt: t - at };
};

const Ring: React.FC<{ cx: number; cy: number; r: number; at: number; color?: string }> = ({ cx, cy, r, at, color = MINT }) => {
  const f = useCurrentFrame();
  const e = sp(f, at, { damping: 14, stiffness: 120 });
  return <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: 2 * r, height: 2 * r, borderRadius: '50%', border: `10px solid ${color}`, boxShadow: `0 0 60px ${color}66, inset 0 0 60px ${color}33`, transform: `scale(${e})`, opacity: clamp01(e) }} />;
};

const SceneIntro: React.FC<SP> = (p) => {
  const { f, on, zoom } = useScene(p);
  if (!on) return null;
  const tag = jelly(f, p.at + 0.35);
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <Ring cx={540} cy={720} r={360} at={p.at} />
      <Guy x={540} y={1060} s={0.95} pose={{ armL: 10, armR: -10 }} />
      <div style={{ position: 'absolute', left: 600, top: 330, padding: '14px 34px', borderRadius: 16, background: MINT, color: BG1, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 64, transform: `rotate(-10deg) scale(${Math.max(0, tag)})`, boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}>Lucas</div>
    </AbsoluteFill>
  );
};

const SceneEvenings: React.FC<SP> = (p) => {
  const { f, t, on, e, zoom } = useScene(p);
  if (!on) return null;
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      {/* window with the moon */}
      <div style={{ position: 'absolute', left: 140, top: 250, width: 800, height: 700, borderRadius: 40, background: '#F6F3EC', padding: 34, boxSizing: 'border-box', transform: `translateY(${(1 - e) * 300}px)`, opacity: clamp01(e * 2), boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 56, color: BG1, marginBottom: 20 }}>Novembre</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 14 }}>
          {[...Array(28)].map((_, i) => {
            const at = p.at + 0.2 + i * 0.035;
            const q = jelly(f, at);
            return (
              <div key={i} style={{ height: 112, borderRadius: 18, background: '#E6E2D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 52, color: '#E86A5B' }}>
                <span style={{ transform: `scale(${t > at ? Math.max(0, q) : 0})` }}>?</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneQuestion: React.FC<SP> = (p) => {
  const { f, t, on, zoom } = useScene(p);
  if (!on) return null;
  const hand = kf(f, [p.at, p.at + 0.6], [0, 1], EASE.out);
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom * 1.25}) translateY(120px)` }}>
      {/* clock */}
      <div style={{ position: 'absolute', left: 230, top: 300, width: 240, height: 240, borderRadius: '50%', background: '#F6F3EC', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ position: 'absolute', left: 126, top: i ? 60 : 30, width: 8, height: i ? 70 : 100, borderRadius: 4, background: BG1, transformOrigin: `4px ${i ? 70 : 100}px`, transform: `rotate(${(t - p.at) * (i ? 120 : 1500)}deg)` }} />
        ))}
      </div>
      <Guy x={600} y={1250} s={1.05} pose={{ head: -8 + Math.sin(t * 2) * 4, facepalm: 0, armL: lerp(6, 120, hand) }} />
      {[0, 1, 2].map((i) => {
        const q = jelly(f, p.at + 0.25 + i * 0.22);
        return (
          <div key={i} style={{ position: 'absolute', left: 700 + i * 90, top: 300 - i * 80 + Math.sin(t * 3 + i) * 12, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 110 - i * 10, color: MINT, transform: `scale(${Math.max(0, q)}) rotate(${10 - i * 12}deg)` }}>?</div>
        );
      })}
    </AbsoluteFill>
  );
};

const Phone: React.FC<{ x: number; y: number; w: number; rot?: number; children?: React.ReactNode; src?: string }> = ({ x, y, w, rot = 0, children, src }) => (
  <div style={{ position: 'absolute', left: x - w / 2, top: y - w * 1.04, width: w, height: w * 2.08, borderRadius: w * 0.15, background: '#16181B', padding: w * 0.03, boxSizing: 'border-box', transform: `rotate(${rot}deg)`, boxShadow: `0 40px 90px rgba(0,0,0,0.5), 0 0 0 3px #2B2F33` }}>
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: w * 0.125, overflow: 'hidden', background: '#0B0D0E' }}>
      {src && <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {children}
      <div style={{ position: 'absolute', top: w * 0.03, left: '50%', width: w * 0.28, height: w * 0.08, marginLeft: -w * 0.14, borderRadius: 99, background: '#000' }} />
    </div>
  </div>
);

const SceneInstall: React.FC<SP> = (p) => {
  const { f, t, on, e, zoom } = useScene(p);
  if (!on) return null;
  const icon = jelly(f, p.at + 0.35);
  const tap = clamp01((t - p.at - 0.9) / 0.5);
  const cols = ['#3A4A5A', '#4A3F5C', '#5C4A3A', '#2F5A4A', '#5A3A47', '#3A5A5A', '#4E4E3A', '#3F3F5C'];
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <Phone x={540} y={760 + (1 - e) * 500} w={560}>
        <div style={{ position: 'absolute', inset: 0, padding: '120px 46px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 34, alignContent: 'start' }}>
          {[...Array(20)].map((_, i) =>
            i === 9 ? (
              <div key={i} style={{ width: 96, height: 96, zIndex: 2, transform: `scale(${t > p.at + 0.35 ? Math.max(0, icon) * 1.7 * (1 - 0.12 * Math.sin(tap * Math.PI)) : 0})`, filter: `drop-shadow(0 0 ${20 + 20 * Math.sin(t * 5)}px ${MINT}aa)` }}>
                <LogoIcon size={96} />
              </div>
            ) : (
              <div key={i} style={{ width: 96, height: 96, borderRadius: 26, background: cols[i % cols.length], opacity: t > p.at + 0.35 ? 0.35 : 0.8 }} />
            ),
          )}
        </div>
        {tap > 0 && tap < 1 && <div style={{ position: 'absolute', left: 300 - tap * 120, top: 400 - tap * 120, width: tap * 240, height: tap * 240, borderRadius: '50%', border: `6px solid ${MINT}`, opacity: 1 - tap }} />}
      </Phone>
    </AbsoluteFill>
  );
};

const SceneWork: React.FC<SP> = (p) => {
  const { t, on, zoom, lt } = useScene(p);
  if (!on) return null;
  const dur = p.out - p.at;
  const x = lerp(120, 780, clamp01(lt / dur));
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      {/* office building */}
      <div style={{ position: 'absolute', left: 560, top: 280, width: 440, height: 900, borderRadius: '30px 30px 0 0', background: '#1C3B48', boxShadow: 'inset 0 0 0 4px #24505F' }}>
        <div style={{ position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 40, color: PLACE.work.color, letterSpacing: '0.1em' }}>BUREAU</div>
        <div style={{ position: 'absolute', top: 120, left: 40, right: 40, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30 }}>
          {[...Array(15)].map((_, i) => (
            <div key={i} style={{ height: 80, borderRadius: 10, background: (i * 7) % 5 === 0 ? '#F2D27A' : '#2B5566', opacity: (i * 7) % 5 === 0 ? 0.9 : 1 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 150, width: 140, height: 220, borderRadius: '20px 20px 0 0', background: '#0F2630' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1180, height: 8, background: '#1F4A44' }} />
      {[...Array(6)].map((_, i) => {
        const fx = 140 + i * 90;
        return fx < x - 60 ? <div key={i} style={{ position: 'absolute', left: fx, top: 1205 + (i % 2) * 18, width: 44, height: 14, borderRadius: 7, background: MINT, opacity: 0.6 }} /> : null;
      })}
      <Guy x={x} y={1185} s={0.62} pose={{ walk: t * 9 }} />
    </AbsoluteFill>
  );
};

const SceneChrono: React.FC<SP & { k: PlaceKind; label: string }> = (p) => {
  const { f, t, on, e, zoom } = useScene(p);
  if (!on) return null;
  const isl = sp(f, p.at + 0.2, { damping: 11, stiffness: 140 });
  const sec = Math.max(0, t - p.at - 0.4) * 4;
  const P = PLACE[p.k];
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <Ring cx={540} cy={330} r={300} at={p.at + 0.2} color={P.color} />
      <Phone x={540} y={980 + (1 - e) * 600} w={620}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#1D3A3A,#0E1F22)' }} />
        <div style={{ position: 'absolute', top: 260, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_TIGHT, fontWeight: 300, fontSize: 170, color: '#fff' }}>9:02</div>
      </Phone>
      {/* giant Dynamic Island coming out of the phone */}
      <div style={{ position: 'absolute', left: 540 - lerp(170, 470, isl), top: lerp(510, 230, isl), width: lerp(340, 940, isl), height: lerp(90, 220, isl), borderRadius: 120, background: '#000', border: `3px solid ${P.color}55`, boxShadow: `0 0 80px ${P.color}55`, display: 'flex', alignItems: 'center', gap: 28, padding: '0 40px', boxSizing: 'border-box' }}>
        <div style={{ opacity: clamp01((isl - 0.5) * 3), display: 'flex', alignItems: 'center', gap: 28, width: '100%' }}>
          <IconTile kind={p.k} size={130} solid />
          <div style={{ flex: 1, fontFamily: FONT, color: '#fff', lineHeight: 1.1 }}>
            <div style={{ fontSize: 34, opacity: 0.6 }}>Arrivée détectée</div>
            <div style={{ fontSize: 54, fontWeight: 800 }}>{p.label}</div>
          </div>
          <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 90, color: P.color, fontVariantNumeric: 'tabular-nums' }}>{`0:${String(Math.floor(sec)).padStart(2, '0')}`}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScenePlaces: React.FC<SP & { pins: { k: PlaceKind; at: number; x: number; y: number }[] }> = (p) => {
  const { f, t, on, e, zoom } = useScene(p);
  if (!on) return null;
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <div style={{ position: 'absolute', left: 60, top: 220, width: 960, height: 960, borderRadius: 60, overflow: 'hidden', background: '#16302E', transform: `scale(${lerp(0.85, 1, e)})`, opacity: clamp01(e * 2), boxShadow: '0 40px 90px rgba(0,0,0,0.45)' }}>
        <svg width={960} height={960}>
          {['M0 250 H960', 'M0 610 H960', 'M240 0 V960', 'M650 0 V960', 'M0 900 L960 100'].map((d, i) => (
            <path key={i} d={d} stroke="#21423F" strokeWidth={48} fill="none" />
          ))}
          <path d="M240 900 L240 610 L650 610 L650 250 L240 250" stroke={MINT} strokeWidth={10} fill="none" strokeDasharray="1800" strokeDashoffset={1800 * (1 - clamp01((t - p.at) / (p.out - p.at)))} strokeLinecap="round" opacity={0.7} />
        </svg>
        {p.pins.map((pin) => {
          const j = jelly(f, pin.at);
          if (t < pin.at) return null;
          const P = PLACE[pin.k];
          return (
            <div key={pin.k} style={{ position: 'absolute', left: pin.x - 80, top: pin.y - 190, width: 160, transformOrigin: '50% 100%', transform: `translateY(${(1 - Math.min(1, j)) * -200}px) scale(${Math.max(0, j)})` }}>
              <div style={{ width: 160, height: 160, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: P.color, boxShadow: `0 0 40px ${P.color}88`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ transform: 'rotate(45deg)' }}>
                  <P.Icon size={78} color="#fff" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const SceneCounted: React.FC<SP> = (p) => {
  const { f, on, e, zoom, t } = useScene(p);
  if (!on) return null;
  const sw = kf(f, [p.at + 0.7, p.at + 1.0], [0, 1], EASE.inOut);
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <Ring cx={540} cy={760} r={470} at={p.at} />
      <Phone x={540} y={780 + (1 - e) * 600} w={560} rot={Math.sin(t * 1.2) * 2}>
        <Img src={staticFile('screens/places_heatmap.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 - sw }} />
        <Img src={staticFile('screens/day_map.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: sw }} />
      </Phone>
    </AbsoluteFill>
  );
};

const SceneBig: React.FC<SP & { k: PlaceKind; value: number; unit: string; color: string; pose: Pose; sweat?: boolean }> = (p) => {
  const { f, t, on, e, zoom } = useScene(p);
  if (!on) return null;
  const cnt = kf(f, [p.at + 0.05, p.at + 0.7], [0, 1], EASE.out);
  const ic = jelly(f, p.at + 0.1);
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <div style={{ position: 'absolute', top: 230, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 26, transform: `scale(${lerp(0.7, 1, e)})` }}>
        <div style={{ transform: `scale(${Math.max(0, ic)})` }}>
          <IconTile kind={p.k} size={150} solid />
        </div>
        <span style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 210, color: p.color, letterSpacing: '-0.05em', textShadow: `0 0 50px ${p.color}66`, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(p.value * cnt)}
          <span style={{ fontSize: 110, letterSpacing: '0' }}> {p.unit}</span>
        </span>
      </div>
      <div style={{ position: 'absolute', left: 110, top: 560, width: 620, height: 420, borderRadius: 30, background: '#1A3936', border: `4px solid ${p.color}55` }}>
        <div style={{ position: 'absolute', left: 40, right: 40, bottom: 40, display: 'flex', alignItems: 'flex-end', gap: 26, height: 300 }}>
          {[0.5, 0.8, 0.65, 0.9, 0.7].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h * 100 * clamp01((t - p.at - i * 0.06) / 0.5)}%`, borderRadius: 12, background: p.color, opacity: 0.85 }} />
          ))}
        </div>
      </div>
      <Guy x={930} y={1180} s={0.62} pose={p.pose} />
      {p.sweat && <div style={{ position: 'absolute', left: 900, top: 700 + ((t * 120) % 60), width: 22, height: 32, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', background: '#7FD3F7', opacity: 0.9 }} />}
    </AbsoluteFill>
  );
};

const SceneTomorrow: React.FC<SP> = (p) => {
  const { t, on, zoom, lt } = useScene(p);
  if (!on) return null;
  const x = lerp(-80, 760, clamp01(lt / (p.out - p.at)));
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <div style={{ position: 'absolute', left: 340, top: 520, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, #F6C86B 0%, #F0A04B 60%, transparent 62%)', opacity: 0.85, transform: `translateY(${-lt * 30}px)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 800, height: 420, background: '#123330' }} />
      <div style={{ position: 'absolute', left: 620, top: 600, width: 300, height: 200, borderRadius: 24, background: '#1E3C49', border: `4px solid ${PLACE.gym.color}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <IconTile kind="gym" size={80} solid />
        <span style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 40, color: '#fff' }}>SALLE</span>
      </div>
      <Guy x={x} y={1185} s={0.62} pose={{ walk: t * 9, bag: true }} />
    </AbsoluteFill>
  );
};

const SceneCta: React.FC<SP> = (p) => {
  const { f, t, on } = useScene(p);
  if (!on) return null;
  const e = jelly(f, p.at + 0.05, 0.9);
  const b = jelly(f, p.at + 0.5);
  const c = jelly(f, p.at + 1.0);
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 300, transform: `scale(${Math.max(0, e)})`, filter: `drop-shadow(0 0 ${40 + 20 * Math.sin(t * 3)}px ${MINT}88)` }}>
        <LogoIcon size={300} />
      </div>
      <div style={{ position: 'absolute', top: 650, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 170, color: '#fff', letterSpacing: '-0.05em', opacity: clamp01((t - p.at - 0.2) / 0.2) }}>OùVa</div>
      <div style={{ position: 'absolute', top: 880, padding: '22px 48px', borderRadius: 999, background: MINT, color: BG1, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 52, transform: `scale(${Math.max(0, b)})`, boxShadow: `0 0 40px ${MINT}66` }}>Gratuit sur l’App Store</div>
      <div style={{ position: 'absolute', top: 1060, textAlign: 'center', transform: `scale(${Math.max(0, c)})` }}>
        <div style={{ fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 96, color: '#fff', letterSpacing: '-0.03em' }}>ABONNE-TOI</div>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 38, color: 'rgba(255,255,255,0.7)' }}>
          pour suivre <span style={{ color: MINT }}>la suite</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- captions ---------------- */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const Captions: React.FC<{ words: Word[]; hi: string[]; stopAt: number }> = ({ words, hi, stopAt }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t >= stopAt) return null;
  // chunks of max 3 words, split after punctuation
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
    <div style={{ position: 'absolute', top: 1290, left: 50, right: 150, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 22px', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 96, lineHeight: 1.0, letterSpacing: '-0.02em', textTransform: 'uppercase', transform: `scale(${lerp(0.8, 1, e)})`, textShadow: '0 6px 24px rgba(0,0,0,0.5)', zIndex: 40 }}>
      {c.map((w, k) => {
        const isHi = hi.some((h) => norm(w.w).startsWith(norm(h)) && norm(h).length > 0);
        return (
          <span key={k} style={{ color: isHi ? MINT : t >= w.s - 0.03 ? '#fff' : 'rgba(255,255,255,0.45)' }}>
            {w.w.replace(/[,:]$/, '')}
          </span>
        );
      })}
    </div>
  );
};

/* ---------------- composition ---------------- */
export const Lucas2: React.FC<Lucas2Props> = ({ audio, words, cues, pins, hi, end }) => {
  const c = (id: string) => cues.find((x) => x.id === id)!.at;
  const next = (id: string) => {
    const i = cues.findIndex((x) => x.id === id);
    return i + 1 < cues.length ? cues[i + 1].at : end;
  };
  const S = (id: string) => ({ at: c(id), out: next(id) });
  const flashT = useT();
  const flash = cues.reduce((m, q) => Math.max(m, flashT >= q.at && flashT < q.at + 0.12 ? 1 - (flashT - q.at) / 0.12 : 0), 0);
  const pw = c('places');
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Night />
      <SceneIntro {...S('intro')} />
      <SceneEvenings {...S('evenings')} />
      <SceneQuestion {...S('question')} />
      <SceneInstall {...S('install')} />
      <SceneWork {...S('work')} />
      <SceneChrono {...S('chrono')} k="work" label="Travail" />
      <ScenePlaces {...S('places')} pins={[
        { k: 'gym', at: pins[0] ?? pw + 0.1, x: 650, y: 250 },
        { k: 'friends', at: pins[1] ?? pw + 0.7, x: 240, y: 610 },
        { k: 'cafe', at: pins[2] ?? pw + 1.3, x: 650, y: 610 },
      ]} />
      <SceneCounted {...S('counted')} />
      <SceneBig {...S('work31')} k="work" value={31} unit="H" color={PLACE.work.color} pose={{ arms: 1 }} />
      <SceneBig {...S('gym12')} k="gym" value={12} unit="MIN" color="#FF6B5E" pose={{ facepalm: 1, head: 8 }} sweat />
      <SceneTomorrow {...S('tomorrow')} />
      <SceneCta {...S('cta')} />
      <Captions words={words} hi={hi} stopAt={c('cta')} />
      {flash > 0 && <AbsoluteFill style={{ background: '#fff', opacity: flash * 0.25 }} />}
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
