"""
Free fallback voice (Microsoft Edge neural TTS, French male) with word timings.
Usage: python3 pipeline/edge_voice.py text.txt out.mp3 words.json
"""
import asyncio, json, os, sys
import edge_tts

VOICE = os.environ.get('EDGE_VOICE', 'fr-FR-HenriNeural')
RATE = os.environ.get('EDGE_RATE', '+14%')


async def main(txt, mp3, wj):
    text = open(txt, encoding='utf8').read().strip()
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary='WordBoundary')
    words = []
    with open(mp3, 'wb') as f:
        async for ch in com.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                s = ch['offset'] / 1e7
                words.append({'w': ch['text'], 's': s, 'e': s + ch['duration'] / 1e7})
    json.dump(words, open(wj, 'w'), ensure_ascii=False)
    print(f'edge voice ok ({VOICE}), {len(words)} words')


asyncio.run(main(*sys.argv[1:4]))
