import { LABS, SKILLS, skillById, skillsForLab } from '../data';
import type { LabId, Mode, Question, Skill } from '../types';

export interface SkillStat {
  /** 0–100, an exponential moving average of recent performance. */
  mastery: number;
  attempts: number;
  correct: number;
}

export interface SessionRecord {
  at: string;
  type: 'practice' | 'lightning';
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
}

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
      if (parsed.version === 1) return { ...newProgress(), ...parsed };
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
