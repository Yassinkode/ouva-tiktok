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
import { publish as publishZernio, deletePost, postStatus } from './zernio.mjs';
import { pickBg } from './bg.mjs';
import { sendText, sendVideo } from './telegram.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.chdir(ROOT);
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const SLOTS = (process.env.SLOTS || '18').split(',').map(Number); // heures de Paris
const STYLE = 3; // video style version: older scheduled videos are replaced by new ones

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
/** upcoming slots (12h/17h/21h Paris) from 25 min to HORIZON_H hours ahead, soonest first */
function upcomingSlots(now = new Date()) {
  const horizon = parseFloat(process.env.HORIZON_H || '40') * 3600e3;
  const out = [];
  for (let k = 0; k < 3; k++) {
    const p = parisParts(new Date(now.getTime() + k * 86400e3));
    const date = `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    for (const h of SLOTS) {
      const at = parisToDate(p.y, p.m, p.d, h);
      const lead = at.getTime() - now.getTime();
      if (lead > 25 * 60e3 && lead < horizon && !out.some((o) => o.at.getTime() === at.getTime())) out.push({ label: `${h}h`, at, date });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

async function main() {
  fs.mkdirSync('data/stories', { recursive: true });
  fs.mkdirSync('public/runs', { recursive: true });
  fs.mkdirSync('out', { recursive: true });
  const histPath = 'data/history.json';
  const history = fs.existsSync(histPath) ? JSON.parse(fs.readFileSync(histPath, 'utf8')) : [];
  // videos still waiting in Zernio from an old slot plan or an old visual style are cancelled and redone
  if (!DRY && process.env.ZERNIO_API_KEY) {
    for (const h of history) {
      if (h.status !== 'scheduled' || h.via !== 'zernio' || !h.postId || !h.scheduledFor) continue;
      if (new Date(h.scheduledFor).getTime() - Date.now() < 15 * 60e3) continue;
      const hour = parseInt(String(h.slot), 10);
      if (SLOTS.includes(hour) && (h.style ?? 1) >= STYLE) continue;
      try {
        await deletePost(h.postId);
        h.status = 'cancelled';
        log('annulée (ancien créneau ou ancien style) :', h.id);
      } catch (e) {
        log('annulation impossible', h.id, String(e).slice(0, 200));
      }
    }
    fs.writeFileSync(histPath, JSON.stringify(history, null, 1));
  }
  // check the videos whose time has passed: did TikTok / Instagram really publish them?
  if (!DRY && process.env.ZERNIO_API_KEY) {
    const due = history.filter((h) => h.via === 'zernio' && h.postId && h.status === 'scheduled' && h.scheduledFor && new Date(h.scheduledFor).getTime() < Date.now() - 20 * 60e3);
    const problems = [];
    for (const h of due.slice(-12)) {
      try {
        const st = await postStatus(h.postId);
        h.platforms = st;
        const bad = st.filter((x) => x.status === 'failed');
        const ok = st.filter((x) => x.status === 'published');
        if (ok.length && !bad.length) h.status = 'published';
        else if (bad.length) {
          h.status = ok.length ? 'partial' : 'publish-failed';
          problems.push(`${h.id} — ${bad.map((x) => `${x.platform} : ${(x.error ?? 'erreur inconnue').slice(0, 160)}`).join(' | ')}`);
        }
      } catch (e) {
        log('statut impossible', h.id, String(e).slice(0, 160));
      }
    }
    fs.writeFileSync(histPath, JSON.stringify(history, null, 1));
    if (problems.length && process.env.TELEGRAM_BOT_TOKEN) await sendText(`⚠️ Publications en échec :\n${problems.join('\n')}`).catch(() => {});
  }
  const done = (slot) => history.some((h) => h.id === `${slot.date}_${slot.label}` && !['failed', 'cancelled'].includes(h.status));
  let slots = upcomingSlots();
  if (process.env.SLOT) slots = slots.filter((s) => s.label === `${parseInt(process.env.SLOT, 10)}h`).slice(0, 1);
  // GitHub's cron is often late or skipped: every run fills ALL the free slots of the next ~40 h,
  // and Zernio publishes each video at its exact time.
  const todo = DRY ? slots.slice(0, 1) : slots.filter((s) => process.env.FORCE || !done(s)).slice(0, parseInt(process.env.MAX_PER_RUN || '2', 10));
  log('créneaux à préparer :', todo.map((s) => `${s.date} ${s.label}`).join(', ') || 'aucun');
  if (process.env.LIST_ONLY) return;
  let failures = 0;
  for (const slot of todo) {
    try {
      const st = await makeOne(slot, history, histPath);
      if (st === 'failed') failures++;
    } catch (e) {
      failures++;
      console.error(e);
      if (process.env.TELEGRAM_BOT_TOKEN) await sendText(`OùVa : la vidéo de ${slot.label} (${slot.date}) a échoué.\n${String(e).slice(0, 500)}`).catch(() => {});
    }
  }
  if (failures) process.exit(1);
}

async function render(compId, props, raw) {
  log('bundling');
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts') });
  const browserExecutable = process.env.REMOTION_CHROME || null;
  const composition = await selectComposition({ serveUrl, id: compId, inputProps: props, browserExecutable });
  let last = 0;
  await renderMedia({
    composition, serveUrl, codec: 'h264', crf: 14, outputLocation: raw, inputProps: props, browserExecutable,
    concurrency: Math.max(1, os.cpus().length), chromiumOptions: { gl: 'swangle' }, imageFormat: 'jpeg', jpegQuality: 92,
    onProgress: ({ progress }) => {
      if (progress - last > 0.1) {
        last = progress;
        log(`render ${Math.round(progress * 100)}%`);
      }
    },
  });
}

/* « Lab » format (since 2026-10-30): light motion-design explainer, no voice, ~15 s */
async function makeLab(slot, history, histPath) {
  const date = slot.date;
  const id = `${date}_${slot.label}`;
  log('run lab', id, DRY ? '(dry run)' : '');
  const used = new Set(history.filter((h) => !['cancelled', 'failed'].includes(h.status)).map((h) => h.backlog).filter(Boolean));
  const stock = fs.readdirSync('data/lab').filter((f) => f.endsWith('.json') && !used.has(`lab/${f}`)).sort();
  if (!stock.length) throw new Error("📚 Stock de vidéos OùVa vide. Demande un nouveau lot à Claude.");
  const f = stock[0];
  const v = JSON.parse(fs.readFileSync(path.join('data/lab', f), 'utf8'));
  const audioRel = `runs/${id}.wav`;
  const [bgName, bgStart] = v.bg ?? ['arches', 11.4];
  execFileSync('python3', ['pipeline/lab_audio.py', `public/${audioRel}`, bgName, String(bgStart)], { stdio: 'inherit' });
  const props = { ...v, audio: audioRel };
  const raw = `out/${id}_raw.mp4`;
  await render('Lab', props, raw);
  const final = `out/OuVa_${id}.mp4`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', final]);
  fs.rmSync(raw, { force: true });
  log('video ready', final);
  const caption = `${v.caption ?? ''}\n\n${(v.hashtags ?? ['#ouva']).join(' ')}`.trim();
  const entry = { id, date, slot: slot.label, title: v.hook.filter(Boolean).join(' '), format: 'lab', feature: v.place, hook: v.hook.filter(Boolean).join(' '), caption, backlog: `lab/${f}`, bg: bgName, style: STYLE };
  const status = await deliver({ slot, final, caption, entry, history, histPath });
  const left = stock.length - 1;
  if (!DRY && process.env.TELEGRAM_BOT_TOKEN && [10, 5, 2].includes(left))
    await sendText(`📚 Stock de vidéos OùVa : plus que ${left} en réserve (≈ ${Math.ceil(left / SLOTS.length)} jour(s)).\n👉 Demande un nouveau lot à Claude.`).catch(() => {});
  fs.rmSync(`public/${audioRel}`, { force: true });
  return status;
}

async function makeOne(slot, history, histPath) {
  if ((process.env.FORMAT || 'lab') === 'lab') return makeLab(slot, history, histPath);
  const date = slot.date;
  const id = `${date}_${slot.label}`;
  log('run', id, DRY ? '(dry run)' : '');

  /* 1. story */
  let story;
  const used = new Set(history.filter((h) => h.status !== 'cancelled').map((h) => h.backlog).filter(Boolean));
  const backlog = fs.existsSync('data/backlog') ? fs.readdirSync('data/backlog').filter((f) => f.endsWith('.json') && !used.has(f)).sort() : [];
  const fromBacklog = () => {
    if (!backlog.length) throw new Error("📚 Stock d'histoires vide : plus aucune vidéo ne peut être publiée. Demande un nouveau lot d'histoires à Claude.");
    // rotation: avoid the formats of the last 2 videos, the features of the last 3 and the same opening scene
    const recent = history.filter((h) => !['failed', 'cancelled'].includes(h.status));
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
  // every video ends with the same spoken call to action over the end card
  if (story.outro === undefined) story.outro = process.env.OUTRO ?? "Lien de l'application en bio.";
  const text = [...story.beats.map((b) => b.text.trim()), story.outro].filter(Boolean).join(' ');
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
  const bg = pickBg(story, history);
  if (bg) log('fond sonore:', bg.title);
  fs.writeFileSync(`out/${id}_events.json`, JSON.stringify({ duration: props.duration, events, bg: bg ? { file: bg.file, start: bg.start ?? 0 } : null }));
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
  const entry = { id, date, slot: slot.label, title: story.title, angle: story.angle, format: story.format, feature: story.feature, hook, caption, backlog: story._backlog, bg: bg?.id, style: STYLE, scenes: story.beats.map((b) => b.scene), voice: voiceModel };
  await deliver({ slot, final, caption, entry, history, histPath, push: false });
  const tg = !!process.env.TELEGRAM_BOT_TOKEN;
  const left = backlog.length - (story._backlog ? 1 : 0);
  if (!DRY && tg && story._backlog && [15, 10, 5, 2].includes(left))
    await sendText(`📚 Stock d'histoires OùVa : plus que ${left} vidéo(s) en réserve, soit environ ${Math.ceil(left / SLOTS.length)} jour(s).\n👉 Demande un nouveau lot d'histoires à Claude pour que les publications continuent.`).catch(() => {});
  if (!DRY) {
    history.push(entry);
    fs.writeFileSync(histPath, JSON.stringify(history, null, 1));
  }
  fs.rmSync(`public/${audioRel}`, { force: true });
  return entry.status;
}

/** publish (Zernio scheduled at the slot time) or send to Telegram; records the entry in the history */
async function deliver({ slot, final, caption, entry, history, histPath, push = true }) {
  const tg = !!process.env.TELEGRAM_BOT_TOKEN;
  if (DRY && !tg) {
    entry.status = 'dry-run';
    log('dry run: not publishing');
  } else if (!DRY && process.env.ZERNIO_API_KEY) {
    // free automatic posting on TikTok through Zernio, then a heads-up on Telegram
    try {
      const scheduledFor = slot.at && slot.at.getTime() - Date.now() > 3 * 60e3 ? slot.at.toISOString() : undefined;
      const r = await publishZernio({ file: final, caption, scheduledFor });
      Object.assign(entry, { status: r.status, postId: r.id, url: r.publicUrl, scheduledFor, via: 'zernio', where: r.where });
      const isToday = slot.date === new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
      const when = scheduledFor ? `programmée pour ${isToday ? '' : 'demain '}${slot.label}` : 'publiée';
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
    const r = await sendVideo({ file: final, caption: DRY ? `[TEST] ${caption}` : slot.at ? `📌 À poster le ${slot.date.slice(8)}/${slot.date.slice(5, 7)} à ${slot.label}\n\n${caption}` : caption });
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
  if (!DRY && push) {
    history.push(entry);
    fs.writeFileSync(histPath, JSON.stringify(history, null, 1));
  }
  return entry.status;
}

main().catch(async (e) => {
  console.error(e);
  if (process.env.TELEGRAM_BOT_TOKEN) await sendText(`OùVa : le lancement a échoué.\n${String(e).slice(0, 600)}`).catch(() => {});
  process.exit(1);
});
