// Offline test of the API glue with a mocked fetch.
import fs from 'fs';
import { writeStory, validateStory } from '../pipeline/story.mjs';
import { publish } from '../pipeline/publish.mjs';
import { makeVoice } from '../pipeline/voice.mjs';
const story = JSON.parse(fs.readFileSync('test/story_orig.json', 'utf8'));
story.caption = 'test'; story.hashtags = ['#ouva'];
const calls = [];
let n = 0;
globalThis.fetch = async (url, opt = {}) => {
  calls.push(`${opt.method ?? 'GET'} ${url.split('?')[0]}`);
  const J = (o, status = 200) => ({ ok: status < 300, status, json: async () => o, text: async () => JSON.stringify(o) });
  if (url.includes('anthropic')) {
    n++;
    if (n === 1) return J({ content: [{ text: 'voilà {"beats": [] }' }] }); // invalid -> retry
    return J({ content: [{ text: JSON.stringify(story) }] });
  }
  if (url.includes('elevenlabs')) {
    const body = JSON.parse(opt.body);
    if (body.model_id === 'eleven_v4') return J({ detail: 'model not found' }, 400);
    const chars = [...body.text];
    return J({ audio_base64: Buffer.from('ID3').toString('base64'), alignment: { characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.06), character_end_times_seconds: chars.map((_, i) => i * 0.06 + 0.05) } });
  }
  if (url.endsWith('/users/me/accounts?platform=tiktok')) return J({ items: [{ id: 42, platform: 'tiktok' }] });
  if (url.endsWith('/media/uploads')) return J({ presignedUrl: 'https://up.example/put', publicUrl: 'https://pub.example/v.mp4' });
  if (url === 'https://up.example/put') return J({});
  if (url.endsWith('/posts')) { const b = JSON.parse(opt.body); if (b.post.target.isAiGenerated !== true) throw new Error('AI flag'); return J({ postSubmissionId: 'abc' }); }
  if (url.endsWith('/posts/abc')) return J({ status: 'scheduled' });
  return J({}, 404);
};
console.log('validate original:', validateStory(story));
const st = await writeStory({ history: [], slot: '12h', apiKey: 'x' });
console.log('story beats', st.beats.length);
const v = await makeVoice(st.beats.map((b) => b.text).join(' '), '/tmp/v.mp3', { apiKey: 'x' });
console.log('voice', v.model, v.words.length, 'words');
const origSet = global.setTimeout; global.setTimeout = (f) => origSet(f, 1);
const r = await publish({ file: 'test/story_orig.json', caption: 'hi', scheduledTime: new Date().toISOString(), key: 'k' });
console.log('publish', r);
console.log(calls.join('\n'));
