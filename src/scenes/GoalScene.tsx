import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, float, kf, lerp, p, sp, vel } from '../lib';
import { KineticLine, MBlur, Pill, Ring } from '../components/Core';
import { CheckIcon, FlagIcon, WalkIcon } from '../components/Icons';

export const GoalScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const e = sp(f, 33.12, { damping: 15, stiffness: 120 });
  const exitFn = (fr: number) => kf(fr, [36.72, 37.0], [0, -1700], EASE.in);
  const ex = exitFn(f);
  const exB = vel(exitFn, f) * 0.5;
  const bar = p(f, 34.6, 1.1, EASE.inOut);
  const ring = p(f, 34.7, 1.4, EASE.inOut);
  const check = sp(f, 36.05, { damping: 8, stiffness: 220 });
  const pill = sp(f, 33.72, { damping: 13 });
  const fy = float(f, 9, 8);

  return (
    <AbsoluteFill>
      <MBlur y={exB}>
        <AbsoluteFill style={{ transform: `translateY(${ex}px)` }}>
          {/* "Cette semaine" pill */}
          <div
            style={{
              position: 'absolute',
              top: 470,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              opacity: clamp01(pill * 2),
              transform: `translateY(${(1 - pill) * 50}px)`,
            }}
          >
            <Pill light style={{ fontSize: 40, padding: '20px 40px', color: C.mintInk }}>
              Cette semaine
            </Pill>
          </div>

          {/* goal card */}
          <AbsoluteFill style={{ perspective: 2200 }}>
            <div
              style={{
                position: 'absolute',
                left: 70,
                top: 620 + fy,
                width: 940,
                height: 760,
                borderRadius: 64,
                background: 'linear-gradient(155deg, #2D6A52 0%, #1A4536 45%, #0F261E 100%)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                boxShadow: '0 30px 60px rgba(10,60,40,0.25), 0 90px 160px rgba(10,60,40,0.30)',
                transform: `translateY(${(1 - e) * 900}px) rotateX(${(1 - e) * 45}deg) scale(${lerp(0.85, 1, e)})`,
                opacity: clamp01(e * 2),
                overflow: 'hidden',
                padding: 64,
                boxSizing: 'border-box',
                color: '#fff',
              }}
            >
              {/* glow */}
              <div
                style={{
                  position: 'absolute',
                  right: -160,
                  top: -160,
                  width: 560,
                  height: 560,
                  borderRadius: '50%',
                  background: `radial-gradient(closest-side, ${C.mint}55, transparent)`,
                  transform: `scale(${1 + Math.sin(f * 0.05) * 0.06})`,
                }}
              />
              <FlagIcon size={86} color="#fff" stroke={3.6} />
              <div style={{ fontFamily: FONT_TIGHT, fontWeight: 820, fontSize: 64, letterSpacing: '-0.035em', marginTop: 28, lineHeight: 1.05 }}>
                Objectif
                <br />
                de la semaine
              </div>
              <div style={{ position: 'absolute', right: 64, top: 64, width: 210, height: 210 }}>
                <Ring size={210} stroke={22} progress={ring * 0.4 + check * 0.6 * clamp01(check)} track="rgba(255,255,255,0.12)" />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ transform: `scale(${check})` }}>
                    <CheckIcon size={110} color={C.mint} stroke={6} />
                  </div>
                </div>
              </div>
              <div style={{ position: 'absolute', left: 64, right: 64, top: 360 }}>
                <KineticLine
                  size={92}
                  color="#fff"
                  accent={C.mint}
                  align="left"
                  words={[
                    { t: 'Sortir', at: 35.55 },
                    { t: 'un', at: 35.72 },
                    { t: 'peu', at: 35.85 },
                    { t: 'plus.', at: 36.0, accent: true },
                  ]}
                />
              </div>
              {/* progress */}
              <div style={{ position: 'absolute', left: 64, right: 64, bottom: 70 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 30, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
                  <span>Temps dehors</span>
                  <span style={{ color: C.mint }}>en route</span>
                </div>
                <div style={{ position: 'relative', height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.12)' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${bar * 46 + check * 12}%`,
                      borderRadius: 13,
                      background: `linear-gradient(90deg, #2FBF8F, ${C.mint})`,
                      boxShadow: `0 0 24px ${C.mint}88`,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: `calc(${bar * 46 + check * 12}% - 40px)`,
                      top: -78,
                      opacity: bar > 0.02 ? 1 : 0,
                    }}
                  >
                    <WalkIcon size={72} color="#fff" phase={f * 0.32} />
                  </div>
                </div>
              </div>
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </MBlur>
    </AbsoluteFill>
  );
};
