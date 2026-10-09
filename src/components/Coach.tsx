import { ALIGNMENT } from '../data/curriculum';
import { SKILL_WHY } from '../data/why';
import type { CoachCard } from '../engine/coach';
import type { Progress } from '../engine/progress';
import { skillById } from '../data';
import { Icon } from './Icon';

interface Props {
  cards: CoachCard[];
  skill: string;
  lightning: boolean;
  tipsOff: boolean;
  progress: Progress;
  /** Terms unlocked this round, newest last. */
  roundTerms: string[];
  onDismiss: (id: string) => void;
  onToggleTips: () => void;
}

/** Right-hand coach: only shows what is new or useful right now. Every card can be dismissed. */
export function Coach({ cards, skill, lightning, tipsOff, progress, roundTerms, onDismiss, onToggleTips }: Props) {
  const newest = roundTerms[roundTerms.length - 1];

  return (
    <aside className="coach" aria-label="Coach">
      <div className="coach-head">
        <span className="why-label">Coach</span>
        <button className={`switch ${tipsOff ? '' : 'on'}`} onClick={onToggleTips} aria-pressed={!tipsOff}>
          Tips {tipsOff ? 'off' : 'on'}
        </button>
      </div>

      {cards.map((c) =>
        c.type === 'brief' ? (
          <Brief key={c.id} skill={skill} onDone={() => onDismiss(c.id)} />
        ) : (
          <div key={c.id} className={`coach-card ${c.type}`}>
            <div className="coach-card-head">
              <strong>{c.title}</strong>
              <button className="btn btn-ghost icon-btn card-x" onClick={() => onDismiss(c.id)} aria-label="Dismiss">
                <Icon name="close" />
              </button>
            </div>
            <p>{c.text}</p>
          </div>
        ),
      )}

      {lightning ? (
        <div className="collection">
          <span className="why-label">Terms unlocked this round</span>
          {roundTerms.length ? (
            <div className="terms">
              {roundTerms.map((t) => (
                <span key={t} className={`term ${t === newest ? 'new' : ''}`}>{t}</span>
              ))}
            </div>
          ) : (
            <p className="muted small">Right answers unlock teacher terms.</p>
          )}
        </div>
      ) : (
        <Collection skill={skill} progress={progress} newest={newest} />
      )}
    </aside>
  );
}

function Brief({ skill, onDone }: { skill: string; onDone: () => void }) {
  const why = SKILL_WHY[skill];
  const align = ALIGNMENT[skill];
  return (
    <div className="coach-card brief">
      <span className="why-label">Why {skillById(skill).name}</span>
      <h3>{why.headline}</h3>
      <ul>
        {why.points.map((pt) => (
          <li key={pt}>{pt}</li>
        ))}
      </ul>
      <div className="std-links">
        {align.standards.map((st, i) => (
          <a key={i} href={st.url} target="_blank" rel="noreferrer" title={st.text}>
            MA {st.code} <Icon name="external" />
          </a>
        ))}
      </div>
      <button className="btn btn-ghost got-it" onClick={onDone}>
        Got it
      </button>
    </div>
  );
}

/** The skill's teacher terms as a collection: unlocked ones shown, the rest still hidden. */
function Collection({ skill, progress, newest }: { skill: string; progress: Progress; newest?: string }) {
  const all = ALIGNMENT[skill].terms;
  const have = progress.terms[skill] ?? 0;
  return (
    <div className="collection">
      <div className="collection-head">
        <span className="why-label">Teacher terms</span>
        <span className="small muted">
          {have}/{all.length} unlocked
        </span>
      </div>
      <div className="terms">
        {all.map((t, i) =>
          i < have ? (
            <span key={t} className={`term ${t === newest ? 'new' : ''}`}>{t}</span>
          ) : (
            <span key={t} className="term locked">
              <Icon name="lock" label="Locked term" />
            </span>
          ),
        )}
      </div>
      {have < all.length && <p className="muted small">Each right answer unlocks the next one.</p>}
    </div>
  );
}
