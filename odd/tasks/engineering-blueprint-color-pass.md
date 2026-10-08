# Engineering Blueprint Color Pass

## Objective

Replace the Stage 1 cream, vermilion, and chartreuse palette with a precise cool-toned “Engineering Blueprint” identity while preserving the existing editorial composition and all application behavior.

## Problem and Why

The current warm palette communicates expressive print craft more strongly than software engineering. Dominant vermilion and chartreuse fields—especially Objectives—break the professional systems-oriented identity Logotype needs for its university exhibition.

## Authorized Scope

- Re-map public-site and configurator color roles only.
- Update the durable visual-system and direction documentation to match the built palette.
- Correct contrast and add non-color differentiation where a state currently depends principally on hue.

## Explicitly Out of Scope

- Layout, spacing, typography, component structure, editorial composition, motion, copy, and images.
- React/JSX, business state, configurator flow, validation, payload, API, navigation, and panel.
- `frontend/src/index.css`, public/configurator component files, `Panel/**`, data files, utility files, and backend.

## Direction

- Creative North Star: **Engineering Blueprint**.
- Temperature: cool and controlled.
- Dominant relationship: cold neutral drafting surfaces against graphite structural ink.
- Primary: deep blueprint blue for decisive regions and actions.
- Secondary: calibrated teal for verified, complete, or live state.
- Supporting tint: pale technical blue for selection and information surfaces.
- Error and warning colors remain semantic, restrained, and accessible.
- No gradients, neon, glass, generic SaaS blue-violet treatment, or decorative color.

## Delivery Strategy

- Strategy: `single-pr` continuation on `redesign/public-site`; no push or PR is authorized.
- Forecast: under 400 authored changed lines because the work is a bounded semantic-token and documentation remap.
- Route: delegated direct; five coordinated files make one cohesive color-system work unit.

## Tasks

- [x] **EBP-1 — Audit chromatic roles and lock the palette strategy**
  - Acceptance: every current primitive, selector-specific literal, semantic state, protected boundary, and contrast-sensitive pair is mapped.
  - Evidence: read-only exploration found all runtime chromatics isolated to `site.css` and `configurator.css`; documentation synchronization is limited to `DESIGN.md`, `.impeccable/design.json`, and the surface direction contract. A token-only remap is insufficient because statuses, shadows, placeholders, dark secondary copy, and completion states need selector-level correction.
- [x] **EBP-2 — Apply Engineering Blueprint colors**
  - Acceptance: hero, navigation, actions, institutional sections, objectives, configurator, focus, selection, completion, errors, and editorial details use stable semantic roles without layout or motion changes.
  - Checks: protected zero-diff audit; contrast-role inspection; Impeccable detector; JSON parse.
  - Evidence: implemented frost canvas `#eef2f5`, drafting paper `#f9fbfc`, graphite `#101923`, slate `#52616d`, structural line `rgba(16, 25, 35, 0.22)`, blueprint blue `#174ea6`, blueprint-on-dark `#8fb7f0`, systems teal `#0f6f7a`, systems-teal-on-dark `#78c6cc`, technical blue tint `#dce8f7`, dark-surface secondary `#d5dde4`, future/inactive `#8b99a5`, error `#a53a32` on `#fff1ef`, and warning `#6d5700` on `#fff3c4`. Actions and focus use blueprint roles; selected/information surfaces use technical blue tint; complete/live/success use systems teal. Completed progress steps also use stronger weight and a one-pixel underline. Impeccable detector returned `[]`; protected source diff against `3ff7af4` was empty; design JSON parsed successfully.
- [ ] **EBP-3 — Verify and record the work unit**
  - Acceptance: production build passes; no protected source changed; documentation matches CSS; color-only diff is committed on the feature branch.
  - Checks: `npm run build`, `git diff --check`, protected path diff, design JSON parse.
  - Evidence: `npm run build` passed with 432 modules transformed; `git diff --check` passed; protected source diff against `3ff7af4` was empty; `.impeccable/design.json` parsed successfully; Impeccable detector returned `[]`. Commit identity remains pending the parent commit. Build-generated `frontend/dist` cleanup remains pending because this writer is prohibited from destructive restore/delete commands.

## Allowed Edit Surface

- `frontend/src/styles/site.css`
- `frontend/src/styles/configurator.css`
- `DESIGN.md`
- `.impeccable/design.json`
- `.impeccable/surfaces/frontend-src-app-jsx.md`
- `odd/tasks/engineering-blueprint-color-pass.md`

## Progress

- Active task: EBP-3, pending parent commit identity and build-output cleanup.
- Reviewed boundary: `3ff7af4`.

## Next Step

Parent restores/removes the build-generated `frontend/dist` outputs, then commits the verified color-system work unit and records its identity.
