import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT_TIGHT, FPS, clamp01, kf, lerp, sp, vel } from '../lib';
import { MBlur } from '../components/Core';

/** Full-bleed mint wipe with italic heavy word – nod to the reference "FAST" beat */
export const WipeScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const xFn = (fr: number) =>
    fr / FPS < 23.1 ? kf(fr, [21.72, 21.98], [1150, 0], EASE.out) : kf(fr, [23.12, 23.42], [0, -1150], EASE.in);
  const x = xFn(f);
  const bx = vel(xFn, f) * 0.55;
  const word = 'SÉDENTAIRE';
  const small = sp(f, 21.9, { damping: 14 });
  return (
    <AbsoluteFill>
      <MBlur x={bx}>
        <AbsoluteFill style={{ transform: `translateX(${x}px)` }}>
          <AbsoluteFill style={{ background: `linear-gradient(160deg, #6BEABF 0%, ${C.mint} 45%, #3FCB9C 100%)` }} />
          {/* subtle pixel texture */}
          <AbsoluteFill
            style={{
              opacity: 0.12,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.6) 2px, transparent 2px)',
              backgroundSize: '54px 54px',
              transform: `translateY(${(f * 0.6) % 54}px)`,
            }}
          />
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: FONT_TIGHT,
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 64,
                color: C.mintInk,
                opacity: clamp01(small * 2),
                transform: `translateY(${(1 - small) * 40}px)`,
                marginBottom: 6,
                letterSpacing: '-0.02em',
              }}
            >
              trop
            </div>
            <div style={{ display: 'flex', fontFamily: FONT_TIGHT, fontStyle: 'italic', fontWeight: 900, fontSize: 150, letterSpacing: '-0.05em', color: '#08241B' }}>
              {word.split('').map((ch, i) => {
                const k = sp(f, 22.02 + i * 0.028, { damping: 11, stiffness: 230 });
                const st = kf(f, [22.0 + i * 0.028, 22.25 + i * 0.028], [2.2, 1], EASE.out);
                return (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      opacity: clamp01(k * 2.5),
                      transform: `translateX(${(1 - k) * 120}px) scaleX(${st})`,
                      filter: k < 0.7 ? `blur(${(1 - k / 0.7) * 10}px)` : undefined,
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
            <div
              style={{
                fontFamily: FONT_TIGHT,
                fontStyle: 'italic',
                fontWeight: 900,
                fontSize: 150,
                color: '#08241B',
                lineHeight: 0.9,
                transform: `scale(${lerp(0.3, 1, sp(f, 22.45, { damping: 7, stiffness: 260 }))}) rotate(${lerp(-30, 8, sp(f, 22.45, { damping: 7 }))}deg)`,
                opacity: clamp01(sp(f, 22.45) * 3),
              }}
            >
              ?
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </MBlur>
    </AbsoluteFill>
  );
};
