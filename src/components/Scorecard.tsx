import { MODE_INFO, labById, skillsForLab } from '../data';
import { TIER_LABEL, labMastery, stat, tierFor, type Progress } from '../engine/progress';
import type { LabId, Mode } from '../types';
import type { AnswerLog } from './Play';
import { Bar } from './ui';

interface Props {
  progress: Progress;
  lab: LabId;
  current: string;
  log: AnswerLog[];
  streak: number;
}

/** Live foundation scorecard: mastery of every skill in the lab, plus this round so far. */
export function Scorecard({ progress, lab, current, log, streak }: Props) {
  const info = labById(lab);
  const right = log.filter((a) => a.correct).length;
  const byMode = (m: Mode) => {
    const xs = log.filter((a) => a.q.mode === m);
    return `${xs.filter((a) => a.correct).length}/${xs.length}`;
  };

  return (
    <aside className="scorecard" aria-label="Foundation scorecard">
      <div className="score-head">
        <span className="why-label">Foundation scorecard</span>
        <strong>
          {info.icon} {info.name} · {labMastery(progress, lab)}%
        </strong>
      </div>

      <ul className="score-skills">
        {skillsForLab(lab).map((s) => {
          const tier = tierFor(progress, s);
          const m = stat(progress, s.id).mastery;
          return (
            <li key={s.id} className={s.id === current ? 'is-current' : ''}>
              <div className="score-skill-line">
                <span className="score-skill-name">
                  {tier === 'locked' ? '🔒' : s.icon} {s.name}
                </span>
                <span className={`tier tier-${tier}`}>{TIER_LABEL[tier]}</span>
              </div>
              <Bar value={m} color={info.color} label={`${s.name} mastery`} />
            </li>
          );
        })}
      </ul>

      <div className="score-round">
        <span className="why-label">This round</span>
        <div className="score-stats">
          <div>
            <strong>
              {right}/{log.length}
            </strong>
            <span className="small muted">correct</span>
          </div>
          <div>
            <strong>🔥 {streak}</strong>
            <span className="small muted">streak</span>
          </div>
        </div>
        {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
          <div key={m} className="score-mode">
            <span>
              {MODE_INFO[m].icon} {MODE_INFO[m].name}
            </span>
            <span className="muted">{byMode(m)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
