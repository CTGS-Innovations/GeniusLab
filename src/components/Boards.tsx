import { useState } from 'react';
import { QUESTIONS, labById, skillById } from '../data';
import { addBoard, toggleSaved, type Progress } from '../engine/progress';
import { MathProvider, T } from './MathText';

interface Props {
  progress: Progress;
  onProgress: (update: (p: Progress) => Progress) => void;
  onPlay: (board: string) => void;
  onBack: () => void;
}

const EMOJIS = ['📌', '🔥', '🧠', '🎯', '💡', '⭐'];

/** Pinterest-style boards of saved cards. */
export function Boards({ progress, onProgress, onPlay, onBack }: Props) {
  const [open, setOpen] = useState<string | null>(progress.boards.find((b) => b.items.length)?.id ?? null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const board = progress.boards.find((b) => b.id === open);
  const total = progress.boards.reduce((n, b) => n + b.items.length, 0);

  return (
    <div className="screen boards-screen">
      <div className="topbar">
        <button className="btn btn-ghost" onClick={onBack}>← Home</button>
      </div>
      <h1>📌 My Boards</h1>
      <p className="muted">
        {total ? `${total} saved ${total === 1 ? 'card' : 'cards'}.` : 'Save cards while you play: tap 📌 after answering, or double-tap a card.'}
      </p>

      <div className="boards-layout">
        <div className="board-list">
          {progress.boards.map((b) => (
            <button key={b.id} className={`card board-tile ${open === b.id ? 'on' : ''}`} onClick={() => setOpen(b.id)}>
              <span className="board-emoji">{b.emoji}</span>
              <span>
                <strong>{b.name}</strong>
                <span className="small muted">{b.items.length} {b.items.length === 1 ? 'card' : 'cards'}</span>
              </span>
            </button>
          ))}
          <form
            className="card new-board"
            onSubmit={(e) => {
              e.preventDefault();
              onProgress((p) => addBoard(p, name, emoji));
              setName('');
            }}
          >
            <label htmlFor="new-board" className="why-label">
              New board
            </label>
            <div className="emoji-row">
              {EMOJIS.map((x) => (
                <button type="button" key={x} className={x === emoji ? 'on' : ''} onClick={() => setEmoji(x)} aria-label={`Use ${x}`}>
                  {x}
                </button>
              ))}
            </div>
            <div className="new-board-row">
              <input id="new-board" value={name} maxLength={40} placeholder="e.g. Quiz Tuesday" onChange={(e) => setName(e.target.value)} />
              <button className="btn btn-primary" disabled={!name.trim()}>
                Add
              </button>
            </div>
          </form>
        </div>

        <section className="board-view">
          {board ? (
            <>
              <div className="board-head">
                <h2>
                  {board.emoji} {board.name}
                </h2>
                <button className="btn btn-primary" disabled={!board.items.length} onClick={() => onPlay(board.id)}>
                  ▶ Practice {board.items.length || ''}
                </button>
              </div>
              {board.items.length === 0 ? (
                <p className="muted">Nothing here yet. Save a card to this board after you answer it.</p>
              ) : (
                <div className="pins">
                  {board.items.map((id) => {
                    const q = QUESTIONS.find((x) => x.id === id);
                    if (!q) return null;
                    const skill = skillById(q.skill);
                    const lab = labById(skill.lab);
                    return (
                      <MathProvider key={id} on={skill.lab !== 'english'}>
                        <article className="pin" style={{ ['--accent' as string]: lab.color }}>
                          <span className="small pin-skill">
                            {skill.icon} {skill.name}
                          </span>
                          <strong>
                            <T>{q.prompt}</T>
                          </strong>
                          {q.context && (
                            <span className="pin-context">
                              <T>{q.context}</T>
                            </span>
                          )}
                          {q.reason && (
                            <span className="small muted">
                              💡 <T>{q.reason}</T>
                            </span>
                          )}
                          <button className="btn btn-ghost pin-remove" onClick={() => onProgress((p) => toggleSaved(p, board.id, id))}>
                            Remove
                          </button>
                        </article>
                      </MathProvider>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="muted">Pick a board.</p>
          )}
        </section>
      </div>
    </div>
  );
}
