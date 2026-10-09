import { skillById } from '../data';
import { adviceAfter, rankFor, type Achievement, type Progress } from '../engine/progress';
import type { SessionSummary } from './Play';
import { Bar } from './ui';

interface Props {
  summary: SessionSummary;
  progress: Progress;
  earned: Achievement[];
  onPractice: (skill: string) => void;
  onAgain: () => void;
  onDone: () => void;
}

export function Results({ summary, progress, earned, onPractice, onAgain, onDone }: Props) {
  const { log, points, bestStreak, spec, before } = summary;
  const correct = log.filter((a) => a.correct).length;
  const accuracy = log.length ? correct / log.length : 0;
  const misses = log.filter((a) => !a.correct);
  const rankBefore = rankFor(before.xp);
  const rank = rankFor(progress.xp);
  const rankedUp = rank.index > rankBefore.index;
  const skill = spec.type === 'practice' ? skillById(spec.skill) : null;
  const advice = skill ? adviceAfter(before, progress, skill, accuracy) : null;
  const grade = accuracy >= 0.9 ? 'Genius move!' : accuracy >= 0.7 ? 'Strong work!' : accuracy >= 0.5 ? 'Getting there!' : 'Every rep counts.';

  return (
    <div className="screen results">
      <header className="results-head">
        <p className="muted">{spec.type === 'lightning' ? '⚡ Lightning Round' : `${skill!.icon} ${skill!.name}`}</p>
        <h1>{grade}</h1>
        <div className="big-score">{points.toLocaleString()}</div>
        <p className="muted">points · +{points.toLocaleString()} XP</p>
      </header>

      <div className={`results-grid ${misses.length ? '' : 'single'}`}>
      <div className="results-main">
      <div className="stats">
        <div className="stat">
          <strong>{correct}/{log.length}</strong>
          <span className="muted small">correct</span>
        </div>
        <div className="stat">
          <strong>{Math.round(accuracy * 100)}%</strong>
          <span className="muted small">accuracy</span>
        </div>
        <div className="stat">
          <strong>🔥 {bestStreak}</strong>
          <span className="muted small">best streak</span>
        </div>
      </div>

      <div className={`card ${rankedUp ? 'rank-up' : ''}`}>
        {rankedUp && <p className="rank-up-banner">RANK UP! {rank.icon} {rank.name}</p>}
        <div className="rank-line">
          <strong>{rank.icon} {rank.name}</strong>
          <span className="muted small">{progress.xp.toLocaleString()} XP</span>
        </div>
        <Bar value={rank.progress * 100} color="var(--gold)" label="Progress to next rank" />
      </div>

      {earned.length > 0 && (
        <div className="card">
          <h3>🏆 Achievement unlocked</h3>
          <div className="badges">
            {earned.map((a) => (
              <div key={a.id} className="badge earned pop">
                <span className="badge-icon">{a.icon}</span>
                <strong>{a.name}</strong>
                <span className="small muted">{a.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {advice && skill && (
        <div className="card advice">
          {advice.kind === 'foundation' && (
            <>
              <h3>🧱 Strengthen the foundation</h3>
              <p>
                Built on <strong>{advice.skill.name}</strong>. A few reps there unlock this.
              </p>
              <button className="btn btn-primary btn-block" onClick={() => onPractice(advice.skill.id)}>
                Practice {advice.skill.icon} {advice.skill.name}
              </button>
            </>
          )}
          {advice.kind === 'retry' && (
            <>
              <h3>🔁 Run it back</h3>
              <p>Review your misses. Then run it back.</p>
            </>
          )}
          {advice.kind === 'unlocked' && (
            <>
              <h3>🔓 New skill unlocked!</h3>
              {advice.skills.map((s) => (
                <button key={s.id} className="btn btn-primary btn-block" onClick={() => onPractice(s.id)}>
                  Try {s.icon} {s.name}
                </button>
              ))}
            </>
          )}
          {advice.kind === 'push' && (
            <>
              <h3>📈 Keep climbing</h3>
              <p>One or two more rounds to level up.</p>
            </>
          )}
          {advice.kind === 'mastered' && (
            <>
              <h3>🥇 Gold-level skill</h3>
              <p>Mastered. Keep it sharp in Lightning Rounds.</p>
            </>
          )}
        </div>
      )}

      </div>
      <div className="results-side">
      {misses.length > 0 && (
        <div className="card">
          <h3>🧩 Break it down: your misses</h3>
          <ul className="review">
            {misses.map((a, i) => (
              <li key={i}>
                <strong>{a.q.prompt}</strong>
                {a.q.context && <div className="context small">{a.q.context}</div>}
                <p className="small">{a.q.why}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      </div>
      </div>
      <div className="row">
        <button className="btn btn-block" onClick={onDone}>Done</button>
        <button className="btn btn-primary btn-block" onClick={onAgain}>Play again</button>
      </div>
    </div>
  );
}
