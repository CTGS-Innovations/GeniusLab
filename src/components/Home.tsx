import { useState } from 'react';
import { LABS, MODE_INFO } from '../data';
import { labMastery, rankFor, skillOfTheDay, suggestedSkill, type Progress } from '../engine/progress';
import type { LabId, Mode } from '../types';
import type { IconName } from './Icon';
import { Icon } from './Icon';
import { Bar, Ring, accentStyle } from './ui';
import { useIsPhone } from './fx';

const MODE_ICON: Record<Mode, IconName> = { spot: 'eye', breakdown: 'puzzle', next: 'next' };

interface Props {
  progress: Progress;
  onOpenLab: (lab: LabId) => void;
  onLightning: (lab: LabId | 'all') => void;
  onGrowth: () => void;
  onSettings: () => void;
  onSwipe: (lab: LabId | 'all') => void;
  onPrep: (lab: LabId | 'all') => void;
  onPractice: (skill: string) => void;
  onBoards: () => void;
}

export function Home({ progress, onOpenLab, onLightning, onGrowth, onSettings, onSwipe, onPrep, onPractice, onBoards }: Props) {
  const rank = rankFor(progress.xp);
  const [boltLab, setBoltLab] = useState<LabId | 'all'>('all');
  const fresh = progress.sessions.length === 0;
  const isPhone = useIsPhone();
  const daily = skillOfTheDay(progress);
  const saved = progress.boards.reduce((n, b) => n + b.items.length, 0);

  return (
    <div className="screen home">
      <header className="home-top">
        <div className="brand">
          <h1>
            Genius<span>Lab</span>
          </h1>
          <p className="tagline">Spot It. Break It Down. Level Up.</p>
        </div>
        <button className="btn btn-ghost gear" onClick={onSettings} aria-label="Settings">
          <Icon name="palette" /> <span className="gear-label">Theme &amp; settings</span>
        </button>
        <button className="card rank-card" onClick={onGrowth}>
          <div className="rank-icon">{rank.icon}</div>
          <div className="rank-body">
            <div className="rank-line">
              <strong>{rank.name}</strong>
              <span className="muted">{progress.xp.toLocaleString()} XP</span>
            </div>
            <Bar value={rank.progress * 100} color="var(--gold)" label="Progress to next rank" />
            <div className="rank-line small muted">
              <span>{rank.next ? `${(rank.next.xp - progress.xp).toLocaleString()} XP to ${rank.next.name}` : 'Top rank reached!'}</span>
              <span className="rank-stats">
                <span>
                  <Icon name="calendar" /> {progress.dayStreak}d
                </span>
                <span>
                  <Icon name="flame" /> {progress.bestStreak}
                </span>
                <span>
                  My growth <Icon name="next" />
                </span>
              </span>
            </div>
          </div>
        </button>
      </header>

      {fresh && (
        <div className="how-modes">
          {(Object.keys(MODE_INFO) as Mode[]).map((id) => ({ id, ...MODE_INFO[id] })).map((m) => (
            <div key={m.name} className="how-mode">
              <span className="how-icon">
                <Icon name={MODE_ICON[m.id]} />
              </span>
              <strong>{m.name}</strong>
              <span className="small muted">{m.blurb}</span>
            </div>
          ))}
        </div>
      )}

      <section className="for-you" aria-label="For you">
        <button className="card fy-card sotd" onClick={() => onPractice(daily.id)}>
          <span className="why-label">
            <Icon name="sun" /> Skill of the Day
          </span>
          <strong>{daily.name}</strong>
          <span className="small muted">{daily.goal}</span>
        </button>
        <button className="card fy-card" onClick={() => onPrep(boltLab)}>
          <span className="why-label">
            <Icon name="clipboard" /> Get Ready With Me
          </span>
          <strong>Test prep in 5 minutes</strong>
          <span className="small muted">Your misses, open traps, and weakest skills{boltLab === 'all' ? '' : ` in ${LABS.find((l) => l.id === boltLab)!.name}`}.</span>
        </button>
        <button className="card fy-card" onClick={onBoards}>
          <span className="why-label">
            <Icon name="pin" /> My Boards
          </span>
          <strong>{saved ? `${saved} saved ${saved === 1 ? 'card' : 'cards'}` : 'Save cards to review'}</strong>
          <span className="small muted">Practice straight from a board.</span>
        </button>
      </section>

      <div className="home-grid">
        <section className="labs">
          {LABS.map((lab) => {
            const m = labMastery(progress, lab.id);
            const next = suggestedSkill(progress, lab.id);
            return (
              <button key={lab.id} className="card lab-card" style={accentStyle(lab.color)} onClick={() => onOpenLab(lab.id)}>
                <Ring value={m} color={lab.color} size={isPhone ? 64 : 96}>
                  <span className="lab-icon big">{lab.icon}</span>
                </Ring>
                <strong className="lab-name">{lab.name}</strong>
                <span className="muted">{lab.tagline}</span>
                <span className="lab-pct">{m}% mastered</span>
                <span className="next-up">
                  Next up: {next.name} <Icon name="next" />
                </span>
              </button>
            );
          })}
        </section>

        <aside className="home-side">
        <button className="card swipe-card" onClick={() => onSwipe(boltLab)}>
          <span className="swipe-phone" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Swipe Mode</strong>
            <span className="small muted">One card at a time. Answer, explain why, swipe up. No clock.</span>
          </span>
        </button>
        <div className="card bolt">
          <div className="bolt-head">
            <div>
              <h3>
                <Icon name="bolt" /> Lightning Round
              </h3>
              <p className="muted small">60 seconds. Speed and streaks multiply your score.</p>
            </div>
            <div className="bolt-best">
              <span className="muted small">Best</span>
              <strong>{progress.lightningBest.toLocaleString()}</strong>
            </div>
          </div>
          <div className="seg">
            {(['all', ...LABS.map((l) => l.id)] as const).map((id) => (
              <button key={id} className={boltLab === id ? 'on' : ''} onClick={() => setBoltLab(id)}>
                {id === 'all' ? 'All' : LABS.find((l) => l.id === id)!.name.replace(' Lab', '')}
              </button>
            ))}
          </div>
          <button className="btn btn-gold btn-block" onClick={() => onLightning(boltLab)}>
            Start the clock
          </button>
        </div>
        </aside>
      </div>
    </div>
  );
}
