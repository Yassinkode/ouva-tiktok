export type Cap = { t: string; at: number; accent?: boolean; color?: string };

export type SceneType =
  | 'heatmap_reveal'
  | 'place_pin'
  | 'counter_map'
  | 'ring_stat'
  | 'compare'
  | 'bento'
  | 'wipe_word'
  | 'phone_auto'
  | 'day_timeline'
  | 'goal'
  | 'outro_map'
  | 'big_word'
  | 'dynamic_island'
  | 'versus'
  | 'add_place'
  | 'replay_day'
  | 'week_compare'
  | 'theme_switch'
  | 'feature_list'
  | 'fact';

export type Seg = {
  index: number;
  type: SceneType;
  start: number; // seconds (absolute)
  end: number;
  params: any;
  t: Record<string, number>; // key moments (absolute seconds), computed from word timings
  cap: Cap[]; // kinetic caption words with absolute times
  cap2?: Cap[];
};

export type StoryProps = {
  seed: number;
  audio: string; // file in public/
  duration: number; // seconds
  endStart: number; // end-card start
  segments: Seg[];
  disclaimer?: boolean;
};
