# Genius Lab

**Spot It. Break It Down. Level Up.**

Genius Lab is a gamified learning app for grades 9–12. Instead of solving whole problems, students train the recognition skills underneath them: spotting what matters, breaking it into building blocks, and choosing the next logical step. It covers Math, English, and Science.

## What's inside

- **Three labs.** Math (*What comes next?*), English (*Spot the structure*), and Science (*Think like a scientist*). Each lab has a 6-skill tree, and a skill unlocks when its prerequisites reach Bronze (50% mastery).
- **Three core thinking modes.** Every challenge is tagged 👀 Spot It, 🧩 Break It Down, or ➡️ What's Next?, and accuracy is tracked for each mode.
- **Four timed game styles (no fill-in-the-blank).**
  - 🔘 **Quick Pick**: multiple choice
  - 👆 **Tap It**: tap the error, subject, outlier, or step
  - 🔗 **Mapping**: connect matching pairs
  - 🔢 **Sequence**: put the steps in order
- **Scoring.** Each correct answer earns base points plus a difficulty bonus, a speed bonus for time left on the clock, and a streak multiplier of up to 2×.
- **⚡ Lightning Round.** A 60-second rapid-fire round using every unlocked skill, either in one lab or all three.
- **Adaptive practice.** Question difficulty follows mastery, missed challenges come back more often, and sets ramp from easy to hard. If a student struggles, the app sends them back to their weakest prerequisite skill.
- **Progression.** XP ranks (Rookie → Genius), Bronze/Silver/Gold skill tiers, a daily streak, and 12 achievements.
- **Growth dashboard.** Shows mastery by lab and by skill, accuracy in each thinking mode with a focus area, and an accuracy trend over recent sessions.

Every answer comes with a short "why" explanation, so a miss turns into a lesson.

## Run it

```bash
npm install
npm run dev        # installs any missing packages, then serves http://localhost:5173
npm test           # engine + content-integrity tests
npm run build      # typecheck + production build into dist/
npm start          # build, then serve app + profile API on :4173 (see below)
```

## Profiles, backup, and the phone app

Progress always saves on the device first, so the app works offline. Kids who make a **profile** (name + 4–8 digit PIN) also get a copy on your server. Sign in on any phone or laptop and the progress follows them. When two copies differ, the newer one wins. The server keeps the last 20 versions per kid in `data/progress/<id>/`.

- **Family code.** Making a profile needs the family code, so strangers who find the URL can't sign up. It prints when the server starts (`[geniuslab] family code: 123456`). Pin your own with `GL_FAMILY_CODE=123456`.
- **Switching kids on one device.** Settings → Profile & backup → *Switch profile*. That clears this device, and the next kid signs in.
- **Backup files.** Settings → *Download backup* / *Restore from file* works for guests too.
- **Your data.** Everything lives in `./data` (set `GL_DATA` to move it). Back that folder up. It is git-ignored.

### Run it for the kids (installable app)

```bash
npm start          # builds, then serves the app + API on http://localhost:4173 (PORT to change)
```

The offline app shell and "Install" only work in this built mode over **https**, which the tunnel provides. `npm run dev` also serves the API, but it skips the offline shell.

To install on a phone, open `https://geniuslab.ctgs.link`:

- **Android (Chrome):** Settings → *Install app*, or the menu → *Install app*.
- **iPhone (Safari):** Share → *Add to Home Screen*.

### Cloudflare Tunnel

The dev and preview servers already allow `geniuslab.ctgs.link` and any `*.ctgs.link` host. Add others with `GL_HOSTS=a.example.com,b.example.com`. Point the tunnel at whichever port you run:

```yaml
# ~/.cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: /home/<you>/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: geniuslab.ctgs.link
    service: http://localhost:4173   # npm start   (use 5173 for npm run dev)
  - service: http_status:404
```

```bash
cloudflared tunnel run <TUNNEL_NAME>                    # one-off
sudo cloudflared service install                        # always on
sudo cp deploy/geniuslab.service /etc/systemd/system/  # keep the app always on too (edit paths first)
```

## Project layout

```
src/
  data/        content bank: skills + challenges per lab (math.ts, english.ts, science.ts)
  engine/      scoring, mastery/unlocks/ranks/achievements, session building
  components/  Home, LabView (skill tree), Play, Challenge (4 game styles), Results, Growth
tests/         engine behaviour + content validation
```

### Adding challenges

Add an entry to the right skill's `bank(...)` call in `src/data/<lab>.ts`:

- **Multiple choice:** list the correct option **first**. Options are shuffled when the game runs.
- **Tap It:** mark the correct token with a leading `*`.
- **Sequence:** list the steps in the correct order.
- **Mapping:** list the pairs already matched.

`npm test` checks that every skill still has enough challenges, covers all three difficulties, and uses at least two game styles.

### Writing formulas

Math and Science text is rendered for readability: `a/b` becomes a stacked fraction, operators get spacing, single-letter variables are set in italic serif, and `²`, `⁻¹`, `₂` become real superscripts and subscripts. When authoring:

- Use the real minus sign `−` (not a hyphen) and `×` / `÷` for operations.
- Write fractions as `a/b`, grouping multi-term parts in parentheses: `(x + 6)/(x + 3)`.
- Use Unicode exponents (`x²`, `2⁻³`) and subscripts (`CO₂`, `y₁`).
- Write units as words or abbreviations that aren't single letters (`hr`, not `h`).

Fonts: Atkinson Hyperlegible (Braille Institute) for text, Lexend digits (an open, unslashed 0), and Noto Serif italic for variables. All are bundled, so the app works offline.
