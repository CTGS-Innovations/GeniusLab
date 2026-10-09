import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KIND_INFO, MODE_INFO, labById, skillById } from '../data';
import { pointsFor, streakMultiplier, timeLimit } from '../engine/scoring';
import { LIGHTNING_SECONDS, buildLightning, buildPractice } from '../engine/session';
import type { Progress } from '../engine/progress';
import type { LabId, Question } from '../types';
import { Challenge } from './Challenge';

export type SessionSpec = { type: 'practice'; skill: string } | { type: 'lightning'; lab: LabId | 'all' };

export interface AnswerLog {
  q: Question;
  correct: boolean;
  timedOut: boolean;
  points: number;
  seconds: number;
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
  onFinish: (summary: SessionSummary) => void;
  onQuit: () => void;
}

/** Lightning Round: speed bonus fades over this many seconds. */
const LIGHTNING_SPEED_WINDOW = 10;
const LIGHTNING_FLASH_MS = 650;

export function Play({ spec, progress, onAnswer, onFinish, onQuit }: Props) {
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
    (correct: boolean, timedOut = false) => {
      if (done || finished.current) return;
      const seconds = (performance.now() - qStart) / 1000;
      const timeLeft = Math.max(0, 1 - seconds / limit);
      const gained = pointsFor(correct, timeLeft, streak, q.difficulty);
      const nextStreak = correct ? streak + 1 : 0;
      setDone(true);
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      setPoints((p) => p + gained);
      setLog((l) => [...l, { q, correct, timedOut, points: gained, seconds }]);
      onAnswer(q, correct, timeLeft);
    },
    [done, qStart, limit, streak, q, onAnswer],
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
      return { title: 'Lightning Round', sub: spec.lab === 'all' ? 'All labs' : labById(spec.lab).name, color: '#ffc145' };
    }
    const skill = skillById(spec.skill);
    const lab = labById(skill.lab);
    return { title: skill.name, sub: lab.name, color: lab.color };
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

  return (
    <div className="screen play" style={{ ['--accent' as string]: header.color }}>
      <div className="play-top">
        <button className="btn btn-ghost" onClick={onQuit} aria-label="Quit">✕</button>
        <div className="play-title">
          <strong>{header.title}</strong>
          <span className="muted">{header.sub}</span>
        </div>
        <div className="play-score">
          <span className="score">{points.toLocaleString()}</span>
          <span className={`streak ${streak >= 3 ? 'hot' : ''}`}>🔥 {streak}</span>
        </div>
      </div>

      <div className="clock">
        <div className={`clock-fill ${clockFrac < 0.25 ? 'low' : ''}`} style={{ width: `${clockFrac * 100}%` }} />
        <span className="clock-text">{clockText}s</span>
      </div>

      <div className="play-meta">
        {!lightning && (
          <span>
            {idx + 1} / {queue.length}
          </span>
        )}
        <span className="chip">{MODE_INFO[q.mode].icon} {MODE_INFO[q.mode].name}</span>
        <span className="chip">{KIND_INFO[q.kind].icon} {KIND_INFO[q.kind].name}</span>
        <span className="chip">{'★'.repeat(q.difficulty)}{'☆'.repeat(3 - q.difficulty)}</span>
        {streak > 0 && <span className="chip chip-accent">×{streakMultiplier(streak).toFixed(1)}</span>}
      </div>

      <div className="card challenge">
        <h2 className="prompt">{q.prompt}</h2>
        {q.context && <div className="context">{q.context}</div>}
        <Challenge key={idx} q={q} done={done} onSubmit={(c) => submit(c)} />
      </div>

      {done && last && last.q.id === q.id && (
        <div className={`feedback ${last.correct ? 'good' : 'bad'} ${lightning ? 'flash' : ''}`}>
          <div className="feedback-head">
            <strong>
              {last.correct ? 'Nailed it!' : last.timedOut ? "Time's up!" : 'Not quite.'}
            </strong>
            {last.correct && <span className="gain">+{last.points}</span>}
          </div>
          {!lightning && (
            <>
              <p>
                <span className="why-label">{last.correct ? 'Why it works' : 'Break it down'}</span>
                {q.why}
              </p>
              <button className="btn btn-primary btn-block" onClick={advance} autoFocus>
                {idx + 1 >= queue.length ? 'See results' : 'Next challenge →'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
