# Public Site Motion System

## Objective
Design one authored motion identity for the Logotype public site (Persuade surface) and the project configurator (Operate flow), using Framer Motion. No simple fadeIn: the movement must read like a software-engineering studio — constructed, deliberate, quiet.

## Scope
- **In scope:** motion only. Hero construction sequence, per-section scroll reveals with distinct personalities, blueprint grid tied subtly to scroll, typographic reveals, button/link/card/line/icon micro-interactions, configurator step transitions, progress bar, staggered field entrance and progressive summary construction.
- **Out of scope:** layout, colors, typography, CSS visual changes, logic, API, payload, validations, backend, admin panel. No new dependencies (Framer Motion 11 already installed).
- **Avoid:** bounce, exaggerated zoom, rotations, strong parallax, gamer/template effects.
- **Performance:** animate only `transform`, `opacity`, `clip-path`. Respect `prefers-reduced-motion` through the existing `MotionConfig`.

## Approach
- New shared module `frontend/src/motion/`:
  - `tokens.js` — easing curves, durations, springs, viewport defaults, clip helpers, configurator step/summary variants.
  - `Reveal.jsx` — `Reveal`, `Stagger`, `StaggerItem` and `revealVariants` (modes: rise, drop, left, right, fade, scale, clipTop/Bottom/Left/Right, drawX/drawY).
- `AnimatedSection` stays API-compatible (backward compatible `direction`), delegating to `Reveal`.
- `SectionTitle` self-animates (clip reveal that also draws the top rule), so sections stop wrapping it.
- Hero owns the focal authored sequence (grid → schematic draw → axis draw → wordmark clip reveal → blue panel → lead → copy → buttons) plus a very subtle scroll-linked grid opacity.
- Each section gets a distinct reveal personality; lists use `Stagger`/`StaggerItem`.
- Configurator: step transitions use a directional clip wipe; step roots use `stepContainer`, fields use `stepField`; progress bar fill springs; summary sections build progressively.

## Checklist
- [x] T1 — Motion core: `tokens.js`, `Reveal.jsx`, rewrite `AnimatedSection`, animate `SectionTitle`.
- [x] T2 — Hero authored sequence + scroll-linked grid + axis draw + schematic path draw.
- [x] T3 — Section personalities: Company, Objectives, OrganizationChart, Services, ProblemSolution, SystemPrototype, Infrastructure, Conclusions, Header, Footer.
- [x] T4 — Micro-interactions: Button, OptionCard, Chip, service cards/arrow.
- [x] T5 — Configurator: step wipe transition, ProgressBar, staggered fields in every Step, progressive ProjectSummary, SuccessMessage.
- [x] T6 — Verify: `npm run build`, detector, reduced-motion reasoning, no layout/CSS/logic regression.

## Route declaration
Delegated direct intended, but subagent delegation is unavailable in this runtime (`OpenCode's free tier can only be used from within OpenCode`); executed inline under the documented degradation path.

## Delivery strategy
`ask-on-risk` (default). Forecast exceeds ~400 authored lines across many files; surface the PR chain-strategy choice to the user at delivery time. Push/PR remain user decisions.

## Verification evidence
- `npm run build` (frontend): OK — 433 modules transformed, `dist/assets/index-fxT4J7ta.css` 73.94 kB, `dist/assets/index-DChIy379.js` 341.24 kB (gzip 104.96 kB). `frontend/dist` reverted to HEAD after the build (source-only work units).
- `git diff --check`: exit 0 (only informational LF→CRLF warnings; no whitespace errors).
- Impeccable detector over changed source + `frontend/src/motion`: exit 0, zero findings.
- Scope: JSX-only diff. No CSS file, no `index.css` legacy tokens, no `data/projectOptions.js`, `validation.js`, `utils/api.js`, no state/API/payload/validation logic changed.
- Performance: animations use only `transform`, `opacity` and `clip-path`, except the Hero schematic line draw which uses SVG `pathLength` (the explicitly requested "lines that draw" effect).
- Reduced motion: existing `<MotionConfig reducedMotion="user">` in `main.jsx` is untouched; the Hero scroll-linked grid opacity and axis translation are additionally guarded by `useReducedMotion()` so they fall back to static values.
- Authored size: ~1545 changed lines (1337 additions+deletions across 26 tracked files + 208 lines in 2 new motion files). Exceeds the ~400 authored-line delivery budget → chain strategy must be chosen before delivery.

## Delivery decision (pending)
`ask-on-risk` triggered: the change exceeds ~400 authored lines. Before committing/opening a PR, choose the chain strategy (`stacked-to-main` or `feature-branch-chain`). Push/PR remain user decisions.
