import { QUESTIONS, SKILLS, questionsForSkill } from '../data';
import type { LabId, Question } from '../types';
import { isUnlocked, mastery, type Progress } from './progress';

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** How likely each difficulty is to be served, given current mastery. */
export function difficultyWeights(m: number): Record<1 | 2 | 3, number> {
  if (m < 40) return { 1: 4, 2: 2, 3: 0.5 };
  if (m < 70) return { 1: 2, 2: 3, 3: 1.5 };
  return { 1: 1, 2: 2, 3: 4 };
}

/** Weighted sample without replacement. */
function weightedSample<T>(items: T[], weight: (t: T) => number, n: number, rng: Rng): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, t) => s + weight(t), 0);
    let r = rng() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= weight(pool[i]);
      if (r <= 0) break;
    }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export const PRACTICE_LENGTH = 8;

/**
 * Build a practice set for one skill: difficulty matched to mastery,
 * recently-missed questions resurface, and the set ramps easy → hard.
 */
export function buildPractice(p: Progress, skill: string, rng: Rng = Math.random): Question[] {
  const weights = difficultyWeights(mastery(p, skill));
  const missed = new Set(p.missed);
  const picked = weightedSample(
    questionsForSkill(skill),
    (q) => weights[q.difficulty] * (missed.has(q.id) ? 2.5 : 1),
    PRACTICE_LENGTH,
    rng,
  );
  return picked.sort((a, b) => a.difficulty - b.difficulty);
}

export const LIGHTNING_SECONDS = 60;

/** Fast-format questions from every unlocked skill, shuffled. */
export function buildLightning(p: Progress, lab: LabId | 'all', rng: Rng = Math.random): Question[] {
  const open = new Set(SKILLS.filter((s) => (lab === 'all' || s.lab === lab) && isUnlocked(p, s)).map((s) => s.id));
  return shuffle(
    QUESTIONS.filter((q) => open.has(q.skill) && (q.kind === 'mc' || q.kind === 'spot')),
    rng,
  );
}
