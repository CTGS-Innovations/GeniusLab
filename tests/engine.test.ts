import { describe, expect, it } from 'vitest';
import { QUESTIONS, SKILLS, skillById } from '../src/data';
import {
  UNLOCK_AT,
  adviceAfter,
  finishSession,
  isUnlocked,
  newProgress,
  rankFor,
  recordAnswer,
  type Progress,
  type SessionRecord,
} from '../src/engine/progress';
import { pointsFor, streakMultiplier } from '../src/engine/scoring';
import { PRACTICE_LENGTH, buildLightning, buildPractice } from '../src/engine/session';

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const withMastery = (entries: Record<string, number>): Progress => {
  const p = newProgress();
  for (const [id, m] of Object.entries(entries)) p.skills[id] = { mastery: m, attempts: 10, correct: 5 };
  return p;
};

const rec = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  at: '2026-01-01T00:00:00Z',
  type: 'practice',
  lab: 'math',
  skill: 'm-order',
  correct: 6,
  total: 8,
  points: 1200,
  bestStreak: 4,
  ...over,
});

describe('scoring', () => {
  it('rewards speed and streaks, gives nothing for misses', () => {
    expect(pointsFor(false, 1, 5, 1)).toBe(0);
    expect(pointsFor(true, 1, 0, 1)).toBeGreaterThan(pointsFor(true, 0.1, 0, 1));
    expect(pointsFor(true, 0.5, 5, 1)).toBeGreaterThan(pointsFor(true, 0.5, 0, 1));
    expect(pointsFor(true, 0.5, 0, 3)).toBeGreaterThan(pointsFor(true, 0.5, 0, 1));
  });

  it('caps the streak multiplier at 2×', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(50)).toBe(2);
  });
});

describe('mastery & unlocks', () => {
  it('rises with correct answers and falls with misses', () => {
    const q = QUESTIONS.find((x) => x.skill === 'm-order')!;
    let p = newProgress();
    for (let i = 0; i < 6; i++) p = recordAnswer(p, q, true, 0.9);
    const high = p.skills['m-order'].mastery;
    expect(high).toBeGreaterThan(UNLOCK_AT);
    p = recordAnswer(p, q, false, 0);
    expect(p.skills['m-order'].mastery).toBeLessThan(high);
    expect(p.missed[0]).toBe(q.id);
    expect(p.modes[q.mode].attempts).toBe(7);
  });

  it('only root skills start unlocked', () => {
    const p = newProgress();
    for (const s of SKILLS) expect(isUnlocked(p, s)).toBe(s.prereqs.length === 0);
  });

  it('unlocks a skill once every prerequisite reaches the threshold', () => {
    const fn = skillById('m-functions');
    expect(isUnlocked(withMastery({ 'm-rules': 60, 'm-word': 40 }), fn)).toBe(false);
    expect(isUnlocked(withMastery({ 'm-rules': 60, 'm-word': 55 }), fn)).toBe(true);
  });

  it('routes a struggling student to their weakest prerequisite', () => {
    const p = withMastery({ 'm-rules': 70, 'm-word': 52 });
    const advice = adviceAfter(p, p, skillById('m-functions'), 0.4);
    expect(advice).toEqual({ kind: 'foundation', skill: skillById('m-word') });
  });

  it('announces newly unlocked skills after a good session', () => {
    const before = withMastery({ 'm-order': 45 });
    const after = withMastery({ 'm-order': 62 });
    const advice = adviceAfter(before, after, skillById('m-order'), 0.9);
    expect(advice.kind).toBe('unlocked');
    if (advice.kind === 'unlocked') expect(advice.skills.map((s) => s.id).sort()).toEqual(['m-inverse', 'm-word']);
  });
});

describe('sessions', () => {
  it('builds a practice set from one skill, ramping easy to hard', () => {
    const qs = buildPractice(newProgress(), 'e-grammar', seeded(7));
    expect(qs.length).toBe(PRACTICE_LENGTH);
    expect(qs.every((q) => q.skill === 'e-grammar')).toBe(true);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
    expect(qs.map((q) => q.difficulty)).toEqual([...qs.map((q) => q.difficulty)].sort());
  });

  it('lightning uses only unlocked skills and fast formats', () => {
    const qs = buildLightning(newProgress(), 'science', seeded(3));
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.skill === 's-variables' && (q.kind === 'mc' || q.kind === 'spot'))).toBe(true);
  });

  it('finishing a session adds XP, tracks day streaks, and awards achievements', () => {
    const day1 = new Date(2026, 0, 1, 10);
    const day2 = new Date(2026, 0, 2, 10);
    const day4 = new Date(2026, 0, 4, 10);
    let { progress: p, earned } = finishSession(newProgress(), rec({ correct: 8, total: 8 }), { fastestCorrect: 2.1 }, day1);
    expect(p.xp).toBe(1200);
    expect(p.dayStreak).toBe(1);
    expect(earned.map((a) => a.id).sort()).toEqual(['first-steps', 'perfect', 'quick-draw']);
    ({ progress: p } = finishSession(p, rec(), { fastestCorrect: null }, day1));
    expect(p.dayStreak).toBe(1);
    ({ progress: p } = finishSession(p, rec(), { fastestCorrect: null }, day2));
    expect(p.dayStreak).toBe(2);
    ({ progress: p, earned } = finishSession(p, rec(), { fastestCorrect: null }, day4));
    expect(p.dayStreak).toBe(1);
    expect(earned).toEqual([]);
  });

  it('ranks climb with XP', () => {
    expect(rankFor(0).name).toBe('Rookie');
    expect(rankFor(1500).name).toBe('Apprentice');
    expect(rankFor(10 ** 6).name).toBe('Genius');
    expect(rankFor(10 ** 6).progress).toBe(1);
  });
});
