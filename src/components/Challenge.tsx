import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { shuffle } from '../engine/session';
import type { ChainQuestion, MatchQuestion, MultipleChoiceQuestion, OrderQuestion, Question, SpotQuestion } from '../types';

interface Props<Q extends Question> {
  q: Q;
  /** True once the answer is in (or time ran out) — inputs lock and the answer is revealed. */
  done: boolean;
  /** `fraction` (0–1) gives partial credit on multi-step problems. */
  onSubmit: (correct: boolean, fraction?: number) => void;
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
    case 'chain':
      return <Chain key={q.id} q={q} done={done} onSubmit={onSubmit} />;
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
    <div>
      <Guide steps={['Read every choice', 'Tap the one best answer']} current={done ? 2 : 1} />
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
    </div>
  );
}

function Spot({ q, done, onSubmit }: Props<SpotQuestion>) {
  const [chosen, setChosen] = useState<number | null>(null);
  const long = q.tokens.some((t) => t.length > 24);
  return (
    <div>
      <Guide steps={['Every box below is tappable', 'Tap the one piece the question asks for']} current={done ? 2 : 1} />
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
    </div>
  );
}

const PAIR_COLORS = ['#4f8cff', '#ff7a59', '#2bc48a', '#c77dff', '#ffc145'];

/** Numbered how-to for each game style; the current step is highlighted. */
export function Guide({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="guide" aria-label="How to answer">
      {steps.map((st, i) => (
        <li key={i} className={i < current ? 'past' : i === current ? 'now' : ''}>
          <span className="guide-num">{i < current ? '✓' : i + 1}</span>
          {st}
        </li>
      ))}
    </ol>
  );
}

interface Line {
  l: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function Match({ q, done, onSubmit }: Props<MatchQuestion>) {
  const rightOrder = useMemo(() => scramble(q.pairs.length), [q]);
  /** left index → right index */
  const [links, setLinks] = useState<Record<number, number>>({});
  const [active, setActive] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ l: number; x: number; y: number } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rightRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragged = useRef(false);

  const count = Object.keys(links).length;
  const complete = count === q.pairs.length;
  const ownerOf = (r: number) => {
    const k = Object.keys(links).find((l) => links[Number(l)] === r);
    return k === undefined ? -1 : Number(k);
  };

  function connect(l: number, r: number) {
    const next: Record<number, number> = {};
    for (const [k, v] of Object.entries(links)) if (v !== r && Number(k) !== l) next[Number(k)] = v;
    next[l] = r;
    setLinks(next);
    setActive(null);
  }

  // Measure where each connection line should be drawn.
  const measure = useCallback(() => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const out: Line[] = [];
    for (const [k, r] of Object.entries(links)) {
      const a = leftRefs.current[Number(k)]?.getBoundingClientRect();
      const b = rightRefs.current[r]?.getBoundingClientRect();
      if (!a || !b) continue;
      out.push({ l: Number(k), x1: a.right - box.left, y1: a.top + a.height / 2 - box.top, x2: b.left - box.left, y2: b.top + b.height / 2 - box.top });
    }
    setLines(out);
  }, [links]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Drag from a left item and release on a right item to connect them.
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      dragged.current = true;
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    };
    const up = (e: PointerEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-right]');
      if (target && dragged.current) connect(drag.l, Number(target.dataset.right));
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  });

  const box = boxRef.current?.getBoundingClientRect();
  const dragFrom = drag ? leftRefs.current[drag.l]?.getBoundingClientRect() : null;
  const step = done ? 3 : complete ? 2 : active !== null || drag ? 1 : 0;
  const lineColor = (l: number) => (done ? (links[l] === l ? 'var(--good)' : 'var(--bad)') : PAIR_COLORS[l % PAIR_COLORS.length]);

  return (
    <div>
      <Guide
        steps={['Pick an item on the left: tap it, or press and drag', 'Tap or drop on its match on the right', 'Connect them all, then lock it in']}
        current={step}
      />
      <div className="match" ref={boxRef}>
        <svg className="match-lines" aria-hidden>
          {lines.map((ln) => (
            <g key={ln.l}>
              <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke={lineColor(ln.l)} strokeWidth={3} strokeLinecap="round" />
              <circle cx={ln.x1} cy={ln.y1} r={5} fill={lineColor(ln.l)} />
              <circle cx={ln.x2} cy={ln.y2} r={5} fill={lineColor(ln.l)} />
            </g>
          ))}
          {drag && box && dragFrom && dragged.current && (
            <line
              x1={dragFrom.right - box.left}
              y1={dragFrom.top + dragFrom.height / 2 - box.top}
              x2={drag.x - box.left}
              y2={drag.y - box.top}
              stroke={PAIR_COLORS[drag.l % PAIR_COLORS.length]}
              strokeWidth={3}
              strokeDasharray="6 6"
            />
          )}
        </svg>
        <div className="match-col">
          <span className="match-head">Items</span>
          {q.pairs.map(([left], l) => (
            <button
              key={l}
              ref={(el) => {
                leftRefs.current[l] = el;
              }}
              className={`match-item match-left ${active === l || drag?.l === l ? 'is-active' : ''} ${done ? (links[l] === l ? 'is-correct' : 'is-wrong') : ''}`}
              style={!done && links[l] !== undefined ? { borderColor: lineColor(l) } : undefined}
              disabled={done}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                dragged.current = false;
                setDrag({ l, x: e.clientX, y: e.clientY });
              }}
              onClick={() => {
                if (dragged.current) return;
                setActive(active === l ? null : l);
              }}
            >
              {left}
            </button>
          ))}
        </div>
        <div className="match-col">
          <span className="match-head">Matches</span>
          {rightOrder.map((r) => {
            const owner = ownerOf(r);
            return (
              <button
                key={r}
                data-right={r}
                ref={(el) => {
                  rightRefs.current[r] = el;
                }}
                className={`match-item match-right ${(active !== null || drag) && owner < 0 ? 'is-target' : ''} ${done && owner >= 0 ? (owner === r ? 'is-correct' : 'is-wrong') : ''}`}
                style={!done && owner >= 0 ? { borderColor: lineColor(owner) } : undefined}
                disabled={done}
                onClick={() => active !== null && connect(active, r)}
              >
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
          {complete ? 'Lock it in' : `${count} of ${q.pairs.length} connected`}
        </button>
      )}
    </div>
  );
}

const ordinal = (n: number) => `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

function Order({ q, done, onSubmit }: Props<OrderQuestion>) {
  const pool = useMemo(() => scramble(q.steps.length), [q]);
  const [seq, setSeq] = useState<number[]>([]);
  const complete = seq.length === q.steps.length;

  return (
    <div>
      <Guide
        steps={[complete ? 'All steps placed' : `Tap the step that comes ${seq.length === 0 ? 'first' : `${ordinal(seq.length + 1)}`}`, 'Changed your mind? Tap a placed step to undo', 'Lock it in']}
        current={done ? 3 : complete ? 2 : 0}
      />
      <ol className="sequence">
        {q.steps.map((_, slot) => {
          const step = seq[slot];
          const cls = done ? (step === slot ? 'is-correct' : 'is-wrong') : step === undefined ? `is-empty ${slot === seq.length ? 'is-next' : ''}` : '';
          return (
            <li key={slot}>
              <button
                className={`seq-slot ${cls}`}
                disabled={done || step === undefined}
                onClick={() => setSeq(seq.filter((_, i) => i < slot))}
                title="Tap to undo from here"
              >
                <span className="seq-num">{slot + 1}</span>
                {step === undefined ? (
                  <span className="muted">{slot === seq.length ? `Step ${slot + 1} goes here: tap it below ↓` : ' '}</span>
                ) : (
                  q.steps[step]
                )}
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

/** Multi-step word problem: each step is a quick pick, answered in order. */
function Chain({ q, done, onSubmit }: Props<ChainQuestion>) {
  const orders = useMemo(() => q.steps.map((st) => shuffle(st.options.map((_, i) => i))), [q]);
  const [picks, setPicks] = useState<number[]>([]);
  const current = picks.length;

  function pick(i: number) {
    const next = [...picks, i];
    setPicks(next);
    if (next.length === q.steps.length) {
      const right = next.filter((p, s) => p === q.steps[s].answer).length;
      onSubmit(right === q.steps.length, right / q.steps.length);
    }
  }

  return (
    <div>
    <Guide steps={['Answer each step in order', 'Every answer unlocks the next step', 'See how you did']} current={done ? 3 : current === 0 ? 0 : 1} />
    <ol className="chain">
      {q.steps.map((st, s) => {
        const chosen = picks[s];
        const answered = chosen !== undefined;
        const open = !done && s === current;
        const state = answered ? (chosen === st.answer ? 'good' : 'bad') : open ? 'open' : done ? 'bad' : 'waiting';
        return (
          <li key={s} className={`chain-step chain-${state}`}>
            <div className="chain-head">
              <span className="chain-num">{answered ? (chosen === st.answer ? '✓' : '✗') : s + 1}</span>
              <strong>{st.ask}</strong>
            </div>
            {open && (
              <div className="choices">
                {orders[s].map((i, pos) => (
                  <button key={i} className="choice" onClick={() => pick(i)}>
                    <span className="choice-key">{'ABCD'[pos]}</span>
                    <span>{st.options[i]}</span>
                  </button>
                ))}
              </div>
            )}
            {(answered || done) && (
              <p className="chain-why small">
                {answered && chosen !== st.answer && (
                  <>
                    <span className="chain-pick">You picked: {st.options[chosen]}</span>
                    <br />
                  </>
                )}
                <strong>{st.options[st.answer]}</strong> — {st.why}
              </p>
            )}
          </li>
        );
      })}
    </ol>
    </div>
  );
}
