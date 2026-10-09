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

const byId = (id: string) => QUESTIONS.find((q) => q.id === id);

/** Questions saved to a board, shuffled. */
export function buildBoard(p: Progress, boardId: string, rng: Rng = Math.random): Question[] {
  const board = p.boards.find((b) => b.id === boardId);
  return shuffle((board?.items ?? []).map(byId).filter((q): q is Question => !!q), rng);
}

export const PREP_LENGTH = 8;

/**
 * "Get Ready With Me" test prep: a short warm-up built from what this student
 * actually needs — recent misses, traps not beaten yet, the Test Friday board,
 * then the weakest unlocked skills.
 */
export function buildPrep(p: Progress, lab: LabId | 'all', rng: Rng = Math.random): Question[] {
  const inLab = (q: Question) => lab === 'all' || SKILLS.find((s) => s.id === q.skill)!.lab === lab;
  const open = new Set(SKILLS.filter((s) => isUnlocked(p, s)).map((s) => s.id));
  const ok = (q: Question | undefined): q is Question => !!q && inLab(q) && open.has(q.skill) && q.kind !== 'chain';
  const picked = new Map<string, Question>();
  const take = (qs: (Question | undefined)[], max: number) => {
    for (const q of qs) {
      if (picked.size >= PREP_LENGTH || max <= 0) break;
      if (ok(q) && !picked.has(q.id)) {
        picked.set(q.id, q);
        max--;
      }
    }
  };
  take(p.missed.map(byId), 3);
  take(shuffle(QUESTIONS.filter((q) => q.trap && p.traps[q.trap] && !p.traps[q.trap].beaten), rng), 2);
  take(shuffle((p.boards.find((b) => b.id === 'test')?.items ?? []).map(byId), rng), 2);
  const weakest = SKILLS.filter((s) => open.has(s.id) && (lab === 'all' || s.lab === lab)).sort((a, b) => mastery(p, a.id) - mastery(p, b.id));
  for (const s of weakest) take(shuffle(QUESTIONS.filter((q) => q.skill === s.id), rng), 2);
  return [...picked.values()];
}
