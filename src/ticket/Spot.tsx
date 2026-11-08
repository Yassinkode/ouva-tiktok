import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { FPS, sp } from '../lib';
import { Captions, SceneCta, SceneLogo, SceneNobody, SceneTicket, Warm, Word } from './Ticket';
import { Detect, Map3D, Replay, Shot, Stats, Streak, Trips } from './Promo';
import { Compare, Create, Dream, LiveActivity, LockWidgets, NotScreen, StatsTitle, Timeline } from './Promo2';
import { Person } from './Person';

/* Generic automated « spot »: a list of scenes timed on the voice, same visual language as the founder video. */

export type SpotScene = { id: string; at: number };
export type SpotProps = { audio: string; words: Word[]; scenes: SpotScene[]; marks: Record<string, number>; hi: string[]; end: number; theme?: string };

export const Spot: React.FC<SpotProps> = ({ audio, words, scenes, marks, hi, end, theme }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const S = (i: number) => ({ at: scenes[i].at, out: i + 1 < scenes.length ? scenes[i + 1].at : end });
  const cta = scenes.find((s) => s.id === 'cta')?.at ?? end;
  const ti = scenes.findIndex((s) => s.id === 'ticket');
  const ticket = ti >= 0 ? scenes[ti] : undefined;
  const ticketOut = ti >= 0 ? (ti + 1 < scenes.length ? scenes[ti + 1].at : end) : 0;
  const flash = scenes.reduce((m, s) => Math.max(m, t >= s.at && t < s.at + 0.08 ? 1 - (t - s.at) / 0.08 : 0), 0);
  const node = (id: string, p: { at: number; out: number }): React.ReactNode => {
    switch (id) {
      case 'dream': return <Dream {...p} />;
      case 'screen': return <NotScreen {...p} />;
      case 'real': return <SceneNobody {...p} m={[marks.home, marks.work, marks.gym].map((x, k) => x ?? p.at + 0.3 + k * 0.4)} />;
      case 'create': return <Create {...p} />;
      case 'auto': return <Detect {...p} />;
      case 'chrono': return <LiveActivity {...p} />;
      case 'statsTitle': return <StatsTitle {...p} />;
      case 'timeline': return <Timeline {...p} />;
      case 'detailed': return <Stats {...p} tabs={[marks.jour ?? p.at, marks.semaine ?? p.at + 0.5, marks.mois ?? p.at + 1]} />;
      case 'compare': return <Compare {...p} />;
      case 'replay': return <Replay {...p} />;
      case 'heat': return <Map3D {...p} mode="heat" />;
      case 'trips': return <Trips {...p} />;
      case 'widgets': return <LockWidgets {...p} />;
      case 'streak': return <Streak {...p} />;
      default: return null;
    }
  };
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Warm theme={theme} />
      {scenes.map((s, i) =>
        s.id === 'logo' ? <SceneLogo key={i} {...S(i)} /> : s.id === 'ticket' ? <SceneTicket key={i} {...S(i)} circleAt={marks.douze ?? s.at + 2} laughAt={marks.parle ?? s.at + 3} printDur={1.4} /> : s.id === 'cta' ? <SceneCta key={i} {...S(i)} /> : (
          <Shot key={i} {...S(i)} i={i}>
            {node(s.id, S(i))}
          </Shot>
        ),
      )}
      {ticket && marks.douze && t > marks.douze + 0.2 && t < ticketOut + 0.1 && (
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - Math.min(1, sp(f, marks.douze + 0.2, { damping: 15, stiffness: 140 }))) * 500}px)` }}>
          <Person x={890} y={1560} s={0.72} pose="facepalm" />
        </div>
      )}
      {t > cta + 0.6 && (
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - Math.min(1, sp(f, cta + 0.6, { damping: 15, stiffness: 140 }))) * 500}px)` }}>
          <Person x={920} y={1700} s={0.62} pose="present" />
        </div>
      )}
      <Captions words={words} hi={hi} stopAt={cta} />
      {flash > 0 && <AbsoluteFill style={{ background: '#FFF4E8', opacity: flash * 0.3 }} />}
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
