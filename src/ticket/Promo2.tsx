import React from 'react';
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, sp } from '../lib';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { Captions, Chrono, Phone, SceneCta, SceneLogo, SceneNobody, SceneScreenTime, SceneTicket, Warm, Word } from './Ticket';
import { Detect, Map3D, Replay, Shot, Stats, Streak, Trips } from './Promo';

/* Longer founder story: dream → creation → OùVa → auto → STATS (timeline, detailed, week vs week) → replay → the rest → ticket → CTA */

const GREEN = '#23A26D';
export type Promo2Props = { audio: string; words: Word[]; cues: Record<string, number>; marks: Record<string, number>; hi: string[]; end: number };
const ORDER = ['dream', 'screen', 'real', 'create', 'logo', 'auto', 'chrono', 'statsTitle', 'timeline', 'detailed', 'compare', 'replay', 'heat', 'trips', 'widgets', 'streak', 'ticket', 'cta'];
const jelly = (f: number, at: number, k = 1) => sp(f, at, { damping: 8, stiffness: 190 * k, mass: 0.8 });
type SP = { at: number; out: number };

/* the dream: mascot with a thought bubble full of places */
const Dream: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const b = sp(f, at + 0.4, { damping: 12, stiffness: 140 });
  const kinds: PlaceKind[] = ['home', 'work', 'gym', 'cafe', 'friends', 'library'];
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${Math.max(0, jelly(f, at + 0.05, 0.8))})`, transformOrigin: '540px 1150px' }}>
        <Chrono x={540} y={1100} s={1.3} mood="happy" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: 'absolute', left: 600 + i * 50, top: 800 - i * 70, width: 30 + i * 20, height: 30 + i * 20, borderRadius: '50%', background: '#FFF8F0', opacity: clamp01((t - at - 0.2 - i * 0.1) / 0.15) }} />
      ))}
      <div style={{ position: 'absolute', left: 140, top: 230, width: 800, height: 470, borderRadius: 240, background: '#FFF8F0', transform: `scale(${b})`, boxShadow: '0 30px 70px rgba(20,6,10,0.3)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 34, padding: '60px 110px', boxSizing: 'border-box' }}>
        {kinds.map((k, i) => (
          <div key={k} style={{ transform: `scale(${Math.max(0, jelly(f, at + 0.6 + i * 0.12))}) translateY(${Math.sin(t * 2 + i) * 8}px)`, position: 'relative' }}>
            <IconTile kind={k} size={130} solid />
            <div style={{ position: 'absolute', right: -14, top: -14, width: 46, height: 46, borderRadius: 23, background: '#111', color: '#fff', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
          </div>
        ))}
      </div>
    </>
  );
};

/* "pas mon temps d'écran": the screen-time card gets crossed out */
const NotScreen: React.FC<SP> = (p) => {
  const f = useCurrentFrame();
  const x = kf(f, [p.at + 0.7, p.at + 1.0], [0, 1], EASE.out);
  return (
    <>
      <SceneScreenTime {...p} />
      <svg width={1080} height={1000} style={{ position: 'absolute', left: 0, top: 230 }}>
        <path d="M150 60 L930 760" stroke="#E5372B" strokeWidth={34} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - x} />
        <path d="M930 60 L150 760" stroke="#E5372B" strokeWidth={34} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(x * 2 - 1)} />
      </svg>
    </>
  );
};

/* "alors je l'ai créée": a sketch of the app draws itself, then the real screen fills in */
const Create: React.FC<SP> = ({ at, out }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const draw = kf(f, [at, at + 1.0], [0, 1], EASE.inOut);
  const fill = kf(f, [out - 0.9, out - 0.3], [0, 1], EASE.inOut);
  const W = 520;
  const H = W * 2.18;
  const x0 = 540 - W / 2;
  const y0 = 860 - H / 2;
  const lines = [
    `M${x0 + 70} ${y0 + 130} H${x0 + W - 70}`,
    `M${x0 + 50} ${y0 + 240} H${x0 + W - 50} V${y0 + 560} H${x0 + 50} Z`,
    `M${x0 + 50} ${y0 + 620} H${x0 + W / 2 - 10} V${y0 + 820} H${x0 + 50} Z`,
    `M${x0 + W / 2 + 10} ${y0 + 620} H${x0 + W - 50} V${y0 + 820} H${x0 + W / 2 + 10} Z`,
    `M${x0 + 50} ${y0 + 900} H${x0 + W - 50}`,
    `M${x0 + 50} ${y0 + 960} H${x0 + W - 140}`,
  ];
  return (
    <>
      {/* pencil grid paper */}
      <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.08) 2px, transparent 2px)', backgroundSize: '60px 60px', opacity: 1 - fill * 0.6 }} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect x={x0} y={y0} width={W} height={H} rx={W * 0.15} fill="none" stroke="#FFF8F0" strokeWidth={8} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        {lines.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#FFF8F0" strokeWidth={6} strokeDasharray="18 14" pathLength={undefined} opacity={clamp01((draw - 0.3 - i * 0.1) * 4)} />
        ))}
        {/* pencil */}
        {draw < 1 && (
          <g transform={`translate(${x0 + W * (0.2 + 0.7 * Math.abs(Math.sin(t * 3)))} ${y0 + H * draw}) rotate(35)`}>
            <rect x={-12} y={-150} width={24} height={130} rx={4} fill="#F2C94C" />
            <path d="M-12 -20 L12 -20 L0 10 Z" fill="#E8C49A" />
            <path d="M-4 0 L4 0 L0 10 Z" fill="#333" />
          </g>
        )}
      </svg>
      {fill > 0 && (
        <div style={{ opacity: fill, transform: `scale(${lerp(0.96, 1, fill)})` }}>
          <Phone x={540} y={860} w={W} src="screens2/home.png" />
        </div>
      )}
    </>
  );
};

/* big title for the stats chapter */
const StatsTitle: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const j = jelly(f, at + 0.05, 0.9);
  const bars = [0.45, 0.7, 0.55, 0.9, 0.75];
  return (
    <>
      <div style={{ position: 'absolute', left: 190, right: 190, top: 380, height: 520, display: 'flex', alignItems: 'flex-end', gap: 30, transform: `scale(${Math.max(0, j)})` }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h * 100 * clamp01((t - at - 0.1 - i * 0.08) / 0.4)}%`, borderRadius: 22, background: i === 3 ? GREEN : '#FFF8F0', boxShadow: '0 20px 40px rgba(20,6,10,0.3)' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: 950, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 130, color: '#fff', letterSpacing: '-0.04em', transform: `scale(${Math.max(0, jelly(f, at + 0.3))})`, textShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
        Tes stats
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${Math.max(0, jelly(f, at + 0.5))})`, transformOrigin: '880px 380px' }}>
        <Chrono x={880} y={330} s={0.55} mood="wow" />
      </div>
    </>
  );
};

/* "le fil de ta journée": real timeline screen, slow scroll + highlight rows */
const Timeline: React.FC<SP> = ({ at, out }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const e = sp(f, at, { damping: 15, stiffness: 150 });
  const W = 540;
  const iw = W * 0.95;
  const scroll = kf(f, [at + 0.3, out - 0.2], [0, 1], EASE.inOut);
  // rows of the « Fil de la journée » in the 920-wide screenshot coords
  const rows = [923, 1106, 1289, 1472, 1655];
  const k = Math.min(rows.length - 1, Math.floor(clamp01((t - at - 0.3) / (out - at - 0.5)) * rows.length));
  const scale = iw / 920;
  return (
    <Phone x={540} y={830} w={W} rot={lerp(-6, -2, e)}>
      <div style={{ position: 'absolute', left: 0, top: -scroll * 520 * scale, width: '100%' }}>
        <Img src={staticFile('screens2/timeline.png')} style={{ width: '100%', display: 'block' }} />
        <div style={{ position: 'absolute', left: 225 * scale, top: (rows[k] - 42) * scale, width: 625 * scale, height: 84 * scale, borderRadius: 22 * scale, border: `${5 * scale * 2}px solid ${GREEN}`, boxShadow: `0 0 30px ${GREEN}` }} />
      </div>
    </Phone>
  );
};

/* week vs week comparison card (built in the app's style) */
const Compare: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const e = sp(f, at, { damping: 15, stiffness: 150 });
  const rows: { k: PlaceKind; a: number; b: number }[] = [
    { k: 'home', a: 62, b: 58 },
    { k: 'work', a: 31, b: 35 },
    { k: 'library', a: 6, b: 11 },
    { k: 'gym', a: 0.2, b: 3.5 },
  ];
  const max = 62;
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 300, borderRadius: 50, background: '#121413', padding: '44px 44px 50px', boxSizing: 'border-box', transform: `translateY(${(1 - e) * 500}px) scale(${lerp(0.9, 1, e)})`, boxShadow: '0 50px 100px rgba(20,6,10,0.5)', fontFamily: FONT }}>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: 44 }}>Cette semaine vs la précédente</div>
      <div style={{ display: 'flex', gap: 30, marginTop: 14, marginBottom: 30, fontSize: 28, fontWeight: 600 }}>
        <span style={{ color: '#fff' }}>■ Cette semaine</span>
        <span style={{ color: 'rgba(255,255,255,0.45)' }}>■ Semaine dernière</span>
      </div>
      {rows.map((r, i) => {
        const g = kf(f, [at + 0.3 + i * 0.25, at + 1.1 + i * 0.25], [0, 1], EASE.out);
        const P = PLACE[r.k];
        const d = r.b - r.a;
        const badge = jelly(f, at + 1.0 + i * 0.25);
        return (
          <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 30 }}>
            <IconTile kind={r.k} size={84} solid />
            <div style={{ flex: 1 }}>
              <div style={{ height: 24, borderRadius: 12, background: '#232624', marginBottom: 10 }}>
                <div style={{ width: `${Math.max(1.5, (r.b / max) * 100) * g}%`, height: '100%', borderRadius: 12, background: P.color }} />
              </div>
              <div style={{ height: 16, borderRadius: 8, background: '#1C1E1D' }}>
                <div style={{ width: `${Math.max(1.5, (r.a / max) * 100) * g}%`, height: '100%', borderRadius: 8, background: 'rgba(255,255,255,0.3)' }} />
              </div>
            </div>
            <div style={{ width: 170, textAlign: 'center', padding: '10px 0', borderRadius: 18, background: d >= 0 ? 'rgba(35,162,109,0.2)' : 'rgba(229,55,43,0.2)', color: d >= 0 ? '#4ADE9A' : '#FF7A6E', fontWeight: 800, fontSize: 34, transform: `scale(${Math.max(0, badge)})` }}>
              {d >= 0 ? '↑' : '↓'} {Math.abs(d) < 1 ? `${Math.round(Math.abs(d) * 60)} min` : `${Math.abs(Math.round(d * 10) / 10).toString().replace('.', ',')} h`}
            </div>
          </div>
        );
      })}
    </div>
  );
};


const hms = (sec: number) => `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/* the real Live Activity: compact Dynamic Island, then the expanded card, both ticking */
const LiveActivity: React.FC<SP> = ({ at, out }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const c = sp(f, at + 0.05, { damping: 12, stiffness: 160 });
  const swap = at + 1.3;
  const x = sp(f, swap, { damping: 12, stiffness: 140 });
  const sec = 1 * 3600 + 21 * 60 + 4 + Math.max(0, t - at);
  const CW = 960;
  const CH = CW * (135 / 760);
  const EW = 980;
  const EH = EW * (416 / 1127);
  return (
    <>
      <Phone x={540} y={1060} w={470} src="screens2/home.png" />
      {t < swap + 0.15 && (
        <div style={{ position: 'absolute', left: 540 - CW / 2, top: 330, width: CW, height: CH, borderRadius: CH / 2, overflow: 'hidden', transform: `scale(${Math.max(0, c) * (1 - clamp01((t - swap) / 0.15))})`, boxShadow: '0 30px 70px rgba(0,0,0,0.45)' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${CH * 0.32}px 0 ${CH * 0.18}px` }}>
            <Img src={staticFile('screens2/la_icon.png')} style={{ height: CH * 0.7 }} />
            <span style={{ color: '#fff', fontFamily: FONT, fontWeight: 500, fontSize: CH * 0.5, fontVariantNumeric: 'tabular-nums' }}>{hms(sec)}</span>
          </div>
        </div>
      )}
      {t >= swap && (
        <div style={{ position: 'absolute', left: 540 - EW / 2, top: 250, width: EW, height: EH, borderRadius: 70, overflow: 'hidden', transform: `scale(${Math.max(0, x)})`, transformOrigin: '50% 30%', boxShadow: '0 40px 90px rgba(0,0,0,0.5)', background: '#000' }}>
          <Img src={staticFile('screens2/la_expanded.png')} style={{ position: 'absolute', left: '-3%', top: '-4%', width: '106%', height: '108%' }} />
          <div style={{ position: 'absolute', left: EW * 0.405, top: EH * 0.69, width: EW * 0.24, height: EH * 0.17, background: 'rgb(18,18,18)', color: '#fff', fontFamily: FONT, fontWeight: 600, fontSize: EH * 0.13, display: 'flex', alignItems: 'center', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>{hms(sec + 18)}</div>
        </div>
      )}
      {t < 0 && out}
    </>
  );
};

/* lock screen with the real Live Activity + an OùVa widget */
const LockWidgets: React.FC<SP> = ({ at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const e = sp(f, at, { damping: 15, stiffness: 160 });
  const w1 = jelly(f, at + 0.15);
  const w2 = jelly(f, at + 0.4);
  const rows: { k: PlaceKind; m: number }[] = [
    { k: 'home', m: 552 },
    { k: 'library', m: 150 },
    { k: 'gym', m: 102 },
  ];
  const W = 800;
  return (
    <div style={{ position: 'absolute', left: 140, top: 200, width: W, height: 1130, borderRadius: 90, overflow: 'hidden', background: 'linear-gradient(170deg,#B98A6E 0%,#9B5A43 45%,#5A3030 75%,#2E1C26 100%)', transform: `translateY(${(1 - e) * 600}px) rotate(${lerp(6, 2, e)}deg)`, boxShadow: '0 60px 120px rgba(20,6,10,0.55), 0 0 0 16px #0B0B0C' }}>
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 600, fontSize: 34, color: 'rgba(255,255,255,0.8)' }}>sam. 7 nov.</div>
      <div style={{ position: 'absolute', top: 100, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_TIGHT, fontWeight: 300, fontSize: 210, color: '#E8763A', letterSpacing: '-0.02em' }}>12:47</div>
      <div style={{ position: 'absolute', left: 30, right: 30, top: 380, height: (W - 60) * (360 / 860), borderRadius: 46, overflow: 'hidden', transform: `scale(${Math.max(0, w1)})` }}>
        <Img src={staticFile('screens2/la_lock.png')} style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', left: 30, right: 30, top: 730, height: 330, borderRadius: 46, background: 'rgba(16,18,17,0.88)', padding: '28px 32px', boxSizing: 'border-box', transform: `scale(${Math.max(0, w2)})`, fontFamily: FONT }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: 26, fontWeight: 600 }}>
          <span>Aujourd’hui</span>
          <span style={{ color: GREEN }}>OùVa</span>
        </div>
        {rows.map((r, i) => {
          const g = kf(f, [at + 0.5 + i * 0.12, at + 1.1 + i * 0.12], [0, 1], EASE.out);
          return (
            <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 20 }}>
              <IconTile kind={r.k} size={56} solid />
              <div style={{ flex: 1, height: 18, borderRadius: 9, background: '#2A2C2B' }}>
                <div style={{ width: `${(r.m / 552) * 100 * g}%`, height: '100%', borderRadius: 9, background: PLACE[r.k].color }} />
              </div>
              <div style={{ width: 140, textAlign: 'right', color: '#fff', fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 34 }}>{`${Math.floor(r.m / 60)} h ${String(r.m % 60).padStart(2, '0')}`}</div>
            </div>
          );
        })}
      </div>
      {t < 0 && null}
    </div>
  );
};

export const Promo2: React.FC<Promo2Props> = ({ audio, words, cues, marks, hi, end }) => {
  const S = (id: string) => {
    const i = ORDER.indexOf(id);
    return { at: cues[id], out: i + 1 < ORDER.length ? cues[ORDER[i + 1]] : end };
  };
  const f = useCurrentFrame();
  const t = f / FPS;
  const flash = ORDER.reduce((m, id) => Math.max(m, t >= cues[id] && t < cues[id] + 0.08 ? 1 - (t - cues[id]) / 0.08 : 0), 0);
  const shots: [string, React.ReactNode][] = [
    ['dream', <Dream {...S('dream')} />],
    ['screen', <NotScreen {...S('screen')} />],
    ['real', <SceneNobody {...S('real')} m={[marks.home, marks.work, marks.gym]} />],
    ['create', <Create {...S('create')} />],
    ['auto', <Detect {...S('auto')} />],
    ['chrono', <LiveActivity {...S('chrono')} />],
    ['statsTitle', <StatsTitle {...S('statsTitle')} />],
    ['timeline', <Timeline {...S('timeline')} />],
    ['detailed', <Stats {...S('detailed')} tabs={[marks.jour, marks.semaine, marks.mois]} />],
    ['compare', <Compare {...S('compare')} />],
    ['replay', <Replay {...S('replay')} />],
    ['heat', <Map3D {...S('heat')} mode="heat" />],
    ['trips', <Trips {...S('trips')} />],
    ['widgets', <LockWidgets {...S('widgets')} />],
    ['streak', <Streak {...S('streak')} />],
  ];
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Warm />
      {shots.map(([id, node], i) => (
        <Shot key={id} {...S(id)} i={i}>
          {node}
        </Shot>
      ))}
      <SceneLogo {...S('logo')} />
      <SceneTicket {...S('ticket')} circleAt={marks.douze} laughAt={marks.parle} printDur={1.6} />
      <SceneCta {...S('cta')} />
      <Captions words={words} hi={hi} stopAt={cues.cta} />
      {flash > 0 && <AbsoluteFill style={{ background: '#FFF4E8', opacity: flash * 0.3 }} />}
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
