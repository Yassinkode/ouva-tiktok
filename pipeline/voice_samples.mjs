// Generates samples of the free (Edge) French voices, commits them in samples/ and sends them to Telegram.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { chatId } from './telegram.mjs';

const TEXT = "Ton iPhone sait combien de temps tu passes sur chaque appli. Mais dans chaque lieu ? Rien. OùVa, c'est le temps d'écran, mais pour ta vraie vie. Lien de l'application en bio.";
const VOICES = [
  ['fr-FR-RemyMultilingualNeural', 'Rémy (voix de secours actuelle)'],
  ['fr-FR-HenriNeural', 'Henri'],
  ['fr-CA-ThierryNeural', 'Thierry (accent québécois)'],
];
fs.mkdirSync('samples', { recursive: true });
fs.writeFileSync('samples/text.txt', TEXT);
const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
for (const [v, label] of VOICES) {
  const out = `samples/voix_${v.split('-')[2].replace('Neural', '').toLowerCase()}.mp3`;
  execFileSync('python3', ['pipeline/edge_voice.py', 'samples/text.txt', out, '/tmp/w.json'], { stdio: 'inherit', env: { ...process.env, EDGE_VOICE: v } });
  if (token) {
    const fd = new FormData();
    fd.append('chat_id', await chatId());
    fd.append('title', `Voix gratuite — ${label}`);
    fd.append('performer', 'OùVa');
    fd.append('audio', new Blob([fs.readFileSync(out)], { type: 'audio/mpeg' }), out.split('/')[1]);
    const r = await fetch(`https://api.telegram.org/bot${token}/sendAudio`, { method: 'POST', body: fd });
    console.log(label, r.status);
  }
}
