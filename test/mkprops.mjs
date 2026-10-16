import fs from 'fs';
import * as m from '../pipeline/build_props.mjs';
for (const f of process.argv.slice(2)) {
  const s = JSON.parse(fs.readFileSync('data/backlog/' + f + '.json', 'utf8'));
  const text = s.beats.map((b) => b.text).join(' ');
  const w = m.wordsProportional(text, text.length * 0.068);
  const { props } = m.buildProps({ ...s, seed: 7 }, w, { audio: '' });
  fs.writeFileSync('test/props_' + f + '.json', JSON.stringify(props));
  const missing = props.segments.flatMap((sg, i) => Object.keys(s.beats[i].sync ?? {}).filter((k) => sg.t[k] === undefined).map((k) => `${i + 1}.${k}`));
  console.log(f, props.duration.toFixed(1) + 's', missing.length ? 'MISSING ' + missing.join(',') : 'sync ok');
}
