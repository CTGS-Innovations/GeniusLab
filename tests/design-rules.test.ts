/**
 * Static design rules (DESIGN.md). Layout bleed is checked in a real browser by `npm run audit:ui`;
 * this file catches the rest at `npm test` speed.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
const components = readdirSync(join(root, 'src/components'))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => `src/components/${f}`)
  .concat('src/App.tsx');

interface Decl {
  selector: string;
  prop: string;
  value: string;
  line: number;
  exempt: boolean;
}

/** Every declaration outside the token blocks (:root and :root[data-theme=…] custom properties). */
function declarations(): Decl[] {
  const out: Decl[] = [];
  const stack: string[] = [];
  let buf = '';
  let line = 1;
  let startLine = 1;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '\n') line++;
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const comment = css.slice(i, end + 2);
      line += (comment.match(/\n/g) ?? []).length;
      if (comment.includes('token-exempt') && out.length) out[out.length - 1].exempt = true;
      i = end + 1;
      continue;
    }
    if (ch === '{') {
      stack.push(buf.trim());
      buf = '';
      startLine = line;
    } else if (ch === '}') {
      flush();
      stack.pop();
      buf = '';
    } else if (ch === ';') {
      flush();
      buf = '';
    } else buf += ch;
  }
  return out;

  function flush() {
    const m = /^\s*([-\w]+)\s*:\s*([\s\S]+)$/.exec(buf);
    if (!m) return;
    const selector = stack[stack.length - 1] ?? '';
    out.push({ selector, prop: m[1], value: m[2].trim(), line: Math.max(startLine, line), exempt: false });
  }
}

const decls = declarations();
const rules = decls.filter((d) => !d.prop.startsWith('--') && !d.exempt);
const fmt = (d: Decl) => `line ~${d.line}: ${d.selector} { ${d.prop}: ${d.value} }`;
const strip = (v: string) => v.replace(/var\([^()]*(\([^()]*\))?[^()]*\)/g, '').replace(/env\([^)]*\)/g, '');

describe('CSS uses design tokens only', () => {
  it('no raw colors outside the token blocks', () => {
    const bad = rules.filter((d) => /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(d.value));
    expect(bad.map(fmt)).toEqual([]);
  });

  it('spacing comes from the 4px scale (--sp-*)', () => {
    const bad = rules.filter((d) => /^(padding|margin|gap|row-gap|column-gap)/.test(d.prop) && /(?<![\w.-])([3-9]|\d{2,})(\.\d+)?px/.test(strip(d.value)));
    expect(bad.map(fmt)).toEqual([]);
  });

  it('font sizes come from the type scale (--fs-*) or are relative (em)', () => {
    const bad = rules.filter((d) => d.prop === 'font-size' && !/var\(--fs-|^[\d.]+em$|^inherit$|^max\(var\(--fs-/.test(d.value));
    expect(bad.map(fmt)).toEqual([]);
  });

  it('radii come from --radius tokens', () => {
    const bad = rules.filter((d) => d.prop === 'border-radius' && !/^(var\(--radius[\w-]*\)\s*)+(0\s*)*$|^50%$|^0$|^inherit$/.test(d.value.replace(/var\(--radius[\w-]*\) var/g, 'var')) && !/^var\(--radius[\w-]*\)( var\(--radius[\w-]*\)| 0)*$/.test(d.value));
    expect(bad.map(fmt)).toEqual([]);
  });

  it('z-index comes from the layer scale (--z-*)', () => {
    const bad = rules.filter((d) => d.prop === 'z-index' && !/^var\(--z-[\w-]+\)$/.test(d.value));
    expect(bad.map(fmt)).toEqual([]);
  });

  it('shadows come from --shadow tokens or token colors', () => {
    const bad = rules.filter((d) => d.prop === 'box-shadow' && /\d+px/.test(d.value) && !/var\(--|color-mix/.test(d.value));
    expect(bad.map(fmt)).toEqual([]);
  });
});

describe('anti-slop: banned patterns', () => {
  it('no gradient text', () => {
    expect(rules.filter((d) => /background-clip$/.test(d.prop) && d.value === 'text').map(fmt)).toEqual([]);
  });

  it('no colored accent bars on one side of a box', () => {
    const bad = rules.filter((d) => /^border-(left|right)$/.test(d.prop) && /([3-9]|\d{2,})px/.test(d.value));
    expect(bad.map(fmt)).toEqual([]);
  });

  it('no card gradients: surfaces are flat', () => {
    const bad = rules.filter((d) => d.selector.split(',').some((s) => /^\s*\.card\s*$/.test(s)) && /gradient/.test(d.value));
    expect(bad.map(fmt)).toEqual([]);
  });

  it('!important only to switch motion off', () => {
    const bad = rules.filter((d) => d.value.includes('!important') && !/^(animation|transition)/.test(d.prop));
    expect(bad.map(fmt)).toEqual([]);
  });

  it('no sideways entrance animations (they widen the page on phones)', () => {
    const frames = [...css.matchAll(/@keyframes ([\w-]+)\s*\{([\s\S]*?)\n\}/g)];
    const sideways = frames.filter(([, name, body]) => /from\s*\{[^}]*translateX\((?!0)/.test(body) && !/shake|knob/.test(name));
    expect(sideways.map(([, name]) => name)).toEqual([]);
  });
});

describe('components', () => {
  const emoji = /\p{Extended_Pictographic}/u;
  it('no emoji in UI chrome: icons come from <Icon>, emoji only from content data', () => {
    const hits: string[] = [];
    for (const f of components) {
      readFileSync(join(root, f), 'utf8')
        .split('\n')
        .forEach((l, i) => {
          if (emoji.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*')) hits.push(`${f}:${i + 1}: ${l.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it('no hard-coded colors in components', () => {
    const hits: string[] = [];
    for (const f of components) {
      readFileSync(join(root, f), 'utf8')
        .split('\n')
        .forEach((l, i) => {
          if (/['"`]#[0-9a-f]{3,8}['"`]|rgba?\(/i.test(l)) hits.push(`${f}:${i + 1}: ${l.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it('icon-only buttons carry an aria-label', () => {
    const hits: string[] = [];
    for (const f of components) {
      const src = readFileSync(join(root, f), 'utf8');
      for (const m of src.matchAll(/<button([^>]*)>\s*<Icon [^>]*\/>\s*<\/button>/g)) {
        if (!/aria-label=/.test(m[1])) hits.push(`${f}: ${m[0].slice(0, 80)}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
