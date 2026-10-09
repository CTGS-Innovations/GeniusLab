// UI audit: drives every screen in every theme at phone, tablet, and desktop widths,
// and fails on layout bleed. Rules live in DESIGN.md.
//
//   npm run audit:ui            all themes × all viewports
//   npm run audit:ui -- --quick lab theme only
//   npm run audit:ui -- --theme=studio  one theme
//   npm run audit:ui -- --full  also plays every skill at phone width (content sweep)
//
// Needs a Chromium for Playwright: `npx playwright install chromium` (once).
import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const args = new Set(process.argv.slice(2));
const QUICK = args.has('--quick');
const FULL = args.has('--full');
const SHOTS = args.has('--shots');
const OUT = 'audit';

const VIEWPORTS = [
  { name: 'phone', device: devices['iPhone 13'] },
  { name: 'tablet', device: { viewport: { width: 834, height: 1112 }, hasTouch: true, isMobile: false } },
  { name: 'desktop', device: { viewport: { width: 1440, height: 900 } } },
];
const ONLY = process.argv.find((a) => a.startsWith('--theme='))?.slice(8);
const THEMES = ONLY ? [ONLY] : QUICK ? ['lab'] : ['lab', 'street', 'y2k', 'studio', 'arcade'];

/* ---------------- in-page checks (serialized into the browser) ---------------- */

function auditPage({ phone }) {
  const issues = [];
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;

  const name = (el) => {
    const parts = [];
    for (let e = el, i = 0; e && e !== document.body && i < 4; e = e.parentElement, i++) {
      const cls = [...e.classList].filter((c) => !/^(enter|pop|on|won|hot|flash)$/.test(c)).slice(0, 2);
      parts.unshift(e.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : ''));
    }
    return parts.join(' > ');
  };
  const text = (el) => (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
  const add = (rule, el, detail) => issues.push({ rule, where: name(el), text: text(el), detail });

  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'contents' && Number(cs.opacity) > 0.05;
  };
  const decorative = (el) => el.closest('[aria-hidden="true"], [data-audit-ignore], svg');
  // Floating decorations (bursts, fly-ups) may leave their box on purpose: take them out while measuring.
  const floaters = [...document.querySelectorAll('[aria-hidden="true"]')].filter((el) => ['absolute', 'fixed'].includes(getComputedStyle(el).position));
  const saved = floaters.map((el) => el.style.display);
  floaters.forEach((el) => (el.style.display = 'none'));
  const els = [...document.body.querySelectorAll('*')].filter((el) => !decorative(el) && shown(el));

  if (document.documentElement.scrollWidth > vw + 1) {
    // Bisect: which element, when hidden, removes the extra width?
    const culprits = [];
    const sw = () => document.documentElement.scrollWidth;
    for (const e of document.body.querySelectorAll('*')) {
      const prev = e.style.display;
      e.style.display = 'none';
      const fixed = sw() <= vw + 1;
      e.style.display = prev;
      if (fixed) culprits.push(e);
    }
    const leaf = culprits.filter((c) => !culprits.some((d) => d !== c && c.contains(d)));
    if (leaf.length) add('page-scroll-x', leaf[0], `page is ${sw()}px wide in a ${vw}px viewport (hiding this fixes it)`);
    else {
    const wide = [...document.body.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > vw + 1 && !e.matches('.dock, .dock *, .sheet-backdrop'));
    add('page-scroll-x', wide.pop() ?? document.body, `page is ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport (${wide.slice(0, 3).map(name).join(' ; ')})`);
    }
  }

  const scroller = (el) => {
    for (let e = el.parentElement; e; e = e.parentElement) {
      const o = getComputedStyle(e).overflowX;
      if (o === 'auto' || o === 'scroll') return e;
    }
    return null;
  };

  for (const el of els) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();

    // 1. Off the side of the screen.
    if (!scroller(el) && (r.right > vw + 1 || r.left < -1)) add('off-screen', el, `x ${Math.round(r.left)}→${Math.round(r.right)} of ${vw}`);

    // 2. Content wider than its box: spills out (visible) or gets cut (hidden).
    if (cs.display !== 'inline' && el.clientWidth > 0) {
      const over = el.scrollWidth - el.clientWidth;
      if (over > 1 && !['auto', 'scroll'].includes(cs.overflowX)) {
        if (cs.overflowX === 'visible') {
          const box = el.getBoundingClientRect();
          const culprit = [...el.querySelectorAll('*')].filter((d) => !decorative(d) && shown(d)).sort((x, y) => y.getBoundingClientRect().right - x.getBoundingClientRect().right)[0];
          const why = culprit && culprit.getBoundingClientRect().right > box.right + 1 ? ` (widest: ${name(culprit)})` : '';
          add('spill-x', el, `content ${over}px wider than box${why}`);
        }
        else if (cs.textOverflow === 'ellipsis') {
          if (!el.title) add('truncated', el, 'ellipsis without a title');
        } else add('clipped-x', el, `${over}px cut off`);
      }
      const overY = el.scrollHeight - el.clientHeight;
      if (overY > 2 && ['hidden', 'clip'].includes(cs.overflowY) && cs.webkitLineClamp === 'none' && el.innerText.trim()) {
        add('clipped-y', el, `${overY}px of text cut off`);
      }
    }

    // 2b. Text crowding a rounded corner: no rendered glyph box may poke outside the curve.
    const framed = cs.borderTopWidth !== '0px' || (rgba(cs.backgroundColor)?.[3] ?? 0) > 0;
    const cap = (v) => Math.min(parseFloat(v) || 0, r.height / 2, r.width / 2);
    const radii = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomLeftRadius, cs.borderBottomRightRadius].map(cap);
    const rad = Math.max(...radii);
    if (framed && rad > 8) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let worst = 0;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim() || decorative(n.parentElement)) continue;
        range.selectNodeContents(n);
        for (const t of range.getClientRects()) {
          if (t.bottom <= r.top || t.top >= r.bottom) continue; // scrolled out of a scroller's view
          // Glyph boxes include line-height leading; shrink to the ink-ish core.
          const lead = Math.max(0, (t.height - parseFloat(getComputedStyle(n.parentElement).fontSize)) / 2);
          const pts = [[t.left, t.top + lead], [t.right, t.top + lead], [t.left, t.bottom - lead], [t.right, t.bottom - lead]];
          const [a, b, c, d] = radii;
          const centers = [[r.left + a, r.top + a], [r.right - b, r.top + b], [r.left + c, r.bottom - c], [r.right - d, r.bottom - d]];
          pts.forEach(([x, y], i) => {
            if (radii[i] <= 8) return;
            const [cx, cy] = centers[i];
            const out = (i % 2 ? x > cx : x < cx) && (i < 2 ? y < cy : y > cy);
            if (out) worst = Math.max(worst, Math.hypot(x - cx, y - cy) - radii[i]);
          });
        }
      }
      if (worst > 1) add('corner-crowd', el, `text pokes ${Math.round(worst)}px past a ${Math.round(rad)}px corner`);
    }

    // 3. Siblings that overlap each other.
    // Inline runs wrap and interleave by design; data-overlay marks deliberate layers (tap zones).
    const kids = [...el.children].filter((c) => {
      if (decorative(c) || !shown(c) || c.hasAttribute('data-overlay')) return false;
      const ccs = getComputedStyle(c);
      if (ccs.position === 'fixed') return false;
      return !ccs.display.startsWith('inline') || c.matches('button, a, input, select');
    });
    for (let i = 0; i < kids.length; i++) {
      const a = kids[i].getBoundingClientRect();
      for (let j = i + 1; j < kids.length; j++) {
        const b = kids[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 2 && oy > 2) add('overlap', kids[i], `overlaps ${name(kids[j])} by ${Math.round(ox)}×${Math.round(oy)}`);
      }
    }

    // 4. Tap targets: 44px on phones (Apple HIG), 24px elsewhere (WCAG 2.2 AA).
    const interactive = el.matches('button, a[href], [role="button"], [role="switch"], input:not([type="hidden"]), select, summary');
    if (interactive && !(el.tagName === 'A' && cs.display === 'inline')) {
      const min = phone ? 44 : 24;
      if (r.width < min - 0.5 || r.height < min - 0.5) add('tap-target', el, `${Math.round(r.width)}×${Math.round(r.height)} < ${min}`);
    }

    // 5. Readable text: size and contrast.
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (ownText) {
      const size = parseFloat(cs.fontSize);
      if (size < 12) add('tiny-text', el, `${size}px`);
      const ratio = contrast(el, cs);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      const need = large ? 3 : 4.5;
      const disabled = el.closest(':disabled, [aria-disabled="true"]');
      if (ratio && ratio < need && !disabled) add('contrast', el, `${ratio.toFixed(2)} < ${need}`);
    }
  }

  // 6. Card inside card.
  for (const el of document.querySelectorAll('.card .card')) if (shown(el)) add('card-in-card', el, 'nested card surface');

  // 7. Fixed bars covering content at the end of the page.
  const fixed = els.filter((el) => ['fixed', 'sticky'].includes(getComputedStyle(el).position) && !el.closest('.sheet-backdrop'));
  if (fixed.length && !document.querySelector('.sheet-backdrop')) {
    window.scrollTo(0, document.documentElement.scrollHeight);
    for (const bar of fixed) {
      const br = bar.getBoundingClientRect();
      if (br.top <= 0 && br.bottom >= vh) continue;
      for (const el of els) {
        if (bar.contains(el) || el.contains(bar)) continue;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const r = el.getBoundingClientRect();
        const oy = Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top);
        const ox = Math.min(r.right, br.right) - Math.max(r.left, br.left);
        if (oy > 2 && ox > 2) add('covered', el, `hidden under ${name(bar)} at end of scroll`);
      }
    }
    window.scrollTo(0, 0);
  }
  floaters.forEach((el, i) => (el.style.display = saved[i]));
  return issues;

  function rgba(s) {
    // color-mix() computes to color(srgb r g b / a) with 0–1 channels.
    const c = s.match(/color\(srgb ([^)]+)\)/);
    if (c) {
      const [r, g, b, a = 1] = c[1].split(/[ /]+/).filter(Boolean).map(Number);
      return [r * 255, g * 255, b * 255, a];
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [r, g, b, a];
  }
  function lum([r, g, b]) {
    const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function over(top, under) {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1);
  }
  function pageBg() {
    // The page glow is a gradient over --bg; judge text against --bg itself.
    const probe = document.createElement('i');
    probe.style.color = 'var(--bg)';
    document.body.append(probe);
    const c = rgba(getComputedStyle(probe).color);
    probe.remove();
    return c ?? [255, 255, 255, 1];
  }
  function contrast(el, cs) {
    const layers = [];
    for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== 'none') return null; // gradient or image: can't judge
      const c = rgba(s.backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    let bg = pageBg();
    for (const l of layers.reverse()) bg = over(l, bg);
    const color = rgba(cs.color);
    if (!color) return null;
    const fg = over(color, bg);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  }
}

/* ---------------- driving the app ---------------- */

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      try {
        a.finish();
      } catch {
        // infinite animations can't finish
      }
    }
  });
  await page.waitForTimeout(60);
}

async function answer(page) {
  if (await page.locator('.chain').count()) {
    while (await page.locator('.chain-open .choice').count()) await page.locator('.chain-open .choice').first().click();
    return;
  }
  if (await page.locator('.match').count()) {
    const L = page.locator('.match-left');
    const R = page.locator('.match-right');
    const n = await L.count();
    for (let k = 0; k < n; k++) {
      await L.nth(k).click();
      await R.nth(k).click();
    }
    await page.getByRole('button', { name: 'Lock it in' }).click();
    return;
  }
  if (await page.locator('.seq-pool').count()) {
    while (await page.locator('.seq-pool button').count()) await page.locator('.seq-pool button').first().click();
    await page.getByRole('button', { name: 'Lock it in' }).click();
    return;
  }
  await page.locator('.challenge .choice, .challenge .token').first().click();
}

async function playRound(page, check, label, maxQ = 99) {
  for (let q = 0; q < maxQ; q++) {
    if (!(await page.locator('.challenge').count())) break;
    await check(`${label}-question`);
    await answer(page);
    await page.waitForSelector('.feedback');
    if (await page.locator('.why-option').count()) {
      await check(`${label}-why`);
      await page.locator('.why-option').first().click();
    }
    await check(`${label}-feedback`);
    const next = page.locator('.next-btn');
    if (!(await next.count())) break;
    const last = /results/i.test(await next.innerText());
    await next.click();
    if (last) break;
  }
}

async function main() {
  const server = await createServer({ server: { port: 5299, strictPort: true }, logLevel: 'error' });
  await server.listen();
  const URL = 'http://localhost:5299';
  const data = await server.ssrLoadModule('/src/data/index.ts');
  const progress = await server.ssrLoadModule('/src/engine/progress.ts');

  const seed = (theme, veteran) => {
    const p = progress.newProgress();
    p.settings = { ...p.settings, theme, onboarded: veteran !== 'welcome', recap: true };
    if (veteran === true) {
      p.xp = 18_450;
      for (const s of data.SKILLS) p.skills[s.id] = { mastery: 40 + ((s.id.length * 7) % 55), attempts: 24, correct: 17 };
      p.dayStreak = 12;
      p.bestStreak = 23;
      p.lightningBest = 4_820;
      p.missed = data.QUESTIONS.slice(0, 12).map((q) => q.id);
      p.boards = p.boards.map((b, i) => ({ ...b, items: data.QUESTIONS.slice(i * 9, i * 9 + 5).map((q) => q.id) }));
      p.boards.push({ id: 'long', name: 'Chemistry vocabulary I keep mixing up before finals', emoji: '🧪', items: [] });
      p.sessions = Array.from({ length: 30 }, (_, i) => ({
        at: new Date(Date.now() - i * 86_400_000).toISOString(),
        type: 'practice',
        lab: 'math',
        skill: 'm-order',
        correct: 4 + (i % 5),
        total: 8,
        points: 900 + i * 40,
        bestStreak: 3 + (i % 6),
      }));
      for (const a of progress.ACHIEVEMENTS.slice(0, 7)) p.achievements[a.id] = new Date().toISOString();
      for (const s of data.SKILLS) p.terms[s.id] = 3;
      p.kindsPlayed = { mc: 9, spot: 9, match: 9, order: 9, chain: 9 };
    }
    return p;
  };

  const browser = await chromium.launch();
  const found = new Map(); // key → { rule, where, text, detail, at: Set }
  const errors = [];
  let checks = 0;
  if (SHOTS) mkdirSync(`${OUT}/shots`, { recursive: true });

  const combos = VIEWPORTS.flatMap((v) => THEMES.map((t) => ({ v, t })));
  for (const [ci, { v, t }] of combos.entries()) {
    const ctx = await browser.newContext({ ...v.device });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${v.name}/${t}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${v.name}/${t}: ${m.text()}`));
    const check = async (screen) => {
      await settle(page);
      const issues = await page.evaluate(auditPage, { phone: v.name === 'phone' });
      checks++;
      for (const i of issues) {
        const key = `${i.rule}|${i.where}|${i.detail.replace(/\d+/g, '#')}`;
        if (!found.has(key)) found.set(key, { ...i, at: new Set() });
        found.get(key).at.add(`${v.name}/${t}/${screen}`);
      }
      if (SHOTS) await page.screenshot({ path: `${OUT}/shots/${v.name}-${t}-${screen}.png`, fullPage: true });
    };
    const load = async (p) => {
      await page.goto(URL);
      await page.evaluate((s) => localStorage.setItem('geniuslab.progress.v1', JSON.stringify(s)), p);
      await page.reload();
    };

    // First run: welcome sheet, then fresh home.
    await load(seed(t, 'welcome'));
    await check('welcome');
    await page.getByRole('button', { name: 'Let’s go' }).click();
    await check('home-fresh');

    // A kid with lots of history: every surface full of content.
    await load(seed(t, true));
    await check('home');
    await page.getByRole('button', { name: 'Settings' }).click();
    await check('settings');
    await page.getByRole('button', { name: 'Close' }).click();

    for (const lab of data.LABS) {
      await page.locator('.lab-card', { hasText: lab.name }).click();
      await check(`lab-${lab.id}`);
      await page.getByRole('button', { name: /Home/ }).first().click();
    }

    // One full practice round, rotating skills across combos so every lab gets covered.
    const skill = data.SKILLS[(ci * 5) % data.SKILLS.length];
    await page.locator('.lab-card', { hasText: data.LABS.find((l) => l.id === skill.lab).name }).click();
    await page.locator('.tree .skill', { hasText: skill.name }).first().click();
    await playRound(page, check, 'practice');
    if (await page.locator('.recap').count()) {
      await check('recap');
      await page.locator('.recap-skip').click();
    }
    await check('results');
    if (v.name === 'phone') {
      await page.getByRole('button', { name: 'Play again' }).click();
      await page.waitForSelector('.dock');
      await page.locator('.dock button').nth(0).click();
      await check('dock-scorecard');
      await page.getByRole('button', { name: 'Close' }).click();
      await page.locator('.dock button').nth(1).click();
      await check('dock-coach');
      await page.getByRole('button', { name: 'Close' }).click();
    }

    // Lightning (timed) and Swipe.
    await load(seed(t, true));
    await page.getByRole('button', { name: 'Start the clock' }).click();
    await playRound(page, check, 'lightning', 2);
    await load(seed(t, true));
    await page.locator('.swipe-card').click();
    await playRound(page, check, 'swipe', 2);

    // Boards and Growth.
    await load(seed(t, true));
    await page.locator('.fy-card', { hasText: 'My Boards' }).click();
    await check('boards');
    await page.getByRole('button', { name: /Home/ }).first().click();
    await page.locator('.rank-card').click();
    await check('growth');

    await ctx.close();
    process.stdout.write(`\r${ci + 1}/${combos.length} ${v.name}/${t}          `);
  }

  if (FULL) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    for (const skill of data.SKILLS) {
      await page.goto(URL);
      await page.evaluate((s) => localStorage.setItem('geniuslab.progress.v1', JSON.stringify(s)), seed('lab', true));
      await page.reload();
      await page.locator('.lab-card', { hasText: data.LABS.find((l) => l.id === skill.lab).name }).click();
      await page.locator('.tree .skill', { hasText: skill.name }).first().click();
      await playRound(
        page,
        async (screen) => {
          await settle(page);
          const issues = await page.evaluate(auditPage, { phone: true });
          checks++;
          for (const i of issues) {
            const key = `${i.rule}|${i.where}|${i.detail.replace(/\d+/g, '#')}`;
            if (!found.has(key)) found.set(key, { ...i, at: new Set() });
            found.get(key).at.add(`phone/lab/${skill.id}/${screen}`);
          }
        },
        skill.id,
      );
    }
    await ctx.close();
  }

  await browser.close();
  await server.close();

  const list = [...found.values()].map((f) => ({ ...f, at: [...f.at] })).sort((a, b) => a.rule.localeCompare(b.rule) || b.at.length - a.at.length);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/report.json`, JSON.stringify({ checks, errors, issues: list }, null, 1));

  const byRule = {};
  for (const f of list) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
  console.log(`\n\nUI audit: ${checks} screens checked, ${list.length} distinct issues, ${errors.length} console errors`);
  for (const [rule, n] of Object.entries(byRule)) console.log(`  ${rule.padEnd(14)} ${n}`);
  for (const f of list.slice(0, 60)) console.log(`- [${f.rule}] ${f.where} "${f.text}" ${f.detail}  (${f.at.length}× e.g. ${f.at[0]})`);
  if (list.length > 60) console.log(`  …and ${list.length - 60} more in ${OUT}/report.json`);
  for (const e of errors.slice(0, 10)) console.log(`! ${e}`);
  process.exit(list.length || errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
