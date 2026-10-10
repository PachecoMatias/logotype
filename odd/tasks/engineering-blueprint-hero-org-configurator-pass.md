# Engineering Blueprint Hero, Organization, and Configurator Pass

## Objective

Refine the Stage 1 Hero, Organization Chart, and Configurator so they feel more authored, legible, and visually integrated with the existing Engineering Blueprint system without changing motion, behavior, business contracts, navigation, backend, or panel surfaces.

## Problem and Why

The stabilized Hero still leaves the left wordmark plane visually underdeveloped. The Organization Chart's lower role nodes use graphite text over a transparent graphite field, which makes some roles appear missing even though the node height can grow. The Configurator preserves the correct workflow but its light header, neutral workspace, controls, actions, and summary do not yet carry the same technical hierarchy and registered-field confidence as the public site.

## Authorized Scope

- Add a restrained static technical field behind `LOGO / TYPE` using existing palette variables and authored CSS/SVG-style primitives.
- Restore complete lower-node contrast and robust label wrapping in the Organization Chart while preserving its structure and dark section field.
- Refine the Configurator header, progress register, workspace, step hierarchy, controls, options, focus/error/disabled states, actions, and final summary using existing Engineering Blueprint roles.
- Preserve the seven steps, their order, all content, current DOM, and every behavior contract.

## Explicitly Out of Scope

- Motion, animation, transitions, or Framer Motion changes.
- Logic, state, API, payload, validation, navigation, backend, panel, route behavior, JSX/DOM, or shared `index.css` changes.
- Tailwind, UI libraries, dependencies, new colors, stock imagery, generic illustration, gradients, glass, decorative shadows, nested cards, or generic SaaS patterns.
- Changes to the stabilized Hero plane, statement, CTA, axis, shell coordinates, or responsive ownership.
- Changes to `DESIGN.md` or `.impeccable` artifacts; existing durable rules already cover this pass.

## Delivery Strategy

- Strategy: `ask-on-risk` on `redesign/public-site`; forecast is approximately 280–360 authored changed lines, below the chaining threshold unless the observed count exceeds 400.
- Route: delegated direct; one writer owns the sequential CSS work units.
- Reviewed boundary: `508e942`.
- No push or pull request is authorized.

## Tasks

- [x] **EHC-1 — Audit the three visual surfaces and protected contracts**
  - Evidence: Hero decoration can remain CSS-only; lower Organization roles lose contrast because transparent nodes combine graphite text with the graphite section; Configurator visual hooks are fully available in its scoped stylesheet and behavior files need no edits.
- [x] **EHC-2 — Refine Hero field and Organization readability**
  - Acceptance: the left Hero gains a restrained static technical diagram behind the wordmark without competing with it or altering stabilized geometry; every Organization role has clear contrast, padding, growth, and wrapping with no clipping.
  - Checks: focused CSS diff, changed-line motion scan, protected-path diff, build, detector, overflow safeguards.
  - Evidence: `site.css` adds a non-interactive, responsive line-and-node field behind the wordmark without changing the protected Hero frame, statement, axis, shell variables, or overflow ownership. Organization nodes now use a canvas field with graphite text, centered natural-height layout, expanded padding, and `overflow-wrap: anywhere`/hyphenation. `npm run build` passed with 432 modules transformed; scoped `git diff --check` passed with only the existing LF-to-CRLF warning; the focused changed-line diff contains no motion, animation, or transition declarations and adds no `overflow-x: hidden`. No browser tooling was available, so no visual, zoom, or runtime overflow evidence is claimed. The shared detector remains intentionally deferred until all UI edits are final. Work-unit commit: `89b9414` (`fix(frontend): refine hero field and organization nodes`). Native RDD assessed the committed range from `508e942` as `medium / under_budget`, so it remains in the pending slice.
- [x] **EHC-3 — Refine the Configurator experience**
  - Acceptance: header, progress, workspace, step hierarchy, controls, state styling, actions, and summary form one cohesive premium Engineering Blueprint experience while all seven steps and behavior contracts remain unchanged.
  - Checks: CSS-only diff, protected behavior-path diff, build, detector, focus/error/disabled source invariants, responsive safeguards.
  - Evidence: `configurator.css` now treats the graphite topbar and progress register as one technical header, strengthens the registered workspace/stage, clarifies step hierarchy, and gives controls, error/disabled states, options, chips, actions, loading, and the summary registry explicit palette roles without changing state semantics. `npm run build` passed with 432 modules transformed; scoped `git diff --check` passed with only the existing LF-to-CRLF warning; the focused changed-line diff contains no motion, animation, or transition declarations and adds no `overflow-x: hidden`. Protected behavior/source paths have no diff. The final Impeccable detector ran exactly once and returned `[]`.
- [ ] **EHC-4 — Verify and close the work units**
  - Acceptance: builds pass, generated output is cleaned, protected paths and motion are unchanged, no horizontal-overflow shortcut is introduced, RDD outcomes and commit identities are recorded, and browser evidence is reported only when tooling is actually available.
  - Checks: `npm run build`, `git diff --check`, protected-path diff, detector, 375/768/1280 plus zoom when browser tooling is available.
  - Pending: parent-owned work-unit commits and native RDD outcomes; cleanup of Vite-generated tracked/untracked `frontend/dist` output; browser inspection at 375/768/1280, zoom, all seven steps/states, Organization wrapping, and `scrollWidth === clientWidth` because no browser tooling was available to this writer.

## Allowed Edit Surface

- `frontend/src/styles/site.css`
- `frontend/src/styles/configurator.css`
- `odd/tasks/engineering-blueprint-hero-org-configurator-pass.md`

## Progress

- Status: EHC-2 and EHC-3 implementation plus source/build/detector verification complete. EHC-4 remains open for the Configurator commit, generated-output confirmation, native RDD outcome, and unavailable browser evidence.

## Next Step

Commit EHC-3 with its evidence, assess the cumulative slice, then close EHC-4.
