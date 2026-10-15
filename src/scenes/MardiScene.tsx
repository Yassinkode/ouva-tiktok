import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, float, kf, lerp, p, shake, sp, vel } from '../lib';
import { Illustrative, MBlur, Odometer, shadowDeep, shadowLight } from '../components/Core';
import { HouseIcon, WalkIcon } from '../components/Icons';
import { IconTile } from '../components/UI';

export const MardiScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const push = kf(f, [28.7, 33.0], [1, 1.06], EASE.soft);
  const recede = p(f, 32.95, 0.6, EASE.inOut);
  const fade = kf(f, [34.0, 34.8], [0, 1], EASE.soft);
  const sh = shake(f, 31.75, 0.4, 10);

  const hrsFn = (fr: number) => kf(fr, [30.15, 31.2], [0, 14], EASE.out);
  const hrs = hrsFn(f);
  const hV = vel(hrsFn, f);
  const fill = hrs / 24;

  const card = sp(f, 29.95, { damping: 15, stiffness: 140 });
  const track = sp(f, 30.0, { damping: 16, stiffness: 120 });
  const zero = sp(f, 31.7, { damping: 9, stiffness: 230 });

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${sh.x}px, ${sh.y}px) scale(${push * lerp(1, 0.8, recede)})`,
        filter: recede > 0.02 ? `blur(${recede * 16}px)` : undefined,
        opacity: lerp(1, 0.32, recede) * (1 - fade),
      }}
    >
      {/* MARDI */}
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          fontFamily: FONT_TIGHT,
          fontWeight: 900,
          fontSize: 240,
          letterSpacing: '-0.05em',
          color: C.ink,
        }}
      >
        {'MARDI'.split('').map((ch, i) => {
          const fn = (fr: number) => (1 - sp(fr, 28.8 + i * 0.045, { damping: 14, stiffness: 210 })) * 700;
          const x = fn(f);
          const b = vel(fn, f) * 0.5;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                transform: `translateX(${x}px)`,
                filter: b > 0.4 ? `blur(${Math.min(18, b)}px)` : undefined,
                opacity: clamp01(1 - x / 700) * 1.2,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 560,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 560,
          fontSize: 44,
          color: C.inkSoft,
          opacity: p(f, 29.25, 0.4),
          transform: `translateY(${(1 - p(f, 29.25, 0.5)) * 30}px)`,
        }}
      >
        par exemple
      </div>

      {/* big card */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 690 + float(f, 3, 6),
          width: 920,
          height: 330,
          borderRadius: 60,
          background: 'linear-gradient(180deg, #1A201E 0%, #111513 100%)',
          boxShadow: shadowDeep,
          border: '1px solid rgba(255,255,255,0.07)',
          transform: `translateY(${(1 - card) * 500}px) rotateX(${(1 - card) * 30}deg)`,
          opacity: clamp01(card * 2),
          display: 'flex',
          alignItems: 'center',
          padding: '0 60px',
          gap: 50,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ transform: `scale(${lerp(0.4, 1, sp(f, 30.1, { damping: 9 }))})` }}>
          <IconTile kind="home" size={190} solid />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <Odometer value={hrs} digits={2} size={190} color="#fff" speedBlur={hV * 12} />
            <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 110, color: C.home, marginLeft: 14 }}>h</div>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 38, fontWeight: 560, color: 'rgba(255,255,255,0.65)', marginTop: -6, opacity: p(f, 30.75, 0.4) }}>
            à la maison
          </div>
        </div>
      </div>

      {/* timeline */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 1110,
          width: 920,
          opacity: clamp01(track * 2),
          transform: `translateX(${(1 - track) * 300}px)`,
        }}
      >
        <div
          style={{
            position: 'relative',
            height: 120,
            borderRadius: 60,
            background: 'rgba(255,255,255,0.75)',
            border: '1.5px solid #fff',
            boxShadow: shadowLight,
            overflow: 'hidden',
          }}
        >
          {/* hour ticks */}
          {Array.from({ length: 23 }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: ((i + 1) / 24) * 920, top: 48, width: 2, height: 24, background: 'rgba(13,18,16,0.12)' }} />
          ))}
          <div
            style={{
              position: 'absolute',
              left: 10,
              top: 10,
              bottom: 10,
              width: Math.max(0, fill * 900),
              borderRadius: 50,
              background: `linear-gradient(90deg, #F2A86F, ${C.home})`,
              boxShadow: `0 6px 24px ${C.home}66`,
            }}
          />
          {fill > 0.03 && (
            <div
              style={{
                position: 'absolute',
                left: 10 + fill * 900 - 90,
                top: 20,
                width: 80,
                height: 80,
                borderRadius: 40,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
              }}
            >
              <HouseIcon size={44} color={C.home} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, padding: '0 6px', fontFamily: FONT, fontSize: 28, fontWeight: 560, color: C.inkSoft }}>
          {['0 h', '6 h', '12 h', '18 h', '24 h'].map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>

      {/* 0 sortie */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 1360,
          display: 'flex',
          justifyContent: 'center',
          opacity: clamp01(zero * 2.5),
          transform: `scale(${lerp(0.4, 1, zero)}) rotate(${(1 - zero) * -8}deg)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 26,
            padding: '30px 54px 30px 40px',
            borderRadius: 999,
            background: C.ink,
            boxShadow: shadowDeep,
          }}
        >
          <div style={{ width: 96, height: 96, borderRadius: 48, background: '#2A1A18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WalkIcon size={62} color={C.heatHigh} phase={0} />
          </div>
          <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 96, letterSpacing: '-0.04em', color: '#fff' }}>
            <span style={{ color: C.heatHigh }}>0</span> sortie
          </div>
        </div>
      </div>
      <Illustrative opacity={kf(f, [29.2, 29.6], [0, 1])} text="Exemple illustratif" />
    </AbsoluteFill>
  );
};
