# Editorial Motion System Upgrade

## Objective

Elevate the whole public site to the Hero's motion quality and eliminate the
remaining flicker in scroll reveals and configurator step changes, without
changing colors, layout, or content.

## Problem

- Section titles only fade in; the rest of the site reads far below the Hero.
- Scroll reveals flicker: `whileInView` animated the element back to its hidden
  state as it left the viewport (a visible reverse animation), and the same
  machinery double-fired where reveals were nested.
- The configurator step change flickered: `AnimatePresence mode="wait"` left an
  empty stage between exit and enter, and the entering `.cfg-step` ran a second
  full fade on top of the outer transition (a remount + double animation).

## Why

The Hero is the authored set piece; every other section must feel like it
belongs to the same studio. Flicker during scroll and step changes breaks the
premium feel and reads as jank.

## Scope

- In: `frontend/src/motion/*`, `frontend/src/components/common/SectionTitle.jsx`,
  the site sections' reveal wiring, `frontend/src/components/Hero/Hero.jsx`,
  `frontend/src/components/ProjectConfigurator/ProjectConfigurator.jsx`,
  `ProgressBar.jsx`, `SuccessMessage.jsx`, and the added `.split-text` CSS.
- Out: colors, layout, copy, data, configurator payload/validation/API, panel.

## Constraints

- transform + opacity only (clip-path allowed for compositor-friendly masks).
- 60 FPS, no layout shift, no flicker.
- Respect `prefers-reduced-motion` with a meaningful alternative.
- Do not change colors, layout, or content.
- No new dependencies.

## Motion thesis

Focal moment stays the Hero construction sequence. Every section now earns the
same authored quality through **word-level editorial titles** (words rise from a
mask in sequence, subtitles follow), staggered cards, and diagram draw-in — never
one identical fade. Supporting reveals explain hierarchy; they are not decoration.

## Tasks

- [x] T1 Flicker root cause: instant reset on leave.
      `revealVariants` hidden + `Stagger` hidden now carry `transition: { duration: 0 }`;
      Hero, OrganizationChart, SystemPrototype and ProblemSolution local trees use a
      `RESET = { duration: 0 }` on every hidden state.
- [x] T2 Editorial titles: `SplitText` word-mask reveal added; `SectionTitle` uses it
      and delays the subtitle (`delay + 0.16`).
- [x] T3 `SplitText.jsx` written with a clip-path mask (units consistent so the mask
      interpolates) and a reduced-motion fade fallback; `.split-word` CSS added.
- [x] T4 Configurator fluidity: `AnimatePresence mode="wait"` removed from the step
      swap; the incoming step now mounts with an object-based entrance
      (`opacity`+`x`, `DURATION.state`) and the outgoing step unmounts immediately.
- [x] T5 Instant reset applied to ProgressBar-adjacent trees, OrganizationChart and
      SystemPrototype (`ProgressBar`/`SuccessMessage` are mount-only, no reset needed).
- [x] T6 Infrastructure node now scales in with its card (subtle diagram motion).
- [x] T7 Verify: see Verification.
- [x] T8 DESIGN.md Motion paragraph updated to the shipped truth.

## Acceptance criteria

- No flicker during scroll or step change.
- Reveals replay on viewport re-entry with no visible reverse animation.
- Every section title animates editorially (not a plain fade).
- Configurator steps change fluidly with no double animation.
- `npm run build` passes; no color/layout/content changes.

## Verification

- `npm run build` OK twice: 434 modules, `dist/assets/index-BAFyAoom.css` 73.97 kB,
  `dist/assets/index-BjlZ01KT.js` 342.60 kB; `frontend/dist` reverted after each build.
- `git diff --check` clean (LF→CRLF warnings only).
- Impeccable detector: only the expected `codex-grid-background` advisory on the
  intentional blueprint grid (site.css); no new findings from the changes.
- No color/layout/content changed: edits are motion props only plus one `.split-word`
  rule (`display: inline-block`) and the DESIGN.md Motion paragraph.
- Runtime visual capture is not available in this environment (headless Chrome does
  not advance rAF under `--dump-dom`); reveal correctness rests on the code-level
  guarantees above.
- Craft-floor note: the Hero stays the single focal sequence; titles share one
  editorial voice while each section keeps a distinct body reveal.

## Delivery decision

(pending — feature chain strategy still open; authored motion lines exceed ~400)

## Progress

Implemented and build-verified. Awaiting delivery/commit decision.
