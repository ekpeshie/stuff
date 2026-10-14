import type { CSSProperties } from 'react';

interface P { size?: number; sw?: number; style?: CSSProperties }
const svg = (size: number, sw: number, style?: CSSProperties, extra?: object) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: sw, style, 'aria-hidden': true, ...extra,
});

export const SearchIcon = ({ size = 19, sw = 1.6 }: P) => (
  <svg {...svg(size, sw)}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
);
export const FilterIcon = ({ size = 19, sw = 1.6 }: P) => (
  <svg {...svg(size, sw, undefined, { strokeLinecap: 'round' })}><path d="M4 7h16M7 12h10M10 17h4" /></svg>
);
export const HeartIcon = ({ size = 19, sw = 1.6, filled = false }: P & { filled?: boolean }) => (
  <svg {...svg(size, sw, undefined, { fill: filled ? 'currentColor' : 'none' })}>
    <path d="M12 20s-7-4.4-9-8.6C1.6 8.4 3.6 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.4 3.4 4 6.4-2 4.2-9 8.6-9 8.6z" />
  </svg>
);
export const CloseIcon = ({ size = 18, sw = 1.6 }: P) => (
  <svg {...svg(size, sw)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const ExternalIcon = ({ size = 12, sw = 1.8 }: P) => (
  <svg {...svg(size, sw)}><path d="M8 16L16 8M9 8h7v7" /></svg>
);
export const ChevronLeft = ({ size = 16, sw = 1.7 }: P) => (
  <svg {...svg(size, sw)}><path d="M15 6l-6 6 6 6" /></svg>
);
export const ChevronRight = ({ size = 16, sw = 1.7 }: P) => (
  <svg {...svg(size, sw)}><path d="M9 6l6 6-6 6" /></svg>
);
export const LockIcon = ({ size = 16, sw = 1.6, style }: P) => (
  <svg {...svg(size, sw, style)}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const CheckIcon = ({ size = 13, sw = 2.4 }: P) => (
  <svg {...svg(size, sw)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const CopyIcon = ({ size = 13, sw = 1.7 }: P) => (
  <svg {...svg(size, sw)}><rect x="8" y="8" width="11" height="11" rx="1.5" /><path d="M5 15V5h10" /></svg>
);

/** The three overlapping dots used on the personalize CTA. */
export function Dots({ colors, size, overlap, ring }: { colors: string[]; size: number; overlap: number; ring?: string }) {
  return (
    <span style={{ display: 'flex' }} aria-hidden>
      {colors.map((c, i) => (
        <span key={i} style={{ width: size, height: size, borderRadius: 999, background: c, marginLeft: i ? -overlap : 0, boxShadow: ring ? `0 0 0 1.5px ${ring}` : undefined }} />
      ))}
    </span>
  );
}
