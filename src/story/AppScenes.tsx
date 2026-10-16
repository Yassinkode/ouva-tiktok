import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, float, kf, lerp, p, shake, sp, vel } from '../lib';
import { MBlur, Odometer, StyledMap, shadowDeep, shadowLight } from '../components/Core';
import { CheckIcon, ClockIcon, FlagIcon, HouseIcon, OuvaMark, PinIcon, SignalIcon } from '../components/Icons';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { Caption, Disclaimer, Whip, tOr } from './common';
import { Seg } from './types';

const kindOf = (k: any): PlaceKind => (k && (PLACE as any)[k] ? k : 'home');

/* ------------------------------------------------------------------ */
/* Generic 3D iPhone                                                   */
/* ------------------------------------------------------------------ */
export const PW = 580;
export const PH = 1200;
const BEZ = 16;
export const SW = PW - BEZ * 2;
export const SH = PH - BEZ * 2;

export const Phone3D: React.FC<{
  seg: Seg;
  children: React.ReactNode;
  scale?: number;
  cy?: number;
  pose?: number; // -1 left, 1 right
  island?: React.ReactNode;
  noWhip?: boolean;
}> = ({ seg, children, scale = 1, cy = 1080, pose, island, noWhip }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const b = seg.end;
  const side = pose ?? (seg.index % 2 ? 1 : -1);
  const enter = sp(f, a, { damping: 16, stiffness: 90 });
  const ry = side * kf(f, [a, a + 1.4, b], [40, 14, 7], EASE.out) + float(f, 2, 2);
  const rx = kf(f, [a, a + 1.4, b], [14, 6, 3], EASE.out) + float(f, 7, 1.2);
  const rz = -side * kf(f, [a, a + 1.4], [7, 1.5], EASE.out);
  const ty = lerp(520, 0, enter) + float(f, 11, 10);
  const sc = lerp(0.8, 1, enter) * kf(f, [a + 1.4, b], [1, 1.05], EASE.soft) * scale;
  const body = (
    <>
      <div style={{ position: 'absolute', left: 240, top: cy + 620 * scale + ty * 0.2, width: 600, height: 90, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,20,16,0.35), rgba(10,20,16,0))', filter: 'blur(12px)', opacity: enter }} />
      <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: '50% 45%' }}>
        <div style={{ position: 'absolute', left: 540 - PW / 2, top: cy - PH / 2 + ty, width: PW, height: PH, transformStyle: 'preserve-3d', transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})` }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: 92, background: i === 7 ? '#3A3D40' : '#5B6064', transform: `translateZ(${-3 - i * 3}px)` }} />
          ))}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 92, background: 'linear-gradient(140deg, #8C9196 0%, #3B3F43 30%, #1C1E20 60%, #6B7075 100%)' }}>
            <div style={{ position: 'absolute', inset: 5, borderRadius: 88, background: '#050606' }} />
            <div style={{ position: 'absolute', left: BEZ, top: BEZ, width: SW, height: SH, borderRadius: 76, overflow: 'hidden', background: '#0B0F0D' }}>
              {children}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(${115 + ry * 0.8}deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.09) 45%, rgba(255,255,255,0) 60%)` }} />
              {island ?? <div style={{ position: 'absolute', top: 20, left: SW / 2 - 70, width: 140, height: 40, borderRadius: 20, background: '#000' }} />}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
  return noWhip ? <AbsoluteFill>{body}</AbsoluteFill> : (
    <Whip seg={seg} noEnter>
      {body}
    </Whip>
  );
};

const ScreenHeader: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <>
    <div style={{ position: 'absolute', top: 24, left: 40, fontFamily: FONT, fontWeight: 650, fontSize: 22, color: '#fff' }}>9:41</div>
    <div style={{ position: 'absolute', top: 92, left: 26, width: 64, height: 64, borderRadius: 32, background: '#1E2422', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
    <div style={{ position: 'absolute', top: 100, left: 104, right: 20, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 36, color: '#fff', letterSpacing: '-0.03em' }}>{title}</div>
    {sub && <div style={{ position: 'absolute', top: 146, left: 104, fontFamily: FONT, fontSize: 20, color: 'rgba(255,255,255,0.55)' }}>{sub}</div>}
  </>
);

/* ------------------------------------------------------------------ */
/* Dynamic Island / Live Activity                                      */
/* ------------------------------------------------------------------ */
const Topo: React.FC<{ w: number; h: number; color?: string }> = ({ w, h, color = 'rgba(82,223,175,0.10)' }) => (
  <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: 11 }).map((_, i) => (
      <path key={i} d={`M-20 ${120 + i * 95} C ${w * 0.3} ${60 + i * 95}, ${w * 0.6} ${190 + i * 92}, ${w + 20} ${100 + i * 96}`} stroke={color} strokeWidth="2" fill="none" />
    ))}
  </svg>
);

export const DynamicIsland: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const kind = kindOf(seg.params.place);
  const P = PLACE[kind];
  const label = seg.params.label ?? P.name;
  const exp = tOr(seg, 'expand', 0.45);
  const compact = sp(f, a + 0.5, { damping: 14, stiffness: 170 });
  const big = sp(f, exp, { damping: 13, stiffness: 120 });
  const mins = (seg.params.minutes ?? 134) + Math.max(0, f / FPS - a) * 3;
  const w = lerp(lerp(140, 330, compact), 500, big);
  const h = lerp(40, 196, big);
  const r = lerp(20, 54, big);
  const zoom = kf(f, [a, exp, exp + 0.6], [1, 1, 1.12], EASE.inOut);
  const island = (
    <div style={{ position: 'absolute', top: 20, left: SW / 2 - w / 2, width: w, height: h, borderRadius: r, background: '#000', overflow: 'hidden', boxShadow: big > 0.1 ? '0 10px 30px rgba(0,0,0,0.6)' : undefined }}>
      {/* compact */}
      <div style={{ opacity: clamp01(compact * 2) * (1 - clamp01(big * 3)), position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <P.Icon size={18} color={P.color} />
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 650, fontSize: 18, color: C.mint, fontVariantNumeric: 'tabular-nums' }}>
          {Math.floor(mins / 60)}:{String(Math.floor(mins % 60)).padStart(2, '0')}
        </div>
      </div>
      {/* expanded */}
      <div style={{ opacity: clamp01((big - 0.4) * 2), position: 'absolute', inset: 0, padding: '22px 26px', fontFamily: FONT, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconTile kind={kind} size={58} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 750, fontSize: 24 }}>{label}</div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>En ce moment · détecté automatiquement</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 14, color: C.mint }}>
          <Odometer value={Math.floor(mins / 60)} digits={1} size={46} color={C.mint} />
          <span style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 28 }}>h</span>
          <Odometer value={mins % 60} digits={2} size={46} color={C.mint} />
          <span style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 28 }}>min</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)', marginTop: 8 }}>
          <div style={{ width: `${30 + (mins % 60)}%`, height: '100%', borderRadius: 3, background: C.mint }} />
        </div>
      </div>
    </div>
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '50% 30%' }}>
        <Phone3D seg={seg} island={island} scale={1.35} cy={1240} pose={0}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0F2A21 0%, #0B0F0D 70%)' }}>
            <Topo w={SW} h={SH} />
            <div style={{ position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 24, color: 'rgba(255,255,255,0.75)' }}>
              {seg.params.date ?? 'jeudi 16 octobre'}
            </div>
            <div style={{ position: 'absolute', top: 278, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_TIGHT, fontWeight: 600, fontSize: 150, color: '#fff', letterSpacing: '-0.04em' }}>
              9:41
            </div>
          </div>
        </Phone3D>
      </AbsoluteFill>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={150} size={96} />
      <Disclaimer show={false} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Screen time vs time per place                                       */
/* ------------------------------------------------------------------ */
export const Versus: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const tb = tOr(seg, 'b', 0.35);
  const tr = tOr(seg, 'reveal', 0.7);
  const c1 = sp(f, a + 0.05, { damping: 15, stiffness: 140 });
  const c2 = sp(f, tb, { damping: 15, stiffness: 140 });
  const rev = sp(f, tr, { damping: 10, stiffness: 180 });
  const q = 1 + Math.sin(f * 0.18) * 0.06 * (1 - rev);
  const sh = shake(f, tr, 0.35, 8);
  const bars = [
    ['#5B8DEF', 0.8],
    ['#E85D9A', 0.55],
    ['#F2B33D', 0.4],
    ['#8D7BE8', 0.25],
  ] as const;
  const Card: React.FC<{ e: number; y: number; children: React.ReactNode }> = ({ e, y, children }) => (
    <div style={{ position: 'absolute', left: 90, top: y + float(f, y, 6), width: 900, height: 380, borderRadius: 56, background: 'linear-gradient(180deg, #1A201E 0%, #111513 100%)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: shadowDeep, padding: 48, boxSizing: 'border-box', color: '#fff', fontFamily: FONT, transform: `translateY(${(1 - e) * 500}px) rotate(${(1 - e) * 6}deg)`, opacity: clamp01(e * 2) }}>
      {children}
    </div>
  );
  return (
    <AbsoluteFill>
      <Whip seg={seg}>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
          <Card e={c1} y={470}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 84, height: 84, borderRadius: 24, background: '#2A2F45', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="44" height="44" viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3" stroke="#9DB4FF" strokeWidth="2" fill="none" /><circle cx="12" cy="18.5" r="1" fill="#9DB4FF" /></svg>
              </div>
              <div style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 52, letterSpacing: '-0.03em' }}>{seg.params.a ?? "Temps d'écran"}</div>
              <div style={{ marginLeft: 'auto', width: 64, height: 64, borderRadius: 32, background: '#1F3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${sp(f, a + 0.5, { damping: 9 })})` }}>
                <CheckIcon size={44} color={C.mint} stroke={6} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', height: 150, marginTop: 40 }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const g = sp(f, a + 0.2 + i * 0.03, { damping: 14 });
                const hh = (0.3 + ((i * 37) % 10) / 14) * 150 * g;
                return (
                  <div key={i} style={{ flex: 1, height: hh, borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {bars.map(([c, v], k) => (
                      <div key={k} style={{ flex: v, background: c }} />
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card e={c2} y={930}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 84, height: 84, borderRadius: 24, background: '#163A2F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PinIcon size={40} color={C.mint} dot="#163A2F" />
              </div>
              <div style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 52, letterSpacing: '-0.03em' }}>{seg.params.b ?? 'Temps par lieu'}</div>
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 150, height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 170, color: 'rgba(255,255,255,0.9)', transform: `scale(${q * (1 - rev)}) rotate(${rev * 90}deg)`, opacity: 1 - clamp01(rev * 2) }}>?</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22, transform: `scale(${Math.max(0, rev)})`, opacity: clamp01(rev * 2) }}>
                <OuvaMark size={130} t={p(f, tr + 0.2, 0.8)} />
                <div style={{ fontFamily: FONT_TIGHT, fontWeight: 880, fontSize: 110, letterSpacing: '-0.05em' }}>
                  O<span style={{ color: C.mint }}>ù</span>Va
                </div>
              </div>
            </div>
          </Card>
        </AbsoluteFill>
      </Whip>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={200} size={104} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Add a place: zone (4 points) → name & category → done               */
/* ------------------------------------------------------------------ */
const Stepper: React.FC<{ step: number }> = ({ step }) => {
  const labels = ['Définir la zone', 'Nom et détails', 'Valider'];
  return (
    <div style={{ position: 'absolute', top: 186, left: 30, right: 30, height: 90 }}>
      <div style={{ position: 'absolute', top: 23, left: 60, right: 60, height: 3, background: 'rgba(255,255,255,0.14)' }} />
      <div style={{ position: 'absolute', top: 23, left: 60, width: `${Math.min(1, step / 2) * (100 - 0)}%`, maxWidth: 'calc(100% - 120px)', height: 3, background: C.mint }} />
      {labels.map((l, i) => {
        const done = step > i + 0.5;
        const active = Math.round(step) === i;
        return (
          <div key={i} style={{ position: 'absolute', left: `${(i / 2) * 100}%`, transform: `translateX(${-50 + (i === 0 ? 30 : i === 2 ? -30 : 0)}%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 160 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, border: `3px solid ${done || active ? C.mint : 'rgba(255,255,255,0.4)'}`, background: active ? C.mint : '#0B0F0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 20, color: active ? '#06281D' : '#fff', boxSizing: 'border-box' }}>
              {done ? <CheckIcon size={28} color={C.mint} stroke={6} /> : i + 1}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 15, color: active ? C.mint : 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
};

export const AddPlace: React.FC<{ seg: Seg; seed: number }> = ({ seg, seed }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const a = seg.start;
  const kind = kindOf(seg.params.place);
  const label: string = seg.params.label ?? PLACE[kind].name;
  const tn = tOr(seg, 'name', 0.4);
  const td = tOr(seg, 'done', 0.78);
  const step = t < tn ? 0 : t < td ? 1 : 2;
  const pts = [
    [150, 420],
    [390, 380],
    [420, 640],
    [170, 690],
  ];
  const ptsIn = pts.map((_, i) => sp(f, a + 0.45 + i * 0.32, { damping: 9, stiffness: 220 }));
  const poly = clamp01((t - (a + 0.45 + 3 * 0.32)) / 0.4);
  const s1 = (fr: number) => kf(fr, [tn - 0.15, tn + 0.2], [0, -SW], EASE.inOut);
  const s2 = (fr: number) => kf(fr, [td - 0.15, td + 0.2], [0, -SW], EASE.inOut);
  const x1 = s1(f);
  const x2 = s2(f);
  const typed = label.slice(0, Math.max(0, Math.floor((t - tn - 0.25) / 0.06)));
  const catSel = sp(f, tn + 0.35 + label.length * 0.06, { damping: 10, stiffness: 200 });
  const cats: PlaceKind[] = Array.from(new Set([kind, 'home', 'work', 'school', 'gym', 'cafe'] as PlaceKind[])).slice(0, 5);
  const done = sp(f, td + 0.1, { damping: 9, stiffness: 180 });
  const blur = Math.min(10, (vel(s1, f) + vel(s2, f)) * 0.6);
  return (
    <AbsoluteFill>
      <Phone3D seg={seg}>
        <ScreenHeader title="Ajouter un lieu" />
        <Stepper step={step} />
        <div style={{ position: 'absolute', top: 290, left: 0, width: SW * 3, bottom: 0, display: 'flex', transform: `translateX(${x1 + x2}px)`, filter: blur > 0.4 ? `blur(${blur}px)` : undefined }}>
          {/* stage 1 */}
          <div style={{ width: SW, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 30, top: 10, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 34, color: '#fff' }}>Dessine ta zone</div>
            <div style={{ position: 'absolute', left: 30, top: 58, fontFamily: FONT, fontSize: 19, color: 'rgba(255,255,255,0.6)' }}>Place 4 points autour du lieu.</div>
            <div style={{ position: 'absolute', left: 22, right: 22, top: 110, height: 640, borderRadius: 34, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: -700, top: -600, transform: 'scale(1)' }}>
                <StyledMap size={2000} seed={seed} />
              </div>
              <svg width={SW - 44} height={640} style={{ position: 'absolute', inset: 0 }}>
                <polygon points={pts.map(([x, y]) => `${x - 22},${y - 290}`).join(' ')} fill={`rgba(82,223,175,${0.25 * poly})`} stroke={C.mint} strokeWidth={4} strokeDasharray={`${poly * 1200} 1200`} />
                {pts.map(([x, y], i) => (
                  <g key={i} transform={`translate(${x - 22} ${y - 290}) scale(${Math.max(0, ptsIn[i])})`}>
                    <circle r={18} fill="#fff" />
                    <circle r={10} fill={C.mint} />
                  </g>
                ))}
              </svg>
            </div>
          </div>
          {/* stage 2 */}
          <div style={{ width: SW, position: 'relative', fontFamily: FONT, color: '#fff' }}>
            <div style={{ position: 'absolute', left: 30, top: 10, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 36 }}>Donne un nom à ton lieu</div>
            <div style={{ position: 'absolute', left: 30, top: 60, fontSize: 19, color: 'rgba(255,255,255,0.6)' }}>Choisis un nom clair pour le retrouver.</div>
            <div style={{ position: 'absolute', left: 22, right: 22, top: 112, height: 96, borderRadius: 48, background: '#141917', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 30px' }}>
              {(() => {
                const P = PLACE[kind];
                return <P.Icon size={34} color={P.color} />;
              })()}
              <span style={{ fontSize: 30 }}>{typed}</span>
              <span style={{ width: 3, height: 34, background: '#5B8DEF', opacity: Math.floor(f / 18) % 2 ? 1 : 0.2 }} />
            </div>
            <div style={{ position: 'absolute', left: 30, top: 250, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 32 }}>Choisis une catégorie</div>
            <div style={{ position: 'absolute', left: 22, right: 22, top: 310, display: 'flex', justifyContent: 'space-between' }}>
              {cats.map((k, i) => (
                <div key={i} style={{ transform: `scale(${i === 0 ? 1 + catSel * 0.12 : 1})`, borderRadius: 26, boxShadow: i === 0 && catSel > 0.1 ? `0 0 0 4px ${C.mint}` : undefined }}>
                  <IconTile kind={k} size={88} />
                </div>
              ))}
            </div>
            <div style={{ position: 'absolute', left: 22, right: 22, top: 470, height: 100, borderRadius: 50, background: C.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 32, color: '#06281D', transform: `scale(${1 - 0.05 * clamp01(1 - Math.abs(t - (td - 0.25)) * 8)})` }}>
              Continuer ›
            </div>
          </div>
          {/* stage 3 */}
          <div style={{ width: SW, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT, color: '#fff' }}>
            <div style={{ marginTop: 120, width: 200, height: 200, borderRadius: 100, background: '#163A2F', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${Math.max(0, done)})`, boxShadow: `0 0 80px ${C.mint}55` }}>
              <CheckIcon size={130} color={C.mint} stroke={5} />
            </div>
            <div style={{ marginTop: 40, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 40 }}>{label} ajouté</div>
            <div style={{ marginTop: 10, fontSize: 21, color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '0 40px' }}>Le temps y sera compté automatiquement.</div>
          </div>
        </div>
      </Phone3D>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={130} size={92} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Replay of the day on the map                                        */
/* ------------------------------------------------------------------ */
export const ReplayDay: React.FC<{ seg: Seg; seed: number }> = ({ seg, seed }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const a = seg.start;
  const b = seg.end;
  const stops: any[] = (seg.params.stops ?? [
    { place: 'home', time: '07:40' },
    { place: 'school', time: '08:30' },
    { place: 'cafe', time: '17:10' },
  ]).slice(0, 4);
  const MW = SW - 44;
  const MH = 560;
  const P = [
    [110, 430],
    [390, 150],
    [250, 330],
    [420, 470],
  ].slice(0, stops.length);
  const t0 = a + 0.7;
  const t1 = b - 0.5;
  const prog = clamp01((t - t0) / (t1 - t0));
  const nSeg = P.length - 1;
  const sIdx = Math.min(nSeg - 1, Math.floor(prog * nSeg));
  const local = EASE.inOut(clamp01(prog * nSeg - sIdx));
  const [x0, y0] = P[sIdx];
  const [x1, y1] = P[sIdx + 1];
  const cx = (x0 + x1) / 2 + (y1 - y0) * 0.25;
  const cy2 = (y0 + y1) / 2 - (x1 - x0) * 0.25;
  const q = (u: number, A: number, B: number, Cc: number) => (1 - u) * (1 - u) * A + 2 * (1 - u) * u * B + u * u * Cc;
  const ax = q(local, x0, cx, x1);
  const ay = q(local, y0, cy2, y1);
  const at = prog * nSeg >= nSeg - 0.02 ? nSeg : local > 0.92 ? sIdx + 1 : sIdx;
  const cur = stops[Math.min(stops.length - 1, at)];
  const curKind = kindOf(cur.place);
  const route = P.slice(0, -1)
    .map(([px, py], i) => {
      const [nx, ny] = P[i + 1];
      const mx = (px + nx) / 2 + (ny - py) * 0.25;
      const my = (py + ny) / 2 - (nx - px) * 0.25;
      return `M${px} ${py} Q${mx} ${my} ${nx} ${ny}`;
    })
    .join(' ');
  return (
    <AbsoluteFill>
      <Phone3D seg={seg}>
        <ScreenHeader title="Ma journée sur la carte" />
        <div style={{ position: 'absolute', top: 186, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 650, fontSize: 24, color: '#fff' }}>{seg.params.date ?? 'jeudi'}</div>
        <div style={{ position: 'absolute', left: 22, top: 240, width: MW, height: MH, borderRadius: 36, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: -800 - prog * 60, top: -700, transform: `scale(${1.1 + prog * 0.08})`, transformOrigin: '1000px 1000px' }}>
            <StyledMap size={2000} seed={seed + 3} />
          </div>
          <svg width={MW} height={MH} style={{ position: 'absolute', inset: 0 }}>
            <path d={route} stroke="rgba(255,255,255,0.25)" strokeWidth={6} fill="none" strokeDasharray="2 14" strokeLinecap="round" />
            <path d={route} stroke={C.mint} strokeWidth={7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${prog} 1`} />
          </svg>
          {P.map(([px, py], i) => {
            const k = kindOf(stops[i].place);
            const S = PLACE[k];
            const pop = sp(f, a + 0.3 + i * 0.15, { damping: 10 });
            return (
              <div key={i} style={{ position: 'absolute', left: px - 34, top: py - 34, width: 68, height: 68, borderRadius: 34, background: S.bg, border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${Math.max(0, pop)})`, boxShadow: '0 6px 16px rgba(0,0,0,0.4)' }}>
                <S.Icon size={34} color={S.color} />
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: ax - 26, top: ay - 26, width: 52, height: 52, borderRadius: 26, background: '#0B0F0D', border: '4px solid #fff', boxShadow: `0 0 0 10px rgba(82,223,175,0.25)`, opacity: t > t0 - 0.1 ? 1 : 0 }}>
            <svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="17" r="7" fill="#5FA7D9" /><path d="M9 38c1-8 6-12 13-12s12 4 13 12" fill="#5FA7D9" /></svg>
          </div>
          <div style={{ position: 'absolute', left: 18, top: 18, padding: '12px 22px', borderRadius: 22, background: 'rgba(10,14,12,0.9)', fontFamily: FONT, fontWeight: 750, fontSize: 24, color: '#fff' }}>
            {cur.time} · {cur.label ?? PLACE[curKind].name}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 22, right: 22, top: 830, display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: '#F2F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="34" height="34" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" fill="#0B0F0D" /><rect x="14" y="5" width="4" height="14" rx="1" fill="#0B0F0D" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>
              {stops[0].time} — {stops[stops.length - 1].time}
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.15)', marginTop: 10 }}>
              <div style={{ width: `${prog * 100}%`, height: '100%', borderRadius: 4, background: C.mint }} />
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 22, right: 22, top: 950, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stops.slice(0, 2).map((s, i) => {
            const k = kindOf(s.place);
            return (
              <div key={i} style={{ height: 76, borderRadius: 24, background: '#1A201E', display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', opacity: p(f, a + 0.6 + i * 0.15, 0.3) }}>
                <IconTile kind={k} size={46} />
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, color: '#fff' }}>{s.label ?? PLACE[k].name}</div>
                <div style={{ marginLeft: 'auto', fontFamily: FONT, fontSize: 19, color: 'rgba(255,255,255,0.6)' }}>{s.time}</div>
              </div>
            );
          })}
        </div>
      </Phone3D>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={130} size={92} />
      <Disclaimer show text="Trajets illustratifs · horaires d'exemple" />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Compare my weeks                                                    */
/* ------------------------------------------------------------------ */
export const WeekCompare: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const A: number[] = seg.params.before ?? [6, 7, 5, 8, 6, 9, 10];
  const B: number[] = seg.params.after ?? [4, 5, 4, 5, 3, 6, 6];
  const rows: any[] = seg.params.rows ?? [
    { place: 'park', delta: '+2 h 10', good: true },
    { place: 'home', delta: '−3 h 40', good: true },
  ];
  const W = SW - 84;
  const Hc = 300;
  const mx = Math.max(...A, ...B) * 1.15;
  const path = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${(i / (arr.length - 1)) * W} ${Hc - (v / mx) * Hc}`).join(' ');
  const dA = p(f, a + 0.4, 1.0, EASE.inOut);
  const dB = p(f, tOr(seg, 'b', 0.4), 1.2, EASE.inOut);
  return (
    <AbsoluteFill>
      <Phone3D seg={seg}>
        <ScreenHeader title="Comparer mes semaines" />
        <div style={{ position: 'absolute', top: 190, left: 22, right: 22, height: 64, borderRadius: 32, background: '#1A201E', display: 'flex', padding: 6, boxSizing: 'border-box', fontFamily: FONT, fontSize: 20, color: '#fff' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}>{seg.params.labelA ?? 'Semaine dernière'}</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 26, background: '#0B0F0D', fontWeight: 700 }}>{seg.params.labelB ?? 'Cette semaine'}</div>
        </div>
        <div style={{ position: 'absolute', top: 280, left: 22, right: 22, height: 430, borderRadius: 36, background: '#141917', border: '1px solid rgba(255,255,255,0.07)', padding: '34px 20px', boxSizing: 'border-box' }}>
          <div style={{ fontFamily: FONT, fontSize: 20, color: 'rgba(255,255,255,0.6)', marginLeft: 10 }}>{seg.params.metric ?? 'Heures à la maison / jour'}</div>
          <svg width={W} height={Hc + 20} style={{ marginTop: 24, marginLeft: 10, overflow: 'visible' }}>
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={0} x2={W} y1={(i / 3) * Hc} y2={(i / 3) * Hc} stroke="rgba(255,255,255,0.06)" />
            ))}
            <path d={path(A)} stroke="rgba(255,255,255,0.45)" strokeWidth={5} fill="none" strokeDasharray="10 10" pathLength={1} style={{ strokeDasharray: `${dA} 1` }} />
            <path d={path(B)} stroke={C.mint} strokeWidth={7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${dB} 1`} style={{ filter: `drop-shadow(0 0 8px ${C.mint})` }} />
            {B.map((v, i) => (i / (B.length - 1) <= dB ? <circle key={i} cx={(i / (B.length - 1)) * W} cy={Hc - (v / mx) * Hc} r={7} fill={C.mint} /> : null))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 10px 0', fontFamily: FONT, fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 22, right: 22, top: 740, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rows.slice(0, 3).map((r, i) => {
            const k = kindOf(r.place);
            const e = sp(f, tOr(seg, 'rows', 0.65) + i * 0.15, { damping: 13 });
            return (
              <div key={i} style={{ height: 96, borderRadius: 28, background: '#1A201E', display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px', transform: `translateX(${(1 - e) * 300}px)`, opacity: clamp01(e * 2) }}>
                <IconTile kind={k} size={56} />
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: '#fff' }}>{r.label ?? PLACE[k].name}</div>
                <div style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 18, background: r.good === false ? '#3A1C1A' : '#123A2D', fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 26, color: r.good === false ? C.heatHigh : C.mint }}>{r.delta}</div>
              </div>
            );
          })}
        </div>
      </Phone3D>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={130} size={92} />
      <Disclaimer show text="Valeurs d'exemple" />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Logo & theme                                                        */
/* ------------------------------------------------------------------ */
const VARIANTS = [
  { bg: ['#1B2522', '#0B100E'], pin: ['#7DF0C6', '#2FBF8F'] },
  { bg: ['#16213E', '#0B1020'], pin: ['#7FB2FF', '#3D6FE0'] },
  { bg: ['#2B2210', '#120E05'], pin: ['#FFD978', '#E0A42F'] },
  { bg: ['#2A1630', '#120814'], pin: ['#F49BE0', '#C24FAE'] },
];
const IconVariant: React.FC<{ v: number; size: number }> = ({ v, size }) => {
  const V = VARIANTS[v % VARIANTS.length];
  return (
    <svg width={size} height={size} viewBox="0 0 160 160">
      <defs>
        <linearGradient id={`vb${v}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={V.bg[0]} /><stop offset="1" stopColor={V.bg[1]} /></linearGradient>
        <linearGradient id={`vp${v}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={V.pin[0]} /><stop offset="1" stopColor={V.pin[1]} /></linearGradient>
      </defs>
      <rect width="160" height="160" rx="38" fill={`url(#vb${v})`} />
      <path d="M36 124c14 0 18-12 30-12s14 10 26 10" stroke={V.pin[1]} strokeWidth="7" strokeLinecap="round" fill="none" strokeDasharray="1 14" />
      <path d="M86 26c-17 0-30 13-30 29.5C56 77 86 104 86 104s30-27 30-48.5C116 39 103 26 86 26Z" fill={`url(#vp${v})`} />
      <circle cx="86" cy="55" r="11" fill="#0D1210" />
    </svg>
  );
};

export const ThemeSwitch: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const a = seg.start;
  const period = Math.max(0.55, (seg.end - a - 0.8) / 4);
  const idx = Math.max(0, Math.floor((t - a - 0.6) / period));
  const local = clamp01(((t - a - 0.6) % period) / 0.35);
  const v = idx % VARIANTS.length;
  const flip = t > a + 0.6 ? Math.sin(local * Math.PI) : 0;
  const swatches = ['#52DFAF', '#5B8DEF', '#F2B33D', '#E46AC8', '#E0503F', '#F2F2EE'];
  return (
    <AbsoluteFill>
      <Phone3D seg={seg}>
        <ScreenHeader title="Logo et thème" />
        <div style={{ position: 'absolute', top: 230, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ transform: `perspective(800px) rotateY(${flip * 90}deg) scale(${1 + flip * 0.05})`, filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}>
            <IconVariant v={local > 0.5 || idx === 0 ? v : (v + VARIANTS.length - 1) % VARIANTS.length} size={260} />
          </div>
        </div>
        <div style={{ position: 'absolute', top: 540, left: 30, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 30, color: '#fff' }}>Icône</div>
        <div style={{ position: 'absolute', top: 590, left: 22, right: 22, display: 'flex', justifyContent: 'space-between' }}>
          {VARIANTS.map((_, i) => (
            <div key={i} style={{ borderRadius: 30, boxShadow: i === v ? `0 0 0 5px ${C.mint}` : undefined, transform: `scale(${i === v ? 1.06 : 1})` }}>
              <IconVariant v={i} size={110} />
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', top: 760, left: 30, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 30, color: '#fff' }}>Couleur</div>
        <div style={{ position: 'absolute', top: 812, left: 22, right: 22, display: 'flex', justifyContent: 'space-between' }}>
          {swatches.map((c, i) => (
            <div key={i} style={{ width: 70, height: 70, borderRadius: 35, background: c, boxShadow: i === v ? `0 0 0 5px #0B0F0D, 0 0 0 9px ${c}` : undefined }} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: 22, right: 22, top: 950, height: 96, borderRadius: 48, background: swatches[v], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 30, color: '#06140F' }}>Appliquer</div>
      </Phone3D>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={130} size={92} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Feature list (app presentation)                                     */
/* ------------------------------------------------------------------ */
const FIcon: React.FC<{ k: string }> = ({ k }) => {
  switch (k) {
    case 'clock':
      return <ClockIcon size={56} color={C.mint} stroke={4.5} />;
    case 'flag':
      return <FlagIcon size={56} color={C.mint} />;
    case 'signal':
      return <SignalIcon size={56} color={C.mint} />;
    case 'home':
      return <HouseIcon size={52} color={C.mint} />;
    case 'map':
      return (
        <svg width="56" height="56" viewBox="0 0 56 56">
          {[0, 1, 2, 3].flatMap((i) => [0, 1, 2, 3].map((j) => <rect key={`${i}${j}`} x={4 + i * 12.5} y={4 + j * 12.5} width={11} height={11} rx={2} fill={['#3BB59B', '#E8C64B', '#EE8A3B', '#E0503F'][Math.min(3, Math.round(3 - Math.hypot(i - 1.5, j - 1.5)))]} />))}
        </svg>
      );
    case 'chart':
      return (
        <svg width="56" height="56" viewBox="0 0 56 56"><path d="M6 44 L20 30 L30 36 L48 14" stroke={C.mint} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case 'play':
      return (
        <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="22" stroke={C.mint} strokeWidth="4.5" fill="none" /><path d="M23 18l14 10-14 10z" fill={C.mint} /></svg>
      );
    case 'palette':
      return (
        <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="22" stroke={C.mint} strokeWidth="4.5" fill="none" />{[[20, 20], [33, 18], [40, 29], [19, 33]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={C.mint} />)}</svg>
      );
    default:
      return <PinIcon size={44} color={C.mint} dot="#0B0F0D" />;
  }
};

export const FeatureList: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const items: any[] = (seg.params.items ?? []).slice(0, 4);
  const n = Math.max(1, items.length);
  const span = seg.end - a - 0.6;
  return (
    <AbsoluteFill>
      <Whip seg={seg}>
        {items.map((it, i) => {
          const at = seg.t[`i${i + 1}`] ?? a + 0.15 + (span / n) * i;
          const e = sp(f, at, { damping: 14, stiffness: 150 });
          const fn = (fr: number) => (1 - sp(fr, at, { damping: 14, stiffness: 150 })) * 600;
          const bl = vel(fn, f) * 0.6;
          const top = 960 - (n * 190) / 2 + i * 190;
          return (
            <div key={i} style={{ position: 'absolute', left: 80, right: 140, top: top + float(f, i * 3, 5), height: 160, borderRadius: 48, background: 'rgba(255,255,255,0.8)', border: '1.5px solid #fff', boxShadow: shadowLight, display: 'flex', alignItems: 'center', gap: 30, padding: '0 36px', transform: `translateX(${(1 - e) * 600}px)`, opacity: clamp01(e * 2), filter: bl > 0.5 ? `blur(${Math.min(16, bl)}px)` : undefined }}>
              <div style={{ width: 100, height: 100, borderRadius: 30, background: '#0E1311', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FIcon k={it.icon} />
              </div>
              <div style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: it.title.length > 22 ? 40 : 48, color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{it.title}</div>
            </div>
          );
        })}
      </Whip>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={200} size={100} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Fact (sedentarity) with source                                      */
/* ------------------------------------------------------------------ */
export const Fact: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const V: number = seg.params.value ?? 95;
  const suffix: string = seg.params.suffix ?? '%';
  const ct = tOr(seg, 'count', 0.15);
  const fn = (fr: number) => kf(fr, [ct, ct + 1.2], [0, V], EASE.out);
  const c = fn(f);
  const sh = shake(f, ct + 1.15, 0.4, 10);
  const lab = sp(f, ct + 0.5, { damping: 15 });
  const dark = seg.params.dark !== false;
  const ink = dark ? '#fff' : C.ink;
  return (
    <AbsoluteFill>
      <Whip seg={seg}>
        <AbsoluteFill style={{ background: dark ? 'radial-gradient(120% 80% at 50% 40%, #13241E 0%, #0A0E0C 70%)' : undefined, opacity: clamp01((f / FPS - a) / 0.15) }}>
          {dark && <Topo w={1080} h={1920} color="rgba(82,223,175,0.07)" />}
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `translate(${sh.x}px, ${sh.y}px)` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: -120 }}>
              <Odometer value={c} digits={String(Math.round(V)).length} size={330} color={ink} speedBlur={vel(fn, f) * 6} />
              <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 170, color: C.mint, marginTop: 40, marginLeft: 10 }}>{suffix}</div>
            </div>
            <div style={{ maxWidth: 860, textAlign: 'center', fontFamily: FONT_TIGHT, fontWeight: 760, fontSize: 58, lineHeight: 1.12, color: ink, letterSpacing: '-0.025em', marginTop: 10, opacity: clamp01(lab * 2), transform: `translateY(${(1 - lab) * 40}px)` }}>
              {seg.params.label}
            </div>
            {seg.params.source && (
              <div style={{ marginTop: 40, fontFamily: FONT, fontSize: 26, color: dark ? 'rgba(255,255,255,0.5)' : C.inkSoft, opacity: p(f, ct + 0.9, 0.5) }}>Source : {seg.params.source}</div>
            )}
          </AbsoluteFill>
        </AbsoluteFill>
      </Whip>
    </AbsoluteFill>
  );
};
