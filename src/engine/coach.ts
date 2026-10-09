import { MODE_INFO } from '../data';
import { MODE_TIP, RESET_TIP } from '../data/why';
import type { Mode, Question } from '../types';
import { streakMultiplier } from './scoring';

/** What the Coach needs to know about each answer this round. */
export interface CoachAnswer {
  q: Question;
  correct: boolean;
  timedOut: boolean;
  /** Fraction of the clock left when answered (0–1). */
  timeLeft: number;
  /** Teacher term unlocked by this answer, if any. */
  term?: string;
}

export interface CoachContext {
  q: Question;
  /** The question before this one, if any — used to show a move tip only when the move changes. */
  prevMode: Mode | null;
  log: CoachAnswer[];
  streak: number;
  lightning: boolean;
  /** Student has not dismissed (or outgrown) this skill's brief. */
  showBrief: boolean;
  tipsOff: boolean;
  /** Card ids dismissed this round. */
  dismissed: Set<string>;
  /** True once the current question is answered. */
  done: boolean;
}

export type CoachCard =
  | { id: string; type: 'brief' }
  | { id: string; type: 'streak'; title: string; text: string }
  | { id: string; type: 'tip'; icon: string; title: string; text: string };

export const MAX_CARDS = 3;
const STREAK_MILESTONES = [3, 5, 10, 15, 20];

/**
 * Decide which Coach cards to show right now, most valuable first.
 * Event cards come from the latest answer and stay up until the next answer,
 * so they never repeat. Tips only appear when something changed.
 */
export function coachCards(c: CoachContext): CoachCard[] {
  const cards: CoachCard[] = [];
  const n = c.log.length;
  const last = c.log[n - 1];
  const prev = c.log[n - 2];

  // Rewards first — they are the payoff for the last answer. (New terms pop into the collection instead.)
  if (last?.correct && STREAK_MILESTONES.includes(c.streak)) {
    cards.push({
      id: `streak-${n}`,
      type: 'streak',
      title: `🔥 ${c.streak} in a row`,
      text: `Points now ×${streakMultiplier(c.streak).toFixed(1)}.`,
    });
  }

  if (!c.tipsOff && !c.lightning) {
    if (last && prev && last.timedOut && prev.timedOut) {
      cards.push({ id: `clock-${n}`, type: 'tip', icon: '⏱️', title: 'Beat the clock', text: 'Lock in your best guess with 5 seconds left.' });
    } else if (last && prev && !last.correct && !prev.correct) {
      cards.push({ id: `reset-${n}`, type: 'tip', icon: '🧭', title: 'Reset', text: RESET_TIP[last.q.mode] });
    } else if (last && prev && last.correct && prev.correct && last.timeLeft < 0.35 && prev.timeLeft < 0.35) {
      cards.push({ id: `speed-${n}`, type: 'tip', icon: '⚡', title: 'Accuracy locked. Now speed.', text: 'Faster answers earn up to +100 each.' });
    }

    if (c.showBrief) cards.push({ id: `brief-${c.q.skill}`, type: 'brief' });

    if (!c.done && c.q.mode !== c.prevMode) {
      const m = MODE_INFO[c.q.mode];
      cards.push({ id: `move-${n}`, type: 'tip', icon: m.icon, title: m.name, text: MODE_TIP[c.q.mode] });
    }
  }

  return cards.filter((card) => !c.dismissed.has(card.id)).slice(0, MAX_CARDS);
}

/** Retire a skill's brief once the student has clearly started on it. */
export const BRIEF_RETIRES_AFTER = 3;
