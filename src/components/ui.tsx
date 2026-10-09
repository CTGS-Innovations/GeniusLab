import type { ReactNode } from 'react';

export function Ring({ value, size = 56, color, children }: { value: number; size?: number; color: string; children?: ReactNode }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={6} fill="none" />
        {v > 0 && <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * v) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />}
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

export function Bar({ value, color, label }: { value: number; color: string; label?: string }) {
  return (
    <div className="bar" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

/** Tiny line chart of 0–100 values. */
export function Sparkline({ values, color, height = 64 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return <p className="muted small">Play a few more sessions to see your trend.</p>;
  const w = 300;
  const step = w / (values.length - 1);
  const y = (v: number) => height - 4 - (v / 100) * (height - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="spark" preserveAspectRatio="none" role="img" aria-label="Accuracy trend">
      <line x1={0} x2={w} y1={y(80)} y2={y(80)} className="spark-guide" />
      <path d={d} stroke={color} strokeWidth={2.5} fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
