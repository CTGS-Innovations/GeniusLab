import { MODE_INFO, labById, skillsForLab } from '../data';
import { TIER_LABEL, labMastery, nextTier, stat, tierFor, type Progress } from '../engine/progress';
import type { LabId, Mode } from '../types';
import type { AnswerLog } from './Play';
import { Bar } from './ui';

interface Props {
  progress: Progress;
  lab: LabId;
  current: string;
  log: AnswerLog[];
  lightning: boolean;
}

/** Live foundation scorecard: where every skill in the lab stands, and how this round is going. */
export function Scorecard({ progress, lab, current, log, lightning }: Props) {
  const info = labById(lab);
  const right = log.filter((a) => a.correct).length;
  const goal = nextTier(progress, current);
  const modes = (Object.keys(MODE_INFO) as Mode[])
    .map((m) => {
      const xs = log.filter((a) => a.q.mode === m);
      return { m, n: xs.length, right: xs.filter((a) => a.correct).length };
    })
    .filter((x) => x.n > 0);

  return (
    <aside className="scorecard" aria-label="Foundation scorecard">
      <div className="score-head">
        <span className="why-label">Foundation scorecard</span>
        <strong>
          {info.icon} {info.name}
        </strong>
        <Bar value={labMastery(progress, lab)} color={info.color} label={`${info.name} mastery`} />
        <span className="small muted">{labMastery(progress, lab)}% of the lab mastered</span>
      </div>

      <ul className="score-skills">
        {skillsForLab(lab).map((s) => {
          const tier = tierFor(progress, s);
          const isCurrent = s.id === current;
          return (
            <li key={s.id} className={`${isCurrent ? 'is-current' : ''} ${tier === 'locked' ? 'is-locked' : ''}`}>
              <div className="score-skill-line">
                <span className="score-skill-name">
                  {tier === 'locked' ? '🔒' : s.icon} {s.name}
                </span>
                <span className={`tier tier-${tier}`}>{TIER_LABEL[tier]}</span>
              </div>
              {tier !== 'locked' && <Bar value={stat(progress, s.id).mastery} color={info.color} label={`${s.name} mastery`} />}
              {isCurrent && !lightning && goal && (
                <span className="next-goal">
                  Next: <strong>{goal.name}</strong> in ~{goal.answers} right {goal.answers === 1 ? 'answer' : 'answers'}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="score-round">
        <span className="why-label">This round</span>
        <strong className="round-big">
          {right}/{log.length} <span className="small muted">right</span>
        </strong>
        {modes.map((x) => (
          <div key={x.m} className="score-mode">
            <span>
              {MODE_INFO[x.m].icon} {MODE_INFO[x.m].name}
            </span>
            <span className="muted">
              {x.right}/{x.n}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
