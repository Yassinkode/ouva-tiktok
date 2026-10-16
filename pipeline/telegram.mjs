// Free delivery: send the finished video + caption to the owner's phone through a Telegram bot.
import fs from 'fs';
import path from 'path';

const api = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

/** chat id from secret, or discovered from the last message sent to the bot (/start) */
export async function chatId(token = process.env.TELEGRAM_BOT_TOKEN) {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  const r = await (await fetch(api(token, 'getUpdates'))).json();
  const msgs = (r.result ?? []).map((u) => u.message ?? u.channel_post).filter(Boolean);
  const last = msgs[msgs.length - 1];
  if (!last) throw new Error("Telegram: envoie d'abord /start à ton bot pour qu'il connaisse ta conversation");
  return String(last.chat.id);
}

export async function sendText(text, token = process.env.TELEGRAM_BOT_TOKEN) {
  const id = await chatId(token);
  const r = await fetch(api(token, 'sendMessage'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: id, text, disable_web_page_preview: true }),
  });
  if (!r.ok) throw new Error(`Telegram sendMessage ${r.status}: ${await r.text()}`);
}

export async function sendVideo({ file, caption, token = process.env.TELEGRAM_BOT_TOKEN }) {
  const id = await chatId(token);
  const fd = new FormData();
  fd.append('chat_id', id);
  fd.append('supports_streaming', 'true');
  fd.append('width', '1080');
  fd.append('height', '1920');
  fd.append('caption', caption.slice(0, 1000));
  fd.append('video', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), path.basename(file));
  const r = await fetch(api(token, 'sendVideo'), { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`Telegram sendVideo ${r.status}: ${(await r.text()).slice(0, 300)}`);
  // caption again as plain text, easy to long-press & copy into TikTok
  await sendText(caption, token);
  return { status: 'sent-telegram' };
}
