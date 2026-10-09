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
npm run dev        # http://localhost:5173
npm test           # engine + content-integrity tests
npm run build      # typecheck + production build into dist/
```

Progress is stored in the browser (`localStorage`), so no backend is needed.

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
