import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { World } from './World';

export const LucasTest: React.FC<{ shot: number }> = ({ shot }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const cams = [
    { pos: [3, 2.6, 9] as [number, number, number], look: [0, 2, 0] as [number, number, number], fov: 40 },
    { pos: [0, 6, 22] as [number, number, number], look: [2, 3, -6] as [number, number, number], fov: 50 },
    { pos: [0.6, 2.7, 1.6] as [number, number, number], look: [0, 2.4, 0] as [number, number, number], fov: 45 },
  ];
  return (
    <AbsoluteFill style={{ background: '#0B1240' }}>
      <ThreeCanvas width={1080} height={1920} dpr={0.42} style={{ imageRendering: 'pixelated' }}>
        <World t={t} cam={cams[shot % 3]} lucas={{ x: 0, z: 0, rotY: shot === 1 ? 0.4 : 0, walk: shot === 1 ? 1 : 0, phone: shot === 0 ? 1 : 0, jump: 0, smile: shot === 2 ? 1 : 0 }} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
