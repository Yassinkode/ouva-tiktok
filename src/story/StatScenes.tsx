import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, float, kf, lerp, p, shake, sp, vel } from '../lib';
import { MBlur, Odometer, Ring, shadowDeep } from '../components/Core';
import { IconTile, Label, PLACE, PlaceKind, PlaceTile } from '../components/UI';
import { Caption, Disclaimer, Whip, tOr } from './common';
import { Seg } from './types';

const CardShell: React.FC<{ seg: Seg; children: React.ReactNode; push?: number; h?: number }> = ({ seg, children, push = 1, h = 1180 }) => {
  const f = useCurrentFrame();
  const drift = p(f, seg.start, 1.2, EASE.soft);
  return (
    <AbsoluteFill
      style={{
        transform: `perspective(2400px) rotateX(${float(f, 31, 2.6) * drift}deg) rotateY(${float(f, 21, 3.6) * drift}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 70,
          top: 1010 - h / 2 + float(f, 4, 6),
          width: 940,
          height: h,
          borderRadius: 64,
          background: 'linear-gradient(180deg, #171D1B 0%, #101412 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: shadowDeep,
          overflow: 'hidden',
          transform: `scale(${push})`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const kindOf = (k: any): PlaceKind => (k && (PLACE as any)[k] ? k : 'home');
const nameOf = (o: any) => o?.label ?? PLACE[kindOf(o?.place)].name;

/* 4 ─ ring + big % counter + place tile */
export const RingStat: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const ct = tOr(seg, 'count', 0.3);
  const tileT = tOr(seg, 'tile', 0.7);
  const V: number = seg.params.value ?? 62;
  const kind = kindOf(seg.params.place);
  const cntFn = (fr: number) => kf(fr, [ct, ct + 1.15], [0, V], EASE.out);
  const c = cntFn(f);
  const cv = vel(cntFn, f);
  const push = kf(f, [ct, ct + 1.2], [1, 1.05], EASE.out);
  const sh = shake(f, ct + 1.08, 0.4, 9);
  const tile = sp(f, tileT, { damping: 14 });
  return (
    <AbsoluteFill>
      <Whip seg={seg}>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
          <CardShell seg={seg} push={push}>
            <Label size={34} style={{ position: 'absolute', left: 64, top: 60 }}>
              {seg.params.title ?? '30 derniers jours'}
            </Label>
            <div
              style={{
                position: 'absolute',
                left: 170,
                top: 170,
                width: 600,
                height: 600,
                transform: `scale(${lerp(0.4, 1, sp(f, a + 0.05, { damping: 12 }))}) rotate(${(1 - sp(f, a + 0.05, { damping: 14 })) * -90}deg)`,
              }}
            >
              <Ring size={600} stroke={44} progress={c / 100} glow color={seg.params.color ?? C.mint} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Odometer value={c} digits={String(Math.round(V)).length} size={230} color="#fff" speedBlur={cv * 3} />
                  <div style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 104, color: C.mint, marginTop: 30, marginLeft: 6 }}>%</div>
                </div>
                <Label size={34} style={{ marginTop: 6, opacity: p(f, ct + 0.8, 0.5) }}>
                  {seg.params.sub ?? 'de mon temps'}
                </Label>
              </div>
            </div>
            <div style={{ position: 'absolute', left: 60, top: 860 + (1 - tile) * 360, opacity: clamp01(tile * 2) }}>
              <PlaceTile kind={kind} width={820} value={seg.params.tileText ?? `${V} % · ${seg.params.title ?? '30 jours'}`} bar={(V / 100) * p(f, tileT + 0.15, 0.8)} />
            </div>
          </CardShell>
        </AbsoluteFill>
      </Whip>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={205} size={112} />
      <Disclaimer show />
    </AbsoluteFill>
  );
};

/* 5 ─ two bars, the funny contrast + zoom punch */
export const Compare: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const a = seg.start;
  const A = seg.params.a ?? { place: 'home', value: 62 };
  const B = seg.params.b ?? { place: 'gym', value: 4 };
  const tb = tOr(seg, 'b', 0.4);
  const punch = seg.t.punch;
  const maxV = Math.max(A.value, B.value, 1);
  const zoomFn = (fr: number) => {
    if (punch === undefined) return 1;
    const rel = Math.min(punch + 0.95, seg.end - 0.45);
    return fr / FPS < rel ? kf(fr, [punch, punch + 0.22], [1, 2.1], EASE.out) : lerp(2.1, 1, sp(fr, rel, { damping: 11, stiffness: 120 }));
  };
  const zoom = zoomFn(f);
  const zb = Math.min(10, vel(zoomFn, f) * 60);
  const sh = punch !== undefined ? shake(f, punch, 0.45, 12) : { x: 0, y: 0 };
  const sh2 = shake(f, tb + 0.02, 0.3, 5);
  const small = B.value < A.value ? 1 : 0; // which column is "small" for punch
  const originX = small ? 685 : 255;
  return (
    <AbsoluteFill>
      <Whip seg={seg}>
        <AbsoluteFill style={{ transform: `translate(${sh.x + sh2.x}px, ${sh.y + sh2.y}px)` }}>
          <CardShell seg={seg}>
            <MBlur y={zb}>
              <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: `${originX}px 760px` }}>
                {[A, B].map((o: any, i) => {
                  const kind = kindOf(o.place);
                  const cx = i === 0 ? 255 : 685;
                  const at = i === 0 ? a + 0.1 : tb;
                  const grow = sp(f, at, i === 0 ? { damping: 15, stiffness: 110 } : { damping: 9, stiffness: 220 });
                  const hBar = Math.max(14, (o.value / maxV) * 600) * grow;
                  const big = o.value === maxV;
                  const lab = sp(f, at + 0.05, { damping: big ? 12 : 8, stiffness: 240 });
                  const icon = sp(f, a + 0.05 + i * 0.06, { damping: 12 });
                  const P = PLACE[kind];
                  return (
                    <React.Fragment key={i}>
                      <div
                        style={{
                          position: 'absolute',
                          left: cx - 130,
                          top: 880 - hBar,
                          width: 260,
                          height: hBar,
                          borderRadius: '36px 36px 14px 14px',
                          background: `linear-gradient(180deg, ${P.color} 0%, ${P.color}88 100%)`,
                          boxShadow: `0 0 60px ${P.color}40`,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: cx - 200,
                          width: 400,
                          top: 880 - hBar - (big ? 150 : 96),
                          textAlign: 'center',
                          fontFamily: FONT_TIGHT,
                          fontWeight: 850,
                          fontSize: big ? 132 : 70,
                          letterSpacing: '-0.045em',
                          color: '#fff',
                          opacity: clamp01(lab * 2),
                          transform: `scale(${Math.max(0, lab)})`,
                          transformOrigin: '50% 100%',
                        }}
                      >
                        {o.value} {o.unit ?? '%'}
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          left: cx - 210,
                          width: 420,
                          top: 926,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 18,
                          opacity: clamp01(icon * 2),
                          transform: `translateY(${(1 - icon) * 60}px) scale(${lerp(0.6, 1, icon)})`,
                        }}
                      >
                        <IconTile kind={kind} size={112} />
                        <Label size={34} color="rgba(255,255,255,0.85)" style={{ textAlign: 'center' }}>
                          {nameOf(o)}
                        </Label>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div style={{ position: 'absolute', left: 60, right: 60, top: 884, height: 3, background: 'rgba(255,255,255,0.12)' }} />
              </div>
            </MBlur>
          </CardShell>
        </AbsoluteFill>
      </Whip>
      <Caption cap={seg.cap} out={punch !== undefined ? Math.min(punch - 0.05, seg.end - 0.3) : seg.end - 0.3} top={205} size={112} />
      <Disclaimer show={t < seg.end - 0.1} />
    </AbsoluteFill>
  );
};

const SmallCard: React.FC<{ o: any; at: number; x: number; y: number; w: number; h: number; seed: number; maxV: number }> = ({ o, at, x, y, w, h, seed, maxV }) => {
  const f = useCurrentFrame();
  const kind = kindOf(o.place);
  const e = sp(f, at, { damping: 15, stiffness: 150 });
  const fn = (fr: number) => (1 - sp(fr, at, { damping: 15, stiffness: 150 })) * 520;
  const bx = vel(fn, f) * 0.9;
  const bar = p(f, at + 0.15, 0.7);
  return (
    <div
      style={{
        position: 'absolute',
        left: x + (1 - e) * 520,
        top: y + float(f, seed, 7),
        width: w,
        height: h,
        opacity: clamp01(e * 2),
        filter: bx > 0.5 ? `blur(${Math.min(20, bx)}px)` : undefined,
        borderRadius: 44,
        background: 'linear-gradient(180deg, #1C2220 0%, #141917 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: shadowDeep,
        padding: 30,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transform: `rotate(${float(f, seed + 3, 0.8)}deg)`,
      }}
    >
      <IconTile kind={kind} size={78} />
      <div>
        <div style={{ fontFamily: FONT, color: 'rgba(255,255,255,0.65)', fontSize: 26, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nameOf(o)}</div>
        <div style={{ fontFamily: FONT_TIGHT, color: '#fff', fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 4 }}>
          {Math.round(o.value * bar)} {o.unit ?? '%'}
        </div>
        <div style={{ height: 10, borderRadius: 9, background: 'rgba(255,255,255,0.09)', marginTop: 12 }}>
          <div style={{ height: '100%', width: `${(o.value / maxV) * 100 * bar}%`, borderRadius: 9, background: PLACE[kind].color }} />
        </div>
      </div>
    </div>
  );
};

/* 6 ─ bento of places: the main one dominates */
export const Bento: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const list: any[] = (seg.params.places ?? []).slice(0, 4);
  while (list.length < 4) list.push([{ place: 'home', value: 62 }, { place: 'gym', value: 4 }, { place: 'school', value: 17 }, { place: 'work', value: 15 }][list.length]);
  const main = list[0];
  const kind = kindOf(main.place);
  const maxV = main.value;
  const recede = kf(f, [a, seg.end], [1.08, 0.94], EASE.soft);
  const rotY = kf(f, [a, seg.end], [0, -9], EASE.soft);
  const mainIn = sp(f, a, { damping: 15, stiffness: 120 });
  return (
    <AbsoluteFill>
      <Whip seg={seg} noEnter>
        <AbsoluteFill style={{ transform: `perspective(2400px) rotateY(${rotY}deg) scale(${recede})` }}>
          <div
            style={{
              position: 'absolute',
              left: 70,
              top: 540 + float(f, 4, 6),
              width: 600,
              height: 940,
              borderRadius: 64,
              background: 'linear-gradient(180deg, #171D1B 0%, #101412 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: shadowDeep,
              overflow: 'hidden',
              padding: 44,
              boxSizing: 'border-box',
              transform: `translateX(${(1 - mainIn) * -700}px) scale(${lerp(0.8, 1, mainIn)})`,
              opacity: clamp01(mainIn * 2),
            }}
          >
            <IconTile kind={kind} size={120} />
            <Label size={36} style={{ marginTop: 34 }}>
              {nameOf(main)}
            </Label>
            <div style={{ fontFamily: FONT_TIGHT, color: '#fff', fontSize: 168, fontWeight: 850, letterSpacing: '-0.05em', lineHeight: 1 }}>
              {main.value} {main.unit ?? '%'}
            </div>
            <Label size={30} style={{ marginTop: 6 }}>
              Cette semaine
            </Label>
            <div style={{ position: 'absolute', left: 44, right: 44, bottom: 44, height: 300, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => {
                const g = sp(f, a + 0.25 + i * 0.05, { damping: 13 });
                const hv = [0.78, 1, 0.82, 0.7, 0.75, 0.92, 0.95][(i + (seg.index % 3)) % 7];
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: '100%', height: 250 * hv * g, borderRadius: 18, background: hv === 1 ? PLACE[kind].color : `${PLACE[kind].color}66` }} />
                    <div style={{ fontFamily: FONT, fontSize: 24, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{d}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {list.slice(1).map((o, i) => (
            <SmallCard key={i} o={o} at={a + 0.12 + i * 0.1} x={705} y={540 + i * 315} w={305} h={i === 2 ? 310 : 290} seed={i + 1} maxV={maxV} />
          ))}
        </AbsoluteFill>
      </Whip>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={230} size={100} />
      <Disclaimer show />
    </AbsoluteFill>
  );
};
