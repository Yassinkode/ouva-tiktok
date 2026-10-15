import React from 'react';
import { Composition } from 'remotion';
import '@fontsource-variable/inter';
import '@fontsource-variable/inter-tight';
import { Main } from './Main';
import { Story } from './story/Story';
import { DURATION_S, FPS, H, W } from './lib';
import sample from './story/sample-props.json';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="OuvaAd" component={Main} durationInFrames={Math.round(DURATION_S * FPS)} fps={FPS} width={W} height={H} />
    <Composition
      id="Story"
      component={Story as any}
      fps={FPS}
      width={W}
      height={H}
      durationInFrames={Math.round((sample as any).duration * FPS)}
      defaultProps={sample as any}
      calculateMetadata={({ props }: any) => ({ durationInFrames: Math.round(props.duration * FPS) })}
    />
  </>
);
