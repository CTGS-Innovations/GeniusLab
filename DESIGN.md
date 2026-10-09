# Genius Lab design rules

These rules keep the UI consistent, readable, and free of the generic "AI-made" look. Two checks enforce them, and both must pass before a commit:

| Check | Command | Catches |
| --- | --- | --- |
| Design lint | `npm test` (`tests/design-rules.test.ts`) | Raw values instead of tokens, banned patterns, emoji in UI chrome, unlabeled icon buttons |
| UI audit | `npm run audit:ui` (`scripts/ui-audit.mjs`) | Layout bleed in a real browser: every screen × 5 themes × phone/tablet/desktop |

The audit writes `audit/report.json`. Add `--shots` to save screenshots, `--quick` for the Lab theme only, or `--full` to also play every skill on a phone. You need Chromium once: `npx playwright install chromium`.

## 1. Tokens

Every value comes from a token in `:root` at the top of `src/styles.css`. Themes only re-skin tokens: layout, type, and challenge typography never change between themes. If you need a value that isn't a token, add the token first. A raw value outside the token blocks fails the lint. The only escape hatch is a `/* token-exempt: reason */` comment on the line.

| Kind | Tokens | Rule |
| --- | --- | --- |
| Spacing | `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24 · `--sp-8` 32 · `--sp-10` 40 · `--sp-12` 48 · `--sp-16` 64 | 4px grid for padding, margin, and gap. 1–2px hairlines are fine. |
| Type | `--fs-xs` .75 · `--fs-sm` .875 · `--fs-base` 1 · `--fs-md` 1.125 · `--fs-lg` 1.375 · `--fs-xl` 1.75 · `--fs-2xl` 2.25 · `--fs-3xl` 3 · `--fs-display` (rem, 1rem = 17px) | Nothing renders below 12px. Math sub/sup use `max(var(--fs-xs), .72em)`. |
| Shape | `--radius-xs`, `--radius-sm`, `--radius`, `--radius-pill`, `50%` | Themes set `--radius*`. Components pick a role, not a number. |
| Layers | `--z-raised` · `--z-float` · `--z-sticky` · `--z-dock` · `--z-sheet` · `--z-overlay` | No bare z-index numbers. |
| Elevation | `--shadow-1`, `--shadow-2`, `--scrim` | Shadows only on things that float (menus, sheets). Cards are flat. |
| Color roles | `--bg` `--bg-2` `--card` `--card-2` `--line` `--text` `--muted` `--brand` `--gold` `--good` `--bad` `--accent` | Tints are `color-mix(in srgb, var(--role) N%, transparent)`, never rgba literals. |
| Ink on fills | `--on-brand` `--on-accent` `--on-gold` `--on-good` `--on-bad` `--ink` | Text on a filled color always uses its `--on-*` token. Each theme sets them to pass contrast. Lab colors use `accentStyle()` from `ui.tsx`, which sets `--accent` and `--on-accent` together. |
| Touch | `--tap` 44px | Minimum tap target on touch screens. |
| Motion | `--dur-fast` `--dur` `--dur-slow` | Everything turns off under reduced motion. |

## 2. Layout: nothing bleeds

1. **Content stays inside its box.**
   - Flex and grid children that hold text get `min-width: 0`.
   - Rows of controls `flex-wrap: wrap`.
   - Fixed `min-width` on buttons only where the row can wrap.
2. **One scroll direction.** The page never scrolls sideways at any width. Entrance animations move vertically only: a sideways slide widens the page on phones. The lint checks this.
3. **Nothing sits on top of text.**
   - Close buttons go in the header row (`.sheet-head`, `.coach-card-head`), not absolutely positioned over content.
   - No sticky buttons over reading text. On phones, the app scrolls the feedback into view instead.
4. **Fixed bars reserve their space.** The phone dock has matching bottom padding on the screen. The audit checks that nothing is covered at the end of the scroll.
5. **Truncation is a last resort.** If text uses `text-overflow: ellipsis`, the element carries a `title` with the full text.
6. **Breakpoints:** phone ≤ 767px, tablet ≤ 1199px, desktop above. Every screen is checked at all three.
7. **Decorations are `aria-hidden`.** Bursts, fly-ups, and pin pops never take part in layout.

## 3. Components

- **Icons.**
  - UI chrome uses `<Icon name>` (`src/components/Icon.tsx`): one 24px set with 2px round strokes in `currentColor`.
  - An icon-only button needs an `aria-label`. Use `.icon-btn` so it meets the 44px target.
- **Emoji are content, not chrome.**
  - Skill, lab, rank, achievement, and board glyphs come from `src/data` or `src/engine` and appear only in their own slot: ring center, skill tile, badge, or board tile.
  - Never as a prefix on headings, labels, buttons, or chips. The lint rejects any emoji in `src/components`.
- **Buttons.**
  - One primary action per region.
  - Labels are verbs ("Practice", "Create profile", "Start the clock").
  - `.btn-ghost` is for secondary or back actions.
- **Cards.**
  - Flat `--card` surface with a 1px `--line` border.
  - Never nest a card inside a card: use a plain section with a divider. The audit checks this.
- **Chips** are short text facts (mode, game style, grade). No icons except difficulty stars and the trap warning.
- **Notes and callouts** use a tinted background (`color-mix` of the role color), not a colored side border.
- **Sheets** have a header row with a title and a Close button, and scroll internally.

## 4. Copy

- Lean, plain, sentence case. Bottom line first.
- One idea per line. No run-ons, no stacked exclamation marks.
- Teacher terms come from the Massachusetts frameworks (`src/data/curriculum.ts`), not invented labels.
- Errors say what happened and what to do: "That family code isn't right. Ask a parent."

## 5. Accessibility

- **Contrast:** 4.5:1 for text, 3:1 for large text (24px+, or 18.66px+ bold). The audit measures every text node in every theme.
- **Tap targets:** 44px on touch screens, 24px minimum elsewhere.
- **Focus:** every control shows a `:focus-visible` outline.
- **Motion:** both `prefers-reduced-motion` and the in-app Motion switch turn animation off.

## 6. Anti-slop list

These are the tells of generic generated UI. Each one is banned, and most are checked by the lint (L) or the audit (A).

| Banned | Instead | Check |
| --- | --- | --- |
| Gradient text (`background-clip: text`) | Solid brand color on one word | L |
| Purple-to-blue or rainbow gradients on surfaces | Flat token surfaces. A gradient only as a progress fill or a deliberate theme feature (Y2K button). | L (cards) |
| Colored accent bar down one side of a card or note | Tinted background or a divider | L |
| Emoji as section markers or bullet icons | `<Icon>` or nothing | L |
| Card inside card, borders inside borders | One surface per group, dividers inside | A |
| Same radius and shadow on everything | Radius by role, shadows only on floating layers | L |
| `!important` to win specificity fights | Correct selectors (`:is()` state rules). `!important` only to turn motion off. | L |
| Arbitrary one-off sizes (13px, 0.92rem, 14px gaps) | Type and spacing scales | L |
| Ellipsis-truncated labels with no way to read them | Wrap, or add a `title` | A |
| Hover-only affordances | Visible controls with real labels | review |
| Centering everything | Left-aligned reading text. Center only hero numbers and recap slides. | review |
| Filler copy ("Unlock your potential!") | Specific, short, true statements | review |

## 7. Before you commit

```bash
npm test            # unit + content + design lint
npm run audit:ui    # must report 0 issues
npm run build
```
