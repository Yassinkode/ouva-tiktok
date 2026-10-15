import React from 'react';

type P = { size?: number; color?: string; stroke?: number; style?: React.CSSProperties };

export const HouseIcon: React.FC<P> = ({ size = 48, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <path
      d="M24 6.5 4.8 22.2c-1 .8-.4 2.4.9 2.4H10V40c0 1 .8 1.8 1.8 1.8h8.4V31.4c0-.8.6-1.4 1.4-1.4h4.8c.8 0 1.4.6 1.4 1.4v10.4h8.4c1 0 1.8-.8 1.8-1.8V24.6h4.3c1.3 0 1.9-1.6.9-2.4L25.9 6.5c-.6-.5-1.3-.5-1.9 0Z"
      fill={color}
    />
  </svg>
);

export const DumbbellIcon: React.FC<P> = ({ size = 48, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <rect x="3" y="18" width="5" height="12" rx="2.2" fill={color} />
    <rect x="9" y="12" width="7" height="24" rx="3" fill={color} />
    <rect x="15" y="21.2" width="18" height="5.6" rx="2" fill={color} />
    <rect x="32" y="12" width="7" height="24" rx="3" fill={color} />
    <rect x="40" y="18" width="5" height="12" rx="2.2" fill={color} />
  </svg>
);

export const PinIcon: React.FC<P & { dot?: string }> = ({ size = 48, color = '#fff', dot = '#fff', style }) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 40 48" style={style}>
    <path d="M20 2C10.6 2 3 9.4 3 18.6 3 31 20 46 20 46s17-15 17-27.4C37 9.4 29.4 2 20 2Z" fill={color} />
    <circle cx="20" cy="18.5" r="6.5" fill={dot} />
  </svg>
);

export const ClockIcon: React.FC<P> = ({ size = 48, color = '#fff', stroke = 4, style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style} fill="none">
    <circle cx="24" cy="24" r="18" stroke={color} strokeWidth={stroke} />
    <path d="M24 14v11l7 4" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CapIcon: React.FC<P> = ({ size = 48, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <path d="M24 8 2 18l22 10 22-10L24 8Z" fill={color} />
    <path d="M11 24v9c0 3 6 6.5 13 6.5S37 36 37 33v-9l-13 6-13-6Z" fill={color} opacity={0.85} />
    <rect x="42" y="18" width="3" height="12" rx="1.5" fill={color} />
  </svg>
);

export const BriefcaseIcon: React.FC<P> = ({ size = 48, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <path d="M17 12V9.5C17 7.6 18.6 6 20.5 6h7C29.4 6 31 7.6 31 9.5V12h-3V9.5c0-.3-.2-.5-.5-.5h-7c-.3 0-.5.2-.5.5V12h-3Z" fill={color} />
    <rect x="4" y="12" width="40" height="28" rx="5" fill={color} />
    <rect x="4" y="23" width="40" height="3" fill="rgba(0,0,0,0.35)" />
  </svg>
);

export const WalkIcon: React.FC<P & { phase?: number }> = ({ size = 48, color = '#fff', phase = 0, style }) => {
  const a = Math.sin(phase) * 22;
  const b = -a;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={style} fill="none">
      <circle cx="26" cy="7" r="4.2" fill={color} />
      <path d="M25 13 21 27" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <g transform={`rotate(${a} 21 27)`}>
        <path d="M21 27 17 43" stroke={color} strokeWidth="4.6" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${b} 21 27)`}>
        <path d="M21 27 26 43" stroke={color} strokeWidth="4.6" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${b * 0.9} 24 15)`}>
        <path d="M24 15 16 24" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${a * 0.9} 24 15)`}>
        <path d="M24 15 32 23" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
};

export const FlagIcon: React.FC<P> = ({ size = 48, color = '#fff', stroke = 3.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style} fill="none">
    <path d="M10 44V6" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    <path d="M10 8c8-4 14 4 22 0 2-1 4-1 6-1v18c-2 0-4 0-6 1-8 4-14-4-22 0" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
  </svg>
);

export const CheckIcon: React.FC<P> = ({ size = 48, color = '#fff', stroke = 5, style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style} fill="none">
    <path d="M11 25l9 9 17-19" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowUpRight: React.FC<P> = ({ size = 48, color = '#fff', stroke = 4, style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style} fill="none">
    <path d="M14 34 34 14M18 14h16v16" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRight: React.FC<P> = ({ size = 48, color = '#fff', stroke = 4, style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style} fill="none">
    <path d="M18 10l14 14-14 14" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SignalIcon: React.FC<P> = ({ size = 48, color = '#fff', stroke = 3.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style} fill="none">
    <circle cx="24" cy="24" r="4" fill={color} />
    <path d="M15 15a13 13 0 0 0 0 18M33 15a13 13 0 0 1 0 18M9 9a21 21 0 0 0 0 30M39 9a21 21 0 0 1 0 30" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
  </svg>
);

export const AppleIcon: React.FC<P> = ({ size = 48, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <path
      d="M33.6 25.4c0-4.6 3.8-6.8 4-6.9-2.2-3.2-5.6-3.6-6.8-3.7-2.9-.3-5.6 1.7-7.1 1.7-1.5 0-3.7-1.7-6.1-1.6-3.1 0-6 1.8-7.6 4.6-3.3 5.7-.8 14.1 2.4 18.7 1.6 2.3 3.4 4.8 5.8 4.7 2.3-.1 3.2-1.5 6-1.5s3.6 1.5 6.1 1.4c2.5 0 4.1-2.3 5.6-4.6 1.8-2.6 2.5-5.1 2.5-5.3 0 0-4.8-1.9-4.8-7.5ZM29 11.6c1.3-1.6 2.2-3.7 1.9-5.9-1.9.1-4.1 1.3-5.5 2.8-1.2 1.4-2.3 3.6-2 5.7 2.1.2 4.3-1.1 5.6-2.6Z"
      fill={color}
    />
  </svg>
);

/** OùVa mark: pin with a little route trail */
export const OuvaMark: React.FC<{ size?: number; t?: number }> = ({ size = 160, t = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 160 160">
    <defs>
      <linearGradient id="ouvaBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1B2522" />
        <stop offset="1" stopColor="#0B100E" />
      </linearGradient>
      <linearGradient id="ouvaPin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7DF0C7" />
        <stop offset="1" stopColor="#2FBF8F" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="160" height="160" rx="38" fill="url(#ouvaBg)" />
    <path
      d="M36 124c14 0 18-12 30-12s14 10 26 10"
      stroke="#52DFAF"
      strokeWidth="7"
      strokeLinecap="round"
      fill="none"
      strokeDasharray="1 14"
      opacity={0.9}
      pathLength={100}
      strokeDashoffset={(1 - t) * 40}
    />
    <path d="M86 26c-17 0-30 13-30 29.5C56 77 86 104 86 104s30-27 30-48.5C116 39 103 26 86 26Z" fill="url(#ouvaPin)" />
    <circle cx="86" cy="55" r="11" fill="#0D1210" />
  </svg>
);

export const CupIcon: React.FC<P> = ({ size = 48, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <path d="M8 16h26v12c0 7.2-5.8 13-13 13S8 35.2 8 28V16Z" fill={color} />
    <path d="M34 19h3a6 6 0 0 1 0 12h-3.6" stroke={color} strokeWidth="4" fill="none" />
    <path d="M15 4c-2 3 2 5 0 8M22 4c-2 3 2 5 0 8" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

export const TreeIcon: React.FC<P> = ({ size = 48, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <path d="M24 4c-7 0-12 5.4-12 12 -4 1.6-6 5-6 9 0 5.5 4.5 10 10 10h16c5.5 0 10-4.5 10-10 0-4-2-7.4-6-9 0-6.6-5-12-12-12Z" fill={color} />
    <rect x="21.5" y="30" width="5" height="15" rx="2" fill={color} />
  </svg>
);

export const PeopleIcon: React.FC<P> = ({ size = 48, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <circle cx="17" cy="15" r="7" fill={color} />
    <circle cx="33" cy="17" r="6" fill={color} opacity={0.85} />
    <path d="M3 40c0-8 6.3-13 14-13s14 5 14 13v2H3v-2Z" fill={color} />
    <path d="M30 28.4c1-.3 2-.4 3-.4 6.6 0 12 4.4 12 11v3H34v-2c0-4.6-1.5-8.6-4-11.6Z" fill={color} opacity={0.85} />
  </svg>
);

export const BagIcon: React.FC<P> = ({ size = 48, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <path d="M9 15h30l-2.4 26.2A3 3 0 0 1 33.6 44H14.4a3 3 0 0 1-3-2.8L9 15Z" fill={color} />
    <path d="M17 19v-7a7 7 0 0 1 14 0v7" stroke={color} strokeWidth="3.6" fill="none" strokeLinecap="round" />
  </svg>
);
