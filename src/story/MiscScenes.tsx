import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FONT_TIGHT, FPS, clamp01, float, kf, lerp, p, shake, sp, vel } from '../lib';
import { KineticLine, MBlur, Odometer, Pill, Ring, shadowDeep, shadowLight } from '../components/Core';
import { CheckIcon, ClockIcon, FlagIcon, HouseIcon, OuvaMark, PinIcon, SignalIcon, WalkIcon } from '../components/Icons';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { Caption, Disclaimer, Whip, tOr } from './common';
import { Seg } from './types';

const kindOf = (k: any): PlaceKind => (k && (PLACE as any)[k] ? k : 'home');

/* 7 ─ full-bleed mint wipe with heavy italic word */
export const WipeWord: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const b = seg.end;
  const xFn = (fr: number) => (fr / FPS < (a + b) / 2 ? kf(fr, [a, a + 0.26], [1150, 0], EASE.out) : kf(fr, [b - 0.3, b], [0, -1150], EASE.in));
  const x = xFn(f);
  const bx = vel(xFn, f) * 0.55;
  const word: string = (seg.params.word ?? 'WOW').toUpperCase();
  const small: string = seg.params.small ?? '';
  const wt = tOr(seg, 'word', 0.2);
  const sIn = sp(f, a + 0.18, { damping: 14 });
  const size = word.length > 12 ? 110 : word.length > 9 ? 140 : 170;
  return (
    <AbsoluteFill>
      <MBlur x={bx}>
        <AbsoluteFill style={{ transform: `translateX(${x}px)` }}>
          <AbsoluteFill style={{ background: `linear-gradient(160deg, #6BEABF 0%, ${C.mint} 45%, #3FCB9C 100%)` }} />
          <AbsoluteFill
            style={{
              opacity: 0.12,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.6) 2px, transparent 2px)',
              backgroundSize: '54px 54px',
              transform: `translateY(${(f * 0.6) % 54}px)`,
            }}
          />
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            {small && (
              <div style={{ fontFamily: FONT_TIGHT, fontStyle: 'italic', fontWeight: 800, fontSize: 64, color: C.mintInk, opacity: clamp01(sIn * 2), transform: `translateY(${(1 - sIn) * 40}px)`, marginBottom: 6 }}>
                {small}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', fontFamily: FONT_TIGHT, fontStyle: 'italic', fontWeight: 900, fontSize: size, letterSpacing: '-0.05em', color: '#08241B', padding: '0 40px' }}>
              {word.split('').map((ch, i) => {
                const k = sp(f, wt + i * 0.028, { damping: 11, stiffness: 230 });
                const st = kf(f, [wt + i * 0.028, wt + 0.25 + i * 0.028], [2.2, 1], EASE.out);
                return (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      whiteSpace: 'pre',
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
          </AbsoluteFill>
        </AbsoluteFill>
      </MBlur>
    </AbsoluteFill>
  );
};

/* 8 ─ 3D iPhone, the app fills itself */
const PW = 580;
const PH = 1200;
const BEZ = 16;
const SW = PW - BEZ * 2;

const MiniTile: React.FC<{ kind: PlaceKind; w: number; h: number; mins: number; fill: number; check: number; label?: string }> = ({ kind, w, h, mins, fill, check, label }) => {
  const hh = Math.floor(mins / 60);
  const mm = Math.floor(mins % 60);
  return (
    <div style={{ width: w, height: h, borderRadius: 30, background: 'linear-gradient(160deg, #26302C 0%, #161B19 100%)', border: '1px solid rgba(255,255,255,0.06)', padding: 20, boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <IconTile kind={kind} size={54} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: w - 120 }}>{label ?? PLACE[kind].name}</div>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, color: 'rgba(255,255,255,0.6)' }}>{hh > 0 ? `${hh} h ${String(mm).padStart(2, '0')}` : `${mm} min`}</div>
        </div>
      </div>
      <div style={{ height: 8, borderRadius: 9, background: 'rgba(255,255,255,0.09)' }}>
        <div style={{ height: '100%', width: `${fill * 100}%`, borderRadius: 9, background: PLACE[kind].color }} />
      </div>
      {check > 0.01 && (
        <div style={{ position: 'absolute', right: 14, top: 14, width: 40, height: 40, borderRadius: 20, background: C.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${check})` }}>
          <CheckIcon size={30} color="#06281D" stroke={6} />
        </div>
      )}
    </div>
  );
};

const PhoneScreen: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const d = seg.end - a;
  const auto0 = a + d * 0.5;
  const main = kindOf(seg.params.place);
  const others: PlaceKind[] = (seg.params.others ?? ['school', 'work']).map(kindOf);
  const mainLabel = seg.params.label ?? PLACE[main].name;
  const session = kf(f, [a, auto0, seg.end], [134, 136, 158], EASE.soft);
  const toast = sp(f, auto0, { damping: 15, stiffness: 160 });
  const toastOut = p(f, seg.end - 0.75, 0.3, EASE.in);
  const live = (Math.sin(f * 0.15) + 1) / 2;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0B0F0D', fontFamily: FONT, color: '#fff', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 26, left: 44, fontWeight: 650, fontSize: 24 }}>9:41</div>
      <div style={{ position: 'absolute', top: 92, left: 30, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 62, height: 62, borderRadius: 31, background: '#2A302E' }} />
        <div>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)' }}>Bonjour</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>toi</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 178, left: 30, fontFamily: FONT_TIGHT, fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>Chaque moment compte.</div>
      <div style={{ position: 'absolute', top: 250, left: 22, right: 22, height: 330, borderRadius: 36, overflow: 'hidden', background: 'linear-gradient(150deg, #5E8F78 0%, #3E6B57 40%, #23443A 100%)' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: 250 + (i % 3) * 80 - Math.floor(i / 3) * 30, top: 20 + Math.floor(i / 3) * 70 + (i % 3) * 18, width: 54, height: 54, borderRadius: 10, background: 'rgba(230,245,236,0.22)', transform: 'rotate(45deg) skew(-8deg,-8deg)' }} />
        ))}
        <div style={{ position: 'absolute', top: 24, left: 26, display: 'flex', alignItems: 'center', gap: 8, color: '#7FF0C6', fontWeight: 650, fontSize: 22 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: C.mint, boxShadow: `0 0 ${6 + live * 10}px ${C.mint}` }} />
          En ce moment
        </div>
        <div style={{ position: 'absolute', top: 58, left: 26, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 52, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{mainLabel}</div>
        <div style={{ position: 'absolute', top: 126, left: 26, fontSize: 20, color: 'rgba(255,255,255,0.75)' }}>Session en cours depuis</div>
        <div style={{ position: 'absolute', top: 154, left: 22, display: 'flex', alignItems: 'baseline', color: '#7FF0C6' }}>
          <Odometer value={Math.floor(session / 60)} digits={1} size={64} color="#7FF0C6" />
          <div style={{ fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 40, margin: '0 10px 0 4px' }}>h</div>
          <Odometer value={session % 60} digits={2} size={64} color="#7FF0C6" />
        </div>
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 18, height: 64, borderRadius: 32, background: 'rgba(16,40,31,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontWeight: 650, fontSize: 22 }}>
          <ClockIcon size={26} color="#fff" stroke={4} />
          Détecté automatiquement
        </div>
      </div>
      <div style={{ position: 'absolute', top: 606, left: 30, fontFamily: FONT_TIGHT, fontSize: 30, fontWeight: 780 }}>Tes lieux aujourd'hui</div>
      <div style={{ position: 'absolute', top: 656, left: 22, display: 'flex', gap: 14 }}>
        <MiniTile kind={main} label={mainLabel} w={262} h={262} mins={kf(f, [auto0, seg.end - 0.3], [134, 158], EASE.soft)} fill={lerp(0.42, 0.66, p(f, auto0, 2, EASE.soft))} check={sp(f, auto0 + 1.0, { damping: 9 })} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {others.slice(0, 2).map((k, i) => (
            <MiniTile key={i} kind={k} w={240} h={124} mins={kf(f, [auto0 + 0.2 * (i + 1), seg.end - 0.3], [0, i ? 52 : 95], EASE.soft)} fill={(i ? 0.25 : 0.4) * p(f, auto0 + 0.2 * (i + 1), 1.7, EASE.soft)} check={sp(f, auto0 + 1.3 + i * 0.25, { damping: 9 })} />
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 30, height: 104, borderRadius: 52, background: 'rgba(40,46,44,0.92)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8 }}>
        <div style={{ height: 84, flex: 1.35, borderRadius: 42, background: '#0B0F0D', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 650, fontSize: 24 }}>
          <HouseIcon size={34} color={C.mint} /> Accueil
        </div>
        {['Lieux', 'Stats', 'Profil'].map((l) => (
          <div key={l} style={{ flex: 1, textAlign: 'center', fontSize: 20, color: 'rgba(255,255,255,0.75)' }}>{l}</div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 18, left: 18, right: 18, height: 108, borderRadius: 34, background: 'rgba(38,44,42,0.96)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', transform: `translateY(${(1 - toast) * -160 - toastOut * 160}px)`, display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px' }}>
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
    <div style={{ position: 'absolute', left: x + float(f, seed, 14), top: y + float(f, seed + 5, 18), width: 150, height: 150, borderRadius: 75, background: 'rgba(255,255,255,0.78)', border: '1.5px solid rgba(255,255,255,0.95)', boxShadow: shadowLight, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateZ(${z}px) scale(${Math.max(0, e)})`, opacity: clamp01(e * 2) }}>
      {children}
    </div>
  );
};

export const PhoneAuto: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const b = seg.end;
  const enter = sp(f, a, { damping: 16, stiffness: 90 });
  const ry = kf(f, [a, a + 1.7, b], [-46, -16, -8], EASE.out) + float(f, 2, 2);
  const rx = kf(f, [a, a + 1.7, b], [16, 7, 4], EASE.out) + float(f, 7, 1.2);
  const rz = kf(f, [a, a + 1.7], [8, 2], EASE.out);
  const ty = lerp(500, 0, enter) + float(f, 11, 10);
  const sc = lerp(0.8, 1, enter) * kf(f, [a + 1.7, b], [1, 1.05], EASE.soft);
  const c2 = seg.cap2 && seg.cap2.length ? seg.cap2[0].at : b;
  return (
    <AbsoluteFill>
      <Whip seg={seg} noEnter>
        <div style={{ position: 'absolute', left: 240, top: 1700 + ty * 0.2, width: 600, height: 90, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,20,16,0.35), rgba(10,20,16,0))', filter: 'blur(12px)', opacity: enter }} />
        <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: '50% 45%' }}>
          <div style={{ position: 'absolute', left: 540 - PW / 2, top: 1080 - PH / 2 + ty, width: PW, height: PH, transformStyle: 'preserve-3d', transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})` }}>
            <Orb at={a + 0.7} x={-250} y={150} z={140} seed={1}>
              <PinIcon size={62} color={C.mintDeep} dot="#fff" />
            </Orb>
            <Orb at={a + 0.95} x={PW + 60} y={420} z={200} seed={2}>
              <ClockIcon size={70} color={C.ink} stroke={4.5} />
            </Orb>
            <Orb at={a + 1.2} x={-220} y={860} z={90} seed={3}>
              <SignalIcon size={70} color={C.mintDeep} />
            </Orb>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: 92, background: i === 7 ? '#3A3D40' : '#5B6064', transform: `translateZ(${-3 - i * 3}px)` }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 92, background: 'linear-gradient(140deg, #8C9196 0%, #3B3F43 30%, #1C1E20 60%, #6B7075 100%)' }}>
              <div style={{ position: 'absolute', inset: 5, borderRadius: 88, background: '#050606' }} />
              <div style={{ position: 'absolute', left: BEZ, top: BEZ, width: SW, height: PH - BEZ * 2, borderRadius: 76, overflow: 'hidden' }}>
                <PhoneScreen seg={seg} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${115 + ry * 0.8}deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0) 60%)` }} />
                <div style={{ position: 'absolute', top: 20, left: SW / 2 - 70, width: 140, height: 40, borderRadius: 20, background: '#000' }} />
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Whip>
      <Caption cap={seg.cap} out={Math.min(c2 - 0.2, b - 0.3)} top={150} size={92} accent={C.heatHigh} />
      <Caption cap={seg.cap2} out={b - 0.3} top={130} size={88} />
      <Disclaimer show text="Interface OùVa · valeurs d'exemple" />
    </AbsoluteFill>
  );
};

/* 9 ─ one day: DAY word, counter, timeline, chip */
export const DayTimeline: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const day: string = (seg.params.day ?? 'MARDI').toUpperCase();
  const kind = kindOf(seg.params.place);
  const V: number = seg.params.value ?? 14;
  const unit: string = seg.params.unit ?? 'h';
  const ct = tOr(seg, 'count', 0.35);
  const chipT = seg.t.chip;
  const chip = seg.params.chip;
  const cntFn = (fr: number) => kf(fr, [ct, ct + 1.05], [0, V], EASE.out);
  const hrs = cntFn(f);
  const hv = vel(cntFn, f);
  const fill = Math.min(1, hrs / 24);
  const card = sp(f, ct - 0.2, { damping: 15, stiffness: 140 });
  const track = sp(f, ct - 0.15, { damping: 16, stiffness: 120 });
  const z = chipT !== undefined ? sp(f, chipT, { damping: 9, stiffness: 230 }) : 0;
  const sh = chipT !== undefined ? shake(f, chipT + 0.03, 0.4, 10) : { x: 0, y: 0 };
  const P = PLACE[kind];
  const sz = day.length > 9 ? 150 : day.length > 6 ? 190 : 240;
  return (
    <AbsoluteFill>
      <Whip seg={seg} noEnter>
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) scale(${kf(f, [a, seg.end], [1, 1.06], EASE.soft)})` }}>
          <div style={{ position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: sz, letterSpacing: '-0.05em', color: C.ink }}>
            {day.split('').map((ch, i) => {
              const fn = (fr: number) => (1 - sp(fr, a + i * 0.045, { damping: 14, stiffness: 210 })) * 700;
              const x = fn(f);
              const bl = vel(fn, f) * 0.5;
              return (
                <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', transform: `translateX(${x}px)`, filter: bl > 0.4 ? `blur(${Math.min(18, bl)}px)` : undefined, opacity: clamp01(1.2 - x / 700) }}>
                  {ch}
                </span>
              );
            })}
          </div>
          {seg.params.sub && (
            <div style={{ position: 'absolute', top: 560, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 560, fontSize: 44, color: C.inkSoft, opacity: p(f, a + 0.4, 0.4) }}>{seg.params.sub}</div>
          )}
          <div style={{ position: 'absolute', left: 80, top: 690 + float(f, 3, 6), width: 920, height: 330, borderRadius: 60, background: 'linear-gradient(180deg, #1A201E 0%, #111513 100%)', boxShadow: shadowDeep, transform: `translateY(${(1 - card) * 500}px)`, opacity: clamp01(card * 2), display: 'flex', alignItems: 'center', padding: '0 60px', gap: 50, boxSizing: 'border-box' }}>
            <div style={{ transform: `scale(${lerp(0.4, 1, sp(f, ct - 0.05, { damping: 9 }))})` }}>
              <IconTile kind={kind} size={190} solid />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <Odometer value={hrs} digits={String(Math.round(V)).length} size={190} color="#fff" speedBlur={hv * 12} />
                <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 110, color: P.color, marginLeft: 14 }}>{unit}</div>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 38, fontWeight: 560, color: 'rgba(255,255,255,0.65)', marginTop: -6, opacity: p(f, ct + 0.6, 0.4), whiteSpace: 'nowrap' }}>{seg.params.caption ?? seg.params.label ?? P.name}</div>
            </div>
          </div>
          {unit === 'h' && (
            <div style={{ position: 'absolute', left: 80, top: 1110, width: 920, opacity: clamp01(track * 2), transform: `translateX(${(1 - track) * 300}px)` }}>
              <div style={{ position: 'relative', height: 120, borderRadius: 60, background: 'rgba(255,255,255,0.75)', border: '1.5px solid #fff', boxShadow: shadowLight, overflow: 'hidden' }}>
                {Array.from({ length: 23 }).map((_, i) => (
                  <div key={i} style={{ position: 'absolute', left: ((i + 1) / 24) * 920, top: 48, width: 2, height: 24, background: 'rgba(13,18,16,0.12)' }} />
                ))}
                <div style={{ position: 'absolute', left: 10, top: 10, bottom: 10, width: Math.max(0, fill * 900), borderRadius: 50, background: `linear-gradient(90deg, ${P.color}aa, ${P.color})` }} />
                {fill > 0.03 && (
                  <div style={{ position: 'absolute', left: 10 + fill * 900 - 90, top: 20, width: 80, height: 80, borderRadius: 40, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(0,0,0,0.18)' }}>
                    <P.Icon size={44} color={P.color} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, padding: '0 6px', fontFamily: FONT, fontSize: 28, fontWeight: 560, color: C.inkSoft }}>
                {['0 h', '6 h', '12 h', '18 h', '24 h'].map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          )}
          {chip && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 1360, display: 'flex', justifyContent: 'center', opacity: clamp01(z * 2.5), transform: `scale(${lerp(0.4, 1, z)}) rotate(${(1 - z) * -8}deg)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '30px 54px 30px 40px', borderRadius: 999, background: C.ink, boxShadow: shadowDeep }}>
                <div style={{ width: 96, height: 96, borderRadius: 48, background: chip.good ? '#123A2D' : '#2A1A18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WalkIcon size={62} color={chip.good ? C.mint : C.heatHigh} phase={chip.good ? f * 0.3 : 0} />
                </div>
                <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 88, letterSpacing: '-0.04em', color: '#fff', whiteSpace: 'nowrap' }}>
                  <span style={{ color: chip.good ? C.mint : C.heatHigh }}>{chip.value}</span> {chip.label}
                </div>
              </div>
            </div>
          )}
        </AbsoluteFill>
      </Whip>
      <Disclaimer show text="Exemple illustratif" />
    </AbsoluteFill>
  );
};

/* 10 ─ goal card on mint */
export const Goal: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const b = seg.end;
  const e = sp(f, a + 0.05, { damping: 15, stiffness: 120 });
  const bar = p(f, a + 0.9, 1.1, EASE.inOut);
  const check = sp(f, Math.max(a + 1.6, b - 0.8), { damping: 8, stiffness: 220 });
  const ring = p(f, a + 1.0, 1.4, EASE.inOut);
  const pill = sp(f, a + 0.45, { damping: 13 });
  return (
    <AbsoluteFill>
      <Whip seg={seg} noEnter>
        <div style={{ position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: clamp01(pill * 2), transform: `translateY(${(1 - pill) * 50}px)` }}>
          <Pill light style={{ fontSize: 40, padding: '20px 40px', color: C.mintInk }}>
            {seg.params.pill ?? 'Cette semaine'}
          </Pill>
        </div>
        <AbsoluteFill style={{ perspective: 2200 }}>
          <div style={{ position: 'absolute', left: 70, top: 620 + float(f, 9, 8), width: 940, height: 760, borderRadius: 64, background: 'linear-gradient(155deg, #2D6A52 0%, #1A4536 45%, #0F261E 100%)', border: '1.5px solid rgba(255,255,255,0.12)', boxShadow: '0 30px 60px rgba(10,60,40,0.25), 0 90px 160px rgba(10,60,40,0.30)', transform: `translateY(${(1 - e) * 900}px) rotateX(${(1 - e) * 45}deg) scale(${lerp(0.85, 1, e)})`, opacity: clamp01(e * 2), overflow: 'hidden', padding: 64, boxSizing: 'border-box', color: '#fff' }}>
            <div style={{ position: 'absolute', right: -160, top: -160, width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(closest-side, ${C.mint}55, transparent)`, transform: `scale(${1 + Math.sin(f * 0.05) * 0.06})` }} />
            <FlagIcon size={86} color="#fff" stroke={3.6} />
            <div style={{ fontFamily: FONT_TIGHT, fontWeight: 820, fontSize: 64, letterSpacing: '-0.035em', marginTop: 28, lineHeight: 1.05, maxWidth: 560 }}>{seg.params.title ?? 'Objectif de la semaine'}</div>
            <div style={{ position: 'absolute', right: 64, top: 64, width: 210, height: 210 }}>
              <Ring size={210} stroke={22} progress={ring * 0.4 + check * 0.6 * clamp01(check)} track="rgba(255,255,255,0.12)" />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ transform: `scale(${Math.max(0, check)})` }}>
                  <CheckIcon size={110} color={C.mint} stroke={6} />
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', left: 64, right: 64, top: 360 }}>
              {seg.cap && seg.cap.length > 0 && (
                <KineticLine size={seg.cap.reduce((s, c) => s + c.t.length + 1, 0) > 22 ? 70 : 88} color="#fff" accent={C.mint} align="left" words={seg.cap.map((c) => ({ t: c.t, at: c.at, accent: c.accent }))} />
              )}
            </div>
            <div style={{ position: 'absolute', left: 64, right: 64, bottom: 70 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 30, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
                <span>{seg.params.barLabel ?? 'Progression'}</span>
                <span style={{ color: C.mint }}>en route</span>
              </div>
              <div style={{ position: 'relative', height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.12)' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${bar * 46 + check * 12}%`, borderRadius: 13, background: `linear-gradient(90deg, #2FBF8F, ${C.mint})`, boxShadow: `0 0 24px ${C.mint}88` }} />
                <div style={{ position: 'absolute', left: `calc(${bar * 46 + check * 12}% - 40px)`, top: -78, opacity: bar > 0.02 ? 1 : 0 }}>
                  <WalkIcon size={72} color="#fff" phase={f * 0.32} />
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Whip>
    </AbsoluteFill>
  );
};

/* 12 ─ kinetic statement with a place icon */
export const BigWord: React.FC<{ seg: Seg }> = ({ seg }) => {
  const f = useCurrentFrame();
  const a = seg.start;
  const kind = seg.params.place ? kindOf(seg.params.place) : null;
  const ic = sp(f, a + 0.05, { damping: 9, stiffness: 180 });
  const len = (seg.cap ?? []).reduce((s, c) => s + c.t.length + 1, 0);
  const size = len > 40 ? 92 : len > 26 ? 112 : 140;
  const dark = !!seg.params.dark;
  return (
    <AbsoluteFill>
      <Whip seg={seg}>
        {dark && <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 45%, #13241E 0%, #0A0E0C 70%)', opacity: clamp01((f / FPS - a) / 0.12) }} />}
        {kind && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center', transform: `scale(${Math.max(0, ic)}) rotate(${(1 - ic) * -20}deg) translateY(${float(f, 5, 10)}px)`, opacity: clamp01(ic * 2) }}>
            <div style={{ filter: 'drop-shadow(0 30px 40px rgba(10,30,22,0.25))' }}>
              <IconTile kind={kind} size={240} solid />
            </div>
          </div>
        )}
        <div style={{ position: 'absolute', left: 60, right: 60, top: kind ? 900 : 760 }}>
          {seg.cap && seg.cap.length > 0 && <KineticLine size={size} out={seg.end - 0.25} color={dark ? '#fff' : undefined} accent={dark ? C.mint : undefined} words={seg.cap.map((c) => ({ t: c.t, at: c.at, accent: c.accent, color: c.color }))} />}
        </div>
      </Whip>
    </AbsoluteFill>
  );
};

/* end card */
export const EndCard: React.FC<{ start: number; tagline?: string }> = ({ start, tagline = 'Découvre où passe ton temps.' }) => {
  const f = useCurrentFrame();
  const mark = sp(f, start + 0.15, { damping: 11, stiffness: 150 });
  const store = sp(f, start + 0.9, { damping: 15 });
  const sheen = kf(f, [start + 1.1, start + 2.0], [-0.4, 1.4], EASE.inOut);
  const settle = kf(f, [start + 0.15, start + 2.3], [1.06, 1], EASE.soft);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${settle})` }}>
      <div style={{ position: 'relative', transform: `translateY(${-150 + (1 - mark) * 120}px) scale(${lerp(0.2, 1, mark)}) rotate(${(1 - mark) * -25}deg)`, opacity: clamp01(mark * 2), filter: 'drop-shadow(0 30px 50px rgba(10,30,22,0.28))' }}>
        <OuvaMark size={250} t={p(f, start + 0.4, 0.9)} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 60, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, bottom: -60, width: 90, left: `${sheen * 100}%`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', transform: 'rotate(20deg)' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1000, display: 'flex', fontFamily: FONT_TIGHT, fontWeight: 880, fontSize: 200, letterSpacing: '-0.055em', color: C.ink }}>
        {'OùVa'.split('').map((ch, i) => {
          const k = sp(f, start + 0.32 + i * 0.06, { damping: 12, stiffness: 190 });
          return (
            <span key={i} style={{ display: 'inline-block', color: i === 1 ? C.mintDeep : C.ink, opacity: clamp01(k * 2), transform: `translateY(${(1 - k) * 110}px)`, filter: k < 0.6 ? `blur(${(1 - k / 0.6) * 12}px)` : undefined }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 1270, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, opacity: clamp01(store * 1.5), transform: `translateY(${(1 - store) * 40}px)` }}>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 44, color: C.inkSoft }}>Disponible sur l’App Store</div>
        <div style={{ padding: '22px 52px', borderRadius: 999, background: '#2F7BF6', color: '#fff', fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 44, boxShadow: '0 16px 40px rgba(47,123,246,0.35)', transform: `scale(${1 + Math.sin(f * 0.12) * 0.03 * clamp01(store)})` }}>lien en bio</div>
      </div>
    </AbsoluteFill>
  );
};
