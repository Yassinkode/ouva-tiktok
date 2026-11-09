import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { HoloWorld, Human, Pose, Prop, useXbot } from './Holo3D';

const POSES: { p: any; prop?: any; lie?: boolean }[] = [
  { p: 'type', prop: 'desk' }, { p: 'lift' }, { p: 'sleep', prop: 'bed', lie: true }, { p: 'drink', prop: 'cafe' }, { p: 'phone' }, { p: 'couch', prop: 'sofa' }, { p: 'walk' }, { p: 'cheer' },
];
export const HoloTest: React.FC = () => {
  const f = useCurrentFrame();
  const g = useXbot();
  const P = POSES[f % POSES.length];
  const t = 0.6;
  return (
    <AbsoluteFill>
      <ThreeCanvas width={1080} height={1920} dpr={0.5}>
        <HoloWorld t={t} cam={{ pos: [2.6, 1.4, 2.6], look: [0, 1.0, 0], fov: 40 }} rings={[[0, 0, 0]]}>
          {g && <Human g={g} t={t} pose={P.p} lie={P.lie} pos={P.lie ? [0, 0.45, 0.9] : [0, 0, 0]} />}
          {P.prop && <Prop kind={P.prop} pos={[0, 0, 0]} />}
        </HoloWorld>
      </ThreeCanvas>
      <div style={{ position: 'absolute', top: 40, left: 40, color: '#fff', fontSize: 60 }}>{P.p}</div>
    </AbsoluteFill>
  );
};
