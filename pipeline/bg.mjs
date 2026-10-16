// Picks the background track that fits the video best, without always using the same one.
import fs from 'fs';

export function pickBg(story, history = []) {
  if (process.env.BG === 'none') return null;
  const { tracks } = JSON.parse(fs.readFileSync('data/bg_tracks.json', 'utf8'));
  const avail = tracks.filter((t) => fs.existsSync(t.file));
  if (!avail.length) return null;
  if (process.env.BG) return avail.find((t) => t.id === process.env.BG) ?? null;
  const recent = history.filter((h) => h.bg).slice(-4).map((h) => h.bg);
  const last = recent.at(-1);
  const twiceInARow = recent.length >= 2 && recent.at(-1) === recent.at(-2);
  const score = (t) => {
    let s = (t.fit[story.format] ?? 1) + 0.5 * (t.fit[story.feature] ?? 0);
    s -= 0.6 * recent.filter((x) => x === t.id).length; // variety over the last videos
    if (t.id === last) s -= twiceInARow ? 99 : 1; // twice in a row is ok, three times never
    return s;
  };
  // tiny deterministic jitter so equal scores don't always resolve the same way
  const seed = [...(story.title ?? '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return avail
    .map((t, i) => ({ t, s: score(t) + (((seed >> (i * 3)) & 7) / 7) * 0.3 }))
    .sort((a, b) => b.s - a.s)[0].t;
}
