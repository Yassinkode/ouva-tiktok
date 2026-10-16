// Free delivery: send the finished video + caption to the owner's phone through a Telegram bot.
import fs from 'fs';
import path from 'path';

const TOKEN = () => (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const api = (method) => `https://api.telegram.org/bot${TOKEN()}/${method}`;
const STORE = 'data/telegram.json';

async function call(method, init) {
  const r = await fetch(api(method), init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(`Telegram ${method}: ${r.status} ${j.description ?? ''}`.trim());
  return j.result;
}

/** chat id: secret > saved file > last message sent to the bot (/start), then saved for next runs */
export async function chatId() {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID.trim();
  if (fs.existsSync(STORE)) {
    const s = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    if (s.chat_id) return String(s.chat_id);
  }
  const me = await call('getMe');
  const updates = await call('getUpdates');
  const msgs = updates.map((u) => u.message ?? u.channel_post).filter(Boolean);
  const last = msgs[msgs.length - 1];
  if (!last) throw new Error(`Telegram: aucun message reçu par @${me.username}. Ouvre le bot et envoie /start.`);
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify({ chat_id: last.chat.id, bot: me.username }, null, 1));
  console.log(`Telegram: conversation trouvée avec @${me.username}`);
  return String(last.chat.id);
}

export async function sendText(text) {
  const id = await chatId();
  return call('sendMessage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: id, text, disable_web_page_preview: true }),
  });
}

export async function sendVideo({ file, caption }) {
  const id = await chatId();
  const fd = new FormData();
  fd.append('chat_id', id);
  fd.append('supports_streaming', 'true');
  fd.append('width', '1080');
  fd.append('height', '1920');
  fd.append('caption', caption.slice(0, 1000));
  fd.append('video', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), path.basename(file));
  await call('sendVideo', { method: 'POST', body: fd });
  // caption again as plain text, easy to long-press & copy into TikTok
  await sendText(caption);
  return { status: 'sent-telegram' };
}

// `node pipeline/telegram.mjs test` -> quick connectivity check
if (process.argv[1]?.endsWith('telegram.mjs') && process.argv[2] === 'test') {
  sendText('✅ OùVa Studio est bien connecté. Les vidéos arriveront ici.')
    .then(() => console.log('telegram ok'))
    .catch((e) => {
      console.error(String(e));
      process.exit(1);
    });
}

// `node pipeline/telegram.mjs say "texte"` -> send a message
if (process.argv[1]?.endsWith('telegram.mjs') && process.argv[2] === 'say') {
  sendText(process.argv[3] ?? '').catch((e) => {
    console.error(String(e));
    process.exit(1);
  });
}
