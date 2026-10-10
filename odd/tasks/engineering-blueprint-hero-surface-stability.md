# Engineering Blueprint Hero Surface Stability

## Objective

Make the Stage 1 opening viewport more deliberate and stable across desktop, tablet, mobile, and browser zoom while amplifying only the Header, Hero, Company ground, and Organization ground within the existing Engineering Blueprint system.

## Problem and Why

The current Hero mixes three coordinate systems: the blue statement uses a viewport-relative negative margin inside the grid, its full-height plane is positioned from the centered frame, and the registration axis is positioned from the viewport. The two-column layout also persists through 768px. Together these choices make the statement, CTAs, and axis drift or compress at different zoom and viewport widths. The Header and the general Company and Organization grounds remain comparatively pale and reduce the intended first-viewport hierarchy.

## Authorized Scope

- Stabilize Hero column ownership, statement width, registration plane, axis alignment, and responsive stacking in public CSS.
- Refine Header, Hero plane, Company ground, and Organization ground using existing palette variables only.
- Preserve the large `LOGO / TYPE` composition, current content, component structure, controls, and interaction behavior.

## Explicitly Out of Scope

- Motion or animation changes of any kind.
- Configurator, panel, shared `index.css`, logic, API, payload, validation, state, navigation, backend, or JSX/DOM changes.
- Typography changes, new colors, gradients, glass, neon, decorative shadows, generic SaaS devices, or new visual primitives.
- Unrequested changes to any other public section.

## Delivery Strategy

- Strategy: `single-pr` continuation on `redesign/public-site`; no push or PR is authorized.
- Forecast: under 120 authored changed lines.
- Route: delegated direct because exploration prepares a responsive CSS write; one implementation writer owns the bounded public CSS work unit.
- Reviewed boundary: `82499a9`.

## Tasks

- [x] **EBS-1 — Map the opening geometry and protected boundaries**
  - Evidence: the statement negative margin, frame-relative plane, viewport-relative axis, and late 760px stack are the observed instability sources. Existing Engineering Blueprint rules already authorize stronger registered fields, so no durable design artifact change is required.
- [x] **EBS-2 — Stabilize and amplify the scoped public surfaces**
  - Acceptance: statement and CTAs remain grid-owned without negative overlap; plane and axis stay visually registered at desktop, tablet, and mobile widths; Header, Hero, Company, and Organization use stronger existing field roles; all other surfaces and all behavior remain unchanged.
  - Checks: focused source diff, changed-line motion scan, protected-path diff, Impeccable detector.
  - Evidence: `site.css` now gives the statement an explicit bounded grid column, derives the desktop plane and viewport axis from shared shell/panel variables, stacks the Hero at `<=1080px`, and derives the narrower axis from shell inset variables at `<=760px` and `<=480px`. Header, Hero plane, Company ground, and Organization ground use only existing palette variables. The focused motion scan found no changed motion declarations, the protected-path diff was empty, and the Impeccable detector returned `[]`.
- [x] **EBS-3 — Verify and close the work unit**
  - Acceptance: build passes, overflow safeguards remain present, generated output is cleaned, and the implementation is committed as one Conventional Commit work unit.
  - Checks: `npm run build`, `git diff --check`, protected-path diff, detector, viewport inspection at 375/768/1280 when browser tooling is available.
  - Evidence: `npm run build` passed with 432 modules transformed; `git diff --check` passed with line-ending warnings only; `overflow-x: clip` and the two intentional `overflow-x: auto` safeguards remain, with no new `overflow-x: hidden`; the parent detector spot check returned `[]`; generated `frontend/dist` output was restored and cleaned. Browser tooling was unavailable, so 375/768/1280 and zoom inspection was not claimed. Work-unit commit: `5d494c9` (`fix(frontend): stabilize blueprint hero surfaces`). Native RDD assessed the committed range from `82499a9` as `medium / under_budget`, so no review transaction was due.

## Allowed Edit Surface

- `frontend/src/styles/site.css`
- `odd/tasks/engineering-blueprint-hero-surface-stability.md`

## Progress

- Status: implementation and proportional source/build verification complete.

## Next Step

Inspect the Header and Hero registration at 375px, 768px, and 1280px plus browser zoom when browser tooling becomes available.
