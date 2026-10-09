import { useEffect, useState } from 'react';

/** Short vibration on phones that support it. */
export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported
  }
}

/** True on phone-sized screens. */
export function useIsPhone(): boolean {
  const q = '(max-width: 767px)';
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(q).matches);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return !!match;
}

/** A quick ring of sparks behind a success message. Hidden when motion is reduced. */
export function Burst() {
  return (
    <span className="burst" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} style={{ ['--a' as string]: `${i * 36}deg` }} />
      ))}
    </span>
  );
}
