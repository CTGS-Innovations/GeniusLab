import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KIND_INFO, MODE_INFO, labById, questionsForSkill, skillById } from '../data';
import { pointsFor, streakMultiplier, timeLimit } from '../engine/scoring';
import { LIGHTNING_SECONDS, buildBoard, buildLightning, buildPractice, buildPrep, shuffle } from '../engine/session';
import { TRAP_BEATEN_AT, boardsWith, recordWhy, stat, termCount, toggleSaved, type Progress } from '../engine/progress';
import { trapById } from '../data/traps';
import { BRIEF_RETIRES_AFTER, coachCards } from '../engine/coach';
import type { LabId, Question } from '../types';
import { ALIGNMENT } from '../data/curriculum';
import { HOWTO_LIMIT } from '../data/why';
import { Coach } from './Coach';
import { Scorecard } from './Scorecard';
import { Challenge } from './Challenge';
import { MathProvider, T } from './MathText';
import { Burst, buzz, useIsPhone } from './fx';

export type SessionSpec =
  | { type: 'practice'; skill: string }
  | { type: 'lightning'; lab: LabId | 'all' }
  | { type: 'swipe'; lab: LabId | 'all' }
  | { type: 'board'; board: string }
  | { type: 'prep'; lab: LabId | 'all' };

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
  /** Result of the "Why?" follow-up, if it was asked. */
  why?: { correct: boolean; bonus: number; lucky: boolean };
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
  /** Update progress directly (coach preferences, Why? insights). */
  onProgress: (update: (p: Progress) => Progress) => void;
  onFinish: (summary: SessionSummary) => void;
  onQuit: () => void;
}

/** Lightning Round: speed bonus fades over this many seconds. */
const LIGHTNING_SPEED_WINDOW = 10;
const LIGHTNING_FLASH_MS = 650;
/** Points for a right reason on the Why? step, and the odds of a surprise ×3. */
export const INSIGHT_POINTS = 50;
export const LUCKY_ODDS = 0.25;

const hasWhy = (q: Question) => q.kind !== 'chain' && !!q.reason && q.decoys?.length === 2;

export function Play({ spec, progress, onAnswer, onProgress, onFinish, onQuit }: Props) {
  const before = useRef(progress).current;
  const lightning = spec.type === 'lightning';
  const swipe = spec.type === 'swipe';
  const endless = lightning || swipe;
  /** Practice is untimed unless the student turns on Speed mode. Lightning is always timed. */
  const timed = lightning || (spec.type === 'practice' && before.settings.speed);
  const haptics = progress.settings.haptics;
  const isPhone = useIsPhone();

  const [queue, setQueue] = useState<Question[]>(() =>
    spec.type === 'practice'
      ? buildPractice(progress, spec.skill)
      : spec.type === 'board'
        ? buildBoard(progress, spec.board)
        : spec.type === 'prep'
          ? buildPrep(progress, spec.lab)
          : buildLightning(progress, spec.lab),
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
  const [whyPick, setWhyPick] = useState<number | null>(null);
  const [sheet, setSheet] = useState<'score' | 'coach' | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [pinPop, setPinPop] = useState(0);
  const lastTap = useRef(0);
  const touchY = useRef<number | null>(null);

  const q = queue[idx];
  const limit = lightning ? LIGHTNING_SPEED_WINDOW : timeLimit(q);
  const elapsed = (now - qStart) / 1000;
  const roundLeft = Math.max(0, LIGHTNING_SECONDS - (now - roundStart.current) / 1000);
  const last = log[log.length - 1];
  const askWhy = !lightning && !!q && hasWhy(q);
  /** 0 = the right reason; shuffled once per question. */
  const whyOrder = useMemo(() => shuffle([0, 1, 2]), [idx]);
  const reasons = q && askWhy ? [q.reason!, ...q.decoys!] : [];
  const reviewing = done && (!askWhy || whyPick !== null);

  useEffect(() => {
    if (!timed) return;
    const t = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(t);
  }, [timed]);

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
      // Untimed play scores as a steady mid-speed answer, so there is no rush.
      const timeLeft = timed ? Math.max(0, 1 - seconds / limit) : 0.5;
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
      if (correct && haptics) buzz(nextStreak >= 3 ? [12, 40, 12] : 15);
      onAnswer(q, correct, timeLeft);
    },
    [done, qStart, timed, limit, streak, q, onAnswer, progress.terms, progress.traps, haptics],
  );

  const pickWhy = (i: number) => {
    if (whyPick !== null) return;
    const right = i === 0;
    const lucky = right && Math.random() < LUCKY_ODDS;
    const bonus = right ? INSIGHT_POINTS * (lucky ? 3 : 1) : 0;
    setWhyPick(i);
    setPoints((p) => p + bonus);
    setLog((l) => l.map((a, k) => (k === l.length - 1 ? { ...a, why: { correct: right, bonus, lucky } } : a)));
    if (right && haptics) buzz(lucky ? [20, 60, 20, 60, 40] : [10, 30, 10]);
    onProgress((p) => recordWhy(p, q, right));
  };

  const advance = useCallback(() => {
    if (!endless && idx + 1 >= queue.length) {
      finish(log, points, bestStreak);
      return;
    }
    if (endless && idx + 1 >= queue.length) {
      setQueue((qs) => [...qs, ...buildLightning(progress, 'lab' in spec ? spec.lab : 'all')]);
    }
    setIdx((i) => i + 1);
    setDone(false);
    setWhyPick(null);
    setGuideOpen(false);
    setSaveOpen(false);
    setPinPop(0);
    setQStart(performance.now());
    if (swipe) window.scrollTo({ top: 0 });
  }, [endless, swipe, idx, queue.length, finish, log, points, bestStreak, progress, spec]);

  // Speed mode: the per-question clock running out counts as a miss.
  useEffect(() => {
    if (timed && !lightning && !done && elapsed >= limit) submit(false, true);
  }, [timed, lightning, done, elapsed, limit, submit]);

  // Lightning: the round clock ends the session; answers auto-advance.
  useEffect(() => {
    if (lightning && roundLeft <= 0) finish(log, points, bestStreak);
  }, [lightning, roundLeft, finish, log, points, bestStreak]);
  useEffect(() => {
    if (!lightning || !done) return;
    const t = setTimeout(advance, LIGHTNING_FLASH_MS);
    return () => clearTimeout(t);
  }, [lightning, done, advance]);

  // Enter / arrow-down moves on once the explanation is showing.
  useEffect(() => {
    if (!reviewing || lightning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reviewing, lightning, advance]);

  const header = useMemo(() => {
    if (spec.type === 'lightning') {
      return { title: '⚡ Lightning Round', sub: `${spec.lab === 'all' ? 'All labs' : labById(spec.lab).name} · speed and streaks multiply your score`, color: 'var(--gold)' };
    }
    if (spec.type === 'board') {
      const b = progress.boards.find((x) => x.id === spec.board);
      return { title: `${b?.emoji ?? '📌'} ${b?.name ?? 'Board'}`, sub: 'Your saved cards', color: 'var(--brand)' };
    }
    if (spec.type === 'prep') {
      return { title: '🪞 Get Ready With Me', sub: 'Your misses, open traps, and weakest skills', color: 'var(--brand)' };
    }
    if (spec.type === 'swipe') {
      return { title: '📱 Swipe Mode', sub: `${spec.lab === 'all' ? 'All labs' : labById(spec.lab).name} · answer, explain, swipe up`, color: 'var(--brand)' };
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

  const lab = skillById(q.skill).lab;
  const accent = spec.type === 'practice' ? header.color : labById(lab).color;
  const clockFrac = lightning ? roundLeft / LIGHTNING_SECONDS : Math.max(0, 1 - elapsed / limit);
  const clockText = lightning ? Math.ceil(roundLeft) : Math.max(0, Math.ceil(limit - elapsed));
  const prevMode = idx > 0 ? queue[idx - 1].mode : null;
  const guideRetired = (before.kindsPlayed[q.kind] ?? 0) >= HOWTO_LIMIT;
  const tipsOff = progress.coach.off;
  const showBrief =
    briefOpen || (!progress.coach.briefsDismissed.includes(q.skill) && stat(progress, q.skill).attempts < BRIEF_RETIRES_AFTER);
  const cards = coachCards({ q, prevMode, log, streak, lightning, showBrief: !endless && showBrief, tipsOff, dismissed, done, timed });
  const fresh = last && last.q.id === q.id ? last : undefined;
  const correctOption = q.kind === 'mc' ? q.options[q.answer] : q.kind === 'spot' ? q.tokens[q.answer] : null;

  const dismiss = (id: string) => {
    if (id.startsWith('brief-')) {
      setBriefOpen(false);
      onProgress((p) => ({ ...p, coach: { ...p.coach, briefsDismissed: [...new Set([...p.coach.briefsDismissed, q.skill])] } }));
    }
    setDismissed((d) => new Set(d).add(id));
  };

  const saved = boardsWith(progress, q.id);
  const quickSave = () => {
    if (!saved.includes('review')) onProgress((p) => toggleSaved(p, 'review', q.id));
    setPinPop((n) => n + 1);
    if (haptics) buzz(10);
  };

  const scorecard = <Scorecard progress={progress} lab={lab} current={q.skill} log={log} lightning={endless} />;
  const coach = (
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
  );

  return (
    <div
      className={`screen play ${swipe ? 'swipe' : ''}`}
      style={{ ['--accent' as string]: accent }}
      onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
      onTouchEnd={(e) => {
        const start = touchY.current;
        touchY.current = null;
        if (start !== null && reviewing && !lightning && start - e.changedTouches[0].clientY > 70) advance();
      }}
    >
      {!isPhone && !swipe && scorecard}

      <MathProvider on={lab !== 'english'}>
        <div className="play-main">
          <header className="play-top">
            <button className="btn btn-ghost" onClick={swipe ? () => finish(log, points, bestStreak) : onQuit} aria-label={swipe ? 'End and see results' : 'Quit'}>
              ✕
            </button>
            <div className="play-title">
              <strong>{header.title}</strong>
              <span className="muted">{header.sub}</span>
            </div>
            {!endless && !isPhone && (
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
              {fresh && fresh.points > 0 && (
                <span key={`fly-${log.length}-${fresh.why ? 'w' : 'a'}`} className="fly">
                  +{fresh.why?.bonus ? fresh.why.bonus : fresh.points}
                </span>
              )}
            </div>
          </header>

          {timed && (
            <div className="clock">
              <div className={`clock-fill ${clockFrac < 0.25 ? 'low' : ''}`} style={{ width: `${clockFrac * 100}%` }} />
              <span className="clock-text">{clockText}s</span>
            </div>
          )}

          <div className="play-meta">
            {!endless && (
              <ol className="dots" aria-label={`Challenge ${idx + 1} of ${queue.length}`}>
                {queue.map((_, i) => {
                  const a = log[i];
                  const cls = a ? (a.correct ? 'good' : a.points > 0 ? 'part' : 'bad') : i === idx ? 'now' : '';
                  return <li key={i} className={cls} />;
                })}
              </ol>
            )}
            {swipe && <span className="chip">#{idx + 1}</span>}
            <span className="chip">{MODE_INFO[q.mode].icon} {MODE_INFO[q.mode].name}</span>
            <span className="chip">{KIND_INFO[q.kind].icon} {KIND_INFO[q.kind].name}</span>
            <span className="chip">{'★'.repeat(q.difficulty)}{'☆'.repeat(3 - q.difficulty)}</span>
            {ALIGNMENT[q.skill] && <span className="chip">📚 {ALIGNMENT[q.skill].grade}</span>}
            {q.trap && !questionsForSkill(q.skill).every((x) => x.trap) && <span className="chip chip-trap">⚠️ Trap ahead</span>}
            {streak > 0 && (
              <span className="chip chip-accent combo" style={{ ['--combo' as string]: `${Math.min(1, streak / 10) * 100}%` }}>
                ×{streakMultiplier(streak).toFixed(1)}
              </span>
            )}
            {guideRetired && !done && (
              <button className="chip chip-btn" onClick={() => setGuideOpen((o) => !o)}>
                {guideOpen ? 'Hide steps' : '? How to play'}
              </button>
            )}
          </div>

          <div
            key={idx}
            className={`card challenge enter ${guideRetired && !guideOpen ? 'no-guide' : ''} ${fresh?.correct ? 'won' : ''}`}
            onPointerUp={(e) => {
              // Double-tap empty space on the card to quick-save it to Review later.
              if ((e.target as HTMLElement).closest('button')) return;
              const t = performance.now();
              if (t - lastTap.current < 320) quickSave();
              lastTap.current = t;
            }}
          >
            {pinPop > 0 && (
              <span key={`pin-${pinPop}`} className="pin-pop" aria-hidden>
                📌
              </span>
            )}
            <h2 className="prompt">
              <T>{q.prompt}</T>
            </h2>
            {q.context && (
              <div className="context">
                <T>{q.context}</T>
              </div>
            )}
            <Challenge key={`q-${idx}`} q={q} done={done} onSubmit={(c, f) => submit(c, false, f)} />
          </div>

          {done && fresh && (
            <div className={`feedback ${fresh.correct ? 'good' : 'bad'} ${lightning ? 'flash' : ''}`} aria-live="polite">
              <div className="feedback-head">
                <strong className="verdict">
                  {fresh.correct && <Burst />}
                  {fresh.correct ? 'Nailed it!' : fresh.timedOut ? 'Time’s up.' : fresh.points > 0 ? 'Partly there.' : 'Not yet.'}
                </strong>
                {fresh.points > 0 && <span className="gain">+{fresh.points}</span>}
              </div>

              {askWhy && whyPick === null && (
                <div className="why-step">
                  <p className="why-ask">
                    {fresh.correct ? (
                      <>Lock it in: <strong>why does that work?</strong></>
                    ) : correctOption ? (
                      <>
                        The answer is <strong className="why-answer"><T>{correctOption}</T></strong>. <strong>Why is it right?</strong>
                      </>
                    ) : (
                      <><strong>Which rule makes the right answer work?</strong></>
                    )}
                  </p>
                  <div className="why-options">
                    {whyOrder.map((r) => (
                      <button key={r} className="why-option" onClick={() => pickWhy(r)}>
                        <T>{reasons[r]}</T>
                      </button>
                    ))}
                  </div>
                  <span className="small muted">Right reason = +{INSIGHT_POINTS} Insight bonus. Sometimes it’s a lot more.</span>
                </div>
              )}

              {askWhy && whyPick !== null && (
                <div className={`why-result ${whyPick === 0 ? 'good' : 'bad'}`}>
                  {whyPick === 0 ? (
                    <strong>
                      💡 Insight{fresh.why?.lucky ? ' ×3!' : ''} <span className="gain">+{fresh.why?.bonus}</span>
                    </strong>
                  ) : (
                    <strong>The rule: <T>{q.reason!}</T></strong>
                  )}
                </div>
              )}

              {!lightning && reviewing && (
                <div className="feedback-body">
                  <div className="feedback-text">
                    <p>
                      <T>{q.why}</T>
                    </p>
                    {q.trap && trapById(q.trap) && (
                      <p className="trap-note">
                        <strong>⚠️ Common trap · {trapById(q.trap)!.name}.</strong> <T>{trapById(q.trap)!.tell}</T>
                      </p>
                    )}
                  </div>
                  <div className="save-wrap">
                    <button className={`btn save-btn ${saved.length ? 'on' : ''} ${!fresh.correct && !saved.length ? 'nudge' : ''}`} onClick={() => setSaveOpen((o) => !o)} aria-expanded={saveOpen}>
                      📌 {saved.length ? 'Saved' : 'Save'}
                    </button>
                    {saveOpen && (
                      <div className="save-menu" role="menu">
                        {progress.boards.map((b) => (
                          <button key={b.id} role="menuitemcheckbox" aria-checked={saved.includes(b.id)} onClick={() => onProgress((p) => toggleSaved(p, b.id, q.id))}>
                            <span>{b.emoji} {b.name}</span>
                            <span>{saved.includes(b.id) ? '✓' : '+'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="btn btn-primary next-btn" onClick={advance} autoFocus>
                    {!endless && idx + 1 >= queue.length ? 'See results' : swipe ? 'Next ↑' : 'Next →'}
                  </button>
                </div>
              )}
              {swipe && reviewing && <p className="swipe-hint small muted">Swipe up or press Enter for the next card</p>}
            </div>
          )}
        </div>
      </MathProvider>

      {!isPhone && !swipe && coach}

      {isPhone && !swipe && (
        <>
          <nav className="dock" aria-label="Panels">
            <button onClick={() => setSheet('score')}>📊 Scorecard</button>
            <button onClick={() => setSheet('coach')}>
              💡 Coach{cards.length > 0 && <span className="badge-dot">{cards.length}</span>}
            </button>
          </nav>
          {sheet && (
            <div className="sheet-backdrop" onClick={() => setSheet(null)}>
              <div className="sheet panel-sheet" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-ghost sheet-close" onClick={() => setSheet(null)} aria-label="Close">
                  ✕
                </button>
                {sheet === 'score' ? scorecard : coach}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
