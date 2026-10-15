import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, float, kf, lerp, p, sp, vel } from '../lib';
import { Illustrative, KineticLine, MBlur, Odometer, shadowLight } from '../components/Core';
import { CheckIcon, ClockIcon, HouseIcon, PinIcon, SignalIcon } from '../components/Icons';
import { IconTile, PLACE, PlaceKind } from '../components/UI';

const PW = 580;
const PH = 1200;
const BEZ = 16;
const SW = PW - BEZ * 2;

const Tile: React.FC<{ kind: PlaceKind; w: number; h: number; mins: number; fill: number; check: number }> = ({
  kind,
  w,
  h,
  mins,
  fill,
  check,
}) => {
  const hh = Math.floor(mins / 60);
  const mm = Math.floor(mins % 60);
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 30,
        background: 'linear-gradient(160deg, #26302C 0%, #161B19 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 20,
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <IconTile kind={kind} size={54} />
        <div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: '#fff' }}>{PLACE[kind].name}</div>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
            {hh > 0 ? `${hh} h ${String(mm).padStart(2, '0')}` : `${mm} min`}
          </div>
        </div>
      </div>
      <div style={{ height: 8, borderRadius: 9, background: 'rgba(255,255,255,0.09)' }}>
        <div style={{ height: '100%', width: `${fill * 100}%`, borderRadius: 9, background: PLACE[kind].color }} />
      </div>
      {check > 0.01 && (
        <div
          style={{
            position: 'absolute',
            right: 14,
            top: 14,
            width: 40,
            height: 40,
            borderRadius: 20,
            background: C.mint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${check})`,
          }}
        >
          <CheckIcon size={30} color="#06281D" stroke={6} />
        </div>
      )}
    </div>
  );
};

const Screen: React.FC = () => {
  const f = useCurrentFrame();
  const auto = (a: number, d = 1.6) => p(f, a, d, EASE.soft);
  const sessionMins = kf(f, [23.4, 26.2, 28.4], [134, 136, 158], EASE.soft);
  const mm = sessionMins % 60;
  const hh = Math.floor(sessionMins / 60);
  const toast = sp(f, 26.25, { damping: 15, stiffness: 160 });
  const toastOut = p(f, 27.9, 0.3, EASE.in);
  const live = (Math.sin(f * 0.15) + 1) / 2;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0B0F0D', fontFamily: FONT, color: '#fff', overflow: 'hidden' }}>
      {/* status bar */}
      <div style={{ position: 'absolute', top: 26, left: 44, fontWeight: 650, fontSize: 24 }}>9:41</div>
      <div style={{ position: 'absolute', top: 30, right: 40, display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        {[8, 12, 16, 20].map((h, i) => (
          <div key={i} style={{ width: 5, height: h, borderRadius: 2, background: '#fff' }} />
        ))}
        <div style={{ width: 40, height: 20, borderRadius: 6, border: '2px solid rgba(255,255,255,0.6)', marginLeft: 8, padding: 2, boxSizing: 'border-box' }}>
          <div style={{ width: '80%', height: '100%', background: C.mint, borderRadius: 3 }} />
        </div>
      </div>
      {/* header */}
      <div style={{ position: 'absolute', top: 92, left: 30, right: 30, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 62, height: 62, borderRadius: 31, background: '#2A302E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: 12, background: '#7C8682', marginTop: -6 }} />
        </div>
        <div>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)' }}>Bonjour</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>toi</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 178, left: 30, fontFamily: FONT_TIGHT, fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>
        Chaque moment compte.
      </div>
      {/* En ce moment */}
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 22,
          right: 22,
          height: 330,
          borderRadius: 36,
          overflow: 'hidden',
          background: 'linear-gradient(150deg, #5E8F78 0%, #3E6B57 40%, #23443A 100%)',
        }}
      >
        {/* stylised isometric blocks */}
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 250 + (i % 3) * 80 - Math.floor(i / 3) * 30,
              top: 20 + Math.floor(i / 3) * 70 + (i % 3) * 18,
              width: 54,
              height: 54,
              borderRadius: 10,
              background: 'rgba(230,245,236,0.22)',
              transform: 'rotate(45deg) skew(-8deg,-8deg)',
            }}
          />
        ))}
        <div style={{ position: 'absolute', top: 24, left: 26, display: 'flex', alignItems: 'center', gap: 8, color: '#7FF0C6', fontWeight: 650, fontSize: 22 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: C.mint, boxShadow: `0 0 ${6 + live * 10}px ${C.mint}` }} />
          En ce moment
        </div>
        <div style={{ position: 'absolute', top: 58, left: 26, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 52, letterSpacing: '-0.03em' }}>Maison</div>
        <div style={{ position: 'absolute', top: 126, left: 26, fontSize: 20, color: 'rgba(255,255,255,0.75)' }}>Session en cours depuis</div>
        <div style={{ position: 'absolute', top: 154, left: 22, display: 'flex', alignItems: 'baseline', color: '#7FF0C6' }}>
          <Odometer value={hh} digits={1} size={64} color="#7FF0C6" />
          <div style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 40, margin: '0 10px 0 4px' }}>h</div>
          <Odometer value={mm} digits={2} size={64} color="#7FF0C6" />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 18,
            right: 18,
            bottom: 18,
            height: 64,
            borderRadius: 32,
            background: 'rgba(16,40,31,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontWeight: 650,
            fontSize: 22,
          }}
        >
          <ClockIcon size={26} color="#fff" stroke={4} />
          Détecté automatiquement
        </div>
      </div>
      {/* tes lieux */}
      <div style={{ position: 'absolute', top: 606, left: 30, fontFamily: FONT_TIGHT, fontSize: 30, fontWeight: 780, letterSpacing: '-0.02em' }}>
        Tes lieux aujourd'hui
      </div>
      <div style={{ position: 'absolute', top: 656, left: 22, display: 'flex', gap: 14 }}>
        <Tile kind="home" w={262} h={262} mins={kf(f, [26.25, 28.2], [134, 158], EASE.soft)} fill={lerp(0.42, 0.66, auto(26.25, 2))} check={sp(f, 27.3, { damping: 9 })} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Tile kind="school" w={240} h={124} mins={kf(f, [26.45, 28.2], [0, 95], EASE.soft)} fill={0.4 * auto(26.45, 1.8)} check={sp(f, 27.6, { damping: 9 })} />
          <Tile kind="work" w={240} h={124} mins={kf(f, [26.65, 28.2], [0, 52], EASE.soft)} fill={0.25 * auto(26.65, 1.6)} check={sp(f, 27.85, { damping: 9 })} />
        </div>
      </div>
      {/* tab bar */}
      <div
        style={{
          position: 'absolute',
          left: 22,
          right: 22,
          bottom: 30,
          height: 104,
          borderRadius: 52,
          background: 'rgba(40,46,44,0.92)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 8,
        }}
      >
        <div style={{ height: 84, flex: 1.35, borderRadius: 42, background: '#0B0F0D', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 650, fontSize: 24 }}>
          <HouseIcon size={34} color={C.mint} /> Accueil
        </div>
        {['Lieux', 'Stats', 'Profil'].map((l) => (
          <div key={l} style={{ flex: 1, textAlign: 'center', fontSize: 20, color: 'rgba(255,255,255,0.75)' }}>
            {l}
          </div>
        ))}
      </div>
      {/* auto-detect toast */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          right: 18,
          height: 108,
          borderRadius: 34,
          background: 'rgba(38,44,42,0.96)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          transform: `translateY(${(1 - toast) * -160 - toastOut * 160}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '0 22px',
        }}
      >
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#0E1311', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PinIcon size={30} color={C.mint} dot="#0E1311" />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>OùVa</div>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>Temps à jour · compté automatiquement</div>
        </div>
      </div>
    </div>
  );
};

const Orb: React.FC<{ at: number; x: number; y: number; z: number; seed: number; children: React.ReactNode }> = ({ at, x, y, z, seed, children }) => {
  const f = useCurrentFrame();
  const e = sp(f, at, { damping: 10, stiffness: 170 });
  return (
    <div
      style={{
        position: 'absolute',
        left: x + float(f, seed, 14),
        top: y + float(f, seed + 5, 18),
        width: 150,
        height: 150,
        borderRadius: 75,
        background: 'rgba(255,255,255,0.72)',
        border: '1.5px solid rgba(255,255,255,0.95)',
        boxShadow: shadowLight,
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translateZ(${z}px) scale(${e})`,
        opacity: clamp01(e * 2),
      }}
    >
      {children}
    </div>
  );
};

export const PhoneScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const enter = sp(f, 23.3, { damping: 16, stiffness: 90 });
  const exitFn = (fr: number) => kf(fr, [28.5, 28.82], [0, -1400], EASE.in);
  const ex = exitFn(f);
  const exBlur = vel(exitFn, f) * 0.5;
  const ry = kf(f, [23.3, 25.0, 28.4], [-46, -16, -8], EASE.out) + float(f, 2, 2) - (ex / -1400) * 30;
  const rx = kf(f, [23.3, 25.0, 28.4], [16, 7, 4], EASE.out) + float(f, 7, 1.2);
  const rz = kf(f, [23.3, 25.0], [8, 2], EASE.out);
  const ty = lerp(500, 0, enter) + float(f, 11, 10);
  const sc = lerp(0.8, 1, enter) * kf(f, [25, 28.4], [1, 1.05], EASE.soft);

  return (
    <AbsoluteFill>
      <MBlur x={exBlur}>
        <AbsoluteFill style={{ transform: `translateX(${ex}px)` }}>
          {/* floor shadow */}
          <div
            style={{
              position: 'absolute',
              left: 540 - 300,
              top: 1700 + ty * 0.2,
              width: 600,
              height: 90,
              borderRadius: '50%',
              background: 'radial-gradient(closest-side, rgba(10,20,16,0.35), rgba(10,20,16,0))',
              filter: 'blur(12px)',
              opacity: enter,
            }}
          />
          <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: '50% 45%' }}>
            <div
              style={{
                position: 'absolute',
                left: 540 - PW / 2,
                top: 1060 - PH / 2 + ty,
                width: PW,
                height: PH,
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`,
              }}
            >
              {/* orbiting icons */}
              <Orb at={24.0} x={-250} y={150} z={140} seed={1}>
                <PinIcon size={62} color={C.mintDeep} dot="#fff" />
              </Orb>
              <Orb at={24.25} x={PW + 60} y={420} z={200} seed={2}>
                <ClockIcon size={70} color={C.ink} stroke={4.5} />
              </Orb>
              <Orb at={24.5} x={-220} y={860} z={90} seed={3}>
                <SignalIcon size={70} color={C.mintDeep} />
              </Orb>
              {/* side thickness */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 92,
                    background: i === 7 ? '#3A3D40' : '#5B6064',
                    transform: `translateZ(${-3 - i * 3}px)`,
                  }}
                />
              ))}
              {/* body */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 92,
                  background: 'linear-gradient(140deg, #8C9196 0%, #3B3F43 30%, #1C1E20 60%, #6B7075 100%)',
                  padding: 5,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ position: 'absolute', inset: 5, borderRadius: 88, background: '#050606' }} />
                <div
                  style={{
                    position: 'absolute',
                    left: BEZ,
                    top: BEZ,
                    width: SW,
                    height: PH - BEZ * 2,
                    borderRadius: 76,
                    overflow: 'hidden',
                  }}
                >
                  <Screen />
                  {/* glass reflection */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(${115 + ry * 0.8}deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0) 60%)`,
                    }}
                  />
                  {/* dynamic island */}
                  <div style={{ position: 'absolute', top: 20, left: SW / 2 - 70, width: 140, height: 40, borderRadius: 20, background: '#000' }} />
                </div>
              </div>
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </MBlur>

      {t > 24.5 && t < 26.4 && (
        <div style={{ position: 'absolute', top: 170, left: 0, right: 0 }}>
          <KineticLine
            size={96}
            out={26.05}
            words={[
              { t: 'Aucun', at: 24.75 },
              { t: 'suivi', at: 24.92 },
              { t: 'manuel.', at: 25.1, color: C.heatHigh },
            ]}
          />
        </div>
      )}
      {t > 26.1 && t < 28.9 && (
        <div style={{ position: 'absolute', top: 120, left: 0, right: 0 }}>
          <KineticLine
            size={88}
            out={28.45}
            words={[
              { t: 'Tout', at: 26.2 },
              { t: 'se', at: 26.3 },
              { t: 'fait', at: 26.4 },
              { t: 'automatiquement.', at: 26.6, accent: true },
            ]}
          />
        </div>
      )}
      <Illustrative opacity={kf(f, [24, 24.5, 28.3, 28.6], [0, 1, 1, 0])} text="Interface OùVa · valeurs d'exemple" />
    </AbsoluteFill>
  );
};
