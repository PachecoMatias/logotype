# Engineering Blueprint Final Public Pass

## Objective

Complete one final public-site-only visual amplification so the Engineering Blueprint journey has stronger field differentiation and an authoritative closing without changing layout, typography, motion, content, configurator, logic, or behavior.

## Problem and Why

The previous passes established the right system and stronger global rhythm. The remaining weakness is local: Company still repeats two surface states, Objectives is too uniform, Organization nodes resemble floating boxes, the prototype chrome is pale, and Conclusions still reads like an outlined report before the footer.

## Authorized Scope

- Refine public-site surface assignments and static structural contrast in the named weak sections.
- Use only existing Engineering Blueprint palette variables and existing layout geometry.
- Preserve the already-strong Hero, Services, Problem/Solution, Infrastructure, and Footer except for a minimal transition rule if needed.

## Explicitly Out of Scope

- Configurator CSS or behavior.
- Layout, spacing, sizing, typography, DOM/JSX, content, responsive structure, motion, and animation.
- Logic, API, payload, validation, state, navigation, backend, panel, shared `index.css`, and design-system artifacts.
- New colors, gradients, glass, neon, shadows, pills, generic SaaS cards, or decorative backgrounds.

## Delivery Strategy

- Strategy: `single-pr` continuation on `redesign/public-site`; no push or PR is authorized.
- Route: delegated direct; one public CSS work unit plus its ODD evidence.
- Reviewed boundary: `431e068`.

## Tasks

- [x] **EBF-1 — Audit remaining public surface weaknesses**
  - Evidence: the remaining need is field differentiation, not missing layout. Company, Objectives, Organization, prototype chrome, and Conclusions can be amplified with existing surface roles. Hero, Services, Problem/Solution, Infrastructure, Footer, configurator, and design artifacts require no structural work.
- [x] **EBF-2 — Apply final public-only amplification**
  - Acceptance: four Company quadrants become distinct registered fields; Objectives gains row-level contrast; Organization nodes integrate into the blueprint network; prototype chrome gains product authority; Conclusions becomes a graphite editorial close flowing into the blueprint footer.
  - Checks: CSS-only diff, motion-declaration scan, protected path diff, detector.
  - Evidence: `frontend/src/styles/site.css` now assigns graphite/selection/canvas/primary fields to the four Company quadrants, drafting-paper/graphite contrast to Objectives rows two and three, transparent primary-ruled and selection lead nodes to Organization, an inset blueprint hairline plus graphite chrome to the prototype, and a graphite Conclusions field with an on-dark registration edge, dividers, and numbered marks. The changed-line motion scan found no matching declarations. The Impeccable detector was invoked once and returned `[]`; the final non-geometric inset implementation was then narrowed from a pseudo-element to an inner outline without changing the visual role.
- [x] **EBF-3 — Verify and record the work unit**
  - Acceptance: build passes, overflow safeguards remain intact, protected paths are unchanged, generated output is cleaned, and the CSS work unit is committed.
  - Checks: `npm run build`, `git diff --check`, protected diff, Impeccable detector.
  - Evidence: `npm run build` passes (Vite 5.4.21, 432 modules); `git diff --check` passes with working-copy line-ending warnings only; protected source paths under `frontend/src` (except `site.css`), `backend`, `DESIGN.md`, and `.impeccable` have no diff from `431e068`; changed lines contain no motion declarations; final Impeccable detector rerun returned `[]`; overflow and responsive safeguards match the reviewed boundary; build output was restored/cleaned. Work-unit commit: `1bb3d78` (`feat(frontend): refine final public surfaces`). Browser tooling was unavailable, so runtime viewport inspection remains part of the user's browser pass. Native RDD assessed `medium / under_budget`, so no review transaction was due.

## Allowed Edit Surface

- `frontend/src/styles/site.css`
- `odd/tasks/engineering-blueprint-final-public-pass.md`

## Progress

- Status: implementation and proportional source/build verification complete.

## Next Step

Review the final Company, Objectives, Organization, prototype, and Conclusions rhythm in the user's browser pass.
