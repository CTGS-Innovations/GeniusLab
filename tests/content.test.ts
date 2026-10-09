import { describe, expect, it } from 'vitest';
import { LABS, QUESTIONS, SKILLS, questionsForSkill } from '../src/data';
import { SKILL_WHY } from '../src/data/why';

describe('content bank', () => {
  it('has unique question ids', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every question belongs to a real skill', () => {
    const skills = new Set(SKILLS.map((s) => s.id));
    for (const q of QUESTIONS) expect(skills.has(q.skill), q.id).toBe(true);
  });

  it('every prerequisite exists in the same lab', () => {
    for (const s of SKILLS) {
      for (const p of s.prereqs) expect(SKILLS.find((x) => x.id === p)?.lab, `${s.id} → ${p}`).toBe(s.lab);
    }
  });

  it('each lab has at least one starting skill', () => {
    for (const lab of LABS) expect(SKILLS.some((s) => s.lab === lab.id && s.prereqs.length === 0)).toBe(true);
  });

  it('each skill has enough challenges, all three difficulties, and multiple game styles', () => {
    for (const s of SKILLS) {
      const qs = questionsForSkill(s.id);
      expect(qs.length, s.id).toBeGreaterThanOrEqual(7);
      expect(new Set(qs.map((q) => q.difficulty)).size, s.id).toBe(3);
      expect(new Set(qs.map((q) => q.kind)).size, s.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('every skill has a why-this-matters pitch', () => {
    for (const s of SKILLS) {
      expect(SKILL_WHY[s.id]?.headline, s.id).toBeTruthy();
      expect(SKILL_WHY[s.id]?.body, s.id).toBeTruthy();
    }
  });

  it('every lab trains all three core thinking modes', () => {
    for (const lab of LABS) {
      const modes = new Set(QUESTIONS.filter((q) => SKILLS.find((s) => s.id === q.skill)!.lab === lab.id).map((q) => q.mode));
      expect(modes.size, lab.id).toBe(3);
    }
  });

  it('every question is well-formed', () => {
    for (const q of QUESTIONS) {
      expect(q.prompt.trim(), q.id).not.toBe('');
      expect(q.why.trim(), q.id).not.toBe('');
      switch (q.kind) {
        case 'mc':
          expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
          expect(new Set(q.options).size, q.id).toBe(q.options.length);
          expect(q.options[q.answer], q.id).toBeDefined();
          break;
        case 'spot':
          expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
          expect(q.tokens.filter((t) => t.startsWith('*')), q.id).toHaveLength(0);
          break;
        case 'match':
          expect(q.pairs.length, q.id).toBeGreaterThanOrEqual(3);
          expect(new Set(q.pairs.map((p) => p[0])).size, q.id).toBe(q.pairs.length);
          expect(new Set(q.pairs.map((p) => p[1])).size, q.id).toBe(q.pairs.length);
          break;
        case 'order':
          expect(q.steps.length, q.id).toBeGreaterThanOrEqual(3);
          expect(new Set(q.steps).size, q.id).toBe(q.steps.length);
          break;
      }
    }
  });
});
