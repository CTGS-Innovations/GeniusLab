/**
 * Turn plain-text math ("(x + 6)/(x + 3)", "x⁻² = 1/x²") into readable pieces:
 * stacked fractions, spaced operators, italic variables, real superscripts.
 */
export type Seg =
  | { t: 'text'; v: string }
  | { t: 'op'; v: string; unary?: boolean }
  | { t: 'var'; v: string }
  | { t: 'sup'; v: string }
  | { t: 'sub'; v: string }
  | { t: 'frac'; num: Seg[]; den: Seg[] };

const SUP: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '−', 'ⁿ': 'n', 'ˣ': 'x' };
const SUB: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
const VULGAR: Record<string, string> = { '½': '1/2', '⅓': '1/3', '¼': '1/4', '⅙': '1/6', '⅛': '1/8', '¾': '3/4', '⅔': '2/3' };

const OPS = '+−=×÷<>≤≥±·';
const SUP_CHARS = Object.keys(SUP).join('');
const SUB_CHARS = Object.keys(SUB).join('');

/** One side of a fraction: a parenthesized group, or a run of digits, letters, roots, and superscripts. */
const OPERAND = `(?:\\([^()]*\\)|(?:\\d+(?:\\.\\d+)?|[A-Za-zΔ√${SUP_CHARS}${SUB_CHARS}])+)`;
const FRACTION = new RegExp(`(${OPERAND})\\s*/\\s*(${OPERAND})`, 'g');

const unwrap = (s: string) => (s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1) : s);
const isOp = (c: string | undefined) => !!c && OPS.includes(c);
const isDigit = (c: string | undefined) => !!c && c >= '0' && c <= '9';
const isLetter = (c: string | undefined) => !!c && /[A-Za-z]/.test(c);

/** Letters that are almost always variables when they stand alone. */
const ALWAYS_VAR = new Set(['x', 'y', 'z', 'n', 'k']);

function isMathLetter(s: string, i: number): boolean {
  const c = s[i];
  if (ALWAYS_VAR.has(c)) return true;
  const prev = s[i - 1];
  const next = s[i + 1];
  // Touching a digit, operator, bracket, or exponent: 2x, f(x), x², (A or B)
  if (isDigit(prev) || isOp(prev) || prev === '(' || prev === '|') return true;
  if (isOp(next) || next === '(' || next === ')' || next === '|' || (next && SUP_CHARS.includes(next)) || (next && SUB_CHARS.includes(next))) return true;
  if (prev === ')' ) return true;
  // One space away from an operator: "w = width", "P(A) + P(B)"
  let j = i - 1;
  while (s[j] === ' ') j--;
  if (j < i - 1 && isOp(s[j])) return true;
  j = i + 1;
  while (s[j] === ' ') j++;
  if (j > i + 1 && isOp(s[j])) return true;
  return false;
}

function tokenize(s: string): Seg[] {
  const out: Seg[] = [];
  let text = '';
  const flush = () => {
    if (text) out.push({ t: 'text', v: text });
    text = '';
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (SUP[c]) {
      flush();
      let v = '';
      while (i < s.length && SUP[s[i]]) v += SUP[s[i++]];
      i--;
      out.push({ t: 'sup', v });
    } else if (SUB[c]) {
      flush();
      let v = '';
      while (i < s.length && SUB[s[i]]) v += SUB[s[i++]];
      i--;
      out.push({ t: 'sub', v });
    } else if (isOp(c)) {
      flush();
      const prev = s[i - 1];
      const next = s[i + 1];
      // A sign attached to what follows (−3, +5) rather than a binary operator.
      const unary = (c === '−' || c === '+' || c === '±') && (prev === undefined || prev === ' ' || prev === '(') && next !== undefined && next !== ' ';
      out.push({ t: 'op', v: c, unary });
    } else if (isLetter(c) && !isLetter(s[i - 1]) && !isLetter(s[i + 1]) && s[i + 1] !== '’' && s[i + 1] !== "'" && isMathLetter(s, i)) {
      flush();
      out.push({ t: 'var', v: c });
    } else {
      text += c;
    }
  }
  flush();
  return out;
}

export function mathSegments(input: string): Seg[] {
  const s = input.replace(/[½⅓¼⅙⅛¾⅔]/g, (m) => VULGAR[m]);
  const out: Seg[] = [];
  let last = 0;
  for (const m of s.matchAll(FRACTION)) {
    const [whole, num, den] = m;
    const at = m.index ?? 0;
    // Skip URL-like or word/word text with no math in it ("and/or").
    if (/^[A-Za-z]{2,}$/.test(num) && /^[A-Za-z]{2,}$/.test(den) && !/(rise|run|opp|adj|hyp)/.test(num + den)) continue;
    out.push(...tokenize(s.slice(last, at)));
    out.push({ t: 'frac', num: tokenize(unwrap(num)), den: tokenize(unwrap(den)) });
    last = at + whole.length;
  }
  out.push(...tokenize(s.slice(last)));
  return out;
}

/** True if a string has anything worth formatting as math. */
export const looksMathy = (s: string) => /[0-9+−=×÷<>≤≥±/√⁰¹²³⁴⁵⁶⁷⁸⁹⁻₀-₉½⅓¼⅙⅛]/.test(s);
