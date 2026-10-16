import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FPS, kf } from '../lib';
import { Backdrop } from '../components/Core';
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
  return (
    <AbsoluteFill style={{ background: '#F2F2EE', overflow: 'hidden' }}>
      <Backdrop mint={mint} />
      {ordered.map((s) => {
        const C = SCENES[s.type] ?? SCENES.big_word;
        if (t < s.start - 0.05 || t > s.end + 0.12) return null;
        return <C key={s.index} seg={s} seed={seed} />;
      })}
      {t >= endStart - 0.05 && <EndCard start={endStart} tagline={tagline} />}
      {audio && <Audio src={staticFile(audio)} />}
    </AbsoluteFill>
  );
};
