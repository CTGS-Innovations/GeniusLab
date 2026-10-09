import { describe, expect, it } from 'vitest';
import { QUESTIONS, SKILLS } from '../src/data';
import { addBoard, boardsWith, isUnlocked, newProgress, skillOfTheDay, toggleSaved } from '../src/engine/progress';
import { PREP_LENGTH, buildBoard, buildPrep } from '../src/engine/session';

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('boards', () => {
  it('starts with three boards and toggles a saved card on and off', () => {
    let p = newProgress();
    expect(p.boards.map((b) => b.id)).toEqual(['traps', 'review', 'test']);
    p = toggleSaved(p, 'review', QUESTIONS[0].id);
    expect(boardsWith(p, QUESTIONS[0].id)).toEqual(['review']);
    p = toggleSaved(p, 'review', QUESTIONS[0].id);
    expect(boardsWith(p, QUESTIONS[0].id)).toEqual([]);
  });

  it('creates custom boards and plays their cards', () => {
    let p = addBoard(newProgress(), '  Quiz Tuesday  ');
    const b = p.boards[p.boards.length - 1];
    expect(b.name).toBe('Quiz Tuesday');
    p = toggleSaved(p, b.id, QUESTIONS[3].id);
    p = toggleSaved(p, b.id, QUESTIONS[7].id);
    expect(buildBoard(p, b.id, seeded(1)).map((q) => q.id).sort()).toEqual([QUESTIONS[3].id, QUESTIONS[7].id].sort());
    expect(addBoard(p, '   ').boards.length).toBe(p.boards.length);
  });
});

describe('test prep', () => {
  it('puts recent misses first and stays within unlocked skills', () => {
    const p = newProgress();
    const miss = QUESTIONS.find((q) => q.skill === 'm-order' && q.kind !== 'chain')!;
    p.missed = [miss.id];
    const set = buildPrep(p, 'all', seeded(2));
    expect(set[0].id).toBe(miss.id);
    expect(set.length).toBeLessThanOrEqual(PREP_LENGTH);
    for (const q of set) expect(isUnlocked(p, SKILLS.find((s) => s.id === q.skill)!), q.id).toBe(true);
    expect(new Set(set.map((q) => q.id)).size).toBe(set.length);
  });

  it('respects the chosen lab', () => {
    const set = buildPrep(newProgress(), 'science', seeded(3));
    expect(set.length).toBeGreaterThan(0);
    expect(set.every((q) => q.skill.startsWith('s-'))).toBe(true);
  });
});

describe('skill of the day', () => {
  it('is stable within a day and always unlocked', () => {
    const p = newProgress();
    const a = skillOfTheDay(p, new Date(2026, 3, 1, 8));
    const b = skillOfTheDay(p, new Date(2026, 3, 1, 22));
    expect(a.id).toBe(b.id);
    expect(isUnlocked(p, a)).toBe(true);
  });
});
