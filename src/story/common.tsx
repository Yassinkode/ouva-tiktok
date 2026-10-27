import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, EASE, FONT, FPS, clamp01, kf, vel } from '../lib';
import { KineticLine, MBlur } from '../components/Core';
import { Cap, Seg } from './types';

/** whip transition in/out around a segment, with directional motion blur */
export const Whip: React.FC<{ seg: Seg; children: React.ReactNode; noEnter?: boolean; noExit?: boolean; dist?: number }> = ({
  seg,
  children,
  noEnter,
  noExit,
  dist = 1300,
}) => {
  const f = useCurrentFrame();
  const vertical = seg.index % 3 === 2;
  const inFn = (fr: number) => (noEnter ? 0 : kf(fr, [seg.start, seg.start + 0.24], [1, 0], EASE.out));
  const outFn = (fr: number) => (noExit ? 0 : kf(fr, [seg.end - 0.16, seg.end + 0.04], [0, 1], EASE.in));
  const fn = (fr: number) => (inFn(fr) - outFn(fr)) * dist;
  const v = fn(f);
  const b = vel(fn, f) * 0.5;
  return (
    <MBlur x={vertical ? 0 : b} y={vertical ? b : 0}>
      <div style={{ position: 'absolute', inset: 0, transform: vertical ? `translateY(${v}px)` : `translateX(${v}px)` }}>{children}</div>
    </MBlur>
  );
};

/** top kinetic caption */
export const Caption: React.FC<{ cap?: Cap[]; out: number; top?: number; size?: number; color?: string; accent?: string }> = ({
  cap,
  out,
  top = 200,
  size = 112,
  color,
  accent,
}) => {
  const f = useCurrentFrame();
  if (!cap || !cap.length) return null;
  const t = f / FPS;
  if (t < cap[0].at - 0.1 || t > out + 0.45) return null;
  const len = cap.reduce((a, c) => a + c.t.length + 1, 0);
  const sz = len > 26 ? size * 0.72 : len > 18 ? size * 0.85 : size;
  return (
    <div style={{ position: 'absolute', top, left: 50, right: 50 }}>
      <KineticLine size={sz} out={out} words={cap.map((c) => ({ t: c.t, at: c.at, accent: c.accent, color: c.color }))} color={color} accent={accent} />
    </div>
  );
};

export const Disclaimer: React.FC<{ show: boolean; text?: string; dark?: boolean }> = ({ show, text = 'Données illustratives', dark }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 64,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily: FONT,
      fontSize: 22,
      fontWeight: 500,
      letterSpacing: '0.02em',
      color: 'rgba(255,255,255,0.5)',
      opacity: show ? 1 : 0,
    }}
  >
    {text}
  </div>
);

export const tOr = (seg: Seg, key: string, frac: number) =>
  seg.t[key] !== undefined ? seg.t[key] : seg.start + (seg.end - seg.start) * frac;

export const segP = (frame: number, seg: Seg) => clamp01((frame / FPS - seg.start) / Math.max(0.1, seg.end - seg.start));

export { C };
