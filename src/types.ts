export type LabId = 'math' | 'english' | 'science';

/** The three core thinking skills every challenge trains. */
export type Mode = 'spot' | 'breakdown' | 'next';

export type Difficulty = 1 | 2 | 3;

interface QuestionBase {
  id: string;
  skill: string;
  mode: Mode;
  difficulty: Difficulty;
  prompt: string;
  /** Optional equation, sentence, passage or experiment the prompt refers to. */
  context?: string;
  /** Why the answer is right — shown as feedback after every attempt. */
  why: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  kind: 'mc';
  options: string[];
  answer: number;
}

/** Tap the one piece (word, term, step) that matters. */
export interface SpotQuestion extends QuestionBase {
  kind: 'spot';
  tokens: string[];
  answer: number;
}

/** Connect each item on the left to its partner on the right. */
export interface MatchQuestion extends QuestionBase {
  kind: 'match';
  pairs: [string, string][];
}

/** Put the steps in the right order. `steps` is listed in the correct order. */
export interface OrderQuestion extends QuestionBase {
  kind: 'order';
  steps: string[];
}

export type Question = MultipleChoiceQuestion | SpotQuestion | MatchQuestion | OrderQuestion;
export type QuestionKind = Question['kind'];

export interface Skill {
  id: string;
  lab: LabId;
  name: string;
  blurb: string;
  icon: string;
  /** Skills that must reach the unlock threshold before this one opens. */
  prereqs: string[];
}

export interface Lab {
  id: LabId;
  name: string;
  tagline: string;
  icon: string;
  color: string;
}
