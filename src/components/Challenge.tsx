import { useMemo, useState } from 'react';
import { shuffle } from '../engine/session';
import type { MatchQuestion, MultipleChoiceQuestion, OrderQuestion, Question, SpotQuestion } from '../types';

interface Props<Q extends Question> {
  q: Q;
  /** True once the answer is in (or time ran out) — inputs lock and the answer is revealed. */
  done: boolean;
  onSubmit: (correct: boolean) => void;
}

/** Shuffle so the result never matches the original order (when that is possible). */
function scramble(n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return idx;
  let out = shuffle(idx);
  while (out.every((v, i) => v === i)) out = shuffle(idx);
  return out;
}

export function Challenge({ q, done, onSubmit }: Props<Question>) {
  switch (q.kind) {
    case 'mc':
      return <MultipleChoice key={q.id} q={q} done={done} onSubmit={onSubmit} />;
    case 'spot':
      return <Spot key={q.id} q={q} done={done} onSubmit={onSubmit} />;
    case 'match':
      return <Match key={q.id} q={q} done={done} onSubmit={onSubmit} />;
    case 'order':
      return <Order key={q.id} q={q} done={done} onSubmit={onSubmit} />;
  }
}

function choiceClass(i: number, answer: number, chosen: number | null, done: boolean) {
  if (!done) return '';
  if (i === answer) return 'is-correct';
  if (i === chosen) return 'is-wrong';
  return 'is-dim';
}

function MultipleChoice({ q, done, onSubmit }: Props<MultipleChoiceQuestion>) {
  const order = useMemo(() => shuffle(q.options.map((_, i) => i)), [q]);
  const [chosen, setChosen] = useState<number | null>(null);
  return (
    <div className="choices">
      {order.map((i, pos) => (
        <button
          key={i}
          className={`choice ${choiceClass(i, q.answer, chosen, done)}`}
          disabled={done}
          onClick={() => {
            setChosen(i);
            onSubmit(i === q.answer);
          }}
        >
          <span className="choice-key">{'ABCD'[pos]}</span>
          <span>{q.options[i]}</span>
        </button>
      ))}
    </div>
  );
}

function Spot({ q, done, onSubmit }: Props<SpotQuestion>) {
  const [chosen, setChosen] = useState<number | null>(null);
  const long = q.tokens.some((t) => t.length > 24);
  return (
    <div className={`tokens ${long ? 'tokens-stacked' : ''}`}>
      {q.tokens.map((t, i) => (
        <button
          key={i}
          className={`token ${choiceClass(i, q.answer, chosen, done)}`}
          disabled={done}
          onClick={() => {
            setChosen(i);
            onSubmit(i === q.answer);
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

const PAIR_COLORS = ['#4f8cff', '#ff7a59', '#2bc48a', '#c77dff', '#ffc145'];

function Match({ q, done, onSubmit }: Props<MatchQuestion>) {
  const rightOrder = useMemo(() => scramble(q.pairs.length), [q]);
  /** left index → right index */
  const [links, setLinks] = useState<Record<number, number>>({});
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const [activeRight, setActiveRight] = useState<number | null>(null);

  const leftFor = (r: number) => Number(Object.keys(links).find((l) => links[Number(l)] === r) ?? -1);
  const colorSlot = (l: number) => Object.keys(links).map(Number).sort((a, b) => a - b).indexOf(l);

  function connect(l: number, r: number) {
    const next = { ...links };
    for (const k of Object.keys(next)) if (next[Number(k)] === r) delete next[Number(k)];
    next[l] = r;
    setLinks(next);
    setActiveLeft(null);
    setActiveRight(null);
  }

  function tapLeft(l: number) {
    if (done) return;
    if (links[l] !== undefined && activeRight === null) {
      const next = { ...links };
      delete next[l];
      setLinks(next);
      return;
    }
    if (activeRight !== null) connect(l, activeRight);
    else setActiveLeft(activeLeft === l ? null : l);
  }

  function tapRight(r: number) {
    if (done) return;
    const owner = leftFor(r);
    if (owner >= 0 && activeLeft === null) {
      const next = { ...links };
      delete next[owner];
      setLinks(next);
      return;
    }
    if (activeLeft !== null) connect(activeLeft, r);
    else setActiveRight(activeRight === r ? null : r);
  }

  const complete = Object.keys(links).length === q.pairs.length;

  const style = (l: number) =>
    !done && l >= 0 && links[l] !== undefined ? { borderColor: PAIR_COLORS[colorSlot(l) % PAIR_COLORS.length] } : undefined;
  const badge = (l: number) =>
    l >= 0 && links[l] !== undefined ? (
      <span className="pair-dot" style={{ background: PAIR_COLORS[colorSlot(l) % PAIR_COLORS.length] }} />
    ) : null;
  const result = (l: number) => (done ? (links[l] === l ? 'is-correct' : 'is-wrong') : '');

  return (
    <div>
      <div className="match">
        <div className="match-col">
          {q.pairs.map(([left], l) => (
            <button
              key={l}
              className={`match-item ${activeLeft === l ? 'is-active' : ''} ${result(l)}`}
              style={style(l)}
              disabled={done}
              onClick={() => tapLeft(l)}
            >
              {badge(l)}
              {left}
            </button>
          ))}
        </div>
        <div className="match-col">
          {rightOrder.map((r) => {
            const owner = leftFor(r);
            return (
              <button
                key={r}
                className={`match-item ${activeRight === r ? 'is-active' : ''} ${owner >= 0 ? result(owner) : ''}`}
                style={style(owner)}
                disabled={done}
                onClick={() => tapRight(r)}
              >
                {badge(owner)}
                {q.pairs[r][1]}
              </button>
            );
          })}
        </div>
      </div>
      {done ? (
        <ul className="reveal">
          {q.pairs.map(([a, b]) => (
            <li key={a}>
              <strong>{a}</strong> → {b}
            </li>
          ))}
        </ul>
      ) : (
        <button className="btn btn-primary btn-block" disabled={!complete} onClick={() => onSubmit(q.pairs.every((_, l) => links[l] === l))}>
          {complete ? 'Lock it in' : `Connect all ${q.pairs.length} pairs`}
        </button>
      )}
    </div>
  );
}

function Order({ q, done, onSubmit }: Props<OrderQuestion>) {
  const pool = useMemo(() => scramble(q.steps.length), [q]);
  const [seq, setSeq] = useState<number[]>([]);
  const complete = seq.length === q.steps.length;

  return (
    <div>
      <ol className="sequence">
        {q.steps.map((_, slot) => {
          const step = seq[slot];
          const cls = done ? (step === slot ? 'is-correct' : 'is-wrong') : step === undefined ? 'is-empty' : '';
          return (
            <li key={slot}>
              <button
                className={`seq-slot ${cls}`}
                disabled={done || step === undefined}
                onClick={() => setSeq(seq.filter((_, i) => i < slot))}
                title="Tap to undo from here"
              >
                <span className="seq-num">{slot + 1}</span>
                {step === undefined ? <span className="muted">Tap a step below</span> : q.steps[step]}
              </button>
            </li>
          );
        })}
      </ol>
      {!done && (
        <div className="seq-pool">
          {pool
            .filter((i) => !seq.includes(i))
            .map((i) => (
              <button key={i} className="token" onClick={() => setSeq([...seq, i])}>
                {q.steps[i]}
              </button>
            ))}
        </div>
      )}
      {done ? (
        !(complete && seq.every((s, i) => s === i)) && (
          <ol className="reveal">
            {q.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        )
      ) : (
        <button className="btn btn-primary btn-block" disabled={!complete} onClick={() => onSubmit(seq.every((s, i) => s === i))}>
          {complete ? 'Lock it in' : 'Place every step'}
        </button>
      )}
    </div>
  );
}
