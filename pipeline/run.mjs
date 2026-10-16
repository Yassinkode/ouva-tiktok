// One full run: story -> voice -> props -> sound -> render -> publish -> history.
// Env: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, BLOTATO_API_KEY, [SLOT=12h|18h|21h], [DRY_RUN=1], [STORY_FILE=path], [FPS_SCALE]
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { buildProps, wordsProportional } from './build_props.mjs';
import { writeStory, validateStory } from './story.mjs';
import { makeVoice } from './voice.mjs';
import { publish as publishBlotato } from './publish.mjs';
import { publish as publishZernio } from './zernio.mjs';
import { sendText, sendVideo } from './telegram.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.chdir(ROOT);
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const SLOTS = [12, 17, 21];

/* ---------- time helpers (Europe/Paris) ---------- */
const parisParts = (d = new Date()) => {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const o = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute };
};
const parisToDate = (y, m, d, h) => {
  // find the UTC instant whose Paris wall-clock is y-m-d h:00
  let guess = Date.UTC(y, m - 1, d, h) - 2 * 3600e3;
  for (let i = 0; i < 3; i++) {
    const p = parisParts(new Date(guess));
    const diff = Date.UTC(y, m - 1, d, h) - Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
    guess += diff;
  }
  return new Date(guess);
};
function pickSlot() {
  const now = new Date();
  const p = parisParts(now);
  if (process.env.SLOT) {
    const h = parseInt(process.env.SLOT, 10);
    return { label: `${h}h`, at: parisToDate(p.y, p.m, p.d, h) };
  }
  // the next slot that is 25 min to 3 h 15 ahead (cron fires ~1-3 h before each slot)
  for (const h of SLOTS) {
    const at = parisToDate(p.y, p.m, p.d, h);
    const lead = at.getTime() - now.getTime();
    if (lead > 25 * 60e3 && lead < 195 * 60e3) return { label: `${h}h`, at };
  }
  return { label: 'now', at: null };
}

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

async function main() {
  const slot = pickSlot();
  const p = parisParts();
  const date = `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  const id = `${date}_${slot.label}`;
  if (slot.label === 'now' && !DRY && process.env.GITHUB_EVENT_NAME === 'schedule') {
    console.log('aucun créneau (12h/17h/21h) dans les 3 prochaines heures, rien à faire');
    return;
  }
  log('run', id, DRY ? '(dry run)' : '');
  fs.mkdirSync('data/stories', { recursive: true });
  fs.mkdirSync('public/runs', { recursive: true });
  fs.mkdirSync('out', { recursive: true });
  const histPath = 'data/history.json';
  const history = fs.existsSync(histPath) ? JSON.parse(fs.readFileSync(histPath, 'utf8')) : [];
  if (!DRY && !process.env.FORCE && history.some((h) => h.id === id && h.status !== 'failed')) {
    log('already posted for this slot, skipping');
    return;
  }

  /* 1. story */
  let story;
  const used = new Set(history.map((h) => h.backlog).filter(Boolean));
  const backlog = fs.existsSync('data/backlog') ? fs.readdirSync('data/backlog').filter((f) => f.endsWith('.json') && !used.has(f)).sort() : [];
  const fromBacklog = () => {
    if (!backlog.length) throw new Error('Plus aucune histoire en réserve (data/backlog)');
    // rotation: avoid the formats of the last 2 videos, the features of the last 3 and the same opening scene
    const recent = history.filter((h) => h.status !== 'failed');
    const lastFormats = recent.slice(-2).map((h) => h.format);
    const lastFeatures = recent.slice(-3).map((h) => h.feature);
    const lastOpener = recent.slice(-1).map((h) => (h.scenes ?? [])[0])[0];
    const load = (f) => ({ f, s: JSON.parse(fs.readFileSync(path.join('data/backlog', f), 'utf8')) });
    const all = backlog.map(load);
    const score = ({ s }) => (lastFormats.includes(s.format) ? 4 : 0) + (lastFeatures.includes(s.feature) ? 2 : 0) + (s.beats?.[0]?.scene === lastOpener ? 1 : 0);
    const best = all.reduce((a, b) => (score(b) < score(a) ? b : a));
    best.s._backlog = best.f;
    return best.s;
  };
  if (process.env.STORY_FILE) story = JSON.parse(fs.readFileSync(process.env.STORY_FILE, 'utf8'));
  else if (!process.env.ANTHROPIC_API_KEY) story = fromBacklog();
  else {
    try {
      story = await writeStory({ history, slot: slot.label });
    } catch (e) {
      log('story API failed, using backlog:', String(e).slice(0, 200));
      story = fromBacklog();
    }
  }
  const errs = validateStory(story);
  if (errs.length) log('story warnings:', errs);
  story.seed = story.seed || (Math.abs([...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 900) + 1;
  fs.writeFileSync(`data/stories/${id}.json`, JSON.stringify(story, null, 1));
  const text = story.beats.map((b) => b.text.trim()).join(' ');
  log('story:', story.title, `(${text.length} chars)`);

  /* 2. voice */
  const voicePath = `out/${id}_voice.mp3`;
  let words;
  let voiceModel = 'file';
  if (process.env.VOICE_FILE) {
    fs.copyFileSync(process.env.VOICE_FILE, voicePath);
  } else {
    const v = await makeVoice(text, voicePath);
    words = v.words;
    voiceModel = v.model;
  }
  if (!words || !words.length) {
    try {
      execFileSync('node', ['pipeline/transcribe.mjs', voicePath, `out/${id}_words.json`], { stdio: 'inherit' });
      words = JSON.parse(fs.readFileSync(`out/${id}_words.json`, 'utf8'));
    } catch (e) {
      const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voicePath]).toString());
      words = wordsProportional(text, dur);
    }
  }

  /* 3. props + sound */
  const audioRel = `runs/${id}.wav`;
  const { props, events } = buildProps(story, words, { audio: audioRel });
  fs.writeFileSync(`out/${id}_props.json`, JSON.stringify(props));
  fs.writeFileSync(`out/${id}_events.json`, JSON.stringify({ duration: props.duration, events }));
  execFileSync('python3', ['pipeline/mix_audio.py', `out/${id}_events.json`, voicePath, `public/${audioRel}`], { stdio: 'inherit' });

  /* 4. render */
  log('bundling');
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts') });
  const browserExecutable = process.env.REMOTION_CHROME || null;
  const composition = await selectComposition({ serveUrl, id: 'Story', inputProps: props, browserExecutable });
  const raw = `out/${id}_raw.mp4`;
  let last = 0;
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 14,
    outputLocation: raw,
    inputProps: props,
    browserExecutable,
    concurrency: Math.max(1, os.cpus().length),
    chromiumOptions: { gl: 'swangle' },
    imageFormat: 'jpeg',
    ...(process.env.FRAME_RANGE ? { frameRange: process.env.FRAME_RANGE.split('-').map(Number) } : {}),
    jpegQuality: 92,
    onProgress: ({ progress }) => {
      if (progress - last > 0.1) {
        last = progress;
        log(`render ${Math.round(progress * 100)}%`);
      }
    },
  });
  const final = `out/OuVa_${id}.mp4`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf', 'noise=c0s=5:c0f=t+u,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', final]);
  fs.rmSync(raw, { force: true });
  log('video ready', final);

  /* 5. publish */
  const caption = `${story.caption ?? ''}\n\n${(story.hashtags ?? ['#ouva']).join(' ')}`.trim();
  const hook = story.beats[0].text;
  const entry = { id, date, slot: slot.label, title: story.title, angle: story.angle, format: story.format, feature: story.feature, hook, caption, backlog: story._backlog, scenes: story.beats.map((b) => b.scene) };
  const tg = !!process.env.TELEGRAM_BOT_TOKEN;
  if (DRY && !tg) {
    entry.status = 'dry-run';
    log('dry run: not publishing');
  } else if (!DRY && process.env.ZERNIO_API_KEY) {
    // free automatic posting on TikTok through Zernio, then a heads-up on Telegram
    try {
      const scheduledFor = slot.at && slot.at.getTime() - Date.now() > 3 * 60e3 ? slot.at.toISOString() : undefined;
      const r = await publishZernio({ file: final, caption, scheduledFor });
      Object.assign(entry, { status: r.status, postId: r.id, url: r.publicUrl, scheduledFor, via: 'zernio', where: r.where, voice: voiceModel });
      const when = scheduledFor ? `programmée pour ${slot.label}` : 'publiée';
      const warn = r.warnings?.length ? `\n⚠️ ${r.warnings.join(' | ')}` : '';
      if (tg) await sendText(`✅ Vidéo OùVa ${when} sur ${r.where}${r.publicUrl ? ' : ' + r.publicUrl : ''}${warn}\n\n${caption}`).catch(() => {});
    } catch (e) {
      log('auto-post failed, sending to Telegram instead', e);
      entry.error = String(e).slice(0, 500);
      if (tg) {
        await sendText(`⚠️ La publication automatique a échoué (${String(e).slice(0, 300)}). Voici la vidéo à poster toi-même :`).catch(() => {});
        const r = await sendVideo({ file: final, caption });
        entry.status = r.status;
      } else entry.status = 'failed';
    }
  } else if (!process.env.BLOTATO_API_KEY || DRY) {
    // free mode: deliver to the phone, the owner posts it on TikTok
    const r = await sendVideo({ file: final, caption: DRY ? `[TEST] ${caption}` : slot.at ? `📌 À poster à ${slot.label}\n\n${caption}` : caption });
    entry.status = DRY ? 'dry-run' : r.status;
  } else {
    const scheduledTime = slot.at && slot.at.getTime() - Date.now() > 3 * 60e3 ? slot.at.toISOString() : undefined;
    try {
      const r = await publishBlotato({ file: final, caption, scheduledTime });
      Object.assign(entry, { status: r.status, postId: r.id, url: r.publicUrl, scheduledTime });
    } catch (e) {
      entry.status = 'failed';
      entry.error = String(e).slice(0, 500);
      log('publish failed', e);
    }
  }
  const left = backlog.length - (story._backlog ? 1 : 0);
  if (!DRY && tg && story._backlog && [9, 6, 3, 1].includes(left))
    await sendText(`Il reste ${left} histoire(s) en réserve pour OùVa (≈ ${Math.ceil(left / 3)} jour(s)). Demande un nouveau lot à Claude.`).catch(() => {});
  if (!DRY) {
    history.push(entry);
    fs.writeFileSync(histPath, JSON.stringify(history, null, 1));
  }
  fs.rmSync(`public/${audioRel}`, { force: true });
  if (entry.status === 'failed') process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  if (process.env.TELEGRAM_BOT_TOKEN) await sendText(`OùVa : la vidéo du jour a échoué.\n${String(e).slice(0, 600)}`).catch(() => {});
  process.exit(1);
});
