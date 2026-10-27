// Generates each voice line of a one-off video (data/oneoff/lines.json) with word timings, into data/oneoff/<id>/.
import fs from 'fs';
import { makeVoice } from './voice.mjs';
const spec = JSON.parse(fs.readFileSync('data/oneoff/lines.json', 'utf8'));
const dir = `data/oneoff/${spec.id}`;
fs.mkdirSync(dir, { recursive: true });
if (spec.speed) process.env.VOICE_SPEED = String(spec.speed);
const out = [];
for (const l of spec.lines) {
  const mp3 = `${dir}/${l.k}.mp3`;
  const r = await makeVoice(l.text, mp3);
  out.push({ ...l, model: r.model, words: r.words });
  console.log(l.k, r.model, (r.words ?? []).length, 'words');
}
fs.writeFileSync(`${dir}/lines_out.json`, JSON.stringify(out, null, 1));
