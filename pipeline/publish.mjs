// Blotato: upload the mp4 and post it to TikTok (public, AI-generated label, own-brand disclosure).
import fs from 'fs';
import path from 'path';

const BASE = 'https://backend.blotato.com/v2';

async function api(method, p, body, key) {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'blotato-api-key': key, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Blotato ${method} ${p} ${res.status}: ${txt.slice(0, 400)}`);
  return txt ? JSON.parse(txt) : {};
}

export async function findTikTokAccount(key) {
  if (process.env.BLOTATO_TIKTOK_ACCOUNT_ID) return process.env.BLOTATO_TIKTOK_ACCOUNT_ID;
  const r = await api('GET', '/users/me/accounts?platform=tiktok', null, key);
  const list = Array.isArray(r) ? r : r.items ?? r.accounts ?? r.data ?? [];
  const acc = list.find((a) => (a.platform ?? 'tiktok') === 'tiktok');
  if (!acc) throw new Error('Aucun compte TikTok connecté dans Blotato');
  return String(acc.id);
}

export async function publish({ file, caption, scheduledTime, key = process.env.BLOTATO_API_KEY }) {
  const accountId = await findTikTokAccount(key);
  const up = await api('POST', '/media/uploads', { filename: path.basename(file) }, key);
  const put = await fetch(up.presignedUrl, { method: 'PUT', headers: { 'content-type': 'video/mp4' }, body: fs.readFileSync(file) });
  if (!put.ok) throw new Error(`upload PUT ${put.status}: ${(await put.text()).slice(0, 300)}`);
  const body = {
    post: {
      accountId,
      content: { text: caption, mediaUrls: [up.publicUrl], platform: 'tiktok' },
      target: {
        targetType: 'tiktok',
        privacyLevel: process.env.TIKTOK_PRIVACY || 'PUBLIC_TO_EVERYONE',
        disabledComments: false,
        disabledDuet: false,
        disabledStitch: false,
        isBrandedContent: false,
        isYourBrand: true,
        isAiGenerated: true,
      },
    },
    ...(scheduledTime ? { scheduledTime } : {}),
  };
  const r = await api('POST', '/posts', body, key);
  const id = r.postSubmissionId ?? r.id;
  console.log('Blotato submission', id, scheduledTime ? `scheduled ${scheduledTime}` : 'now');
  // poll a bit (scheduled posts settle on "scheduled")
  let status = 'in-progress', publicUrl, errorMessage;
  for (let i = 0; i < 40 && id; i++) {
    await new Promise((res) => setTimeout(res, i < 6 ? 5000 : 15000));
    try {
      const s = await api('GET', `/posts/${id}`, null, key);
      status = s.status ?? status;
      publicUrl = s.publicUrl;
      errorMessage = s.errorMessage;
      if (['published', 'scheduled', 'failed'].includes(status)) break;
    } catch (e) {
      console.warn(String(e));
    }
  }
  if (status === 'failed') throw new Error(`Publication échouée: ${errorMessage}`);
  return { id, status, publicUrl };
}
