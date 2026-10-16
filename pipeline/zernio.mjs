// Zernio (free plan: 2 accounts, unlimited posts): upload the mp4 and post it publicly on TikTok.
// Env: ZERNIO_API_KEY, [ZERNIO_TIKTOK_ACCOUNT_ID], [TIKTOK_PRIVACY]
import fs from 'fs';
import path from 'path';

const BASE = 'https://zernio.com/api/v1';

async function api(method, p, body, key = process.env.ZERNIO_API_KEY) {
  const res = await fetch(BASE + p, {
    method,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Zernio ${method} ${p} ${res.status}: ${txt.slice(0, 400)}`);
  return txt ? JSON.parse(txt) : {};
}

export async function findTikTokAccount() {
  if (process.env.ZERNIO_TIKTOK_ACCOUNT_ID) return process.env.ZERNIO_TIKTOK_ACCOUNT_ID;
  const r = await api('GET', '/accounts');
  const acc = (r.accounts ?? []).find((a) => a.platform === 'tiktok');
  if (!acc) throw new Error('Aucun compte TikTok connecté dans Zernio');
  return { id: acc._id, name: acc.username ?? acc.displayName };
}

export async function publish({ file, caption }) {
  const acc = await findTikTokAccount();
  const accountId = typeof acc === 'string' ? acc : acc.id;
  const size = fs.statSync(file).size;
  const pre = await api('POST', '/media/presign', { filename: path.basename(file), contentType: 'video/mp4', size });
  const put = await fetch(pre.uploadUrl, { method: 'PUT', headers: { 'content-type': 'video/mp4' }, body: fs.readFileSync(file) });
  if (!put.ok) throw new Error(`upload PUT ${put.status}: ${(await put.text()).slice(0, 300)}`);
  const r = await api('POST', '/posts', {
    content: caption,
    mediaItems: [{ type: 'video', url: pre.publicUrl }],
    platforms: [{ platform: 'tiktok', accountId }],
    tiktokSettings: {
      privacy_level: process.env.TIKTOK_PRIVACY || 'PUBLIC_TO_EVERYONE',
      allow_comment: true,
      allow_duet: true,
      allow_stitch: true,
      content_preview_confirmed: true,
      express_consent_given: true,
      commercialContentType: 'brand_organic', // promoting our own app (TikTok disclosure)
      video_made_with_ai: true, // AI voice-over
    },
    publishNow: true,
  });
  const post = r.post ?? {};
  const pf = (post.platforms ?? [])[0] ?? {};
  if (post.status === 'failed' || pf.status === 'failed') throw new Error(`Publication TikTok échouée: ${pf.errorMessage ?? r.error ?? 'inconnue'}`);
  let url = pf.platformPostUrl ?? null;
  for (let i = 0; i < 8 && !url && post._id; i++) {
    await new Promise((res) => setTimeout(res, 15000));
    try {
      const s = await api('GET', `/posts/${post._id}`);
      const p2 = (s.post ?? s).platforms?.[0] ?? {};
      if (p2.status === 'failed') throw new Error(`Publication TikTok échouée: ${p2.errorMessage}`);
      url = p2.platformPostUrl ?? null;
    } catch (e) {
      if (String(e).includes('échouée')) throw e;
    }
  }
  return { id: post._id, status: pf.status ?? post.status ?? 'published', publicUrl: url };
}

// `node pipeline/zernio.mjs check` → verifies the key and the connected TikTok account
if (process.argv[1]?.endsWith('zernio.mjs') && process.argv[2] === 'check') {
  findTikTokAccount()
    .then((a) => console.log('Zernio OK, compte TikTok :', typeof a === 'string' ? a : `${a.name} (${a.id})`))
    .catch((e) => { console.error(String(e)); process.exit(1); });
}
