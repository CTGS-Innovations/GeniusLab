import { LABS, MODE_INFO, skillsForLab } from '../data';
import { ACHIEVEMENTS, RANKS, TIER_LABEL, labMastery, rankFor, stat, tierFor, type Progress } from '../engine/progress';
import type { Mode } from '../types';
import { Bar, Ring, Sparkline } from './ui';

interface Props {
  progress: Progress;
  onBack: () => void;
  onReset: () => void;
}

export function Growth({ progress, onBack, onReset }: Props) {
  const rank = rankFor(progress.xp);
  const answered = Object.values(progress.skills).reduce((n, s) => n + s.attempts, 0);
  const right = Object.values(progress.skills).reduce((n, s) => n + s.correct, 0);
  const recent = progress.sessions.slice(-20).map((s) => (s.total ? (s.correct / s.total) * 100 : 0));
  const modes = Object.entries(progress.modes) as [Mode, { attempts: number; correct: number }][];
  const weakestMode = modes.filter(([, m]) => m.attempts >= 5).sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts)[0];

  return (
    <div className="screen">
      <div className="topbar">
        <button className="btn btn-ghost" onClick={onBack}>← Home</button>
      </div>
      <h1>My Growth</h1>

      <div className="stats">
        <div className="stat">
          <strong>{rank.icon} {rank.name}</strong>
          <span className="muted small">{progress.xp.toLocaleString()} XP</span>
        </div>
        <div className="stat">
          <strong>{answered ? Math.round((right / answered) * 100) : 0}%</strong>
          <span className="muted small">{right}/{answered} correct</span>
        </div>
        <div className="stat">
          <strong>📅 {progress.dayStreak}</strong>
          <span className="muted small">day streak</span>
        </div>
      </div>

      <div className="card">
        <h3>Rank ladder</h3>
        <div className="ladder">
          {RANKS.map((r, i) => (
            <div key={r.name} className={`ladder-step ${i <= rank.index ? 'reached' : ''} ${i === rank.index ? 'current' : ''}`}>
              <span>{r.icon}</span>
              <span className="small">{r.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Core thinking skills</h3>
        {modes.map(([mode, m]) => (
          <div key={mode} className="mode-row">
            <span className="mode-name">
              {MODE_INFO[mode].icon} {MODE_INFO[mode].name}
            </span>
            <Bar value={m.attempts ? (m.correct / m.attempts) * 100 : 0} color="var(--brand)" label={`${MODE_INFO[mode].name} accuracy`} />
            <span className="small muted mode-pct">{m.attempts ? `${Math.round((m.correct / m.attempts) * 100)}%` : '—'}</span>
          </div>
        ))}
        {weakestMode && (
          <p className="small muted">
            Focus area: <strong>{MODE_INFO[weakestMode[0]].name}</strong> — {MODE_INFO[weakestMode[0]].blurb.toLowerCase()}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Accuracy trend</h3>
        <Sparkline values={recent} color="var(--brand)" />
        {recent.length >= 2 && <p className="small muted">Last {recent.length} sessions · dashed line = 80%</p>}
      </div>

      {LABS.map((lab) => (
        <div key={lab.id} className="card">
          <div className="lab-growth-head">
            <Ring value={labMastery(progress, lab.id)} color={lab.color} size={48}>
              <span>{lab.icon}</span>
            </Ring>
            <h3>{lab.name}</h3>
            <span className="lab-pct">{labMastery(progress, lab.id)}%</span>
          </div>
          {skillsForLab(lab.id).map((s) => {
            const tier = tierFor(progress, s);
            return (
              <div key={s.id} className="mode-row">
                <span className="mode-name">{s.icon} {s.name}</span>
                <Bar value={stat(progress, s.id).mastery} color={lab.color} label={`${s.name} mastery`} />
                <span className={`tier tier-${tier}`}>{TIER_LABEL[tier]}</span>
              </div>
            );
          })}
        </div>
      ))}

      <div className="card">
        <h3>Achievements · {Object.keys(progress.achievements).length}/{ACHIEVEMENTS.length}</h3>
        <div className="badges">
          {ACHIEVEMENTS.map((a) => {
            const got = Boolean(progress.achievements[a.id]);
            return (
              <div key={a.id} className={`badge ${got ? 'earned' : ''}`}>
                <span className="badge-icon">{got ? a.icon : '🔒'}</span>
                <strong>{a.name}</strong>
                <span className="small muted">{a.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="btn btn-ghost btn-block danger"
        onClick={() => {
          if (confirm('Erase all progress on this device? This cannot be undone.')) onReset();
        }}
      >
        Reset progress
      </button>
    </div>
  );
}
