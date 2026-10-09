# Dark Surface Color Pass

## Objective
Make the public site and configurator read as a modern software-engineering platform with predominantly **dark surfaces** (deep navy / dark blueprint / charcoal) accented with technical blue and small cyan/teal highlights. Abandon the "light site" concept.

## Problem
The redesign was predominantly light (`--*-canvas` / `--*-surface` / `--*-selection` backgrounds) with only some sections dark, so the visual identity read as a light consultancy brochure rather than a technical product platform.

## Why
Color conveys the product's engineering character before any copy is read. Dark, blueprint-integrated surfaces signal depth and technical maturity; a light layout dilutes it.

## Scope
- **In scope:** color only. Backgrounds, borders, text colors, selection, small accent states.
- **Out of scope:** layout, typography, structure, logic, validations, motion, behavior. White is reserved for small punctual accents (important cards already dark, chips, status, focus outlines).
- Avoid: loud gradients, glassmorphism, gamer aesthetics.

## Constraints
- Same class names and DOM. No new libraries. React + plain CSS.
- Legacy `index.css` admin/panel classes untouched; `body` background left light to avoid regressions.

## Approach
Add a commented "Dark Surface Theme — color-only" block at the END of `site.css` and `configurator.css`. It redefines design tokens on `.site-page` / `.cfg-page-shell` and overrides only color properties of the affected selectors. Later source order wins; no layout properties are overridden. Blueprint hairline grids are re-tinted for dark backgrounds.

New tokens: `--site-ink #08111d`, `--site-inner #0c1622`, `--site-panel #101b29`, `--site-panel-2 #16263a`, `--site-hairline rgba(143,183,240,0.16)`, `--site-hairline-strong rgba(143,183,240,0.34)`, `--site-text #e7eef5`, `--site-text-muted #9db0c2`, `--site-error-on-dark #f0a9a3` (mirrored with `--cfg-`). `--site-line` / `--cfg-line` flipped to the light hairline (all remaining usages sit on now-dark surfaces).

## Checklist
- [x] T1 — Add dark theme block + tokens to `frontend/src/styles/site.css` (hero, company, objectives, org, problem solution, system).
- [x] T2 — Add dark theme block + tokens to `frontend/src/styles/configurator.css` (page ground, workspace, step stage, controls, options, chips, buttons, summary, states).
- [x] T3 — Align system sidebar hover/active to a blue wash instead of a light block.

## Delivery strategy
`ask-on-risk` (default). Forecast authored changed lines well under ~400 → single work unit, no chained PR needed.

## Route declaration
Delegated direct was intended but subagent delegation is unavailable in this runtime (`OpenCode's free tier can only be used from within OpenCode`); executed inline under the documented degradation path.

## Verification evidence
- T1–T3: `npm run build` in `frontend` → 432 modules transformed, `dist/assets/index-fxT4J7ta.css` 73.94 kB, `index-C8ECtlk2.js` 332.42 kB. `git diff --check` exit 0 (only LF→CRLF warnings). Impeccable detector `detect --json` over both files → exit 0, 2 advisory `codex-grid-background` findings at the intentional blueprint fields (site.css `.site-hero__field`, configurator.css `.cfg-main`) — expected, not defects.
- RDD: `gentle-ai review assess` → `risk: medium`, `review_due: false` (`under_budget`). No native review forced.
- `frontend/dist` reverted to HEAD and new build assets removed so the work unit stays source-only.
- Change size: +299 lines across 2 files (0 deletions).

## Next step
Commit the work unit. Push / PR remain the user's decision.
