/**
 * One icon set for the whole UI: 24px grid, 2px round strokes, currentColor.
 * UI chrome uses these, never emoji. Emoji appear only as content
 * (skill, lab, rank, and badge glyphs) in their own slots. See DESIGN.md.
 */
const PATHS = {
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
  up: 'M6 15l6-6 6 6',
  play: 'M8 5.5v13l10-6.5z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M7 7l10 10M17 7L7 17',
  lock: 'M7 11V8a5 5 0 0110 0v3M5.5 11h13v9.5h-13z',
  flame: 'M12 2.5c.6 3.2 4.5 5.4 5.6 9.2A6 6 0 116.4 12.6c.4-1.6 1.4-2.8 2.4-3.6-.1 1.6.5 2.8 1.6 3.4C10 9 10.6 5.4 12 2.5z',
  bolt: 'M13 2.5L5 13.5h6l-1 8 8-11h-6z',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0012 3z',
  pin: 'M12 21v-6M7 4h10l-1.5 5.5L18 13H6l2.5-3.5z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  palette: 'M12 3a9 9 0 100 18c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.3-1.6-1.3-2.9 0-1 .8-1.6 1.8-1.6H17a4 4 0 004-4C21 6.5 17 3 12 3zM7.5 12.5h.01M9.5 8h.01M14.5 8h.01',
  shield: 'M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z',
  alert: 'M12 4l9.5 16.5h-19zM12 10v4.5M12 17.5h.01',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z',
  book: 'M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21.5zM4 5.5v16',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  trophy: 'M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 20h8',
  phone: 'M7 2.5h10v19H7zM11 18.5h2',
  clipboard: 'M9 4h6v3H9zM7 5.5H5.5V21h13V5.5H17M9 13.5l2 2 4-4.5',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  plus: 'M12 5v14M5 12h14',
  repeat: 'M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  unlock: 'M7 11V8a5 5 0 019.6-2M5.5 11h13v9.5h-13z',
  puzzle: 'M10 4a2 2 0 014 0v2h4v4h-2a2 2 0 000 4h2v4h-4v-2a2 2 0 00-4 0v2H6v-4h2a2 2 0 000-4H6V6h4z',
  medal: 'M8 3h8l-2 6h-4zM12 9a6 6 0 100 12 6 6 0 000-12zM12 12.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.5M12 17h.01',
} as const;

export type IconName = keyof typeof PATHS;

const FILLED: ReadonlySet<IconName> = new Set(['play', 'flame', 'bolt', 'star']);

export function Icon({ name, label, className = '' }: { name: IconName; label?: string; className?: string }) {
  const filled = FILLED.has(name);
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 1.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
