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
  // camera: a small punch-in on every new scene + a slow continuous drift, so the frame never sits still
  let punch = 0;
  for (const s of segments) if (t >= s.start && t < s.start + 0.6) punch = Math.max(punch, 1 - (t - s.start) / 0.6);
  const cam = 1 + 0.035 * punch * punch + 0.012 * Math.sin(t * 0.9);
  const camX = Math.sin(t * 0.55) * 6;
  const camY = Math.cos(t * 0.47) * 6;
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
      <AbsoluteFill style={{ transform: inEnd ? undefined : `translate(${camX}px, ${camY}px) scale(${cam})` }}>
        {ordered.map((s) => {
          // the opening hook always becomes the animated explainer (what the app does, in the first seconds)
          const C = s.index === 0 && s.type === 'big_word' ? (IntroHook as any) : SCENES[s.type] ?? SCENES.big_word;
          if (t < s.start - 0.05 || t > s.end + 0.12) return null;
          return <C key={s.index} seg={s} seed={seed} />;
        })}
      </AbsoluteFill>
      {inEnd && <EndCard start={endStart} tagline={tagline} />}
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
};
