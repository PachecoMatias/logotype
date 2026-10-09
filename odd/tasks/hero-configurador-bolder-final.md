# Hero + Configurador — Final Bolder Visual Pass

## Objective

Amplify the Hero and the project Configurator so both read as the two strongest surfaces of the site: a designed technology platform and a project-planning experience, not a flat document or an admin form. Visual only.

## Problem and Why

The Hero's left frost field feels empty and the Configurator still reads like fields drawn on a white sheet. Surfaces, depth, hierarchy, and contrast are weak in both. The Engineering Blueprint palette and layout are correct; the expression is under-committed.

## Authorized Scope

- Hero: technical blueprint background on the left field (grid + authored node/connector SVG), surface/depth treatment of the graphite panel and the blue statement block.
- Configurator: intro hierarchy, production-line progress rail, layered workspace/stage depth, recessed technical inputs/selects/textarea, label markers, option and chip states, graphite control console action bar, summary header markers.
- CSS-dominant refinement plus one decorative background layer (SVG) in the Hero markup.

## Explicitly Out of Scope

- Motion/animation (no new motion; existing transform/opacity untouched).
- Logic, state, navigation, validation, payload, API, backend, panel, shared `index.css`.
- Layout structure, sizing, positioning, and the 7-step order.
- New palette colors (only Frost, Drafting Paper, Technical Tint, Navy/Graphite, Blueprint Blue, Systems Teal as accent), gradients, glass, neumorphism, exaggerated shadows, generic SaaS components.

## Direction

- Creative North Star remains **Engineering Blueprint** (living release sheet).
- Depth from layered flat planes, inset hairlines, registration marks, and shared edges — never effects or ambient shadows.
- One decisive amplification per surface; quiet everything around it.
- Hero: left field becomes a drafting grid with an authored schematic (nodes, orthogonal connectors, registration circles); graphite panel and blue statement gain inset frames/grid.
- Configurator: progress becomes a production rail with station nodes; fields become recessed technical slots; the action bar becomes a graphite control console.

## Delivery Strategy

- Strategy: `single-pr` continuation on `redesign/public-site`; no push or PR authorized.
- Route: delegated direct; one writer for the CSS + Hero markup, one cohesive work unit.
- Reviewed boundary: `734e51c`.

## Tasks

- [x] **HBC-1 — Hero technical field and surface depth**
  - Acceptance: left field carries a subtle blueprint grid and authored schematic; graphite panel and blue statement gain flat inset depth; no layout/motion/behavior change.
  - Checks: diff review, `npm run build`, Impeccable detector, responsive reasoning (no horizontal scroll).
- [x] **HBC-2 — Configurator production-line and technical forms**
  - Acceptance: progress reads as a production line; inputs/selects/textarea read as recessed technical slots; options, chips, actions, and summary gain stronger hierarchy; no behavior change.
  - Checks: diff review, `npm run build`, Impeccable detector, responsive reasoning (no horizontal scroll).
- [x] **HBC-3 — Verify and record the visual work unit**
  - Acceptance: build passes, detector reports no findings, protected paths unchanged, commit on the feature branch.
  - Checks: `npm run build`, `git diff --check`, Impeccable detector `[]`, protected path diff.

## Allowed Edit Surface

- `frontend/src/styles/site.css`
- `frontend/src/styles/configurator.css`
- `frontend/src/components/Hero/Hero.jsx`
- `odd/tasks/hero-configurador-bolder-final.md`

## Progress

- Status: complete; recorded in commit `b6518fe`.
- Evidence:
  - `npm run build` (frontend): passed — 432 modules transformed, `index-C0d886JZ.css 66.33 kB`, built in 6.21s.
  - `git diff --check`: exit 0 (only informational CRLF normalization warnings).
  - Impeccable detector: exit 0, two advisory findings only (`codex-grid-background` at `site.css:186` and `configurator.css:108`) — both the brief-authorized blueprint grids, expected not defects.
  - Protected paths unchanged: logic, `index.css`, data, validation, API untouched.
  - Responsive: diagram hidden ≤480px, recentered ≤1080px; field clipped by `overflow:hidden` — no horizontal scroll.

## Next Step

Delivered for the human. Push/PR remain human decisions under ordinary repository policy.
