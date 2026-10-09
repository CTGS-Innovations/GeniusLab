import { useEffect, useMemo, useState } from 'react';
import { skillById } from '../data';
import { nextTier, rankFor, type Achievement, type Progress } from '../engine/progress';
import { Icon, type IconName } from './Icon';
import type { SessionSummary } from './Play';

interface Props {
  summary: SessionSummary;
  progress: Progress;
  earned: Achievement[];
  onDone: () => void;
}

interface Slide {
  kicker: string;
  big: string;
  icon?: IconName;
  line: string;
  tone: string;
}

const SLIDE_MS = 4200;

/** Instagram-style recap: a few tap-through cards about this round, then the full results. */
export function Recap({ summary, progress, earned, onDone }: Props) {
  const slides = useMemo(() => buildSlides(summary, progress, earned), [summary, progress, earned]);
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => (i + 1 < slides.length ? setI(i + 1) : onDone()), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, slides.length, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const next = () => (i + 1 < slides.length ? setI(i + 1) : onDone());
  const s = slides[i];

  return (
    <div className="recap" style={{ ['--tone' as string]: s.tone }}>
      <div className="recap-bars">
        {slides.map((_, k) => (
          <span key={k} className={k < i ? 'full' : k === i ? 'now' : ''}>
            <i style={k === i ? { animationDuration: `${SLIDE_MS}ms` } : undefined} key={`${k}-${i}`} />
          </span>
        ))}
      </div>
      <button className="recap-skip btn btn-ghost" onClick={onDone}>
        Skip
      </button>
      <button className="recap-back" data-overlay aria-label="Previous" onClick={() => setI(Math.max(0, i - 1))} />
      <button className="recap-card" key={i} onClick={next}>
        <span className="recap-kicker">{s.kicker}</span>
        {s.icon && <Icon name={s.icon} className="recap-icon" />}
        <span className="recap-big">{s.big}</span>
        <span className="recap-line">{s.line}</span>
      </button>
      <span className="recap-hint small">Tap to continue</span>
    </div>
  );
}

function buildSlides(summary: SessionSummary, progress: Progress, earned: Achievement[]): Slide[] {
  const { log, points, bestStreak, before } = summary;
  const right = log.filter((a) => a.correct).length;
  const pct = log.length ? Math.round((right / log.length) * 100) : 0;
  const slides: Slide[] = [
    {
      kicker: 'This round',
      big: points.toLocaleString(),
      line: `${right} of ${log.length} right · ${pct}%`,
      tone: 'var(--brand)',
    },
  ];

  const insights = log.filter((a) => a.why?.correct);
  const lucky = log.find((a) => a.why?.lucky);
  if (lucky) slides.push({ kicker: 'Lucky insight', big: '×3', icon: 'bulb', line: `You nailed the why behind “${shorten(lucky.q.prompt)}”`, tone: 'var(--gold)' });
  else if (insights.length) slides.push({ kicker: 'You explained it', big: `${insights.length}`, icon: 'bulb', line: `${insights.length === 1 ? 'reason' : 'reasons'} right. That’s how it sticks.`, tone: 'var(--gold)' });

  if (bestStreak >= 3) slides.push({ kicker: 'Best streak', big: `${bestStreak}`, icon: 'flame', line: 'in a row without a miss', tone: 'var(--bad)' });

  const traps = log.flatMap((a) => (a.trapBeaten ? [a.trapBeaten] : []));
  if (traps.length) slides.push({ kicker: 'Trap beaten', big: `${traps.length}`, icon: 'shield', line: traps.join(' · '), tone: 'var(--good)' });

  const terms = log.flatMap((a) => (a.term ? [a.term] : []));
  if (terms.length) slides.push({ kicker: 'New teacher terms', big: `${terms.length}`, icon: 'book', line: terms.slice(0, 3).join(' · '), tone: 'var(--brand)' });

  if (earned.length) slides.push({ kicker: 'Achievement', big: earned[0].icon, line: earned[0].name, tone: 'var(--gold)' });

  const rankBefore = rankFor(before.xp);
  const rank = rankFor(progress.xp);
  if (rank.index > rankBefore.index) slides.push({ kicker: 'Rank up', big: rank.icon, line: `You’re now ${rank.name}`, tone: 'var(--gold)' });

  const skill = summary.spec.type === 'practice' ? summary.spec.skill : log[log.length - 1]?.q.skill;
  const goal = skill ? nextTier(progress, skill) : null;
  if (skill && goal)
    slides.push({ kicker: 'Next goal', big: goal.name, line: `in ~${goal.answers} right answers on ${skillById(skill).name}`, tone: 'var(--good)' });

  return slides;
}

const shorten = (s: string) => (s.length > 48 ? `${s.slice(0, 46)}…` : s);
