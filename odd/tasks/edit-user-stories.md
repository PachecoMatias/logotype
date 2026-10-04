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
- Forecast: approximately 380–420 authored changed lines across two work units.
- Branch: `feat/edit-user-stories`
- Reviewed boundary: `890cf4e`

## Tasks

- [ ] **STORY-1 — Persisted identity and PATCH contract**
  - Route: delegated direct; multiple non-trivial backend files and test-first API work trigger one bounded writer.
  - Acceptance: backlog responses include immutable persisted IDs; PATCH accepts a non-empty subset of approved fields, rejects invalid or immutable fields using existing validation conventions, updates JSON criteria correctly, returns `{ success: true, data }`, and returns 404 for an unknown ID.
  - Checks: observe focused API test RED then GREEN; backend lint; focused integration tests.
  - Commit: pending.
  - Review: pending.
- [ ] **STORY-2 — Shared editor in backlog and Kanban**
  - Route: delegated direct; shared state integration spans multiple non-trivial frontend files and triggers one bounded writer.
  - Acceptance: both entry points use one editor component; PATCH uses the real story ID; successful saves update the dedicated screen, Kanban card/modal, and canonical App state without reload; loading and API errors are visible; phase remains non-editable.
  - Checks: frontend production build and targeted structural verification of both integrations.
  - Commit: pending.
  - Review: pending.

## Progress

- Exploration completed against the current backend and both current frontend interfaces.
- User authorized exposing the persisted immutable story ID in the existing backlog response.

## Next Step

Implement STORY-1 with test-first evidence, commit it as one reviewable backend work unit, then assess the committed candidate.
