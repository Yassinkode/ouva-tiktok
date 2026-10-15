import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { EASE, kf } from './lib';
import { Backdrop, Grain } from './components/Core';
import { MapScene } from './scenes/MapScene';
import { StatsScene } from './scenes/StatsScene';
import { WipeScene } from './scenes/WipeScene';
import { PhoneScene } from './scenes/PhoneScene';
import { MardiScene } from './scenes/MardiScene';
import { GoalScene } from './scenes/GoalScene';
import { FinalScene } from './scenes/FinalScene';

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 60;
  const mint = kf(f, [33.0, 33.9, 36.75, 37.2], [0, 1, 1, 0], EASE.soft);
  return (
    <AbsoluteFill style={{ background: '#F2F2EE', overflow: 'hidden' }}>
      <Backdrop mint={mint} />
      {t < 11.2 && <MapScene />}
      {t >= 10.85 && t < 22.1 && <StatsScene />}
      {t >= 23.15 && t < 28.95 && <PhoneScene />}
      {t >= 28.55 && t < 34.9 && <MardiScene />}
      {t >= 32.95 && t < 37.1 && <GoalScene />}
      {t >= 36.7 && <FinalScene />}
      {t >= 21.65 && t < 23.5 && <WipeScene />}
      <Audio src={staticFile('mix.wav')} />
    </AbsoluteFill>
  );
};
