import { describe, expect, it } from 'vitest';
import { mathSegments, type Seg } from '../src/engine/mathText';

const kinds = (segs: Seg[]) => segs.map((s) => s.t);
const frac = (s: string) => mathSegments(s).find((x) => x.t === 'frac') as Extract<Seg, { t: 'frac' }> | undefined;
const text = (segs: Seg[]): string => segs.map((s) => (s.t === 'frac' ? `[${text(s.num)}|${text(s.den)}]` : s.v)).join('');

describe('math text', () => {
  it('stacks a slash into a fraction and drops the grouping parentheses', () => {
    const f = frac('(x + 6)/(x + 3)')!;
    expect(text(f.num)).toBe('x + 6');
    expect(text(f.den)).toBe('x + 3');
  });

  it('handles simple, spaced, and exponent fractions', () => {
    expect(text(mathSegments('1/8'))).toBe('[1|8]');
    expect(text(mathSegments('(7 − 3) / (3 − 1)'))).toBe('[7 − 3|3 − 1]');
    expect(text(mathSegments('x⁻² = 1/x²'))).toBe('x−2 = [1|x2]');
    expect(text(mathSegments('½'))).toBe('[1|2]');
    expect(text(mathSegments('= 1/8.'))).toBe('= [1|8].');
    expect(text(mathSegments('12.5/2.5'))).toBe('[12.5|2.5]');
  });

  it('turns unicode exponents into real superscripts', () => {
    expect(mathSegments('x²').map((s) => s.t)).toEqual(['var', 'sup']);
  });

  it('spaces binary operators but keeps signs tight', () => {
    const segs = mathSegments('−3 + 4');
    const ops = segs.filter((s) => s.t === 'op') as Extract<Seg, { t: 'op' }>[];
    expect(ops.map((o) => [o.v, !!o.unary])).toEqual([['−', true], ['+', false]]);
  });

  it('italicizes variables but not the article “a”', () => {
    expect(kinds(mathSegments('2x + 5'))).toContain('var');
    const article = mathSegments('A line passes through a point.');
    expect(article.some((s) => s.t === 'var')).toBe(false);
    const prob = mathSegments('P(A or B)');
    expect(prob.filter((s) => s.t === 'var').map((s) => s.v)).toEqual(['P', 'A', 'B']);
  });

  it('leaves plain words with slashes alone', () => {
    expect(frac('and/or')).toBeUndefined();
  });
});
