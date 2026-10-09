import { ALIGNMENT, MILESTONES, SOURCES } from '../data/curriculum';
import { labById, questionsForSkill, skillById, skillsForLab } from '../data';
import { TIER_LABEL, UNLOCK_AT, labMastery, mastery, skillDepth, stat, suggestedSkill, tierFor, type Progress } from '../engine/progress';
import type { LabId } from '../types';
import { Bar, Ring } from './ui';

interface Props {
  lab: LabId;
  progress: Progress;
  onPractice: (skill: string) => void;
  onBack: () => void;
}

export function LabView({ lab: labId, progress, onPractice, onBack }: Props) {
  const lab = labById(labId);
  const skills = skillsForLab(labId);
  const levels = Math.max(...skills.map(skillDepth)) + 1;
  const rows = Array.from({ length: levels }, (_, d) => skills.filter((s) => skillDepth(s) === d));
  const next = suggestedSkill(progress, labId);

  return (
    <div className="screen" style={{ ['--accent' as string]: lab.color }}>
      <div className="topbar">
        <button className="btn btn-ghost" onClick={onBack}>← Home</button>
      </div>
      <header className="lab-header">
        <Ring value={labMastery(progress, labId)} color={lab.color} size={84}>
          <span className="lab-icon big">{lab.icon}</span>
        </Ring>
        <div>
          <h1>{lab.name}</h1>
          <p className="muted">{lab.tagline}</p>
        </div>
      </header>

      <button className="btn btn-primary btn-block" onClick={() => onPractice(next.id)}>
        ▶ Continue: {next.icon} {next.name}
      </button>

      <h3 className="section-title">Skill tree</h3>
      <p className="muted small">
        Reach {UNLOCK_AT}% mastery (Bronze) in a skill to unlock the skills built on it.
      </p>
      <div className="tree">
        {rows.map((row, d) => (
          <div key={d} className="tree-row">
            <span className="tree-level">Level {d + 1}</span>
            <div className="tree-nodes">
              {row.map((s) => {
                const tier = tierFor(progress, s);
                const st = stat(progress, s.id);
                const locked = tier === 'locked';
                const needs = s.prereqs.filter((p) => mastery(progress, p) < UNLOCK_AT).map((p) => skillById(p).name);
                return (
                  <button key={s.id} className={`card skill ${locked ? 'locked' : ''}`} disabled={locked} onClick={() => onPractice(s.id)}>
                    <div className="skill-head">
                      <span className="skill-icon">{locked ? '🔒' : s.icon}</span>
                      <span className={`tier tier-${tier}`}>{TIER_LABEL[tier]}</span>
                    </div>
                    <strong>{s.name}</strong>
                    <span className="grade-tag">📚 {ALIGNMENT[s.id].grade}</span>
                    <span className="small muted">{locked ? `Unlock: ${needs.join(' + ')}` : s.blurb}</span>
                    {!locked && (
                      <>
                        <Bar value={st.mastery} color={lab.color} label={`${s.name} mastery`} />
                        <span className="small muted">
                          {Math.round(st.mastery)}% · {st.correct}/{st.attempts} right · {questionsForSkill(s.id).length} challenges
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <h3 className="section-title">Milestones by grade</h3>
      <p className="muted small">
        Mapped to the Massachusetts Curriculum Framework. {MILESTONES[labId].note}
      </p>
      <ol className="milestones">
        {MILESTONES[labId].levels.map((m) => (
          <li key={m.level} className="card milestone">
            <strong>{m.level}</strong>
            <ul className="domains">
              {m.domains.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            {m.skills.length ? (
              <div className="milestone-skills">
                {m.skills.map((id) => {
                  const sk = skillById(id);
                  const tier = tierFor(progress, sk);
                  return (
                    <button key={id} className="milestone-skill" disabled={tier === 'locked'} onClick={() => onPractice(id)}>
                      {tier === 'locked' ? '🔒' : sk.icon} {sk.name}
                      <span className={`tier tier-${tier}`}>{TIER_LABEL[tier]}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="small muted">Genius Lab skills for this course are coming next.</span>
            )}
          </li>
        ))}
      </ol>
      <p className="small muted sources">
        Sources:{' '}
        {SOURCES.map((src, i) => (
          <span key={src.url}>
            {i > 0 && ' · '}
            <a href={src.url} target="_blank" rel="noreferrer">
              {src.name}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
