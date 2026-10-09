import type { Mode } from '../types';

export interface Why {
  headline: string;
  body: string;
}

/** The founder-style "why this matters" pitch for every skill. */
export const SKILL_WHY: Record<string, Why> = {
  // Math
  'm-order': {
    headline: 'Sequence beats speed.',
    body: 'Every launch has an order: build, test, ship. Do step three first and everything breaks. Order of operations trains you to ask “what goes first?” before you move. That habit is behind every good plan.',
  },
  'm-inverse': {
    headline: 'Work backward from the goal.',
    body: 'Solving an equation is reverse-engineering. You know the result and undo your way to the cause. Founders do this daily: “We want 1,000 users. What has to happen right before that?”',
  },
  'm-word': {
    headline: 'Find the signal in the noise.',
    body: 'Real problems never come labeled. Customers, coaches, and bosses hand you a pile of details, and only some of them matter. Pull out the numbers that count and name the unknown. That is how you scope a problem before you build.',
  },
  'm-errors': {
    headline: 'Debug before you scale.',
    body: 'One bad step early wrecks every step after it. Great builders still make mistakes. They just find the broken step fast. Train your eye to catch it, in math and in your own work.',
  },
  'm-rules': {
    headline: 'Know the playbook.',
    body: 'Rules and properties are shortcuts someone already proved. Spot the pattern and you skip hours of grinding, like a founder who sees “this is a pricing problem” instead of starting from zero.',
  },
  'm-multistep': {
    headline: 'Big problems are just small decisions in a row.',
    body: 'No one solves a hard problem in one move. Founders break a launch into tasks; you break a word problem into steps: what is asked, what matters, which equation, what is next. Nail each step and the big answer takes care of itself.',
  },
  'm-functions': {
    headline: 'Read the trend, see what’s coming.',
    body: 'Graphs are how every company shows growth. Slope is speed. Curves are momentum. If you can read a function at a glance, you can read a pitch deck, a sales chart, or your own progress.',
  },

  // English
  'e-parts': {
    headline: 'Who’s doing what?',
    body: 'Every sentence has a core: someone doing something. Strip away the extras and find it. It is the same skill as boiling your idea down to one line: who you help and what you do.',
  },
  'e-grammar': {
    headline: 'Small bugs cost big trust.',
    body: 'One typo in a pitch email makes a stranger doubt the whole idea. Grammar errors are bugs in your writing. Catch them, and people trust your thinking.',
  },
  'e-structure': {
    headline: 'Claim. Proof. So what?',
    body: 'A paragraph works like a pitch: state the point, show the evidence, explain why it matters. Investors and teachers both tune out the moment the proof or the “so what” goes missing.',
  },
  'e-clarity': {
    headline: 'Clear beats clever.',
    body: 'If your reader has to guess what you mean, you have lost them. Good founders rewrite until a stranger gets it in one read. Learn to spot what makes a sentence confusing, and you can fix your own.',
  },
  'e-openings': {
    headline: 'Win the first ten seconds.',
    body: 'Readers decide fast, just like investors. A strong hook earns attention. A sharp thesis tells them exactly what you will prove. No hook, no read. Vague thesis, no buy-in.',
  },
  'e-revise': {
    headline: 'Ship it, then iterate.',
    body: 'A first draft is an MVP. It is supposed to be rough. The real skill is knowing the next best fix: big picture first, polish last. That is how good products and good essays both get made.',
  },

  // Science
  's-variables': {
    headline: 'Change one thing, learn one thing.',
    body: 'Startups run experiments: change the price, keep everything else the same, measure sales. Change two things at once and you learn nothing. Variables are how you get answers you can trust.',
  },
  's-hypothesis': {
    headline: 'Make a bet, then prove it.',
    body: 'Every startup is a hypothesis: “people will pay for this.” You test it with evidence, not vibes. Knowing what actually counts as evidence keeps you from fooling yourself.',
  },
  's-design': {
    headline: 'Build a fair test.',
    body: 'A test with no control group is like asking only your friends if your idea is good. Spot the missing piece in an experiment and you will trust your own results and catch weak claims from others.',
  },
  's-cause': {
    headline: 'Find what’s really moving the needle.',
    body: 'Sales dropped. Why? Founders who guess the wrong cause fix the wrong thing. Tracing cause and effect trains you to find the real driver before you act.',
  },
  's-data': {
    headline: 'Read the numbers. Don’t get played.',
    body: 'Charts can mislead with a stretched axis or one weird outlier. Reading data carefully means you decide based on what is true, not on what looks dramatic.',
  },
  's-next': {
    headline: 'Always know your next move.',
    body: 'Strong founders never stall. They look at the evidence and pick the next experiment. Ask, test, learn, repeat. Scientists call that loop the cycle of investigation. Founders call it the playbook.',
  },
};

/** Why each core thinking move matters, in the same voice. */
export const MODE_WHY: Record<Mode, string> = {
  spot: 'Opportunities, bugs, and mistakes hide in plain sight. The people who win are the ones who notice first.',
  breakdown: 'Big problems are just small problems stacked up. Split it into parts and every part gets easier.',
  next: 'You don’t need the whole plan. You need the next right step, then the one after that.',
};

export const LIGHTNING_WHY: Why = {
  headline: 'Reps build instinct.',
  body: 'Pros make good calls under pressure because they have seen the pattern a hundred times. Fast recognition is a skill, and every round trains it.',
};
