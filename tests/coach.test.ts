import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../src/data';
import { coachCards, MAX_CARDS, type CoachAnswer, type CoachContext } from '../src/engine/coach';

const spotQ = QUESTIONS.find((q) => q.mode === 'spot')!;
const nextQ = QUESTIONS.find((q) => q.mode === 'next')!;
const ans = (over: Partial<CoachAnswer> = {}): CoachAnswer => ({ q: spotQ, correct: true, timedOut: false, timeLeft: 0.8, ...over });
const ctx = (over: Partial<CoachContext> = {}): CoachContext => ({
  q: spotQ,
  prevMode: null,
  log: [],
  streak: 0,
  lightning: false,
  showBrief: false,
  tipsOff: false,
  dismissed: new Set(),
  done: false,
  ...over,
});
const types = (c: CoachContext) => coachCards(c).map((x) => x.id.split('-')[0]);

describe('coach', () => {
  it('opens a new skill with the brief and the move tip', () => {
    expect(types(ctx({ showBrief: true }))).toEqual(['brief', 'move']);
  });

  it('shows a move tip only when the thinking move changes', () => {
    expect(types(ctx({ prevMode: 'spot' }))).toEqual([]);
    expect(types(ctx({ q: nextQ, prevMode: 'spot' }))).toEqual(['move']);
  });

  it('hides the move tip once the question is answered', () => {
    expect(types(ctx({ done: true }))).toEqual([]);
  });

  it('celebrates streak milestones only', () => {
    expect(types(ctx({ prevMode: 'spot', log: [ans(), ans(), ans()], streak: 3 }))).toEqual(['streak']);
    expect(types(ctx({ prevMode: 'spot', log: [ans(), ans(), ans(), ans()], streak: 4 }))).toEqual([]);
  });

  it('offers a reset tactic after two misses in a row', () => {
    const log = [ans({ correct: false }), ans({ correct: false })];
    expect(types(ctx({ prevMode: 'spot', log }))).toEqual(['reset']);
  });

  it('prefers a clock tip when both misses were timeouts', () => {
    const log = [ans({ correct: false, timedOut: true }), ans({ correct: false, timedOut: true })];
    expect(types(ctx({ prevMode: 'spot', log }))).toEqual(['clock']);
  });

  it('nudges speed after two slow right answers', () => {
    const log = [ans({ timeLeft: 0.2 }), ans({ timeLeft: 0.1 })];
    expect(types(ctx({ prevMode: 'spot', log, streak: 2 }))).toEqual(['speed']);
  });

  it('never shows a dismissed card again', () => {
    const c = ctx({ showBrief: true });
    const dismissed = new Set(coachCards(c).map((x) => x.id));
    expect(coachCards({ ...c, dismissed })).toEqual([]);
  });

  it('tips off silences tips and the brief but keeps streak rewards', () => {
    const log = [ans(), ans(), ans()];
    expect(types(ctx({ tipsOff: true, showBrief: true, log, streak: 3 }))).toEqual(['streak']);
  });

  it('keeps Lightning Rounds free of reading', () => {
    const log = [ans({ correct: false }), ans({ correct: false })];
    expect(types(ctx({ lightning: true, showBrief: true, log }))).toEqual([]);
  });

  it(`never shows more than ${MAX_CARDS} cards`, () => {
    const log = [ans({ correct: false }), ans({ correct: false })];
    expect(coachCards(ctx({ q: nextQ, showBrief: true, log, streak: 0 })).length).toBeLessThanOrEqual(MAX_CARDS);
  });
});
