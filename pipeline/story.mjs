// Writes a new story with the Anthropic API, validated against the scene catalogue.
import fs from 'fs';
import path from 'path';
import { SCENES, norm, tokens, wordMatches } from './build_props.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export const SHOT_IDS = ['home_now', 'home_features', 'places_heatmap', 'day_map', 'place_stats', 'add_place'];

export function validateStory(st) {
  const errs = [];
  if (!st || !Array.isArray(st.beats)) return ['beats manquant'];
  const n = st.beats.length;
  if (n < 6 || n > 12) errs.push(`il faut 6 à 11 beats (reçu ${n})`);
  const total = st.beats.reduce((a, b) => a + String(b.text ?? '').length, 0);
  if (total < 250 || total > 720) errs.push(`texte total ${total} caractères (attendu 450–620)`);
  const kinds = new Set();
  let wipes = 0, phones = 0;
  st.beats.forEach((b, i) => {
    const where = `beat ${i + 1}`;
    if (!b.text || typeof b.text !== 'string') errs.push(`${where}: text manquant`);
    if (/[\[\]]/.test(b.text ?? '')) errs.push(`${where}: pas de crochets`);
    if ((b.text ?? '').length > 110) errs.push(`${where}: trop long (${b.text.length} car.)`);
    if (!SCENES.includes(b.scene)) errs.push(`${where}: scene inconnue "${b.scene}"`);
    if (i > 0 && st.beats[i - 1].scene === b.scene) errs.push(`${where}: même scène que le beat précédent`);
    kinds.add(b.scene);
    if (b.scene === 'wipe_word') wipes++;
    if (b.scene === 'phone_auto') phones++;
    const tk = tokens(b.text ?? '');
    for (const [k, w] of Object.entries(b.sync ?? {})) {
      if (!tk.some((t) => wordMatches(t, w))) errs.push(`${where}: sync.${k}="${w}" absent du texte`);
    }
    const p = b.params ?? {};
    if (b.scene === 'wipe_word' && (!p.word || String(p.word).length > 13)) errs.push(`${where}: params.word requis (≤ 12 lettres)`);
    if (b.scene === 'compare' && (!p.a || !p.b)) errs.push(`${where}: params.a et params.b requis`);
    if (['ring_stat', 'counter_map', 'day_timeline'].includes(b.scene) && typeof p.value !== 'number') errs.push(`${where}: params.value (nombre) requis`);
    if (b.scene === 'app_screen' && !SHOT_IDS.includes(p.shot)) errs.push(`${where}: params.shot doit être ${SHOT_IDS.join('/')}`);
    if (b.scene === 'app_tour' && (!Array.isArray(p.shots) || p.shots.some((x) => !SHOT_IDS.includes(x)))) errs.push(`${where}: params.shots invalide`);
    if (b.scene === 'fact' && typeof p.value !== 'number') errs.push(`${where}: params.value requis`);
    if (b.scene === 'feature_list' && (!Array.isArray(p.items) || !p.items.length)) errs.push(`${where}: params.items requis`);
    if (b.scene === 'bento' && (!Array.isArray(p.places) || p.places.length < 3)) errs.push(`${where}: params.places (4 lieux) requis`);
    if (b.cap && tokens(b.cap).length > 6) errs.push(`${where}: cap trop long`);
  });
  if (kinds.size < 5) errs.push(`seulement ${kinds.size} types de scènes (min 5)`);
  if (!st.beats.some((b) => ['app_screen', 'app_tour'].includes(b.scene))) errs.push('au moins une capture réelle (app_screen ou app_tour) requise');
  if (wipes > 1) errs.push('wipe_word plus d’une fois');
  if (phones > 1) errs.push('phone_auto plus d’une fois');
  if (!st.caption) errs.push('caption manquante');
  return errs;
}

const extractJson = (txt) => {
  const a = txt.indexOf('{');
  const b = txt.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('pas de JSON');
  return JSON.parse(txt.slice(a, b + 1));
};

export async function writeStory({ history = [], slot = '', apiKey = process.env.ANTHROPIC_API_KEY, model = process.env.STORY_MODEL || 'claude-opus-5-5' } = {}) {
  const guide = fs.readFileSync(path.join(ROOT, 'pipeline/STORY_GUIDE.md'), 'utf8');
  const recent = history.slice(-45).map((h) => `- [${h.date} ${h.slot}] ${h.angle ?? ''} — « ${h.hook} »`).join('\n') || '(aucune)';
  const messages = [
    {
      role: 'user',
      content: `Écris la vidéo du ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' })}, créneau ${slot}.\n\nVidéos déjà publiées (ne répète ni l'angle des 6 dernières ni aucune accroche) :\n${recent}\n\nRéponds uniquement avec le JSON.`,
    },
  ];
  let lastErr = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 4000, temperature: 1, system: guide, messages }),
    });
    if (!res.ok) {
      lastErr = `Anthropic ${res.status}: ${await res.text()}`;
      console.warn(lastErr);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
      continue;
    }
    const data = await res.json();
    const txt = data.content.map((c) => c.text ?? '').join('');
    let st;
    try {
      st = extractJson(txt);
    } catch (e) {
      messages.push({ role: 'assistant', content: txt }, { role: 'user', content: 'JSON invalide. Renvoie uniquement un objet JSON valide.' });
      continue;
    }
    const errs = validateStory(st);
    if (!errs.length) return st;
    console.warn(`story attempt ${attempt} rejected:`, errs);
    lastErr = errs.join('; ');
    messages.push({ role: 'assistant', content: txt }, { role: 'user', content: `Corrige ces problèmes et renvoie le JSON complet :\n- ${errs.join('\n- ')}` });
  }
  throw new Error(`Impossible d'écrire une histoire valide: ${lastErr}`);
}
