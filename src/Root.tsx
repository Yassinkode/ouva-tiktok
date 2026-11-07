import React from 'react';
import { Composition } from 'remotion';
import '@fontsource-variable/inter';
import '@fontsource-variable/inter-tight';
import { Main } from './Main';
import { Story } from './story/Story';
import { DURATION_S, FPS, H, W } from './lib';
import sample from './story/sample-props.json';
import { LucasTest } from './lucas/Test';
import { LucasVideo } from './lucas/Lucas';
import lucasProps from '../public/lucas/props.json';
import { Lab, labDefault, LAB_DURATION } from './lab/Lab';
import { Lab2, lab2Default, L2 } from './lab/Lab2';
import { Lucas2 } from './story2/Lucas2';
import lucas2Props from '../public/story2/props.json';
import { Ticket } from './ticket/Ticket';
import ticketProps from '../public/ticket/props.json';
import { Promo } from './ticket/Promo';
import promoProps from '../public/promo/props.json';
import { Promo2 } from './ticket/Promo2';
import promo2Props from '../public/promo/props2.json';
import { AdA, AdB, AdC, StaticA, StaticB } from './ads/Ads';

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
    <Composition id="Lucas" component={LucasVideo as any} fps={FPS} width={W} height={H} durationInFrames={Math.round((lucasProps as any).duration * FPS)} defaultProps={lucasProps as any} />
    <Composition id="LucasTest" component={LucasTest as any} fps={30} width={W} height={H} durationInFrames={90} defaultProps={{ shot: 0 }} />
    <Composition id="Lab" component={Lab as any} fps={FPS} width={W} height={H} durationInFrames={Math.round(LAB_DURATION * FPS)} defaultProps={labDefault as any} />
    <Composition id="Lab2" component={Lab2 as any} fps={FPS} width={W} height={H} durationInFrames={Math.round(L2.end * FPS)} defaultProps={lab2Default as any} />
    <Composition id="Lucas2" component={Lucas2 as any} fps={FPS} width={W} height={H} durationInFrames={Math.round((lucas2Props as any).end * FPS)} defaultProps={lucas2Props as any} />
    <Composition id="Ticket" component={Ticket as any} fps={FPS} width={W} height={H} durationInFrames={Math.round((ticketProps as any).end * FPS)} defaultProps={ticketProps as any} />
    <Composition id="Promo" component={Promo as any} fps={FPS} width={W} height={H} durationInFrames={Math.round((promoProps as any).end * FPS)} defaultProps={promoProps as any} />
    <Composition id="Promo2" component={Promo2 as any} fps={FPS} width={W} height={H} durationInFrames={Math.round((promo2Props as any).end * FPS)} defaultProps={promo2Props as any} />
    <Composition id="AdA" component={AdA} fps={FPS} width={W} height={H} durationInFrames={15 * FPS} />
    <Composition id="AdB" component={AdB} fps={FPS} width={W} height={H} durationInFrames={15 * FPS} />
    <Composition id="AdC" component={AdC} fps={FPS} width={W} height={H} durationInFrames={13 * FPS} />
    <Composition id="StaticA" component={StaticA} fps={FPS} width={1080} height={1350} durationInFrames={1} />
    <Composition id="StaticB" component={StaticB} fps={FPS} width={1080} height={1350} durationInFrames={1} />
  </>
);
