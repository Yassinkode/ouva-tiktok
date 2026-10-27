// Publishes one ready-made video (data/post/post.json) right now on TikTok + Instagram through Zernio.
import fs from 'fs';
import { publish } from './zernio.mjs';
import { sendText } from './telegram.mjs';
const spec = JSON.parse(fs.readFileSync('data/post/post.json', 'utf8'));
const r = await publish({ file: spec.file, caption: spec.caption });
console.log('published', r);
fs.writeFileSync('data/post/result.json', JSON.stringify({ ...r, at: new Date().toISOString() }, null, 1));
if (process.env.TELEGRAM_BOT_TOKEN) await sendText(`✅ Vidéo spéciale publiée sur ${r.where}${r.publicUrl ? ' : ' + r.publicUrl : ''}${r.warnings?.length ? '\n⚠️ ' + r.warnings.join(' | ') : ''}`).catch(() => {});
