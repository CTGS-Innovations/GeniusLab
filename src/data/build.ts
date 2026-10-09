import type { Difficulty, Mode, Question } from '../types';

interface DraftBase {
  mode: Mode;
  difficulty: Difficulty;
  prompt: string;
  context?: string;
  why: string;
}

/**
 * Authoring shapes. Multiple-choice drafts always list the correct option
 * first (options are shuffled at play time). Spot drafts mark the correct
 * token with a leading `*`.
 */
export type Draft =
  | (DraftBase & { kind: 'mc'; options: string[] })
  | (DraftBase & { kind: 'spot'; tokens: string[] })
  | (DraftBase & { kind: 'match'; pairs: [string, string][] })
  | (DraftBase & { kind: 'order'; steps: string[] });

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
      default:
        return { ...d, id, skill };
    }
  });
}
