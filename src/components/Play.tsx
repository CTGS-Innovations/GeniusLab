import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KIND_INFO, MODE_INFO, labById, skillById } from '../data';
import { pointsFor, streakMultiplier, timeLimit } from '../engine/scoring';
import { LIGHTNING_SECONDS, buildLightning, buildPractice } from '../engine/session';
import { TRAP_BEATEN_AT, stat, termCount, type Progress } from '../engine/progress';
import { trapById } from '../data/traps';
import { BRIEF_RETIRES_AFTER, coachCards } from '../engine/coach';
import type { LabId, Question } from '../types';
import { ALIGNMENT } from '../data/curriculum';
import { HOWTO_LIMIT } from '../data/why';
import { Coach } from './Coach';
import { Scorecard } from './Scorecard';
import { Challenge } from './Challenge';

export type SessionSpec = { type: 'practice'; skill: string } | { type: 'lightning'; lab: LabId | 'all' };

export interface AnswerLog {
  q: Question;
  correct: boolean;
  timedOut: boolean;
  points: number;
  seconds: number;
  timeLeft: number;
  /** Teacher term unlocked by this answer. */
  term?: string;
  trapBeaten?: string;
}

export interface SessionSummary {
  spec: SessionSpec;
  log: AnswerLog[];
  points: number;
  bestStreak: number;
  before: Progress;
}

interface Props {
  spec: SessionSpec;
  progress: Progress;
  onAnswer: (q: Question, correct: boolean, timeLeft: number) => void;
  /** Update coach preferences (dismissed briefs, tips on/off). */
  onProgress: (update: (p: Progress) => Progress) => void;
  onFinish: (summary: SessionSummary) => void;
  onQuit: () => void;
}

/** Lightning Round: speed bonus fades over this many seconds. */
const LIGHTNING_SPEED_WINDOW = 10;
const LIGHTNING_FLASH_MS = 650;

export function Play({ spec, progress, onAnswer, onProgress, onFinish, onQuit }: Props) {
  const before = useRef(progress).current;
  const lightning = spec.type === 'lightning';
  const [queue, setQueue] = useState<Question[]>(() =>
    spec.type === 'practice' ? buildPractice(progress, spec.skill) : buildLightning(progress, spec.lab),
  );
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<AnswerLog[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [qStart, setQStart] = useState(() => performance.now());
  const [now, setNow] = useState(() => performance.now());
  const roundStart = useRef(performance.now());
  const finished = useRef(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [briefOpen, setBriefOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const q = queue[idx];
  const limit = lightning ? LIGHTNING_SPEED_WINDOW : timeLimit(q);
  const elapsed = (now - qStart) / 1000;
  const roundLeft = Math.max(0, LIGHTNING_SECONDS - (now - roundStart.current) / 1000);
  const last = log[log.length - 1];

  useEffect(() => {
    const t = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(t);
  }, []);

  const finish = useCallback(
    (finalLog: AnswerLog[], finalPoints: number, finalBest: number) => {
      if (finished.current) return;
      finished.current = true;
      onFinish({ spec, log: finalLog, points: finalPoints, bestStreak: finalBest, before });
    },
    [onFinish, spec, before],
  );

  const submit = useCallback(
    (correct: boolean, timedOut = false, fraction = correct ? 1 : 0) => {
      if (done || finished.current) return;
      const seconds = (performance.now() - qStart) / 1000;
      const timeLeft = Math.max(0, 1 - seconds / limit);
      const gained = correct
        ? pointsFor(true, timeLeft, streak, q.difficulty)
        : Math.round(pointsFor(true, timeLeft, 0, q.difficulty) * fraction * 0.5);
      const nextStreak = correct ? streak + 1 : 0;
      const had = progress.terms[q.skill] ?? 0;
      const term = correct && had < termCount(q.skill) ? ALIGNMENT[q.skill].terms[had] : undefined;
      const tr = q.trap ? progress.traps[q.trap] : undefined;
      const trapBeaten =
        q.trap && correct && !tr?.beaten && (tr?.run ?? 0) + 1 >= TRAP_BEATEN_AT ? trapById(q.trap)?.name : undefined;
      setDone(true);
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      setPoints((p) => p + gained);
      setLog((l) => [...l, { q, correct, timedOut, points: gained, seconds, timeLeft, term, trapBeaten }]);
      onAnswer(q, correct, timeLeft);
    },
    [done, qStart, limit, streak, q, onAnswer, progress.terms, progress.traps],
  );

  const advance = useCallback(() => {
    if (!lightning && idx + 1 >= queue.length) {
      finish(log, points, bestStreak);
      return;
    }
    if (lightning && idx + 1 >= queue.length) {
      setQueue((qs) => [...qs, ...buildLightning(progress, spec.type === 'lightning' ? spec.lab : 'all')]);
    }
    setIdx((i) => i + 1);
    setDone(false);
    setGuideOpen(false);
    setQStart(performance.now());
  }, [lightning, idx, queue.length, finish, log, points, bestStreak, progress, spec]);

  // Practice: the per-question clock running out counts as a miss.
  useEffect(() => {
    if (!lightning && !done && elapsed >= limit) submit(false, true);
  }, [lightning, done, elapsed, limit, submit]);

  // Lightning: the round clock ends the session; answers auto-advance.
  useEffect(() => {
    if (lightning && roundLeft <= 0) finish(log, points, bestStreak);
  }, [lightning, roundLeft, finish, log, points, bestStreak]);
  useEffect(() => {
    if (!lightning || !done) return;
    const t = setTimeout(advance, LIGHTNING_FLASH_MS);
    return () => clearTimeout(t);
  }, [lightning, done, advance]);

  const header = useMemo(() => {
    if (spec.type === 'lightning') {
      return { title: '⚡ Lightning Round', sub: spec.lab === 'all' ? 'All labs · speed and streaks multiply your score' : `${labById(spec.lab).name} · speed and streaks multiply your score`, color: '#ffc145' };
    }
    const skill = skillById(spec.skill);
    return { title: `${skill.icon} ${skill.name}`, sub: skill.goal, color: labById(skill.lab).color };
  }, [spec]);

  if (!q) {
    return (
      <div className="screen">
        <p>No challenges are unlocked here yet.</p>
        <button className="btn" onClick={onQuit}>Back</button>
      </div>
    );
  }

  const clockFrac = lightning ? roundLeft / LIGHTNING_SECONDS : Math.max(0, 1 - elapsed / limit);
  const clockText = lightning ? Math.ceil(roundLeft) : Math.max(0, Math.ceil(limit - elapsed));
  const prevMode = idx > 0 ? queue[idx - 1].mode : null;
  const guideRetired = (before.kindsPlayed[q.kind] ?? 0) >= HOWTO_LIMIT;
  const tipsOff = progress.coach.off;
  const showBrief =
    briefOpen || (!progress.coach.briefsDismissed.includes(q.skill) && stat(progress, q.skill).attempts < BRIEF_RETIRES_AFTER);
  const cards = coachCards({ q, prevMode, log, streak, lightning, showBrief: !lightning && showBrief, tipsOff, dismissed, done });

  const dismiss = (id: string) => {
    if (id.startsWith('brief-')) {
      setBriefOpen(false);
      onProgress((p) => ({ ...p, coach: { ...p.coach, briefsDismissed: [...new Set([...p.coach.briefsDismissed, q.skill])] } }));
    }
    setDismissed((d) => new Set(d).add(id));
  };

  return (
    <div className="screen play" style={{ ['--accent' as string]: header.color }}>
      <Scorecard progress={progress} lab={skillById(q.skill).lab} current={q.skill} log={log} lightning={lightning} />

      <div className="play-main">
        <header className="play-top">
          <button className="btn btn-ghost" onClick={onQuit} aria-label="Quit">✕</button>
          <div className="play-title">
            <strong>{header.title}</strong>
            <span className="muted">{header.sub}</span>
          </div>
          {!lightning && (
            <button
              className={`btn btn-ghost why-toggle ${showBrief ? 'on' : ''}`}
              onClick={() => (showBrief ? dismiss(`brief-${q.skill}`) : setBriefOpen(true))}
              title="Why this skill matters"
            >
              ⓘ Why it matters
            </button>
          )}
          <div className="play-score">
            <span className="score">{points.toLocaleString()}</span>
            <span className={`streak ${streak >= 3 ? 'hot' : ''}`}>🔥 {streak}</span>
          </div>
        </header>

        <div className="clock">
          <div className={`clock-fill ${clockFrac < 0.25 ? 'low' : ''}`} style={{ width: `${clockFrac * 100}%` }} />
          <span className="clock-text">{clockText}s</span>
        </div>

        <div className="play-meta">
          {!lightning && (
            <ol className="dots" aria-label={`Challenge ${idx + 1} of ${queue.length}`}>
              {queue.map((_, i) => {
                const a = log[i];
                const cls = a ? (a.correct ? 'good' : a.points > 0 ? 'part' : 'bad') : i === idx ? 'now' : '';
                return <li key={i} className={cls} />;
              })}
            </ol>
          )}
          <span className="chip">{MODE_INFO[q.mode].icon} {MODE_INFO[q.mode].name}</span>
          <span className="chip">{KIND_INFO[q.kind].icon} {KIND_INFO[q.kind].name}</span>
          <span className="chip">{'★'.repeat(q.difficulty)}{'☆'.repeat(3 - q.difficulty)}</span>
          {ALIGNMENT[q.skill] && <span className="chip">📚 {ALIGNMENT[q.skill].grade}</span>}
          {q.trap && <span className="chip chip-trap">⚠️ Trap ahead</span>}
          {streak > 0 && <span className="chip chip-accent">×{streakMultiplier(streak).toFixed(1)}</span>}
          {guideRetired && !done && (
            <button className="chip chip-btn" onClick={() => setGuideOpen((o) => !o)}>
              {guideOpen ? 'Hide steps' : '? How to play'}
            </button>
          )}
        </div>

        <div className={`card challenge ${guideRetired && !guideOpen ? 'no-guide' : ''}`}>
          <h2 className="prompt">{q.prompt}</h2>
          {q.context && <div className="context">{q.context}</div>}
          <Challenge key={idx} q={q} done={done} onSubmit={(c, f) => submit(c, false, f)} />
        </div>

        {done && last && last.q.id === q.id && (
          <div className={`feedback ${last.correct ? 'good' : 'bad'} ${lightning ? 'flash' : ''}`}>
            <div className="feedback-head">
              <strong>
                {last.correct ? 'Nailed it!' : last.timedOut ? "Time's up!" : last.points > 0 ? 'Partly there.' : 'Not quite.'}
              </strong>
              {last.points > 0 && <span className="gain">+{last.points}</span>}
            </div>
            {!lightning && (
              <div className="feedback-body">
                <div className="feedback-text">
                  <p>{q.why}</p>
                  {q.trap && trapById(q.trap) && (
                    <p className="trap-note">
                      <strong>⚠️ Common trap · {trapById(q.trap)!.name}.</strong> {trapById(q.trap)!.tell}
                    </p>
                  )}
                </div>
                <button className="btn btn-primary" onClick={advance} autoFocus>
                  {idx + 1 >= queue.length ? 'See results' : 'Next →'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Coach
        cards={cards}
        skill={q.skill}
        lightning={lightning}
        tipsOff={tipsOff}
        progress={progress}
        roundTerms={log.flatMap((a) => (a.term ? [a.term] : []))}
        onDismiss={dismiss}
        onToggleTips={() => onProgress((p) => ({ ...p, coach: { ...p.coach, off: !p.coach.off } }))}
      />
    </div>
  );
}
