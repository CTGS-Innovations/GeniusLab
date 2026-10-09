import type { Mode } from '../types';

export interface Why {
  headline: string;
  /** Three short fragments. No full paragraphs. */
  points: [string, string, string];
}

/** The founder-style "why this matters" brief for every skill. */
export const SKILL_WHY: Record<string, Why> = {
  // Math
  'm-order': { headline: 'Sequence beats speed.', points: ['Wrong order, wrong answer.', 'Ask “what goes first?” before you move.', 'Same rule runs every formula and spreadsheet.'] },
  'm-inverse': { headline: 'Work backward from the goal.', points: ['Undo each step to isolate x.', 'Same move founders use: goal → steps.', 'Every equation after this builds on it.'] },
  'm-word': { headline: 'Find the signal in the noise.', points: ['Real problems never come labeled.', 'Name the unknown first.', 'Ignore details that don’t matter.'] },
  'm-multistep': { headline: 'Big problems are small decisions in a row.', points: ['Question → givens → equation → solve → check.', 'One clean step at a time.', 'Re-read the question before you answer.'] },
  'm-errors': { headline: 'Debug before you scale.', points: ['One bad step breaks everything after it.', 'Pros find the broken step fast.', 'Catch it here, catch it on tests.'] },
  'm-rules': { headline: 'Know the playbook.', points: ['Rules are proven shortcuts.', 'Spot the pattern, skip the grind.', 'Factoring and exponents unlock Algebra II.'] },
  'm-functions': { headline: 'Read the trend, see what’s next.', points: ['Slope = speed. Curve = momentum.', 'Every growth chart is a function.', 'Read it at a glance, decide faster.'] },
  // English
  'e-parts': { headline: 'Who’s doing what?', points: ['Every sentence has a core.', 'Find the subject, then the verb.', 'Same skill as a one-line pitch.'] },
  'e-grammar': { headline: 'Small bugs cost big trust.', points: ['One typo can sink a pitch.', 'Errors are bugs in your writing.', 'Clean writing reads as clear thinking.'] },
  'e-structure': { headline: 'Claim. Proof. So what?', points: ['A paragraph works like a pitch.', 'Missing proof loses the reader.', 'Missing “so what” loses the point.'] },
  'e-clarity': { headline: 'Clear beats clever.', points: ['If they guess, you lose them.', 'One read should be enough.', 'Cut every word that doesn’t work.'] },
  'e-openings': { headline: 'Win the first ten seconds.', points: ['The hook earns attention.', 'The thesis earns buy-in.', 'Vague claim, no deal.'] },
  'e-revise': { headline: 'Ship it, then iterate.', points: ['A first draft is an MVP.', 'Fix big picture first, polish last.', 'Pick the one change that matters most.'] },
  // Science
  's-variables': { headline: 'Change one thing, learn one thing.', points: ['Two changes at once teach you nothing.', 'Startups test prices this exact way.', 'Every lab report starts here.'] },
  's-hypothesis': { headline: 'Make a bet, then prove it.', points: ['A hypothesis is a testable bet.', 'Evidence beats vibes.', 'Correlation is not proof.'] },
  's-design': { headline: 'Build a fair test.', points: ['No control group, no conclusion.', 'More trials, less luck.', 'Spot weak claims in the wild.'] },
  's-cause': { headline: 'Find what moves the needle.', points: ['Wrong cause, wrong fix.', 'Trace the force or the reaction.', 'Same logic as debugging a product.'] },
  's-data': { headline: 'Read the numbers. Don’t get played.', points: ['Check the axis before the bars.', 'One outlier can fool you.', 'Decide on facts, not drama.'] },
  's-next': { headline: 'Always know your next move.', points: ['Ask, test, learn, repeat.', 'Results decide the next test.', 'Scientists and founders run the same loop.'] },
};

/** One-line tactic for each thinking move. Shown only when the move changes. */
export const MODE_TIP: Record<Mode, string> = {
  spot: 'Scan for the one thing that’s off or key.',
  breakdown: 'Name each part before you pick.',
  next: 'Ask: what’s the very first move?',
};

/** Reset tactic after back-to-back misses, by thinking move. */
export const RESET_TIP: Record<Mode, string> = {
  spot: 'Read the question’s last line first. It tells you what to find.',
  breakdown: 'Cover the choices. Name the parts yourself, then match.',
  next: 'Ignore the full solution. Pick only the first step.',
};

/** In-challenge how-to guides retire after the student has played a game style this many times. */
export const HOWTO_LIMIT = 2;
