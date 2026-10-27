import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FPS, kf } from '../lib';
import { CinemaBackdrop, RoofPins } from '../components/Cinema';
import { IntroHook } from './Intro';
import { StoryProps, Seg } from './types';
import { CounterMap, HeatmapReveal, OutroMap, PlacePin } from './MapScenes';
import { Bento, Compare, RingStat } from './StatScenes';
import { BigWord, DayTimeline, EndCard, Goal, PhoneAuto, WipeWord } from './MiscScenes';
import { AppScreen, AppTour } from './ShotScenes';
import { AddPlace, DynamicIsland, Fact, FeatureList, ReplayDay, ThemeSwitch, Versus, WeekCompare } from './AppScenes';

const SCENES: Record<string, React.FC<{ seg: Seg; seed: number }>> = {
  heatmap_reveal: HeatmapReveal,
  place_pin: PlacePin,
  counter_map: CounterMap,
  outro_map: OutroMap,
  ring_stat: RingStat as any,
  compare: Compare as any,
  bento: Bento as any,
  wipe_word: WipeWord as any,
  phone_auto: PhoneAuto as any,
  day_timeline: DayTimeline as any,
  goal: Goal as any,
  big_word: BigWord as any,
  dynamic_island: DynamicIsland as any,
  versus: Versus as any,
  add_place: AddPlace as any,
  replay_day: ReplayDay as any,
  week_compare: WeekCompare as any,
  theme_switch: ThemeSwitch as any,
  feature_list: FeatureList as any,
  fact: Fact as any,
  app_screen: AppScreen as any,
  app_tour: AppTour as any,
};

export const Story: React.FC<StoryProps> = ({ seed, audio, segments, endStart, tagline }: StoryProps & { tagline?: string }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  // mint backdrop while a goal segment is on screen
  let mint = 0;
  for (const s of segments) {
    if (s.type === 'goal') mint = Math.max(mint, kf(f, [s.start - 0.1, s.start + 0.6, s.end - 0.2, s.end + 0.3], [0, 1, 1, 0], EASE.soft));
  }
  // wipes are drawn on top (they are transitions)
  const ordered = [...segments].sort((a, b) => (a.type === 'wipe_word' ? 1 : 0) - (b.type === 'wipe_word' ? 1 : 0));
  // fast, punchy camera: hard punch-in + rotation kick on every cut, a "re-frame" jump in the middle of long
  // scenes (feels like an extra cut), a small bump on every caption word, and a constant handheld drift
  const decay = (t0: number, d: number) => (t >= t0 && t < t0 + d ? Math.pow(1 - (t - t0) / d, 2) : 0);
  let punch = 0;
  let kickDir = 1;
  let reframe = 0;
  let bump = 0;
  for (const s of segments) {
    const p = decay(s.start, 0.38);
    if (p > punch) {
      punch = p;
      kickDir = s.index % 2 ? 1 : -1;
    }
    const len = s.end - s.start;
    if (len > 2.4) {
      // zoom-in jump at ~45 % of the scene, held until the end (like cutting to a closer shot)
      const tm = s.start + len * 0.45;
      if (t >= tm && t < s.end) reframe = Math.max(reframe, kf(f, [tm, tm + 0.12], [0, 1], EASE.out));
    }
    for (const c of s.cap ?? []) bump = Math.max(bump, decay(c.at, 0.22));
  }
  const cam = 1 + 0.09 * punch + 0.06 * reframe + 0.018 * bump + 0.015 * Math.sin(t * 1.7);
  const rot = kickDir * 1.6 * punch + Math.sin(t * 1.3) * 0.35;
  const camX = Math.sin(t * 1.1) * 9 + kickDir * 40 * punch;
  const camY = Math.cos(t * 0.9) * 9;
  const inEnd = t >= endStart - 0.05;
  // colour mood of the city changes with each scene (cross-fade), different starting mood per video
  let cur = 0;
  segments.forEach((sg, i) => { if (t >= sg.start - 0.05) cur = i; });
  if (inEnd) cur = segments.length;
  const mood = seed + cur;
  const prevMood = seed + Math.max(0, cur - 1);
  const segStart = inEnd ? endStart : segments[cur]?.start ?? 0;
  const blend = cur === 0 ? 1 : kf(f, [segStart - 0.1, segStart + 0.45], [0, 1], EASE.soft);
  return (
    <AbsoluteFill style={{ background: '#F5F4F0', overflow: 'hidden' }}>
      <CinemaBackdrop mood={mood} prevMood={prevMood} blend={blend} />
      <AbsoluteFill style={{ opacity: mint * 0.92, background: 'radial-gradient(110% 70% at 50% 40%, #1D6B52 0%, #0E3D2F 60%, #072219 100%)' }} />
      <RoofPins opacity={inEnd || cur === 0 ? 0 : 1} />
      <AbsoluteFill style={{ transform: inEnd ? undefined : `translate(${camX}px, ${camY}px) rotate(${rot}deg) scale(${cam})` }}>
        {ordered.map((s) => {
          // the opening hook always becomes the animated explainer (what the app does, in the first seconds)
          const C = s.index === 0 && s.type === 'big_word' ? (IntroHook as any) : SCENES[s.type] ?? SCENES.big_word;
          if (t < s.start - 0.05 || t > s.end + 0.12) return null;
          return <C key={s.index} seg={s} seed={seed} />;
        })}
      </AbsoluteFill>
      {/* quick light flash on every cut */}
      {!inEnd && (() => {
        let fl = 0;
        for (const sg of segments) if (sg.index > 0) fl = Math.max(fl, decay(sg.start - 0.02, 0.16));
        return fl > 0 ? <AbsoluteFill style={{ background: 'radial-gradient(70% 50% at 50% 45%, rgba(255,255,255,0.9), rgba(255,255,255,0.2))', opacity: 0.55 * fl, mixBlendMode: 'screen' }} /> : null;
      })()}
      {inEnd && <EndCard start={endStart} tagline={tagline} />}
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
};
