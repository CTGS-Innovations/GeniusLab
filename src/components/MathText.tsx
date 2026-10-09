import { createContext, useContext, type ReactNode } from 'react';
import { looksMathy, mathSegments, type Seg } from '../engine/mathText';

/** Turned on for labs whose content contains formulas (Math, Science). */
export const MathMode = createContext(false);

export function MathProvider({ on, children }: { on: boolean; children: ReactNode }) {
  return <MathMode.Provider value={on}>{children}</MathMode.Provider>;
}

function render(segs: Seg[]): ReactNode[] {
  return segs.map((s, i) => {
    switch (s.t) {
      case 'text':
        return s.v;
      case 'op':
        return (
          <span key={i} className={`m-op ${s.unary ? 'unary' : ''}`}>
            {s.v}
          </span>
        );
      case 'var':
        return (
          <span key={i} className="m-var">
            {s.v}
          </span>
        );
      case 'sup':
        return <sup key={i} className="m-sup">{s.v}</sup>;
      case 'sub':
        return <sub key={i} className="m-sub">{s.v}</sub>;
      case 'frac':
        return (
          <span key={i} className="m-frac" role="math" aria-label={`${flat(s.num)} over ${flat(s.den)}`}>
            <span className="m-num">{render(s.num)}</span>
            <span className="m-den">{render(s.den)}</span>
          </span>
        );
    }
  });
}

const flat = (segs: Seg[]): string =>
  segs.map((s) => (s.t === 'frac' ? `${flat(s.num)} over ${flat(s.den)}` : s.t === 'sup' ? `^${s.v}` : s.v)).join('');

/** Text that renders formulas readably when math mode is on. */
export function T({ children }: { children: string }) {
  const on = useContext(MathMode);
  if (!on || !looksMathy(children)) return <>{children}</>;
  return <>{render(mathSegments(children))}</>;
}
