# Edit User Stories

## Objective

Allow any user to edit persisted backlog stories from both the dedicated backlog screen and the Kanban story modal through one shared editor, without reloading the page.

## Problem and Why

Generated stories are currently read-only. The API also hides persisted story IDs, so the frontend fabricates identities that cannot safely address a story update. Editing requires a real immutable identity, a validated partial-update contract, and synchronized frontend state.

## Scope

- Expose each persisted story `id` in the existing backlog response without changing backlog generation.
- Add `PATCH /api/historias/:id` for the approved editable fields.
- Reuse existing Zod constraints for priorities, roles, Fibonacci estimates, and story fields.
- Add one shared story editor used by the backlog screen and Kanban modal.
- Update canonical and Kanban-local story state after save without a full-page reload.

## Constraints

- Do not change backlog generation behavior or add a story read endpoint.
- Do not add authentication, role restrictions, audit history, or phase editing.
- Do not change analysis, project creation, configurator, or unrelated flows.
- Preserve pre-existing changes in `.atl/.skill-registry.cache.json` and `.atl/skill-registry.md`.
- Generated technical artifacts remain in English.

## Authorized Scope

Backend story schemas, repository, service/controller/router wiring, focused API tests, frontend backlog identity adaptation, shared editor UI, backlog and Kanban integrations, and their focused styling are authorized.

## Delivery

- Strategy: `ask-on-risk`
- Chain strategy: `stacked-to-main` (user-selected).
- Forecast: approximately 380–420 authored changed lines across two work units.
- Running count: 379 lines in Slice 1 and 358 lines in Slice 2.
- Branches: `feat/edit-user-stories` → `feat/edit-user-stories-ui`.
- Reviewed boundary: `890cf4e`
- Slice 1: `4fbb24f` — backend persisted identity and PATCH contract; target `main`.
- Slice 2: `4ee3748` — shared frontend editor; built on Slice 1 and retargeted/rebased after Slice 1 lands.

## Tasks

- [x] **STORY-1 — Persisted identity and PATCH contract**
  - Route: delegated direct; multiple non-trivial backend files and test-first API work trigger one bounded writer.
  - Acceptance: backlog responses include immutable persisted IDs; PATCH accepts a non-empty subset of approved fields, rejects invalid or immutable fields using existing validation conventions, updates JSON criteria correctly, returns `{ success: true, data }`, and returns 404 for an unknown ID.
  - Checks: RED observed with 14 expected failures; GREEN 14/14 focused historias tests; backlog contract tests 3/3; ESLint and touched-file Prettier checks passed. Full migration suite has 15 failures independently reproduced at base `890cf4e` (25 pass / 15 fail), so they are pre-existing environmental failures.
  - Commit: `4fbb24f` (`feat(api): edit persisted user stories`).
  - Review: medium, `under_budget`; native review deferred in the current slice.
- [x] **STORY-2 — Shared editor in backlog and Kanban**
  - Route: delegated direct; shared state integration spans multiple non-trivial frontend files and triggers one bounded writer.
  - Acceptance: both entry points use one editor component; PATCH uses the real story ID; successful saves update the dedicated screen, Kanban card/modal, and canonical App state without reload; loading and API errors are visible; phase remains non-editable.
  - Checks: frontend production build passed with 430 modules transformed; structural checks confirmed one seven-field editor, both entry points, real-ID PATCH calls, canonical and Kanban-local state updates, and removal of fabricated IDs. No frontend test runner exists, so RED was not applicable.
  - Commit: `4ee3748` (`feat(frontend): edit backlog user stories`).
  - Review: medium, `under_budget`; native review deferred in the current slice.

## Progress

- Exploration completed against the current backend and both current frontend interfaces.
- User authorized exposing the persisted immutable story ID in the existing backlog response.
- STORY-1 completed with persisted IDs, validated partial updates, uniform 404 handling, and focused integration coverage.
- STORY-2 completed with one shared editor and immediate synchronized updates in both frontend interfaces.

## Next Step

Implementation is complete. Push and PR creation remain user decisions; Slice 1 must land before Slice 2 is retargeted or rebased onto `main`.
