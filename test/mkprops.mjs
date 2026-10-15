import fs from 'fs';
import * as m from '../pipeline/build_props.mjs';
for (const f of process.argv.slice(2)) {
  const s = JSON.parse(fs.readFileSync('data/backlog/' + f + '.json', 'utf8'));
  const text = s.beats.map((b) => b.text).join(' ');
  const w = m.wordsProportional(text, text.length * 0.068);
  const { props } = m.buildProps({ ...s, seed: 7 }, w, { audio: '' });
  fs.writeFileSync('test/props_' + f + '.json', JSON.stringify(props));
  console.log(f, props.duration, props.segments.map((x) => x.type + '@' + x.start.toFixed(1)).join(' '));
}
