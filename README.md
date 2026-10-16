# OùVa — usine à vidéos TikTok

**Mode gratuit (actif)** : une vidéo tous les 2 jours (~15/mois) est doublée avec la voix Paul K (ElevenLabs),
montée et envoyée sur ton **Telegram** vers 18 h avec sa légende. Tu la postes sur TikTok via « Partager ».
Les histoires viennent de la réserve `data/backlog/` (écrite par Claude) ; quand il en reste 3, le bot te prévient.

Secrets nécessaires : `ELEVENLABS_API_KEY`, `TELEGRAM_BOT_TOKEN` (créé avec @BotFather, puis envoie /start à ton bot).
Optionnels (payants) : `ANTHROPIC_API_KEY` (histoires écrites à la volée), `BLOTATO_API_KEY` (publication directe TikTok).

---
Mode complet (payant) : 3 vidéos/jour publiées directement à 12 h, 18 h et 21 h.

```
Claude (Anthropic API)  →  ElevenLabs (voix Paul K + timings au mot)  →  Remotion (scènes animées)
   histoire en "beats"         mp3 + alignement                          + bruitages synthétisés
                                                                          ↓
                                              Blotato → TikTok (public, label « IA », « ma marque »)
```

## Mise en route (une fois)
1. **Secrets** du dépôt (Settings → Secrets and variables → Actions → New repository secret) :
   - `ANTHROPIC_API_KEY` — console.anthropic.com → API keys
   - `ELEVENLABS_API_KEY` — elevenlabs.io → Profile → API keys
   - `BLOTATO_API_KEY` — Blotato → Settings → API
   - (optionnel) `BLOTATO_TIKTOK_ACCOUNT_ID` si plusieurs comptes TikTok sont connectés
2. **Test** : onglet Actions → « OùVa TikTok » → Run workflow → `dry_run = 1`.
   La vidéo apparaît dans les artefacts du run, rien n'est publié.
3. C'est tout : les 3 créneaux quotidiens tournent ensuite tout seuls.

## Piloter
- **Mettre en pause** : Settings → Variables → `PAUSED = 1` (les vidéos sont générées mais pas publiées).
- **Modèle d'écriture** : variable `STORY_MODEL` (défaut `claude-opus-5-5`).
- **Ton / angles / règles** : `pipeline/STORY_GUIDE.md` (c'est le brief donné à Claude).
- **Historique** : `data/history.json` (anti-répétition) et `data/stories/` (scripts publiés).
- **Secours** : si l'API d'écriture tombe, une histoire de `data/backlog/` est utilisée.

## Coûts indicatifs / mois (90 vidéos)
Blotato Starter ~29 $ · ElevenLabs ~50 000 caractères (plan Creator suffisant) · Anthropic < 5 $ · GitHub Actions gratuit (dépôt public).

## Fichiers
- `src/story/` — moteur de scènes (carte de chaleur, épingle, compteur, anneau, comparaison, bento, aplat, iPhone, journée, objectif, outro, typo) + carte de fin
- `pipeline/run.mjs` — orchestration d'un run · `story.mjs` (écriture + validation) · `voice.mjs` · `build_props.mjs` (synchro mots → scènes) · `mix_audio.py` (bruitages, pas de musique) · `publish.mjs`
- `src/scenes/` + composition `OuvaAd` — la pub originale

Local : `npm run test:dry` (nécessite `ELEVENLABS_API_KEY`), `npm run studio` pour prévisualiser.
