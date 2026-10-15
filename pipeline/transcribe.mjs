// Fallback word timings with a local Whisper model (no network needed at runtime).
// Usage: node pipeline/transcribe.mjs voice.mp3 words.json
import { pipeline, env } from '@huggingface/transformers';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const [inp, out] = process.argv.slice(2);
env.localModelPath = path.join(path.dirname(require.resolve('sts-whisper-base/package.json')), 'models') + '/';
env.allowRemoteModels = false;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', inp, '-ar', '16000', '-ac', '1', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
const audio = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', { dtype: 'q8' });
const r = await asr(audio, { language: 'french', task: 'transcribe', return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5 });
// whisper word onsets land ~0.18 s late: shift
const words = r.chunks.map((c) => ({ w: c.text.trim(), s: Math.max(0, c.timestamp[0] - 0.18), e: Math.max(0, (c.timestamp[1] ?? c.timestamp[0] + 0.3) - 0.18) })).filter((w) => w.w);
fs.writeFileSync(out, JSON.stringify(words, null, 1));
console.log(`transcribed ${words.length} words`);
