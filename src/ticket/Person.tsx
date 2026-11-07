import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FPS, lerp } from '../lib';

/* Adult, modern flat-illustration character (faceless editorial style): fade haircut, short beard,
   dark-green hoodie, black tapered pants, white sneakers. Poses: phone / facepalm / present / idle. */

const SKIN = '#B57E57';
const SKIN_D = '#9A6744';
const HAIR = '#16110E';
const HOOD = '#2D5A4B';
const HOOD_D = '#234A3D';
const PANTS = '#1C1F24';

type Pose = 'idle' | 'phone' | 'facepalm' | 'present' | 'walk';

const Arm: React.FC<{ sx: number; sy: number; a1: number; a2: number; front?: boolean; phone?: boolean }> = ({ sx, sy, a1, a2, front, phone }) => (
  <g transform={`translate(${sx} ${sy}) rotate(${a1})`}>
    <rect x={-19} y={-6} width={38} height={118} rx={19} fill={front ? HOOD : HOOD_D} />
    <g transform={`translate(0 104) rotate(${a2})`}>
      <rect x={-17} y={-6} width={34} height={108} rx={17} fill={front ? HOOD : HOOD_D} />
      <rect x={-17} y={86} width={34} height={14} rx={6} fill={HOOD_D} />
      <ellipse cx={0} cy={112} rx={15} ry={18} fill={front ? SKIN : SKIN_D} />
      {phone && (
        <g transform="translate(-4 104) rotate(-8)">
          <rect x={-22} y={-8} width={44} height={84} rx={9} fill="#0E0F11" />
          <rect x={-18} y={-4} width={36} height={76} rx={6} fill="#1C3A31" />
          <rect x={-12} y={8} width={24} height={6} rx={3} fill="#3DDC97" opacity={0.9} />
          <rect x={-12} y={20} width={18} height={4} rx={2} fill="#fff" opacity={0.5} />
          <ellipse cx={-14} cy={30} rx={10} ry={12} fill={SKIN} />
        </g>
      )}
    </g>
  </g>
);

export const Person: React.FC<{ x: number; y: number; s: number; pose?: Pose; flip?: boolean }> = ({ x, y, s, pose = 'idle', flip }) => {
  const t = useCurrentFrame() / FPS;
  const breathe = Math.sin(t * 2) * 2;
  const w = pose === 'walk' ? t * 7 : 0;
  const legA = pose === 'walk' ? Math.sin(w) * 20 : 0;
  const bob = pose === 'walk' ? -Math.abs(Math.cos(w)) * 6 : 0;
  // arm angles (deg): back arm (right side of body when facing us = his left), front arm
  let back = { a1: 8, a2: -6, phone: false };
  let front = { a1: -8, a2: 6, phone: false };
  let head = 0;
  if (pose === 'phone') {
    front = { a1: -10, a2: -95, phone: true };
    head = 10;
  } else if (pose === 'facepalm') {
    front = { a1: 134 + Math.sin(t * 3) * 2, a2: 102, phone: false };
    back = { a1: 10, a2: -4, phone: true };
    head = 14;
  } else if (pose === 'present') {
    front = { a1: -70 + Math.sin(t * 2.5) * 4, a2: -30, phone: true };
  } else if (pose === 'walk') {
    back = { a1: -Math.sin(w) * 18, a2: -10, phone: false };
    front = { a1: Math.sin(w) * 18, a2: -14, phone: true };
  }
  return (
    <svg width={320 * s} height={840 * s} viewBox="-160 -20 320 840" style={{ position: 'absolute', left: x - 160 * s, top: y - 800 * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined }}>
      <ellipse cx={0} cy={802} rx={92} ry={12} fill="rgba(0,0,0,0.25)" />
      <g transform={`translate(0 ${bob})`}>
        {/* back arm */}
        <Arm sx={58} sy={200} a1={back.a1} a2={back.a2} phone={back.phone} />
        {/* legs */}
        {[
          [-26, legA],
          [26, -legA],
        ].map(([lx, a], i) => (
          <g key={i} transform={`rotate(${a} ${lx} 430)`}>
            <path d={`M${lx - 30} 420 L${lx + 30} 420 L${lx + 20} 770 L${lx - 18} 770 Z`} fill={i ? '#22262C' : PANTS} />
            <path d={`M${lx - 24} 760 Q${lx - 26} 798 ${lx - 4} 800 L${lx + 44} 800 Q${lx + 50} 786 ${lx + 26} 770 L${lx + 20} 756 Z`} fill="#F4F2EE" />
            <rect x={lx - 26} y={794} width={74} height={8} rx={4} fill="#C9A27A" />
          </g>
        ))}
        {/* hoodie body */}
        <g transform={`translate(0 ${breathe * 0.5})`}>
          <path d="M-78 196 Q-86 180 -60 172 L60 172 Q86 180 78 196 L82 430 Q82 444 68 444 L-68 444 Q-82 444 -82 430 Z" fill={HOOD} />
          <rect x={-82} y={420} width={164} height={26} rx={10} fill={HOOD_D} />
          <path d="M-44 300 L44 300 L52 370 L-52 370 Z" fill={HOOD_D} opacity={0.7} />
          {/* hood around the neck */}
          <path d="M-56 176 Q0 236 56 176 Q40 160 0 168 Q-40 160 -56 176 Z" fill={HOOD_D} />
          <line x1={-12} y1={200} x2={-14} y2={262} stroke="#EDEBE6" strokeWidth={4} strokeLinecap="round" />
          <line x1={12} y1={200} x2={14} y2={258} stroke="#EDEBE6" strokeWidth={4} strokeLinecap="round" />
        </g>
        {/* neck + head (faceless, 3/4) */}
        <rect x={-16} y={140} width={32} height={40} rx={10} fill={SKIN_D} />
        <g transform={`rotate(${head} 0 150)`}>
          <ellipse cx={4} cy={92} rx={50} ry={60} fill={SKIN} />
          {/* beard */}
          <path d="M-42 98 Q-38 150 6 154 Q46 150 52 100 Q46 126 10 130 Q-24 128 -42 98 Z" fill={SKIN_D} />
          <path d="M-36 104 Q-30 148 6 152 Q42 148 48 106 Q40 136 8 138 Q-22 136 -36 104 Z" fill="#2A1D16" opacity={0.75} />
          {/* hair: fade + volume on top */}
          <path d="M-48 84 Q-54 30 -8 22 Q44 14 56 62 Q58 78 52 86 Q48 56 18 50 Q-20 46 -40 64 Q-46 74 -48 84 Z" fill={HAIR} />
          <path d="M-50 86 Q-52 100 -46 108 L-44 90 Z" fill={HAIR} opacity={0.6} />
          <ellipse cx={-46} cy={98} rx={9} ry={14} fill={SKIN_D} />
        </g>
        {/* front arm */}
        <Arm sx={-58} sy={200} a1={front.a1} a2={front.a2} phone={front.phone} front />
      </g>
      {/* subtle size cue */}
      <g opacity={0}>{lerp(0, 1, 0)}</g>
    </svg>
  );
};
