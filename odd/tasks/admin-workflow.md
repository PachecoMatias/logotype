# Admin Workflow

## Objective

Persist each story's Kanban column so the board retains its state after reloads and across browser sessions.

## Problem and Why

The database already stores `columna_tablero`, but the backlog API mapper drops it and the frontend board places every story in Backlog. Card moves only mutate component memory, so navigation or another browser loses the board state.

## Scope

- Add `PATCH /api/historias/:id/columna` with strict validation for the six supported columns.
- Return the persisted board column from both generated and existing backlog responses.
- Initialize the board from each story's persisted column.
- Persist card moves optimistically, roll back failed moves, show a brief error, and preserve per-story request order.
- Add focused backend integration coverage and run proportionate frontend build verification.

## Constraints

- Unit 1 of the three-unit admin workflow; units 2 and 3 remain outside the current authorized scope.
- Do not modify the existing `PATCH /api/historias/:id` contract.
- Do not add a migration because `columna_tablero` already exists with the required values and default.
- Do not change the board design or add manual ordering within columns.
- Do not commit or intentionally modify `frontend/dist`.
- Migration failures associated with the rollback of migration 005 are a known pre-existing issue and must not be changed.
- Generated technical artifacts remain in English.

## Authorized Scope

Dedicated story-column validation and endpoint wiring, repository persistence and API mapping, backlog response schemas, focused integration tests, frontend API/state/board behavior, and this ODD recovery document.

## Delivery

- Strategy: `ask-on-risk`.
- Forecast: approximately 250–350 authored changed lines for Unit 1.
- Running count: approximately 320 authored changed lines in Unit 1, including tests and this recovery document.
- Branch: `feat/admin-workflow`, based on `redesign/internal-panel` at `2fc713a`.
- Reviewed boundary: `2fc713a`.

## Tasks

- [x] **ADMIN-1 — Persist Kanban story columns**
  - Route: delegated direct; backend and frontend behavior spans multiple non-trivial files and requires test-first API work.
  - Acceptance: the dedicated PATCH accepts exactly the six board columns and returns the updated mapped story; invalid values return 400; unknown IDs return the established 404; generated and cached backlog responses expose the persisted column; the board initializes from it; moves update immediately, persist in per-story order, and roll back with a brief alert on failure.
  - Checks: RED observed before route/mapping implementation; historias integration tests passed 20/20; the exact generated/cached backlog test passed 1/1; touched backend ESLint and Prettier checks passed; frontend temporary-output production build passed with 439 modules; parent reran historias 20/20; `git diff --check` passed; `frontend/dist` remained untouched. The broader proyectos file was not used as the final check because a pre-existing concurrent-analysis test stalled before reaching backlog coverage.
  - Commit: this work-unit commit, `feat(admin): persist Kanban story columns`; exact hash is mirrored in Engram after creation.
  - Review: medium, `under_budget`; native review is deferred within the current slice.

## Progress

- Confirmed a clean starting worktree and created `feat/admin-workflow` from the latest redesigned panel branch.
- Confirmed the exact database column and constraint already exist; no migration is required.
- Mapped the existing backend response conventions, shared backlog mapper, App-owned state, and board-local movement behavior.
- Implemented the dedicated endpoint, persisted response mapping, optimistic frontend movement, per-story request queues, guarded rollback, and inline failure notice.
- Completed focused backend checks, frontend build verification, and the required parent spot check without touching `frontend/dist`.

## Next Step

Unit 1 is complete. Units 2 and 3 await separate user scope; push and PR creation remain user decisions.
