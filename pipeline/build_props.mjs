// Turns a story (beats + scenes) and the voice word timings into Remotion props + SFX events.
// Usage: node pipeline/build_props.mjs story.json words.json out-props.json out-events.json [audioRelPath]
import fs from 'fs';

export const SCENES = [
  'heatmap_reveal', 'place_pin', 'counter_map', 'ring_stat', 'compare', 'bento',
  'wipe_word', 'phone_auto', 'day_timeline', 'goal', 'outro_map', 'big_word',
  'dynamic_island', 'versus', 'add_place', 'replay_day', 'week_compare', 'theme_switch', 'feature_list', 'fact', 'app_screen', 'app_tour',
];

export const norm = (w) =>
  String(w)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');

/** tokenise exactly like the alignment splitter: whitespace-separated, drop tokens with no letters/digits */
export const tokens = (text) => String(text).split(/\s+/).filter((w) => norm(w).length > 0);

/** ElevenLabs alignment (characters + times) -> words [{w,s,e}] */
export const wordsFromAlignment = (al) => {
  const out = [];
  let cur = null;
  for (let i = 0; i < al.characters.length; i++) {
    const ch = al.characters[i];
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = null;
      continue;
    }
    if (!cur) cur = { w: '', s: al.character_start_times_seconds[i], e: al.character_end_times_seconds[i] };
    cur.w += ch;
    cur.e = al.character_end_times_seconds[i];
  }
  if (cur) out.push(cur);
  return out.filter((w) => norm(w.w).length > 0);
};

/** fallback: spread words proportionally to their length over the audio */
export const wordsProportional = (text, duration) => {
  const tk = tokens(text);
  const total = tk.reduce((a, w) => a + w.length + 1, 0);
  let t = 0.15;
  const usable = duration - 0.3;
  return tk.map((w) => {
    const d = ((w.length + 1) / total) * usable;
    const o = { w, s: t, e: t + d * 0.85 };
    t += d;
    return o;
  });
};

/** does a spoken/written word match a target (handles elisions like l'appli, j'ai) */
export const wordMatches = (raw, target) => {
  const n = norm(target);
  if (!n) return false;
  const cands = [norm(raw), norm(String(raw).split(/['’]/).pop())];
  return cands.some((w) => w && (w === n || (n.length >= 3 && w.length >= 3 && (w.startsWith(n) || n.startsWith(w)))));
};

export const findWord = (words, from, to, target, minIdx = from) => {
  const n = norm(target);
  if (!n) return -1;
  for (let i = Math.max(from, minIdx); i < to; i++) {
    if (wordMatches(words[i].w, target)) return i;
  }
  return -1;
};

/** monotonic alignment script tokens -> audio word indices (Needleman-Wunsch) */
export function alignTokens(a, b) {
  const n = a.length, m = b.length;
  const sim = (x, y) => (x === y ? 0 : x.length >= 3 && y.length >= 3 && (x.startsWith(y) || y.startsWith(x)) ? 0.3 : 1);
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const P = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) { D[i][0] = i * 0.8; P[i][0] = 1; }
  for (let j = 1; j <= m; j++) { D[0][j] = j * 0.8; P[0][j] = 2; }
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const c0 = D[i - 1][j - 1] + sim(a[i - 1], b[j - 1]);
      const c1 = D[i - 1][j] + 0.8; // script token not heard
      const c2 = D[i][j - 1] + 0.8; // extra audio word
      if (c0 <= c1 && c0 <= c2) { D[i][j] = c0; P[i][j] = 0; } else if (c1 <= c2) { D[i][j] = c1; P[i][j] = 1; } else { D[i][j] = c2; P[i][j] = 2; }
    }
  const map = new Array(n).fill(-1);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (P[i][j] === 0) { map[i - 1] = j - 1; i--; j--; } else if (P[i][j] === 1) { map[i - 1] = Math.min(j, m - 1); i--; } else j--;
  }
  for (let q = 0; q < n; q++) if (map[q] < 0) map[q] = q > 0 ? map[q - 1] : 0;
  for (let q = 1; q < n; q++) map[q] = Math.max(map[q], map[q - 1]);
  return map;
}

export function buildProps(story, words, opts = {}) {
  const beats = story.beats;
  // spoken outro over the end card (e.g. "Lien de l'application en bio.")
  const outroTok = story.outro ? tokens(story.outro).map(norm) : [];
  // map every script token to an audio word with a small edit-distance alignment
  const beatTok = beats.map((b) => tokens(b.text).map(norm));
  if (outroTok.length) beatTok.push(outroTok);
  const script = beatTok.flat();
  const audioN = words.map((w) => norm(w.w));
  const map = alignTokens(script, audioN);
  if (Math.abs(script.length - words.length) > 0) console.warn(`[build_props] script ${script.length} tokens vs audio ${words.length} words (aligned)`);
  const ranges = [];
  let k = 0;
  for (const bt of beatTok) {
    const idx = bt.map((_, j) => map[k + j]);
    k += bt.length;
    ranges.push([idx[0], idx[idx.length - 1] + 1]);
  }
  for (let i = 0; i < ranges.length; i++) {
    if (i > 0) ranges[i][0] = Math.max(ranges[i][0], ranges[i - 1][1] - 0);
    // extend each beat up to the next beat's first word so extra sounds (laughs) stay inside it
    if (i < ranges.length - 1) ranges[i][1] = Math.max(ranges[i][1], Math.min(ranges[i + 1][0], words.length));
    else ranges[i][1] = words.length;
    ranges[i][0] = Math.min(ranges[i][0], ranges[i][1] - 1);
  }
  const LEAD = 0.14;
  const starts = ranges.map(([a], i) => (i === 0 ? 0 : Math.max(0, words[a].s - LEAD)));
  const lastWord = words[words.length - 1];
  let voiceEnd = lastWord.e;
  if (outroTok.length) {
    // the last beat ends where the outro starts; the end card comes in with the outro
    const oStart = starts[beats.length];
    ranges.length = beats.length;
    voiceEnd = Math.max(oStart - 0.45, starts[beats.length - 1] + 0.8);
  }
  const segEnd = (i) => (i < beats.length - 1 ? starts[i + 1] : voiceEnd + 0.45);

  const segments = beats.map((b, i) => {
    const [wa, wb] = ranges[i];
    const start = starts[i];
    const end = segEnd(i);
    const t = {};
    const used = new Set();
    for (const [k, target] of Object.entries(b.sync ?? {})) {
      let from = wa;
      let idx = -1;
      while (from < wb) {
        idx = findWord(words, from, wb, target);
        if (idx < 0 || !used.has(idx)) break;
        from = idx + 1;
        idx = -1;
      }
      if (idx >= 0) {
        used.add(idx);
        t[k] = words[idx].s;
      }
    }
    const makeCap = (str, fromIdx, defaultAt) => {
      if (!str) return [];
      const accents = new Set(tokens(b.accent ?? '').map(norm));
      let cursor = fromIdx;
      let last = defaultAt;
      return String(str).split(/\s+/).filter(Boolean).map((w) => {
        const idx = norm(w) ? findWord(words, wa, wb, w, cursor) : -1;
        let at;
        if (idx >= 0) {
          at = words[idx].s;
          cursor = idx + 1;
        } else at = last + 0.14;
        at = Math.max(at, start + 0.05);
        last = at;
        return { t: w, at: +at.toFixed(3), accent: accents.has(norm(w)) || undefined };
      });
    };
    let cap = makeCap(b.cap, wa, start + 0.1);
    // statement scenes: never leave the screen empty while the sentence builds up —
    // non-accent words appear right away, the accent word still lands on its spoken time
    if (b.scene === 'big_word' && cap.length && cap[0].at > start + 0.7) {
      cap = cap.map((c, k) => (c.accent ? c : { ...c, at: +(start + 0.15 + k * 0.12).toFixed(3) }));
    }
    let cap2;
    if (b.scene === 'phone_auto' && b.cap2) {
      const l2 = t.line2 !== undefined ? words.findIndex((w) => w.s >= t.line2 - 1e-6) : Math.round((wa + wb) / 2);
      cap2 = makeCap(b.cap2, Math.max(wa, l2), t.line2 ?? (start + end) / 2);
    }
    return {
      index: i,
      type: SCENES.includes(b.scene) ? b.scene : 'big_word',
      start: +start.toFixed(3),
      end: +end.toFixed(3),
      params: b.params ?? {},
      t,
      cap,
      cap2,
    };
  });

  const endStart = +(segEnd(beats.length - 1) - 0.05).toFixed(3);
  const duration = +Math.max(endStart + 2.75, outroTok.length ? lastWord.e + 1.0 : 0).toFixed(3);
  const props = {
    seed: story.seed ?? Math.floor(Math.random() * 900) + 1,
    audio: opts.audio ?? '',
    duration,
    endStart,
    segments,
    tagline: story.tagline ?? 'Découvre où passe ton temps.',
  };
  return { props, events: sfxEvents(props) };
}

/** sound design cues derived from the same timings the visuals use */
export function sfxEvents(props) {
  const ev = [];
  const add = (type, t, extra = {}) => ev.push({ type, t: +t.toFixed(3), ...extra });
  const tOr = (s, k, frac) => (s.t[k] !== undefined ? s.t[k] : s.start + (s.end - s.start) * frac);
  props.segments.forEach((s, i) => {
    if (i > 0) add('whoosh', s.start - 0.08, { up: i % 2 === 0, gain: s.type === 'wipe_word' ? 0.8 : 0.6 });
    for (const c of [...(s.cap ?? []), ...(s.cap2 ?? [])]) add('tick', c.at, { gain: 0.14 });
    // matches the camera "re-frame" jump in the middle of long scenes (Story.tsx)
    if (s.end - s.start > 2.4) add('pop', s.start + (s.end - s.start) * 0.45, { f: 300, gain: 0.35 });
    switch (s.type) {
      case 'heatmap_reveal': {
        const pu = tOr(s, 'punch', 0.55);
        add('blips', s.start + 0.25, { to: pu, n: 20 });
        add('impact', pu, { f: 58, gain: 0.85 });
        break;
      }
      case 'place_pin': {
        const pin = tOr(s, 'pin', 0.3);
        add('pop', pin, { f: 480, gain: 1 });
        add('pop', pin + 0.5, { f: 640, gain: 0.7 });
        break;
      }
      case 'counter_map': {
        const ct = tOr(s, 'count', 0.05);
        const v = s.params.value ?? 30;
        add('counter', ct, { to: ct + 1.25, n: Math.min(40, Math.max(4, Math.round(v))) });
        add('blips', ct, { to: ct + 1.9, n: 30 });
        if (s.params.bottom) add('impact', tOr(s, 'bottom', 0.75), { f: 70, gain: 0.35 });
        break;
      }
      case 'ring_stat': {
        const ct = tOr(s, 'count', 0.3);
        add('pop', s.start + 0.05, { f: 420, gain: 0.7 });
        add('counter', ct, { to: ct + 1.15, n: Math.min(40, Math.max(4, Math.round(s.params.value ?? 50))) });
        add('impact', ct + 1.08, { f: 50, gain: 0.75 });
        add('pop', tOr(s, 'tile', 0.7), { f: 560, gain: 0.6 });
        break;
      }
      case 'compare': {
        add('pop', s.start + 0.1, { f: 600, gain: 0.5 });
        const tb = tOr(s, 'b', 0.4);
        add('pop', tb, { f: 900, gain: 0.75 });
        add('impact', tb, { f: 70, gain: 0.35 });
        if (s.t.punch !== undefined) add('impact', s.t.punch, { f: 55, gain: 0.85 });
        break;
      }
      case 'bento':
        [0.12, 0.22, 0.32].forEach((d, k) => add('pop', s.start + d, { f: 620 + k * 80, gain: 0.45 }));
        break;
      case 'wipe_word':
        add('impact', tOr(s, 'word', 0.2), { f: 46, gain: 0.9 });
        add('riser', s.start - 0.6, { d: 0.6, gain: 0.12 });
        break;
      case 'phone_auto': {
        [0.7, 0.95, 1.2].forEach((d, k) => add('pop', s.start + d, { f: 620 + k * 80, gain: 0.5 }));
        const auto0 = s.start + (s.end - s.start) * 0.5;
        [1.0, 1.3, 1.55].forEach((d, k) => add('pop', auto0 + d, { f: 880 + k * 110, gain: 0.5 }));
        add('counter', auto0, { to: s.end - 0.3, n: 20, base: 2200, gain: 0.07 });
        break;
      }
      case 'day_timeline': {
        const day = String(s.params.day ?? 'MARDI');
        for (let k = 0; k < day.length; k++) add('tick', s.start + k * 0.045, { gain: 0.16 });
        const ct = tOr(s, 'count', 0.35);
        add('pop', ct - 0.2, { f: 520, gain: 0.5 });
        add('counter', ct, { to: ct + 1.05, n: Math.min(30, Math.max(4, Math.round(s.params.value ?? 14))), base: 1100, gain: 0.16 });
        if (s.t.chip !== undefined) {
          add('pop', s.t.chip, { f: 420, gain: 0.8 });
          add('impact', s.t.chip, { f: 52, gain: 0.8 });
        }
        break;
      }
      case 'goal':
        add('pop', s.start + 0.05, { f: 520, gain: 0.6 });
        add('pop', s.start + 0.45, { f: 700, gain: 0.45 });
        add('pop', Math.max(s.start + 1.6, s.end - 0.8), { f: 980, gain: 0.75 });
        break;
      case 'outro_map':
        add('chimes', tOr(s, 'cool', 0.35), {});
        add('riser', s.end - 0.75, { d: 0.75, gain: 0.18 });
        break;
      case 'big_word':
        if (s.params.place) add('pop', s.start + 0.05, { f: 520, gain: 0.6 });
        break;
      case 'dynamic_island': {
        add('pop', s.start + 0.5, { f: 700, gain: 0.5 });
        const ex = tOr(s, 'expand', 0.45);
        add('whoosh', ex - 0.1, { up: true, gain: 0.35 });
        add('pop', ex, { f: 420, gain: 0.8 });
        break;
      }
      case 'versus': {
        add('pop', s.start + 0.05, { f: 520, gain: 0.6 });
        add('pop', s.start + 0.5, { f: 900, gain: 0.5 });
        add('pop', tOr(s, 'b', 0.35), { f: 600, gain: 0.6 });
        add('impact', tOr(s, 'reveal', 0.7), { f: 50, gain: 0.85 });
        add('chimes', tOr(s, 'reveal', 0.7) + 0.1, {});
        break;
      }
      case 'add_place': {
        [0, 1, 2, 3].forEach((k) => add('pop', s.start + 0.45 + k * 0.32, { f: 700 + k * 90, gain: 0.55 }));
        const tn = tOr(s, 'name', 0.4);
        add('whoosh', tn - 0.15, { up: true, gain: 0.35 });
        const lab = String(s.params.label ?? 'Maison');
        for (let k = 0; k < lab.length; k++) add('tick', tn + 0.25 + k * 0.06, { gain: 0.12 });
        const td = tOr(s, 'done', 0.78);
        add('whoosh', td - 0.15, { up: true, gain: 0.35 });
        add('pop', td + 0.1, { f: 520, gain: 0.9 });
        add('impact', td + 0.1, { f: 60, gain: 0.5 });
        break;
      }
      case 'replay_day':
        (s.params.stops ?? [1, 2, 3]).forEach((_, k) => add('pop', s.start + 0.3 + k * 0.15, { f: 560 + k * 100, gain: 0.5 }));
        add('blips', s.start + 0.7, { to: s.end - 0.5, n: 14 });
        break;
      case 'week_compare':
        add('riser', s.start + 0.3, { d: 1.0, gain: 0.1 });
        [0, 1, 2].forEach((k) => add('pop', tOr(s, 'rows', 0.65) + k * 0.15, { f: 700 + k * 100, gain: 0.5 }));
        break;
      case 'theme_switch': {
        const per = Math.max(0.55, (s.end - s.start - 0.8) / 4);
        for (let k = 0; k < 4; k++) add('pop', s.start + 0.6 + k * per, { f: 600 + k * 120, gain: 0.5 });
        break;
      }
      case 'feature_list': {
        const n = Math.max(1, (s.params.items ?? []).length);
        const span = s.end - s.start - 0.6;
        for (let k = 0; k < n; k++) add('pop', s.t[`i${k + 1}`] ?? s.start + 0.15 + (span / n) * k, { f: 560 + k * 110, gain: 0.6 });
        break;
      }
      case 'app_screen': {
        const tz = tOr(s, 'zoom', 0.35);
        add('whoosh', tz, { up: true, gain: 0.3 });
        add('pop', tz + 0.55, { f: 760, gain: 0.6 });
        if (s.params.region2) {
          const tz2 = tOr(s, 'zoom2', 0.7);
          add('whoosh', tz2, { up: false, gain: 0.3 });
          add('pop', tz2 + 0.55, { f: 880, gain: 0.6 });
        }
        break;
      }
      case 'app_tour': {
        const n = (s.params.shots ?? [1, 2, 3]).length;
        const span = s.end - s.start - 0.5;
        for (let k = 1; k < n; k++) add('whoosh', (s.t[`s${k + 1}`] ?? s.start + 0.2 + (span / n) * k) - 0.1, { up: k % 2 === 0, gain: 0.45 });
        break;
      }
      case 'fact': {
        const ct = tOr(s, 'count', 0.15);
        add('counter', ct, { to: ct + 1.2, n: Math.min(40, Math.max(4, Math.round(s.params.value ?? 30))) });
        add('impact', ct + 1.15, { f: 46, gain: 0.9 });
        break;
      }
    }
  });
  add('whoosh', props.endStart - 0.1, { up: false, gain: 0.6 });
  add('impact', props.endStart + 0.15, { f: 42, gain: 1.0 });
  add('pop', props.endStart + 0.15, { f: 520, gain: 0.9 });
  [0.32, 0.38, 0.44, 0.5].forEach((d) => add('tick', props.endStart + d, { gain: 0.16 }));
  add('pop', props.endStart + 1.4, { f: 760, gain: 0.35 });
  return ev.sort((a, b) => a.t - b.t);
}

if (process.argv[1] && process.argv[1].endsWith('build_props.mjs')) {
  const [storyP, wordsP, outP, evP, audio] = process.argv.slice(2);
  const story = JSON.parse(fs.readFileSync(storyP, 'utf8'));
  const words = JSON.parse(fs.readFileSync(wordsP, 'utf8'));
  const { props, events } = buildProps(story, words, { audio });
  fs.writeFileSync(outP, JSON.stringify(props, null, 1));
  fs.writeFileSync(evP, JSON.stringify({ duration: props.duration, events }, null, 1));
  console.log(`props: ${props.segments.length} segments, ${props.duration}s`);
}
