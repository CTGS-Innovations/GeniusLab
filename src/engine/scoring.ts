import type { Question } from '../types';

/** Seconds allowed per challenge. Bigger interactions get more time. */
export function timeLimit(q: Question): number {
  if (q.kind === 'chain') return 25 * q.steps.length;
  const base = { mc: 20, spot: 20, match: 45, order: 40 }[q.kind];
  return base + (q.difficulty - 1) * 5;
}

export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 100;

/** Streak multiplier: +10% per consecutive correct answer, capped at 2×. */
export function streakMultiplier(streak: number): number {
  return Math.min(2, 1 + streak * 0.1);
}

/**
 * Points for one answer. `timeLeft` is the fraction (0–1) of the clock remaining.
 * `streak` is the streak *before* this answer.
 */
export function pointsFor(correct: boolean, timeLeft: number, streak: number, difficulty: number): number {
  if (!correct) return 0;
  const speed = Math.round(MAX_SPEED_BONUS * Math.max(0, Math.min(1, timeLeft)));
  const base = BASE_POINTS + (difficulty - 1) * 25;
  return Math.round((base + speed) * streakMultiplier(streak));
}
