import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, p, sp, vel } from '../lib';
import { Illustrative, KineticLine, MBlur, Pill } from '../components/Core';
import { MapCard } from '../components/UI';
import { HouseIcon, OuvaMark } from '../components/Icons';

export const FinalScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;

  /* ----- map fly-over ----- */
  const inFn = (fr: number) => kf(fr, [36.78, 37.2], [1500, 0], EASE.out);
  const yIn = inFn(f);
  const inB = vel(inFn, f) * 0.45;
  const out = p(f, 38.9, 0.55, EASE.inOut);
  const rz = kf(f, [36.8, 38.9], [-16, 9], EASE.soft) + out * 30;
  const rx = kf(f, [36.8, 38.9], [46, 34], EASE.soft);
  const zoom = kf(f, [36.8, 38.9], [1.35, 0.85], EASE.soft);
  const panX = kf(f, [36.8, 38.9], [140, -20], EASE.soft);
  const panY = kf(f, [36.8, 38.9], [-160, 10], EASE.soft);
  const cool = kf(f, [37.55, 38.75], [0, 1], EASE.soft);
  const mapScale = lerp(1, 0.18, out);

  /* ----- logo ----- */
  const mark = sp(f, 39.05, { damping: 11, stiffness: 150 });
  const sub = sp(f, 39.7, { damping: 16 });
  const store = sp(f, 40.3, { damping: 15 });
  const sheen = kf(f, [40.0, 40.9], [-0.4, 1.4], EASE.inOut);
  const settle = kf(f, [39.05, 41.2], [1.06, 1], EASE.soft);

  return (
    <AbsoluteFill>
      {t < 39.5 && (
        <MBlur y={inB}>
          <AbsoluteFill
            style={{
              transform: `translateY(${yIn}px)`,
              opacity: 1 - clamp01((t - 39.15) / 0.3),
            }}
          >
            <MapCard
              cx={540}
              cy={1040}
              w={960}
              h={1300}
              radius={64}
              rx={rx}
              rz={rz}
              scale={mapScale}
              zoom={zoom}
              panX={panX}
              panY={panY}
              cell={56}
              appear={1}
              boost={1}
              cool={cool}
              focusBlur={out * 8}
              overlay={
                <div style={{ position: 'absolute', left: 0, top: 34, transform: `scale(${1 / zoom})` }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: -70,
                      top: -150,
                      width: 140,
                      height: 140,
                      borderRadius: 70,
                      background: '#121715',
                      border: '8px solid #fff',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 16px 36px rgba(0,0,0,0.45)',
                    }}
                  >
                    <HouseIcon size={66} color={C.home} />
                  </div>
                </div>
              }
            />
          </AbsoluteFill>
        </MBlur>
      )}
      {t < 39.2 && (
        <div style={{ position: 'absolute', top: 190, left: 0, right: 0 }}>
          <KineticLine
            size={104}
            out={38.88}
            words={[
              { t: 'change', at: 37.9 },
              { t: 'de', at: 38.12 },
              { t: 'couleur', at: 38.3, accent: true },
              { t: '?', at: 38.55 },
            ]}
          />
        </div>
      )}
      <Illustrative opacity={kf(f, [37.2, 37.6, 38.7, 39.0], [0, 1, 1, 0])} text="Animation illustrative" />

      {/* ----- end card ----- */}
      {t > 38.95 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${settle})` }}>
          <div
            style={{
              position: 'relative',
              transform: `translateY(${-150 + (1 - mark) * 120}px) scale(${lerp(0.2, 1, mark)}) rotate(${(1 - mark) * -25}deg)`,
              opacity: clamp01(mark * 2),
              filter: 'drop-shadow(0 30px 50px rgba(10,30,22,0.28))',
            }}
          >
            <OuvaMark size={250} t={p(f, 39.3, 0.9)} />
            {/* sheen */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 60, overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  top: -60,
                  bottom: -60,
                  width: 90,
                  left: `${sheen * 100}%`,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                  transform: 'rotate(20deg)',
                }}
              />
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              top: 1000,
              display: 'flex',
              fontFamily: FONT_TIGHT,
              fontWeight: 880,
              fontSize: 200,
              letterSpacing: '-0.055em',
              color: C.ink,
            }}
          >
            {'OùVa'.split('').map((ch, i) => {
              const k = sp(f, 39.22 + i * 0.06, { damping: 12, stiffness: 190 });
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    color: i === 1 ? C.mintDeep : C.ink,
                    opacity: clamp01(k * 2),
                    transform: `translateY(${(1 - k) * 110}px)`,
                    filter: k < 0.6 ? `blur(${(1 - k / 0.6) * 12}px)` : undefined,
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
              top: 1250,
              fontFamily: FONT,
              fontWeight: 560,
              fontSize: 50,
              letterSpacing: '-0.015em',
              color: C.inkSoft,
              opacity: clamp01(sub * 1.5),
              transform: `translateY(${(1 - sub) * 40}px)`,
              filter: sub < 0.6 ? `blur(${(1 - sub / 0.6) * 10}px)` : undefined,
            }}
          >
            Découvre où passe ton temps.
          </div>
          <div style={{ position: 'absolute', top: 1560, opacity: clamp01(store * 1.5), transform: `translateY(${(1 - store) * 40}px)` }}>
            <Pill style={{ fontSize: 32, padding: '22px 40px' }}>Disponible sur l’App Store</Pill>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
