// ElevenLabs TTS with character timestamps -> mp3 + word timings.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { wordsFromAlignment } from './build_props.mjs';

export const VOICE_ID = process.env.ELEVEN_VOICE_ID || 'MBIQRZjHPU6xEjGuB3b8'; // Paul K - Deep Engaging Storyteller
const MODELS = (process.env.ELEVEN_MODELS || 'eleven_v4,eleven_v3,eleven_multilingual_v2').split(',');

/** free fallback: Microsoft Edge neural voice (used when the ElevenLabs monthly quota is used up) */
export function edgeVoice(text, outMp3) {
  const base = outMp3.replace(/\.mp3$/, '');
  fs.writeFileSync(`${base}_text.txt`, text);
  execFileSync('python3', ['pipeline/edge_voice.py', `${base}_text.txt`, outMp3, `${base}_edgewords.json`], { stdio: 'inherit' });
  const words = JSON.parse(fs.readFileSync(`${base}_edgewords.json`, 'utf8'));
  return { model: 'edge', words: words.length ? words : null };
}

export async function makeVoice(text, outMp3, opts = {}) {
  if (process.env.FORCE_VOICE === 'edge' || !(opts.apiKey ?? process.env.ELEVENLABS_API_KEY)) return edgeVoice(text, outMp3);
  try {
    return await elevenVoice(text, outMp3, opts);
  } catch (e) {
    if (process.env.VOICE_FALLBACK === '0') throw e;
    console.warn('ElevenLabs indisponible, voix gratuite de secours :', String(e).slice(0, 200));
    return edgeVoice(text, outMp3);
  }
}

async function elevenVoice(text, outMp3, { apiKey = process.env.ELEVENLABS_API_KEY } = {}) {
  let lastErr = '';
  // stop early with a clear message if the monthly character quota is too low
  try {
    const sub = await (await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': apiKey } })).json();
    if (typeof sub.character_limit === 'number') {
      const left = sub.character_limit - sub.character_count;
      console.log(`ElevenLabs: ${left} caractères restants ce mois-ci`);
      if (left < text.length) throw new Error(`Crédits ElevenLabs insuffisants (${left} restants, ${text.length} nécessaires). Ça repart au renouvellement mensuel.`);
    }
  } catch (e) {
    if (String(e).includes('insuffisants')) throw e;
  }
  for (const model of MODELS) {
    for (const withLang of [true, false]) {
      const body = {
        text,
        model_id: model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: Number(process.env.VOICE_SPEED || 1.16), style: 0, use_speaker_boost: true },
        ...(withLang ? { language_code: 'fr' } : {}),
      };
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        lastErr = `ElevenLabs ${model} ${res.status}: ${(await res.text()).slice(0, 300)}`;
        console.warn(lastErr);
        if (res.status === 401 || res.status === 402) throw new Error(lastErr);
        continue;
      }
      const data = await res.json();
      fs.writeFileSync(outMp3, Buffer.from(data.audio_base64, 'base64'));
      const al = data.alignment ?? data.normalized_alignment;
      const words = al && al.characters?.length ? wordsFromAlignment(al) : null;
      console.log(`voice ok (${model}), ${words ? words.length + ' words aligned' : 'no alignment'}`);
      return { model, words };
    }
  }
  throw new Error(lastErr || 'ElevenLabs failed');
}
