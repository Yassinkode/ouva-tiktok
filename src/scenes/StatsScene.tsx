import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, float, kf, lerp, p, rand, s, shake, sp, vel } from '../lib';
import { Illustrative, KineticLine, MBlur, Odometer, Ring, shadowDeep } from '../components/Core';
import { IconTile, Label, PLACE, PlaceKind, PlaceTile } from '../components/UI';
import { STATS_CARD } from './MapScene';

const K = STATS_CARD;

const SmallCard: React.FC<{ kind: PlaceKind; pct: number; at: number; x: number; y: number; w: number; h: number; seed: number }> = ({
  kind,
  pct,
  at,
  x,
  y,
  w,
  h,
  seed,
}) => {
  const f = useCurrentFrame();
  const e = sp(f, at, { damping: 15, stiffness: 150 });
  const fn = (fr: number) => (1 - sp(fr, at, { damping: 15, stiffness: 150 })) * 520;
  const bx = vel(fn, f) * 0.9;
  const fy = float(f, seed, 7);
  const bar = p(f, at + 0.15, 0.7);
  return (
    <div
      style={{
        position: 'absolute',
        left: x + (1 - e) * 520,
        top: y + fy,
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
        <div style={{ fontFamily: FONT, color: 'rgba(255,255,255,0.65)', fontSize: 28, fontWeight: 600 }}>{PLACE[kind].name}</div>
        <div style={{ fontFamily: FONT_TIGHT, color: '#fff', fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 4 }}>
          {Math.round(pct * bar)} %
        </div>
        <div style={{ height: 10, borderRadius: 9, background: 'rgba(255,255,255,0.09)', marginTop: 12 }}>
          <div style={{ height: '100%', width: `${(pct / 62) * 100 * bar}%`, borderRadius: 9, background: PLACE[kind].color }} />
        </div>
      </div>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;

  /* -------- counters -------- */
  const cnt = (fr: number) => kf(fr, [12.36, 13.5], [0, 62], EASE.out);
  const c62 = cnt(f);
  const cV = vel(cnt, f);
  const push = kf(f, [12.3, 13.6, 15.8], [1, 1.05, 1.03], EASE.out);
  const sh = shake(f, 13.42, 0.4, 9);
  const sh2 = shake(f, 18.95, 0.45, 12);
  const sh3 = shake(f, 17.12, 0.3, 5);

  /* -------- phase switching -------- */
  const ringOutFn = (fr: number) => kf(fr, [15.85, 16.15], [0, -1150], EASE.in);
  const ringX = ringOutFn(f);
  const ringBlur = vel(ringOutFn, f) * 0.5;
  const barsInFn = (fr: number) => kf(fr, [15.95, 16.35], [1150, 0], EASE.out);
  const barsX = barsInFn(f);
  const barsBlur = vel(barsInFn, f) * 0.5;

  /* zoom punch on the "4 %" */
  const zoomFn = (fr: number) =>
    fr < s(19.85) ? kf(fr, [18.9, 19.12], [1, 2.15], EASE.out) : lerp(2.15, 1, sp(fr, 19.88, { damping: 11, stiffness: 120 }));
  const zoom = t < 20.7 ? zoomFn(f) : 1;
  const zBlur = Math.min(10, vel(zoomFn, f) * 60);

  /* -------- card → bento -------- */
  const bt = p(f, 20.62, 0.55, EASE.inOut);
  const cardW = lerp(K.w, 600, bt);
  const cardH = lerp(K.h, 940, bt);
  const cardCx = lerp(K.cx, 70 + 300, bt);
  const cardCy = lerp(K.cy, 540 + 470, bt);
  const recede = kf(f, [20.62, 21.9], [1.06, 0.95], EASE.soft);
  const rotY = kf(f, [20.62, 21.9], [0, -9], EASE.soft);
  const fl = float(f, 4, 6);

  const card = (
    <div
      style={{
        position: 'absolute',
        left: cardCx - cardW / 2,
        top: cardCy - cardH / 2 + fl,
        width: cardW,
        height: cardH,
        borderRadius: K.r,
        background: 'linear-gradient(180deg, #171D1B 0%, #101412 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: shadowDeep,
        overflow: 'hidden',
        transform: `scale(${t < 20.62 ? push : 1})`,
      }}
    >
      {/* ===== ring phase ===== */}
      {t < 16.3 && (
        <MBlur x={ringBlur}>
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${ringX}px)` }}>
            <Label size={34} style={{ position: 'absolute', left: 64, top: 60, opacity: p(f, 10.95, 0.5) }}>
              30 derniers jours
            </Label>
            <div
              style={{
                position: 'absolute',
                left: (K.w - 600) / 2,
                top: 170,
                width: 600,
                height: 600,
                transform: `scale(${lerp(0.4, 1, sp(f, 10.9, { damping: 12 }))}) rotate(${(1 - sp(f, 10.9, { damping: 14 })) * -90}deg)`,
                opacity: p(f, 10.88, 0.3),
              }}
            >
              <Ring size={600} stroke={44} progress={c62 / 100} glow />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Odometer value={c62} digits={2} size={230} color="#fff" speedBlur={cV * 3} />
                  <div style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 104, color: C.mint, marginTop: 30, marginLeft: 6 }}>%</div>
                </div>
                <Label size={34} style={{ marginTop: 6, opacity: p(f, 13.2, 0.5) }}>
                  de mon temps
                </Label>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 60,
                top: 860 + (1 - sp(f, 14.5, { damping: 14 })) * 360,
                opacity: clamp01(sp(f, 14.5) * 2),
              }}
            >
              <PlaceTile kind="home" width={820} value="62 % · 30 jours" bar={0.62 * p(f, 14.65, 0.8)} />
            </div>
          </div>
        </MBlur>
      )}

      {/* ===== bars phase ===== */}
      {t > 15.9 && t < 21.0 && (
        <MBlur x={barsBlur + zBlur * 0.2} y={zBlur}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translateX(${barsX}px) scale(${zoom})`,
              transformOrigin: '685px 760px',
              opacity: 1 - p(f, 20.6, 0.15),
            }}
          >
            {(['home', 'gym'] as const).map((kind, i) => {
              const cx = i === 0 ? 255 : 685;
              const grow = i === 0 ? sp(f, 16.0, { damping: 15, stiffness: 110 }) : sp(f, 17.08, { damping: 9, stiffness: 220 });
              const hBar = (i === 0 ? 600 : 39) * grow;
              const baseY = 880;
              const lab = i === 0 ? sp(f, 16.15, { damping: 12 }) : sp(f, 17.1, { damping: 8, stiffness: 260 });
              const icon = i === 0 ? sp(f, 15.98, { damping: 13 }) : sp(f, 16.02, { damping: 10, stiffness: 200 });
              return (
                <React.Fragment key={kind}>
                  <div
                    style={{
                      position: 'absolute',
                      left: cx - 130,
                      top: baseY - hBar,
                      width: 260,
                      height: Math.max(0, hBar),
                      borderRadius: '36px 36px 14px 14px',
                      background: `linear-gradient(180deg, ${PLACE[kind].color} 0%, ${PLACE[kind].color}88 100%)`,
                      boxShadow: `0 0 60px ${PLACE[kind].color}40`,
                    }}
                  />
                  {/* value label */}
                  <div
                    style={{
                      position: 'absolute',
                      left: cx - 200,
                      width: 400,
                      top: baseY - hBar - (i === 0 ? 150 : 96),
                      textAlign: 'center',
                      fontFamily: FONT_TIGHT,
                      fontWeight: 850,
                      fontSize: i === 0 ? 132 : 70,
                      letterSpacing: '-0.045em',
                      color: '#fff',
                      opacity: clamp01(lab * 2),
                      transform: `scale(${lab})`,
                      transformOrigin: '50% 100%',
                    }}
                  >
                    {i === 0 ? '62 %' : '4 %'}
                  </div>
                  {/* icon + name */}
                  <div
                    style={{
                      position: 'absolute',
                      left: cx - 200,
                      width: 400,
                      top: baseY + 46,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 18,
                      opacity: clamp01(icon * 2),
                      transform: `translateY(${(1 - icon) * 60}px) scale(${lerp(0.6, 1, icon)})`,
                    }}
                  >
                    <IconTile kind={kind} size={112} />
                    <Label size={36} color="rgba(255,255,255,0.85)">
                      {PLACE[kind].name}
                    </Label>
                  </div>
                </React.Fragment>
              );
            })}
            {/* baseline */}
            <div style={{ position: 'absolute', left: 60, right: 60, top: 884, height: 3, background: 'rgba(255,255,255,0.12)' }} />
          </div>
        </MBlur>
      )}

      {/* ===== bento: big Maison card content ===== */}
      {t > 20.7 && (
        <div style={{ position: 'absolute', inset: 0, padding: 44, opacity: p(f, 20.6, 0.2) }}>
          <IconTile kind="home" size={120} />
          <Label size={36} style={{ marginTop: 34 }}>
            Maison
          </Label>
          <div style={{ fontFamily: FONT_TIGHT, color: '#fff', fontSize: 168, fontWeight: 850, letterSpacing: '-0.05em', lineHeight: 1 }}>
            62 %
          </div>
          <Label size={30} style={{ marginTop: 6 }}>
            Cette semaine
          </Label>
          <div style={{ position: 'absolute', left: 44, right: 44, bottom: 44, height: 300, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => {
              const g = sp(f, 20.95 + i * 0.05, { damping: 13 });
              const hv = [0.78, 1, 0.82, 0.7, 0.75, 0.92, 0.95][i];
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: '100%',
                      height: 250 * hv * g,
                      borderRadius: 18,
                      background: i === 1 ? C.home : `${C.home}66`,
                    }}
                  />
                  <div style={{ fontFamily: FONT, fontSize: 24, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{d}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // top kinetic text
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `translate(${sh.x + sh2.x + sh3.x}px, ${sh.y + sh2.y + sh3.y}px) perspective(2400px) rotateX(${float(f, 31, 2.6) * (1 - bt) * p(f, 10.95, 1.4, EASE.soft)}deg) rotateY(${rotY + float(f, 21, 3.6) * (1 - bt) * p(f, 10.95, 1.4, EASE.soft)}deg) scale(${t > 20.62 ? recede : 1})`,
        }}
      >
        {card}
        {t > 20.6 && (
          <>
            <SmallCard kind="gym" pct={4} at={20.72} x={705} y={540} w={305} h={290} seed={1} />
            <SmallCard kind="school" pct={17} at={20.82} x={705} y={855} w={305} h={290} seed={2} />
            <SmallCard kind="work" pct={15} at={20.92} x={705} y={1170} w={305} h={310} seed={3} />
          </>
        )}
      </AbsoluteFill>

      {t < 16.2 && (
        <div style={{ position: 'absolute', top: 205, left: 0, right: 0 }}>
          <KineticLine
            size={118}
            out={15.66}
            words={[
              { t: 'Les', at: 11.0 },
              { t: 'chiffres.', at: 11.25, accent: true },
            ]}
          />
        </div>
      )}
      {t > 15.9 && t < 20.7 && (
        <div style={{ position: 'absolute', top: 205, left: 0, right: 0 }}>
          <KineticLine
            size={118}
            out={18.85}
            words={[
              { t: 'La', at: 15.98 },
              { t: 'salle', at: 16.1, color: PLACE.gym.color },
              { t: '?', at: 16.32 },
            ]}
          />
        </div>
      )}
      <Illustrative opacity={kf(f, [11.3, 11.8, 21.6, 21.8], [0, 1, 1, 0])} />
    </AbsoluteFill>
  );
};
