# Engineering Blueprint Bolder Pass

## Objective

Amplify the existing Engineering Blueprint visual system so the public site and configurator feel like a living software-house website rather than a flat technical document, without changing layout, typography, motion, content, or behavior.

## Problem and Why

The current palette is correct, but long runs of frost and drafting-paper surfaces weaken section rhythm and brand presence. Strong sections already exist; the quieter sections need to use the same registered fields, structural rules, and contrast with greater conviction.

## Authorized Scope

- Refine existing surface assignments, flat color fields, separator contrast, and static registration details.
- Strengthen hero, institutional sections, objectives, organization, prototype, conclusions, buttons/highlights, and configurator surface hierarchy.
- Document the refined use of surfaces, contrast, and depth.

## Explicitly Out of Scope

- Layout, spacing, sizing, positioning, responsive structure, typography, copy, DOM, React/JSX, motion, and animation.
- Logic, state, navigation, configurator behavior, validation, payload, API, backend, panel, and shared `index.css`.
- New palette primitives, gradients, glass, glow, generic SaaS devices, decorative shadows, or a replacement visual direction.

## Direction

- Creative North Star remains **Engineering Blueprint**.
- Structural method remains the existing editorial living-release-sheet composition.
- Depth comes from alternating registered planes, inset hairlines, shared edges, and existing blueprint/graphite fields—not effects.
- Teal remains a punctual technical/live accent.
- One decisive amplification per weak section; already-bold services, problem/solution, infrastructure, and footer remain controlled.

## Delivery Strategy

- Strategy: `single-pr` continuation on `redesign/public-site`; no push or PR is authorized.
- Route: delegated direct; CSS and synchronized visual documentation form one cohesive work unit.
- Reviewed boundary: `180e630`.

## Tasks

- [x] **EBB-1 — Audit surface rhythm and identify system-native amplifications**
  - Evidence: hero/header, organization, prototype, conclusions, and configurator were identified as the main neutral-continuity weaknesses. Company, services, problem/solution, infrastructure, and footer already carry stronger field hierarchy. Flat planes, inset rules, and registration details can correct the issue without layout, motion, or JSX changes.
- [x] **EBB-2 — Amplify the existing visual system**
  - Acceptance: named targets gain stronger section identity and scroll rhythm using only existing palette roles and static CSS treatment; no structural or behavioral diff.
  - Checks: protected diff, CSS review, design metadata synchronization, Impeccable detector.
  - Evidence: header and configurator topbar now use drafting paper; the hero adds a static drafting-paper side plane on the existing registration axis; company and organization distinguish frost cells from drafting-paper fields; objectives and conclusions gain inset registered edges; solution and prototype use technical tint; the prototype artifact returns to drafting paper; graphite services and infrastructure use stronger existing rule/state contrast; configurator workspace and action rail use flat inset hierarchy. All treatments use existing palette roles and CSS-only static devices.
- [ ] **EBB-3 — Verify and record the visual work unit**
  - Acceptance: build passes, generated output is cleaned, protected paths remain unchanged, and the work unit is committed on the feature branch.
  - Checks: `npm run build`, `git diff --check`, design JSON parse, protected path diff.
  - Evidence: `npm run build` passed with 432 modules transformed; `git diff --check` passed with line-ending warnings only; `.impeccable/design.json` parsed successfully; protected paths have zero diff against `180e630`; changed CSS lines contain no motion-declaration matches; the Impeccable detector returned `[]`. Build-generated `frontend/dist` changes require parent cleanup because this worker cannot restore or delete files; commit identity remains pending parent commit.

## Allowed Edit Surface

- `frontend/src/styles/site.css`
- `frontend/src/styles/configurator.css`
- `DESIGN.md`
- `.impeccable/design.json`
- `.impeccable/surfaces/frontend-src-app-jsx.md`
- `odd/tasks/engineering-blueprint-bolder-pass.md`

## Progress

- Active task: EBB-3 verification; commit identity remains pending parent commit.

## Next Step

Run the bounded verification contract, record observed evidence, and leave commit identity pending for the parent.
