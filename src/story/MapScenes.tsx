import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT_TIGHT, FPS, clamp01, heatColor, kf, lerp, p, rand, shake, sp, vel } from '../lib';
import { MBlur, Odometer, Pill } from '../components/Core';
import { MapCard, PLACE, PlaceKind } from '../components/UI';
import { Caption, Disclaimer, Whip, tOr } from './common';
import { Seg } from './types';

const CELL = 56;

const Pin: React.FC<{ kind: PlaceKind; pop: number; ring: number; label?: string; pill: number; zoom: number; scale?: number }> = ({
  kind,
  pop,
  ring,
  label,
  pill,
  zoom,
  scale = 1,
}) => {
  const P = PLACE[kind] ?? PLACE.home;
  return (
    <div style={{ position: 'absolute', left: 0, top: CELL * 0.6, width: 0, height: 0, transform: `scale(${(1 / zoom) * scale})` }}>
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: 'absolute',
            left: -170,
            top: -170,
            width: 340,
            height: 340,
            borderRadius: '50%',
            border: `6px solid rgba(255,255,255,${0.8 * (1 - ring)})`,
            transform: `scale(${0.3 + ring * 1.3})`,
          }}
        />
      )}
      <div style={{ position: 'absolute', left: -82, top: -200, width: 164, height: 200, transform: `scale(${Math.max(0, pop)})`, transformOrigin: '50% 100%' }}>
        <div
          style={{
            width: 164,
            height: 164,
            borderRadius: '50%',
            background: '#121715',
            border: '9px solid #fff',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{ width: 112, height: 112, borderRadius: '50%', background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <P.Icon size={66} color={P.color} />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 62,
            top: 150,
            width: 0,
            height: 0,
            borderLeft: '20px solid transparent',
            borderRight: '20px solid transparent',
            borderTop: '30px solid #fff',
          }}
        />
      </div>
      {label && pill > 0.001 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: -330,
            transform: `translate(-50%, ${(1 - pill) * 50}px) scale(${lerp(0.7, 1, pill)})`,
            opacity: clamp01(pill * 1.5),
            filter: pill < 0.6 ? `blur(${(1 - pill / 0.6) * 10}px)` : undefined,
          }}
        >
          <Pill style={{ fontSize: 46, padding: '20px 40px', gap: 18 }}>
            <P.Icon size={44} color={P.color} />
            {label}
          </Pill>
        </div>
      )}
    </div>
  );
};

/* 1 ─ heat map appears, punch-in on the accent word */
export const HeatmapReveal: React.FC<{ seg: Seg; seed: number }> = ({ seg, seed }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const a = seg.start;
  const punch = tOr(seg, 'punch', 0.55);
  const zoomFn = (fr: number) => {
    const tt = fr / FPS;
    if (tt < punch) return lerp(0.52, 0.66, EASE.soft(clamp01((tt - a) / Math.max(0.3, punch - a))));
    return lerp(0.66, 1.3, EASE.out(clamp01((tt - punch) / 0.26))) + 0.12 * EASE.soft(clamp01((tt - punch - 0.26) / 1.2));
  };
  const zoom = zoomFn(f);
  const zb = Math.min(14, vel(zoomFn, f) * 160);
  const enter = sp(f, a + 0.02, { damping: 16, stiffness: 120 });
  const appear = t < punch ? lerp(0, 0.56, EASE.soft(clamp01((t - a - 0.2) / Math.max(0.4, punch - a - 0.2)))) : lerp(0.56, 0.7, p(f, punch, 1.2));
  const focus = kf(f, [a, a + 0.45], [14, 0], EASE.out) + kf(f, [punch, punch + 0.04, punch + 0.4], [0, 9, 0], EASE.out);
  const sh = shake(f, punch + 0.02, 0.5, 16);
  return (
    <AbsoluteFill>
      <Whip seg={seg} noEnter>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)`, filter: zb > 0.4 ? `blur(${zb}px)` : undefined }}>
          <MapCard
            cx={540}
            cy={1010}
            w={780}
            h={1000}
            radius={64}
            rx={lerp(30, 9, p(f, a, 1.6))}
            rz={lerp(-7, -2, p(f, a, 2))}
            scale={lerp(0.3, 1, enter)}
            zoom={zoom}
            cell={CELL}
            appear={appear}
            focusBlur={focus}
            seed={seed}
          />
        </AbsoluteFill>
      </Whip>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={210} size={124} accent={C.heatHigh} />
    </AbsoluteFill>
  );
};

/* 2 ─ dive into the map, pin + label pop */
export const PlacePin: React.FC<{ seg: Seg; seed: number }> = ({ seg, seed }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const a = seg.start;
  const b = seg.end;
  const pinT = tOr(seg, 'pin', 0.3);
  const kind: PlaceKind = seg.params.place ?? 'home';
  const label: string = seg.params.label ?? PLACE[kind]?.name ?? 'Maison';
  const zoomFn = (fr: number) => {
    const tt = fr / FPS;
    return lerp(1.4, 2.75, EASE.inOut(clamp01((tt - a) / 0.55))) + 0.38 * EASE.soft(clamp01((tt - a - 0.55) / Math.max(0.5, b - a - 0.55)));
  };
  const zoom = zoomFn(f);
  const zb = Math.min(16, vel(zoomFn, f) * 160);
  const rx = kf(f, [a, a + 0.55, b], [9, 0, 20], EASE.soft);
  const rz = kf(f, [a, a + 0.55, b], [-2, 0, -6], EASE.soft);
  const pop = sp(f, pinT - 0.05, { damping: 8, stiffness: 190 });
  const pill = sp(f, pinT + 0.5, { damping: 13, stiffness: 160 });
  const sh = shake(f, pinT, 0.35, 6);
  return (
    <AbsoluteFill>
      <Whip seg={seg} noEnter>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)`, filter: zb > 0.4 ? `blur(${zb}px)` : undefined, opacity: clamp01((t - a) / 0.12) }}>
          <MapCard
            cx={540}
            cy={960}
            w={1240}
            h={2140}
            radius={0}
            rx={rx}
            rz={rz}
            scale={1}
            zoom={zoom}
            cell={CELL}
            appear={0.62}
            seed={seed}
            shadow={false}
            overlay={<Pin kind={kind} pop={pop} ring={clamp01((t - pinT) / 0.9)} label={label} pill={pill} zoom={zoom} />}
          />
        </AbsoluteFill>
      </Whip>
      <Caption cap={seg.cap} out={seg.end - 0.3} top={190} size={110} color="#fff" accent={C.mint} />
    </AbsoluteFill>
  );
};

/* 3 ─ tilted heat map + big counter (e.g. 30 JOURS) */
export const CounterMap: React.FC<{ seg: Seg; seed: number }> = ({ seg, seed }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const a = seg.start;
  const b = seg.end;
  const ct = tOr(seg, 'count', 0.05);
  const V: number = seg.params.value ?? 30;
  const unit: string = (seg.params.unit ?? 'JOURS').toUpperCase();
  const bottom: string = (seg.params.bottom ?? '').toUpperCase();
  const bt = tOr(seg, 'bottom', 0.75);
  const kind: PlaceKind = seg.params.place ?? 'home';
  const zoomFn = (fr: number) => {
    const tt = fr / FPS;
    return lerp(3.0, 0.8, EASE.inOut(clamp01((tt - a) / 0.62))) + 0.08 * EASE.soft(clamp01((tt - a - 0.62) / Math.max(0.5, b - a)));
  };
  const zoom = zoomFn(f);
  const zb = Math.min(16, vel(zoomFn, f) * 160);
  const cntFn = (fr: number) => kf(fr, [ct, ct + 1.25], [0, V], EASE.out);
  const counter = cntFn(f);
  const cv = vel(cntFn, f);
  const boost = kf(f, [a + 0.4, b], [0, 1], EASE.soft);
  const appear = lerp(0.56, 1, EASE.inOut(clamp01((t - ct) / 1.9)));
  const topIn = sp(f, a + 0.1, { damping: 15, stiffness: 140 });
  const strip = V <= 31 && Number.isInteger(V);
  return (
    <AbsoluteFill>
      <Whip seg={seg} noEnter>
        <AbsoluteFill style={{ filter: zb > 0.4 ? `blur(${zb}px)` : undefined }}>
          <MapCard
            cx={540}
            cy={1070}
            w={lerp(1240, 940, p(f, a, 0.62, EASE.inOut))}
            h={lerp(2140, 1180, p(f, a, 0.62, EASE.inOut))}
            radius={lerp(0, 64, p(f, a, 0.62))}
            rx={kf(f, [a, a + 0.62, b], [20, 38, 34], EASE.inOut)}
            rz={kf(f, [a, a + 0.62, b], [-6, -12, 7], EASE.soft)}
            scale={1}
            zoom={zoom}
            cell={CELL}
            appear={appear}
            boost={boost}
            seed={seed}
            overlay={<Pin kind={kind} pop={1} ring={0} zoom={zoom} label={seg.params.label} pill={1} />}
          />
        </AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            top: 130,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: clamp01(topIn * 1.4),
            transform: `translateY(${(1 - topIn) * 80}px) scale(${lerp(0.85, 1, topIn)})`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
            <Odometer value={counter} digits={String(Math.round(V)).length} size={190} speedBlur={cv * 10} />
            <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: unit.length > 8 ? 64 : 92, color: C.ink, paddingBottom: 26 }}>{unit}</div>
          </div>
          {strip && (
            <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
              {Array.from({ length: V }).map((_, i) => {
                const on = clamp01(counter - i);
                const v = 0.55 + rand(i * 3.3 + seed) * 0.45;
                return (
                  <div
                    key={i}
                    style={{
                      width: Math.min(21, 870 / V - 7),
                      height: 21,
                      borderRadius: 5,
                      background: on > 0 ? heatColor(v * (0.6 + 0.4 * boost)) : 'rgba(13,18,16,0.10)',
                      transform: `scale(${on > 0 ? lerp(1.5, 1, on) : 1})`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
        {bottom && (
          <div
            style={{
              position: 'absolute',
              top: 1640,
              left: 30,
              right: 30,
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              fontFamily: FONT_TIGHT,
              fontWeight: 850,
              fontSize: bottom.length > 14 ? 76 : 104,
              letterSpacing: '-0.02em',
            }}
          >
            {bottom.split('').map((ch, i) => {
              const k = sp(f, bt + i * 0.025, { damping: 12, stiffness: 200 });
              const lastWordStart = bottom.lastIndexOf(' ') + 1;
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    color: i >= lastWordStart ? C.heatHigh : C.ink,
                    opacity: clamp01(k * 2),
                    transform: `translateY(${(1 - k) * 90}px) rotate(${(1 - k) * 12}deg)`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        )}
      </Whip>
      <Disclaimer show={t > a + 0.3} />
    </AbsoluteFill>
  );
};

/* 11 ─ outro: fly over the map, red cells cool down to green */
export const OutroMap: React.FC<{ seg: Seg; seed: number }> = ({ seg, seed }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const a = seg.start;
  const b = seg.end;
  const coolT = tOr(seg, 'cool', 0.35);
  const inFn = (fr: number) => kf(fr, [a, a + 0.42], [1500, 0], EASE.out);
  const yIn = inFn(f);
  const inB = vel(inFn, f) * 0.45;
  const out = p(f, b - 0.45, 0.55, EASE.inOut);
  const kind: PlaceKind = seg.params.place ?? 'home';
  return (
    <AbsoluteFill>
      <MBlur y={inB}>
        <AbsoluteFill style={{ transform: `translateY(${yIn}px)`, opacity: 1 - clamp01((t - b + 0.1) / 0.3) }}>
          <MapCard
            cx={540}
            cy={1040}
            w={960}
            h={1300}
            radius={64}
            rx={kf(f, [a, b], [46, 34], EASE.soft)}
            rz={kf(f, [a, b], [-16, 9], EASE.soft) + out * 30}
            scale={lerp(1, 0.18, out)}
            zoom={kf(f, [a, b], [1.35, 0.85], EASE.soft)}
            panX={kf(f, [a, b], [140, -20], EASE.soft)}
            panY={kf(f, [a, b], [-160, 10], EASE.soft)}
            cell={CELL}
            appear={1}
            boost={1}
            cool={kf(f, [coolT, coolT + 1.2], [0, 1], EASE.soft)}
            focusBlur={out * 8}
            seed={seed}
            overlay={<Pin kind={kind} pop={1} ring={0} zoom={kf(f, [a, b], [1.35, 0.85], EASE.soft)} pill={0} scale={0.85} />}
          />
        </AbsoluteFill>
      </MBlur>
      <Caption cap={seg.cap} out={b - 0.1} top={190} size={104} />
      <Disclaimer show={t > a + 0.4 && t < b - 0.2} text="Animation illustrative" />
    </AbsoluteFill>
  );
};
