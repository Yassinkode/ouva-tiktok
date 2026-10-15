// node stills.mjs <prefix> <compId> <propsJson|-> t1 t2 ...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import fs from 'fs';
import path from 'path';
const [prefix, id, propsPath, ...ts] = process.argv.slice(2);
const inputProps = propsPath && propsPath !== '-' ? JSON.parse(fs.readFileSync(propsPath, 'utf8')) : undefined;
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const browserExecutable = process.env.REMOTION_CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const composition = await selectComposition({ serveUrl, id, browserExecutable, inputProps });
fs.mkdirSync('out/stills', { recursive: true });
for (const t of ts.map(Number)) {
  await renderStill({ composition, serveUrl, frame: Math.min(composition.durationInFrames - 1, Math.round(t * 60)), output: `out/stills/${prefix}_${t.toFixed(2).padStart(5, '0')}.png`, scale: 0.4, browserExecutable, inputProps });
}
console.log('done');
