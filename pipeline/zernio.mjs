// Zernio (free plan: 2 accounts, unlimited posts): upload the mp4 and post it publicly on TikTok.
// Env: ZERNIO_API_KEY, [ZERNIO_TIKTOK_ACCOUNT_ID], [TIKTOK_PRIVACY]
import fs from 'fs';
import path from 'path';

const BASE = 'https://zernio.com/api/v1';

// the secret may have been pasted with the whole onboarding sentence around it: keep only the sk_ key
const cleanKey = (k = '') => (String(k).match(/sk_[A-Za-z0-9]+/) ?? [String(k).trim()])[0];

async function api(method, p, body, key = cleanKey(process.env.ZERNIO_API_KEY)) {
  const res = await fetch(BASE + p, {
    method,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Zernio ${method} ${p} ${res.status}: ${txt.slice(0, 400)}`);
  return txt ? JSON.parse(txt) : {};
}

/** connected accounts to post to: TikTok (required) + Instagram (Reels) when connected */
export async function findAccounts() {
  const r = await api('GET', '/accounts');
  const list = r.accounts ?? [];
  const tiktok = list.find((a) => a.platform === 'tiktok');
  // optional filter (e.g. ACCOUNT_MATCH=ouva) if several Instagram accounts get connected one day
  const okName = new RegExp(process.env.ACCOUNT_MATCH || '.', 'i');
  const instagram = list.find((a) => a.platform === 'instagram' && okName.test(a.username ?? a.displayName ?? ''));
  if (!tiktok && !instagram) throw new Error('Aucun compte TikTok ni Instagram connecté dans Zernio');
  const fmt = (a) => a && { id: a._id, name: a.username ?? a.displayName };
  return { tiktok: fmt(tiktok), instagram: process.env.INSTAGRAM === '0' ? null : fmt(instagram) };
}

export async function publish({ file, caption, scheduledFor }) {
  const acc = await findAccounts();
  const size = fs.statSync(file).size;
  const pre = await api('POST', '/media/presign', { filename: path.basename(file), contentType: 'video/mp4', size });
  const put = await fetch(pre.uploadUrl, { method: 'PUT', headers: { 'content-type': 'video/mp4' }, body: fs.readFileSync(file) });
  if (!put.ok) throw new Error(`upload PUT ${put.status}: ${(await put.text()).slice(0, 300)}`);
  const platforms = [];
  if (acc.tiktok) platforms.push({ platform: 'tiktok', accountId: acc.tiktok.id });
  if (acc.instagram) platforms.push({ platform: 'instagram', accountId: acc.instagram.id, platformSpecificData: { shareToFeed: true } });
  const r = await api('POST', '/posts', {
    content: caption,
    mediaItems: [{ type: 'video', url: pre.publicUrl }],
    platforms,
    ...(acc.tiktok
      ? {
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
        }
      : {}),
    ...(scheduledFor ? { scheduledFor, timezone: 'Europe/Paris' } : { publishNow: true }),
  });
  const post = r.post ?? {};
  const res = (post.platforms ?? []).map((x) => ({ platform: x.platform, status: x.status, url: x.platformPostUrl ?? null, error: x.errorMessage }));
  const failed = res.filter((x) => x.status === 'failed');
  if (post.status === 'failed' || (res.length && failed.length === res.length))
    throw new Error(`Publication échouée: ${failed.map((x) => `${x.platform}: ${x.error}`).join(' | ') || r.error || 'inconnue'}`);
  const names = platforms.map((x) => (x.platform === 'tiktok' ? 'TikTok' : 'Instagram'));
  return {
    id: post._id,
    status: scheduledFor ? 'scheduled' : 'published',
    publicUrl: res.find((x) => x.url)?.url ?? null,
    where: names.join(' + '),
    warnings: failed.map((x) => `${x.platform} : ${x.error}`),
  };
}

/** cancel a post that is still scheduled (never touches published posts) */
/** status of a post on each platform: [{platform, status, url, error}] */
export async function postStatus(id) {
  const r = await api('GET', `/posts/${id}`);
  const post = r.post ?? r;
  return (post.platforms ?? []).map((x) => ({ platform: x.platform, status: x.status, url: x.platformPostUrl ?? null, error: x.errorMessage ?? null }));
}

export async function deletePost(id) {
  return api('DELETE', `/posts/${id}`);
}

// `node pipeline/zernio.mjs check` → verifies the key and the connected TikTok account
if (process.argv[1]?.endsWith('zernio.mjs') && process.argv[2] === 'check') {
  findAccounts()
    .then((a) => console.log('Zernio OK —', a.tiktok ? `TikTok @${a.tiktok.name}` : 'pas de TikTok', '/', a.instagram ? `Instagram @${a.instagram.name}` : "pas d'Instagram"))
    .catch((e) => { console.error(String(e)); process.exit(1); });
}
