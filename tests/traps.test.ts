import { describe, expect, it } from 'vitest';
import { QUESTIONS, skillById } from '../src/data';
import { TRAPS } from '../src/data/traps';
import { newProgress, recordAnswer } from '../src/engine/progress';

describe('common traps', () => {
  it('every tagged question points at a real trap in its own lab', () => {
    for (const q of QUESTIONS.filter((x) => x.trap)) {
      const t = TRAPS.find((x) => x.id === q.trap);
      expect(t, q.id).toBeDefined();
      expect(t!.lab, q.id).toBe(skillById(q.skill).lab);
    }
  });

  it('every trap is tested at least twice, so guessing cannot beat it', () => {
    for (const t of TRAPS) expect(QUESTIONS.filter((q) => q.trap === t.id).length, t.id).toBeGreaterThanOrEqual(2);
  });

  it('every trap names the wrong belief, the rule, a tell, and a source', () => {
    for (const t of TRAPS) {
      for (const v of [t.name, t.wrong, t.right, t.tell, t.grade]) expect(v.trim(), t.id).not.toBe('');
      expect(t.source.url, t.id).toMatch(/^https?:\/\//);
    }
  });

  it('a trap is beaten after two right answers in a row, and a miss resets the run', () => {
    const q = { ...QUESTIONS[0], trap: 'test-trap' };
    let p = newProgress();
    p = recordAnswer(p, q, true, 1);
    p = recordAnswer(p, q, false, 1);
    expect(p.traps['test-trap']).toEqual({ seen: 2, run: 0, beaten: false });
    p = recordAnswer(p, q, true, 1);
    p = recordAnswer(p, q, true, 1);
    expect(p.traps['test-trap']).toEqual({ seen: 4, run: 2, beaten: true });
    p = recordAnswer(p, q, false, 1);
    expect(p.traps['test-trap'].beaten).toBe(true);
  });
});
