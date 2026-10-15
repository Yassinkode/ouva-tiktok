import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, heatColor, kf, lerp, p, rand, s, shake, sp, vel } from '../lib';
import { Illustrative, KineticLine, MBlur, Odometer, Pill } from '../components/Core';
import { MapCard } from '../components/UI';
import { HouseIcon } from '../components/Icons';

export const STATS_CARD = { cx: 540, cy: 1010, w: 940, h: 1180, r: 64 };
const CELL = 56;

/** zoom curve with per-segment easing */
const zoomAt = (f: number) => {
  const t = f / FPS;
  const seg = (a: number, b: number, v0: number, v1: number, e = EASE.inOut) =>
    lerp(v0, v1, e(clamp01((t - a) / (b - a))));
  if (t < 1.52) return seg(0, 1.52, 0.52, 0.66, EASE.soft);
  if (t < 2.75) return seg(1.52, 1.78, 0.66, 1.3, EASE.out) + seg(1.78, 2.75, 0, 0.12, EASE.soft);
  if (t < 5.12) return seg(2.75, 3.3, 1.42, 2.75, EASE.inOut) + seg(3.3, 5.12, 0, 0.38, EASE.soft);
  if (t < 9.6) return seg(5.12, 5.8, 3.13, 0.78, EASE.inOut) + seg(5.8, 9.6, 0, 0.08, EASE.soft);
  return seg(9.6, 11.2, 0.86, 0.7, EASE.inOut);
};

export const MapScene: React.FC = () => {
  const f = useCurrentFrame();
  const T = [0, 2.75, 3.3, 5.12, 5.8, 9.6, 10.2, 10.85];
  const w = kf(f, T, [780, 780, 1240, 1240, 940, 940, 940, 940]);
  const h = kf(f, T, [1000, 1000, 2140, 2140, 1180, 1180, 1180, 1180]);
  const radius = kf(f, T, [64, 64, 0, 0, 64, 64, 64, 64]);
  const cy = kf(f, T, [1010, 1010, 960, 960, 1070, 1070, 1010, 1010]);

  // rotations (slow drift inside phases)
  const t = f / FPS;
  let rx: number, rz: number;
  if (t < 2.75) {
    rx = lerp(30, 9, EASE.out(clamp01(t / 1.6)));
    rz = lerp(-7, -2, EASE.out(clamp01(t / 2)));
  } else if (t < 5.12) {
    rx = kf(f, [2.75, 3.3, 5.12], [9, 0, 20], EASE.soft);
    rz = kf(f, [2.75, 3.3, 5.12], [-2, 0, -6], EASE.soft);
  } else if (t < 9.6) {
    rx = kf(f, [5.12, 5.8, 9.6], [20, 38, 34], EASE.inOut);
    rz = kf(f, [5.12, 5.8, 9.6], [-6, -12, 7], EASE.soft);
  } else {
    rx = kf(f, [9.6, 10.2, 10.85], [34, 34, 0], EASE.inOut);
    rz = kf(f, [9.6, 10.2, 10.85], [7, 7, 0], EASE.inOut);
  }

  // entrance spring
  const enter = sp(f, 0.02, { damping: 16, stiffness: 120 });
  const laugh = Math.sin(clamp01((t - 9.68) / 0.7) * Math.PI * 3) * (1 - clamp01((t - 9.68) / 0.7)) * 0.025;
  const scale = lerp(0.3, 1, enter) * (1 + laugh);

  const zoom = zoomAt(f);
  const zBlur = Math.min(16, vel(zoomAt, f) * 160);

  const appear =
    t < 5.3
      ? lerp(0, 0.56, EASE.soft(clamp01((t - 0.25) / 1.35)))
      : t < 10.25
      ? lerp(0.56, 1, EASE.inOut(clamp01((t - 5.35) / 1.9)))
      : lerp(1, 0, EASE.in(clamp01((t - 10.2) / 0.6)));
  const boost = kf(f, [5.6, 8.9], [0, 1], EASE.soft);
  const dim = kf(f, [10.3, 10.85], [0, 1], EASE.soft);
  const focusBlur = kf(f, [0, 0.45, 1.52, 1.56, 1.95], [14, 0, 0, 9, 0], EASE.out);

  const sh1 = shake(f, 1.55, 0.5, 16);
  const sh2 = shake(f, 3.48, 0.35, 6);
  const sh3 = shake(f, 3.0, 0.3, 4);

  // pin + pill (map space, counter-scaled)
  const pinPop = sp(f, 3.42, { damping: 8, stiffness: 190 });
  const pinS = clamp01(pinPop) === 0 ? 0 : pinPop;
  const pillIn = sp(f, 4.05, { damping: 13, stiffness: 160 });
  const pinVis = t < 10.4 ? 1 : 1 - clamp01((t - 10.4) / 0.3);
  const ringT = clamp01((t - 3.45) / 0.9);
  const pinTarget = t < 5.12 ? 1 : 1;

  const overlay = (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: CELL * 0.6,
        width: 0,
        height: 0,
        transform: `scale(${(1 / zoom) * pinTarget})`,
        opacity: pinVis,
      }}
    >
      {/* pulse ring */}
      {ringT > 0 && ringT < 1 && (
        <div
          style={{
            position: 'absolute',
            left: -170,
            top: -170,
            width: 340,
            height: 340,
            borderRadius: '50%',
            border: `6px solid rgba(255,255,255,${0.8 * (1 - ringT)})`,
            transform: `scale(${0.3 + ringT * 1.3})`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: -82,
          top: -200,
          width: 164,
          height: 200,
          transform: `scale(${pinS})`,
          transformOrigin: '50% 100%',
        }}
      >
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
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: '50%',
              background: C.homeBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HouseIcon size={70} color={C.home} />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 82 - 20,
            top: 150,
            width: 0,
            height: 0,
            borderLeft: '20px solid transparent',
            borderRight: '20px solid transparent',
            borderTop: '30px solid #fff',
          }}
        />
      </div>
      {/* Maison pill */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: -330,
          transform: `translate(-50%, ${(1 - pillIn) * 50}px) scale(${lerp(0.7, 1, pillIn)})`,
          opacity: clamp01(pillIn * 1.5),
          filter: pillIn < 0.6 ? `blur(${(1 - pillIn / 0.6) * 10}px)` : undefined,
        }}
      >
        <Pill style={{ fontSize: 46, padding: '20px 40px', gap: 18 }}>
          <HouseIcon size={44} color={C.home} />
          Maison
        </Pill>
      </div>
    </div>
  );

  // screen texts
  const counter = kf(f, [5.3, 6.55], [0, 30], EASE.out);
  const counterV = vel((x) => kf(x, [5.3, 6.55], [0, 30], EASE.out), f);
  const topIn = sp(f, 5.2, { damping: 15, stiffness: 140 });
  const topOut = p(f, 10.15, 0.35, EASE.in);
  const maisonOut = p(f, 10.2, 0.32, EASE.in);
  const sceneOut = 0;

  const word = 'À LA MAISON';
  return (
    <AbsoluteFill>
      <MBlur x={0} y={0}>
        <AbsoluteFill
          style={{
            transform: `translate(${sh1.x + sh2.x + sh3.x}px, ${sh1.y + sh2.y + sh3.y}px) rotate(${sh1.r}deg)`,
            filter: zBlur > 0.4 ? `blur(${zBlur}px)` : undefined,
            opacity: 1 - sceneOut,
          }}
        >
          <MapCard
            cx={540}
            cy={cy}
            w={w}
            h={h}
            radius={radius}
            rx={rx}
            rz={rz}
            scale={scale}
            zoom={zoom}
            cell={CELL}
            appear={appear}
            boost={boost}
            dim={dim}
            focusBlur={focusBlur}
            overlay={overlay}
          />
        </AbsoluteFill>
      </MBlur>

      {/* "tout rouge ?" */}
      {t < 3 && (
        <div style={{ position: 'absolute', top: 210, left: 0, right: 0 }}>
          <KineticLine
            size={128}
            out={2.62}
            words={[
              { t: 'tout', at: 1.2 },
              { t: 'rouge', at: 1.5, color: C.heatHigh },
              { t: '?', at: 1.85 },
            ]}
          />
        </div>
      )}

      {/* 30 JOURS */}
      {t > 5.1 && t < 10.6 && (
        <div
          style={{
            position: 'absolute',
            top: 130,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: clamp01(topIn * 1.4) * (1 - topOut),
            transform: `translateY(${(1 - topIn) * 80 - topOut * 120}px) scale(${lerp(0.85, 1, topIn)})`,
            filter: topOut > 0.02 ? `blur(${topOut * 24}px)` : topIn < 0.5 ? `blur(${(1 - topIn * 2) * 14}px)` : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
            <Odometer value={counter} digits={2} size={190} speedBlur={counterV * 10} />
            <div
              style={{
                fontFamily: FONT_TIGHT,
                fontWeight: 850,
                fontSize: 92,
                letterSpacing: '0.01em',
                color: C.ink,
                paddingBottom: 26,
              }}
            >
              JOURS
            </div>
          </div>
          {/* 30-day pixel strip */}
          <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
            {Array.from({ length: 30 }).map((_, i) => {
              const on = clamp01(counter - i);
              const v = 0.55 + rand(i * 3.3) * 0.45;
              return (
                <div
                  key={i}
                  style={{
                    width: 21,
                    height: 21,
                    borderRadius: 5,
                    background: on > 0 ? heatColor(v * (0.6 + 0.4 * boost)) : 'rgba(13,18,16,0.10)',
                    transform: `scale(${on > 0 ? lerp(1.5, 1, on) : 1})`,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* À LA MAISON */}
      {t > 8.4 && t < 10.6 && (
        <div
          style={{
            position: 'absolute',
            top: 1640,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            fontFamily: FONT_TIGHT,
            fontWeight: 850,
            fontSize: 104,
            letterSpacing: '-0.02em',
            opacity: 1 - maisonOut,
            transform: `translateY(${maisonOut * 60}px)`,
            filter: maisonOut > 0.02 ? `blur(${maisonOut * 20}px)` : undefined,
          }}
        >
          {word.split('').map((ch, i) => {
            const k = sp(f, 8.55 + i * 0.03, { damping: 12, stiffness: 200 });
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'pre',
                  color: i >= 5 ? C.heatHigh : C.ink,
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
      <Illustrative opacity={kf(f, [5.6, 6.2, 10.1, 10.4], [0, 1, 1, 0])} />
    </AbsoluteFill>
  );
};
