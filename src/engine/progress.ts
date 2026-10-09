import { LABS, SKILLS, skillById, skillsForLab } from '../data';
import { ALIGNMENT } from '../data/curriculum';
import type { LabId, Mode, Question, QuestionKind, Skill } from '../types';

export interface SkillStat {
  /** 0–100, an exponential moving average of recent performance. */
  mastery: number;
  attempts: number;
  correct: number;
}

export interface SessionRecord {
  at: string;
  type: 'practice' | 'lightning' | 'swipe' | 'board' | 'prep';
  lab: LabId | 'all';
  skill: string | null;
  correct: number;
  total: number;
  points: number;
  bestStreak: number;
}

export interface Progress {
  version: 1;
  xp: number;
  skills: Record<string, SkillStat>;
  modes: Record<Mode, { attempts: number; correct: number }>;
  sessions: SessionRecord[];
  /** Recently missed question ids — these come back more often. */
  missed: string[];
  bestStreak: number;
  dayStreak: number;
  lastDay: string | null;
  lightningBest: number;
  fastestCorrect: number | null;
  /** achievement id → ISO date earned */
  achievements: Record<string, string>;
  /** How many teacher terms the student has unlocked per skill. */
  terms: Record<string, number>;
  /** How many times each game style has been played — how-to hints retire after a few. */
  kindsPlayed: Partial<Record<QuestionKind, number>>;
  /** Per trap: answers seen and current run of right answers. Beaten at TRAP_BEATEN_AT in a row. */
  traps: Record<string, { seen: number; run: number; beaten: boolean }>;
  coach: {
    /** Skills whose intro brief the student dismissed. */
    briefsDismissed: string[];
    /** Student turned coaching tips off. */
    off: boolean;
  };
  settings: Settings;
  /** Right answers on the "Why?" follow-up. */
  insights: number;
  /** Saved cards, Pinterest-style. */
  boards: Board[];
}

export interface Board {
  id: string;
  name: string;
  emoji: string;
  /** Question ids, newest first. */
  items: string[];
}

export const DEFAULT_BOARDS: Board[] = [
  { id: 'traps', name: 'Traps I keep falling for', emoji: '🪤', items: [] },
  { id: 'review', name: 'Review later', emoji: '🔖', items: [] },
  { id: 'test', name: 'Test Friday', emoji: '📝', items: [] },
];

export function toggleSaved(p: Progress, boardId: string, qid: string): Progress {
  return {
    ...p,
    boards: p.boards.map((b) =>
      b.id !== boardId ? b : { ...b, items: b.items.includes(qid) ? b.items.filter((x) => x !== qid) : [qid, ...b.items] },
    ),
  };
}

export function addBoard(p: Progress, name: string, emoji = '📌'): Progress {
  const clean = name.trim().slice(0, 40);
  if (!clean) return p;
  const id = `b-${Date.now().toString(36)}`;
  return { ...p, boards: [...p.boards, { id, name: clean, emoji, items: [] }] };
}

export const boardsWith = (p: Progress, qid: string) => p.boards.filter((b) => b.items.includes(qid)).map((b) => b.id);

export type ThemeId = 'lab' | 'street' | 'y2k' | 'studio' | 'arcade';

export interface Settings {
  theme: ThemeId;
  /** Timed practice with speed bonuses. Off by default; Lightning is always timed. */
  speed: boolean;
  motion: 'full' | 'reduced';
  haptics: boolean;
  /** Show Recap Stories after each round. */
  recap: boolean;
  /** First-run vibe picker has been shown. */
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'lab', speed: false, motion: 'full', haptics: true, recap: true, onboarded: false };

export const UNLOCK_AT = 50;
export const MAX_SESSIONS = 200;
export const MAX_MISSED = 60;

export function newProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    skills: {},
    modes: { spot: { attempts: 0, correct: 0 }, breakdown: { attempts: 0, correct: 0 }, next: { attempts: 0, correct: 0 } },
    sessions: [],
    missed: [],
    bestStreak: 0,
    dayStreak: 0,
    lastDay: null,
    lightningBest: 0,
    fastestCorrect: null,
    achievements: {},
    terms: {},
    kindsPlayed: {},
    traps: {},
    coach: { briefsDismissed: [], off: false },
    settings: { ...DEFAULT_SETTINGS },
    insights: 0,
    boards: DEFAULT_BOARDS.map((b) => ({ ...b, items: [] })),
  };
}

export const stat = (p: Progress, skill: string): SkillStat => p.skills[skill] ?? { mastery: 0, attempts: 0, correct: 0 };
export const mastery = (p: Progress, skill: string) => stat(p, skill).mastery;

/* ---------- mastery tiers ---------- */

export type Tier = 'locked' | 'new' | 'building' | 'bronze' | 'silver' | 'gold';

export function tierFor(p: Progress, skill: Skill): Tier {
  if (!isUnlocked(p, skill)) return 'locked';
  const s = stat(p, skill.id);
  if (s.attempts === 0) return 'new';
  if (s.mastery >= 85) return 'gold';
  if (s.mastery >= 65) return 'silver';
  if (s.mastery >= UNLOCK_AT) return 'bronze';
  return 'building';
}

export const TIER_LABEL: Record<Tier, string> = {
  locked: 'Locked',
  new: 'New',
  building: 'Building',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

/** A skill opens once every prerequisite hits the threshold — and, once practiced, stays open. */
export function isUnlocked(p: Progress, skill: Skill): boolean {
  return stat(p, skill.id).attempts > 0 || skill.prereqs.every((id) => mastery(p, id) >= UNLOCK_AT);
}

/** Depth of each skill in its lab's tree (0 = no prerequisites). */
export function skillDepth(skill: Skill): number {
  if (skill.prereqs.length === 0) return 0;
  return 1 + Math.max(...skill.prereqs.map((id) => skillDepth(skillById(id))));
}

export function labMastery(p: Progress, lab: LabId): number {
  const skills = skillsForLab(lab);
  return Math.round(skills.reduce((sum, s) => sum + mastery(p, s.id), 0) / skills.length);
}

/** Next tier up and roughly how many right answers it takes to get there. */
export function nextTier(p: Progress, skill: string): { name: string; answers: number } | null {
  const steps: [number, string][] = [
    [UNLOCK_AT, 'Bronze'],
    [65, 'Silver'],
    [85, 'Gold'],
  ];
  let m = mastery(p, skill);
  const goal = steps.find(([at]) => m < at);
  if (!goal) return null;
  let answers = 0;
  while (m < goal[0] && answers < 30) {
    m += (100 - m) * 0.22;
    answers++;
  }
  return { name: goal[1], answers };
}

/* ---------- ranks ---------- */

export const RANKS = [
  { name: 'Rookie', xp: 0, icon: '🌱' },
  { name: 'Apprentice', xp: 1500, icon: '🔧' },
  { name: 'Analyst', xp: 4000, icon: '🔍' },
  { name: 'Strategist', xp: 8000, icon: '♟️' },
  { name: 'Expert', xp: 14000, icon: '🎓' },
  { name: 'Master', xp: 22000, icon: '🏅' },
  { name: 'Genius', xp: 32000, icon: '🧠' },
];

export function rankFor(xp: number) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const rank = RANKS[i];
  const next = RANKS[i + 1] ?? null;
  const progress = next ? (xp - rank.xp) / (next.xp - rank.xp) : 1;
  return { ...rank, index: i, next, progress };
}

/* ---------- recording answers ---------- */

export const termCount = (skill: string) => ALIGNMENT[skill]?.terms.length ?? 0;
export const termsUnlocked = (p: Progress, skill: string) => ALIGNMENT[skill]?.terms.slice(0, p.terms[skill] ?? 0) ?? [];

/** Fold one answer into mastery, mode stats, and the missed list. */
export function recordAnswer(p: Progress, q: Question, correct: boolean, timeLeft: number): Progress {
  const s = stat(p, q.skill);
  const alpha = 0.12 + 0.05 * q.difficulty;
  const target = correct ? (timeLeft >= 0.4 ? 100 : 92) : 0;
  const m = p.modes[q.mode];
  const missed = p.missed.filter((id) => id !== q.id);
  if (!correct) missed.unshift(q.id);
  return {
    ...p,
    skills: {
      ...p.skills,
      [q.skill]: {
        mastery: Math.round((s.mastery + (target - s.mastery) * alpha) * 10) / 10,
        attempts: s.attempts + 1,
        correct: s.correct + (correct ? 1 : 0),
      },
    },
    modes: { ...p.modes, [q.mode]: { attempts: m.attempts + 1, correct: m.correct + (correct ? 1 : 0) } },
    missed: missed.slice(0, MAX_MISSED),
    kindsPlayed: { ...p.kindsPlayed, [q.kind]: (p.kindsPlayed[q.kind] ?? 0) + 1 },
    terms: correct ? { ...p.terms, [q.skill]: Math.min(termCount(q.skill), (p.terms[q.skill] ?? 0) + 1) } : p.terms,
    traps: q.trap ? { ...p.traps, [q.trap]: nextTrap(p.traps[q.trap], correct) } : p.traps,
  };
}

/** A trap counts as beaten after this many right answers in a row. */
export const TRAP_BEATEN_AT = 2;

function nextTrap(t: Progress['traps'][string] | undefined, correct: boolean) {
  const run = correct ? (t?.run ?? 0) + 1 : 0;
  return { seen: (t?.seen ?? 0) + 1, run, beaten: (t?.beaten ?? false) || run >= TRAP_BEATEN_AT };
}

/** The "Why?" follow-up: a right reason nudges mastery up a little and counts as an Insight. */
export function recordWhy(p: Progress, q: Question, correct: boolean): Progress {
  if (!correct) return p;
  const s = stat(p, q.skill);
  return {
    ...p,
    insights: p.insights + 1,
    skills: { ...p.skills, [q.skill]: { ...s, mastery: Math.round((s.mastery + (100 - s.mastery) * 0.05) * 10) / 10 } },
  };
}

/* ---------- finishing a session ---------- */

export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextDayStreak(p: Progress, now: Date): number {
  const today = dayKey(now);
  if (p.lastDay === today) return p.dayStreak;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return p.lastDay === dayKey(y) ? p.dayStreak + 1 : 1;
}

export interface SessionExtras {
  /** Seconds taken for the fastest correct answer this session, if any. */
  fastestCorrect: number | null;
}

export function finishSession(p: Progress, rec: SessionRecord, extras: SessionExtras, now = new Date()) {
  let next: Progress = {
    ...p,
    xp: p.xp + rec.points,
    sessions: [...p.sessions, rec].slice(-MAX_SESSIONS),
    bestStreak: Math.max(p.bestStreak, rec.bestStreak),
    dayStreak: nextDayStreak(p, now),
    lastDay: dayKey(now),
    lightningBest: rec.type === 'lightning' ? Math.max(p.lightningBest, rec.points) : p.lightningBest,
    fastestCorrect:
      extras.fastestCorrect === null
        ? p.fastestCorrect
        : Math.min(p.fastestCorrect ?? Infinity, extras.fastestCorrect),
  };
  const earned = ACHIEVEMENTS.filter((a) => !next.achievements[a.id] && a.check(next, rec));
  if (earned.length) {
    const stamp = now.toISOString();
    next = { ...next, achievements: { ...next.achievements, ...Object.fromEntries(earned.map((a) => [a.id, stamp])) } };
  }
  return { progress: next, earned };
}

/* ---------- guidance ---------- */

export type Advice =
  | { kind: 'foundation'; skill: Skill }
  | { kind: 'retry' }
  | { kind: 'unlocked'; skills: Skill[] }
  | { kind: 'push' }
  | { kind: 'mastered' };

/**
 * What to do after a practice session. When a student struggles we route them
 * to the weakest prerequisite — strengthen the foundation before advancing.
 */
export function adviceAfter(before: Progress, after: Progress, skill: Skill, accuracy: number): Advice {
  if (accuracy < 0.6) {
    const weakest = skill.prereqs
      .map(skillById)
      .sort((a, b) => mastery(after, a.id) - mastery(after, b.id))[0];
    if (weakest && mastery(after, weakest.id) < 85) return { kind: 'foundation', skill: weakest };
    return { kind: 'retry' };
  }
  const opened = SKILLS.filter((s) => !isUnlocked(before, s) && isUnlocked(after, s));
  if (opened.length) return { kind: 'unlocked', skills: opened };
  if (mastery(after, skill.id) >= 85) return { kind: 'mastered' };
  return { kind: 'push' };
}

/** The unlocked skill with the most room to grow — "what to practice next". */
export function suggestedSkill(p: Progress, lab: LabId): Skill {
  const open = skillsForLab(lab).filter((s) => isUnlocked(p, s));
  return [...open].sort((a, b) => mastery(p, a.id) - mastery(p, b.id))[0];
}

/** A daily pick among unlocked skills that still have room to grow. Same skill all day. */
export function skillOfTheDay(p: Progress, now = new Date()): Skill {
  const open = SKILLS.filter((s) => isUnlocked(p, s) && mastery(p, s.id) < 85);
  const pool = open.length ? open : SKILLS.filter((s) => isUnlocked(p, s));
  const key = dayKey(now);
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

/* ---------- achievements ---------- */

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  desc: string;
  check: (p: Progress, last: SessionRecord) => boolean;
}

const totalCorrect = (p: Progress) => Object.values(p.skills).reduce((n, s) => n + s.correct, 0);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', name: 'First Steps', icon: '👣', desc: 'Finish your first session.', check: (p) => p.sessions.length >= 1 },
  { id: 'streak-5', name: 'On Fire', icon: '🔥', desc: 'Get 5 right in a row.', check: (p) => p.bestStreak >= 5 },
  { id: 'streak-10', name: 'Unstoppable', icon: '☄️', desc: 'Get 10 right in a row.', check: (p) => p.bestStreak >= 10 },
  { id: 'perfect', name: 'Flawless', icon: '💎', desc: 'Ace a practice session with 100%.', check: (_p, s) => s.type === 'practice' && s.total >= 5 && s.correct === s.total },
  { id: 'quick-draw', name: 'Quick Draw', icon: '⚡', desc: 'Answer correctly in under 3 seconds.', check: (p) => (p.fastestCorrect ?? Infinity) < 3 },
  { id: 'explorer', name: 'Lab Explorer', icon: '🧭', desc: 'Practice in all three labs.', check: (p) => LABS.every((l) => p.sessions.some((s) => s.lab === l.id)) },
  { id: 'gold', name: 'Gold Standard', icon: '🥇', desc: 'Reach Gold mastery in any skill.', check: (p) => Object.values(p.skills).some((s) => s.mastery >= 85) },
  { id: 'well-rounded', name: 'Well-Rounded', icon: '⚖️', desc: 'Average 50% mastery in every lab.', check: (p) => LABS.every((l) => labMastery(p, l.id) >= 50) },
  { id: 'lightning', name: 'Lightning Brain', icon: '🌩️', desc: 'Score 3,000+ in a Lightning Round.', check: (p) => p.lightningBest >= 3000 },
  { id: 'habit', name: 'Habit Builder', icon: '📅', desc: 'Play 3 days in a row.', check: (p) => p.dayStreak >= 3 },
  { id: 'century', name: 'Century', icon: '💯', desc: 'Answer 100 challenges correctly.', check: (p) => totalCorrect(p) >= 100 },
  { id: 'genius', name: 'Certified Genius', icon: '🧠', desc: 'Reach the Genius rank.', check: (p) => rankFor(p.xp).name === 'Genius' },
];

/* ---------- persistence ---------- */

const KEY = 'geniuslab.progress.v1';

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Progress;
      if (parsed.version === 1) {
        const base = newProgress();
        return { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings } };
      }
    }
  } catch {
    // storage unavailable or corrupt — start fresh
  }
  return newProgress();
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore (private mode, quota)
  }
}
