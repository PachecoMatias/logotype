# Panel UX Refinements

## Objective

Improve panel contrast and backlog presentation, add a dedicated user-stories view, and provide non-destructive Kanban story details while preserving existing backend contracts and behavior.

## Scope

- Request-list and project-detail contrast.
- Shared in-memory backlog data across detail, user-stories, and board views.
- Dedicated user-stories screen.
- Kanban story-detail modal and Done-state styling.
- Basic responsive and accessibility behavior.
- Frontend-only changes; backend, Gemini, scheduling, and movement rules are out of scope.

## Constraints

- Direct ODD implementation; no SDD artifacts or phases.
- Reuse the real backlog returned by the existing endpoint; do not generate or duplicate stories in the frontend.
- Preserve current board movement semantics and date calculation.
- Do not modify backend files.
- Do not commit yet, per explicit user instruction.
- TDD is not configured for this frontend and no frontend test runner exists; verify with production build and focused navigation/runtime checks.

## Work Unit

- [x] **UX-1 — Refine panel readability and backlog navigation**
  - Route: delegated direct ODD implementation; no SDD.
  - Trigger evidence: the implementation spans App navigation/state, multiple Panel components, new views/modal, and responsive CSS.
  - Acceptance criteria:
    - Request-list and detail headings/messages have readable contrast over the dark gradient.
    - Detail shows `Generar backlog` before generation and only `Ver tablero` plus `Ver historias de usuario` after success.
    - User-stories view renders the existing real backlog and returns to detail without losing project/backlog state.
    - Board consumes the shared backlog without generating new stories.
    - Each Kanban card opens a closable detail modal without navigating or resetting the board.
    - Cards in Done have a clear green completed style; movement logic is unchanged.
    - New views and modal remain usable on narrow screens.
    - `npm run build` passes and the requested navigation path is verified.
  - Checks:
    - `npm run build` in `frontend/`.
    - Structural/state-flow harness or focused browser verification for solicitudes → detalle → backlog → historias → volver → tablero → modal → Done.
    - `git diff --check` and empty backend diff.
  - Evidence:
    - `npm run build` in `frontend/`: PASS with Vite 5.4.21; 429 modules transformed; output `index.html` 0.42 kB (gzip 0.29 kB), CSS 22.57 kB (gzip 5.13 kB), JS 313.87 kB (gzip 98.34 kB); built in 2.96s. Generated `dist/` changes were restored after verification.
    - Structural state-flow harness: PASS for solicitudes → detalle → backlog → historias → volver → tablero → modal → Done. It verified App-owned per-project cache and selected-project preservation, detail publication of the once-adapted backlog, presentation-only stories, shared board input, modal wiring, Done-derived styling, responsive rules, and byte-for-byte unchanged Kanban movement logic after line-ending normalization.
    - Browser automation: not run; the frontend has no browser/test runner dependency and no browser automation tool was available. Interaction behavior was verified structurally and the production bundle compiled successfully.
    - Backlog ownership: focused source search found the backlog API request exactly once, in `PanelDetalle.jsx`; `PanelTablero.jsx` and `PanelHistorias.jsx` contain no backlog request.
    - Accessibility/responsive readback: dialog has `role="dialog"`, `aria-modal`, labelled heading, explicit labelled close button, Escape/backdrop close, and trigger-focus restoration; action groups stack at 650 px, stories use a single-column grid, columns retain horizontal scrolling, and the modal is viewport-bounded.
    - Contrast checks: white on `#0f172a` 17.85:1; `#cbd5e1` on `#172554` 9.90:1; `#e2e8f0` on `#172554` 11.92:1; `#fecaca` on `#172554` 10.16:1; `#075985` on `#e0f2fe` 6.59:1; white on completed `#166534` 7.13:1.
    - `git diff --check`: PASS with no whitespace errors. `git diff --exit-code -- backend`: exit 0 with empty output.
  - Commit: explicitly deferred by user.

## Progress

- Branch: `fix/panel-ux-refinements`.
- UX-1 implemented and verified on the merged baseline.
- No backend files, backend contracts, Gemini logic, backlog-generation logic, calculator behavior, or Kanban movement rules were changed.
- CodeGraph initialization was attempted but the upstream `codegraph` executable is unavailable; exploration used targeted reads.

## Next Step

Keep the verified work unit uncommitted until the user explicitly authorizes a commit.
