import React from 'react';
import { C, FONT, FONT_TIGHT, clamp01 } from '../lib';
import { GRID_N, HeatGrid, StyledMap, shadowDeep } from './Core';
import { BagIcon, BriefcaseIcon, CapIcon, CupIcon, DumbbellIcon, HouseIcon, PeopleIcon, TreeIcon } from './Icons';

export const PLACE = {
  home: { name: 'Maison', color: C.home, bg: C.homeBg, Icon: HouseIcon },
  gym: { name: 'Salle de sport', color: '#E8696D', bg: '#4A2326', Icon: DumbbellIcon },
  school: { name: 'École', color: C.school, bg: '#232B45', Icon: CapIcon },
  work: { name: 'Travail', color: C.mint, bg: '#163A2F', Icon: BriefcaseIcon },
  cafe: { name: 'Café', color: '#D9A066', bg: '#3A2A1A', Icon: CupIcon },
  park: { name: 'Parc', color: '#7BD389', bg: '#1C3A22', Icon: TreeIcon },
  friends: { name: 'Chez les potes', color: '#B98CF0', bg: '#2E2342', Icon: PeopleIcon },
  shop: { name: 'Courses', color: '#F0C04B', bg: '#3D3115', Icon: BagIcon },
};
export type PlaceKind = keyof typeof PLACE;

/** rounded square icon tile like the app */
export const IconTile: React.FC<{ kind: PlaceKind; size: number; solid?: boolean }> = ({ kind, size, solid }) => {
  const P = PLACE[kind];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        background: solid ? P.color : P.bg,
        border: `${Math.max(2, size * 0.02)}px solid ${solid ? 'rgba(255,255,255,0.25)' : P.color + '88'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: solid ? `0 ${size * 0.12}px ${size * 0.3}px ${P.color}55` : undefined,
      }}
    >
      <P.Icon size={size * 0.56} color={solid ? '#fff' : P.color} />
    </div>
  );
};

/** dark place tile – app "Lieux" card */
export const PlaceTile: React.FC<{
  kind: PlaceKind;
  width: number;
  value: string;
  bar: number;
  scale?: number;
  style?: React.CSSProperties;
  right?: React.ReactNode;
}> = ({ kind, width, value, bar, scale = 1, style, right }) => {
  const P = PLACE[kind];
  const u = scale;
  return (
    <div
      style={{
        width,
        padding: `${30 * u}px ${34 * u}px`,
        borderRadius: 40 * u,
        background: 'linear-gradient(180deg, #1C2220 0%, #151a18 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: shadowDeep,
        fontFamily: FONT,
        color: '#fff',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 26 * u }}>
        <IconTile kind={kind} size={92 * u} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 40 * u, fontWeight: 720, letterSpacing: '-0.02em' }}>{P.name}</div>
          <div style={{ fontSize: 30 * u, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: 4 * u }}>
            {value}
          </div>
        </div>
        {right}
      </div>
      <div
        style={{
          height: 12 * u,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.09)',
          marginTop: 26 * u,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamp01(bar) * 100}%`,
            borderRadius: 99,
            background: `linear-gradient(90deg, ${P.color}cc, ${P.color})`,
          }}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Map card with heat grid + camera                                    */
/* ------------------------------------------------------------------ */
export const MAP_SIZE = 2000;
export const MapCard: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  radius: number;
  rx: number;
  rz: number;
  scale: number;
  zoom: number;
  panX?: number;
  panY?: number;
  cell: number;
  appear: number;
  boost?: number;
  cool?: number;
  dim?: number;
  heatOpacity?: number;
  focusBlur?: number;
  shadow?: boolean;
  seed?: number;
  overlay?: React.ReactNode; // rendered in map space, centred on heat centre
  screenOverlay?: React.ReactNode; // rendered in card space
}> = ({
  cx,
  cy,
  w,
  h,
  radius,
  rx,
  rz,
  scale,
  zoom,
  panX = 0,
  panY = 0,
  cell,
  appear,
  boost = 0,
  cool = 0,
  dim = 0,
  heatOpacity = 0.82,
  focusBlur = 0,
  shadow = true,
  overlay,
  screenOverlay,
  seed = 0,
}) => {
  const gridSize = cell * GRID_N;
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        transform: `perspective(2600px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${scale})`,
        transformOrigin: '50% 50%',
      }}
    >
      {shadow && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            boxShadow: '0 30px 60px rgba(12,20,16,0.22), 0 90px 160px rgba(12,20,16,0.30)',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          overflow: 'hidden',
          background: C.mapBg,
          filter: focusBlur > 0.3 ? `blur(${focusBlur}px)` : undefined,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: w / 2,
            top: h / 2,
            width: 0,
            height: 0,
            transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
          }}
        >
          <div style={{ position: 'absolute', left: -MAP_SIZE / 2, top: -MAP_SIZE / 2 }}>
            <StyledMap size={MAP_SIZE} seed={seed} />
          </div>
          <div style={{ position: 'absolute', left: -gridSize / 2, top: -gridSize / 2 }}>
            <HeatGrid cell={cell} appear={appear} boost={boost} cool={cool} opacity={heatOpacity} seed={seed} />
          </div>
          {overlay}
        </div>
        {dim > 0 && <div style={{ position: 'absolute', inset: 0, background: C.card, opacity: dim }} />}
        {/* inner glass edge */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.10)',
            pointerEvents: 'none',
          }}
        />
        {screenOverlay}
      </div>
    </div>
  );
};

export const Label: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children,
  size = 30,
  color = 'rgba(255,255,255,0.6)',
  style,
}) => (
  <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 560, color, letterSpacing: '-0.005em', ...style }}>
    {children}
  </div>
);

export const Big: React.FC<{ children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties; weight?: number }> = ({
  children,
  size,
  color = '#fff',
  style,
  weight = 800,
}) => (
  <div style={{ fontFamily: FONT_TIGHT, fontSize: size, fontWeight: weight, color, letterSpacing: '-0.045em', lineHeight: 1, ...style }}>
    {children}
  </div>
);
