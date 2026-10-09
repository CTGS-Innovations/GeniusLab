import type { Difficulty, Mode, Question } from '../types';

interface DraftBase {
  mode: Mode;
  difficulty: Difficulty;
  prompt: string;
  context?: string;
  why: string;
  trap?: string;
  reason?: string;
  decoys?: [string, string];
}

/**
 * Authoring shapes. Multiple-choice drafts always list the correct option
 * first (options are shuffled at play time) — so do the steps of a chain.
 * Spot drafts mark the correct token with a leading `*`.
 */
export type Draft =
  | (DraftBase & { kind: 'mc'; options: string[] })
  | (DraftBase & { kind: 'spot'; tokens: string[] })
  | (DraftBase & { kind: 'match'; pairs: [string, string][] })
  | (DraftBase & { kind: 'order'; steps: string[] })
  | (DraftBase & { kind: 'chain'; steps: { ask: string; options: string[]; why: string }[] });

export function bank(skill: string, drafts: Draft[]): Question[] {
  return drafts.map((d, i): Question => {
    const id = `${skill}-${i + 1}`;
    switch (d.kind) {
      case 'mc':
        return { ...d, id, skill, answer: 0 };
      case 'spot': {
        const answer = d.tokens.findIndex((t) => t.startsWith('*'));
        return { ...d, id, skill, answer, tokens: d.tokens.map((t) => t.replace(/^\*/, '')) };
      }
      case 'chain':
        return { ...d, id, skill, steps: d.steps.map((st) => ({ ...st, answer: 0 })) };
      default:
        return { ...d, id, skill };
    }
  });
}
