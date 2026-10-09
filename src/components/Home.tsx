import { useState } from 'react';
import { LABS, MODE_INFO } from '../data';
import { labMastery, rankFor, suggestedSkill, type Progress } from '../engine/progress';
import type { LabId } from '../types';
import { Bar, Ring } from './ui';

interface Props {
  progress: Progress;
  onOpenLab: (lab: LabId) => void;
  onLightning: (lab: LabId | 'all') => void;
  onGrowth: () => void;
}

export function Home({ progress, onOpenLab, onLightning, onGrowth }: Props) {
  const rank = rankFor(progress.xp);
  const [boltLab, setBoltLab] = useState<LabId | 'all'>('all');
  const fresh = progress.sessions.length === 0;

  return (
    <div className="screen">
      <header className="brand">
        <h1>
          Genius<span>Lab</span>
        </h1>
        <p className="tagline">Spot It. Break It Down. Level Up.</p>
      </header>

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
            <span>
              📅 {progress.dayStreak}d · 🔥 {progress.bestStreak}
            </span>
          </div>
        </div>
      </button>

      {fresh && (
        <div className="card how">
          <h3>How it works</h3>
          <p className="muted small">
            You don’t solve whole problems here. You train the thinking skills that make problems easy.
          </p>
          <div className="how-modes">
            {Object.values(MODE_INFO).map((m) => (
              <div key={m.name} className="how-mode">
                <span className="how-icon">{m.icon}</span>
                <strong>{m.name}</strong>
                <span className="small muted">{m.blurb}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="section-title">Labs</h3>
      <div className="labs">
        {LABS.map((lab) => {
          const m = labMastery(progress, lab.id);
          const next = suggestedSkill(progress, lab.id);
          return (
            <button key={lab.id} className="card lab-card" style={{ ['--accent' as string]: lab.color }} onClick={() => onOpenLab(lab.id)}>
              <Ring value={m} color={lab.color} size={64}>
                <span className="lab-icon">{lab.icon}</span>
              </Ring>
              <div className="lab-body">
                <strong>{lab.name}</strong>
                <span className="muted small">{lab.tagline}</span>
                <span className="small next-up">Next up: {next.icon} {next.name}</span>
              </div>
              <span className="lab-pct">{m}%</span>
            </button>
          );
        })}
      </div>

      <div className="card bolt">
        <div className="bolt-head">
          <div>
            <h3>⚡ Lightning Round</h3>
            <p className="muted small">60 seconds. Rapid-fire. Speed and streaks multiply your score.</p>
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

      <button className="btn btn-block" onClick={onGrowth}>
        📈 My Growth & Achievements
      </button>
    </div>
  );
}
