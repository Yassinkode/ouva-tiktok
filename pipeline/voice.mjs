// ElevenLabs TTS with character timestamps -> mp3 + word timings.
import fs from 'fs';
import { wordsFromAlignment } from './build_props.mjs';

export const VOICE_ID = process.env.ELEVEN_VOICE_ID || 'MBIQRZjHPU6xEjGuB3b8'; // Paul K - Deep Engaging Storyteller
const MODELS = (process.env.ELEVEN_MODELS || 'eleven_v4,eleven_v3,eleven_multilingual_v2').split(',');

export async function makeVoice(text, outMp3, { apiKey = process.env.ELEVENLABS_API_KEY } = {}) {
  let lastErr = '';
  for (const model of MODELS) {
    for (const withLang of [true, false]) {
      const body = {
        text,
        model_id: model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.08, style: 0, use_speaker_boost: true },
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
