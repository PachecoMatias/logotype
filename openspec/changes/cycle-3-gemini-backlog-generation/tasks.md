# Tasks: Cycle 3 Gemini Backlog Generation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | Approximately 650–850 authored lines across migration handling, persistence, API wiring, and focused integration tests |
| 400-line budget risk | High |
| Chained PRs recommended | Yes, for reviewability; the maintainer has pre-authorized one `size:exception` PR |
| Suggested split | One authorized PR with two coherent work-unit commits: migration safety, then backlog generation/API flow |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add migration 005 constraint evolution, descendant recognition, fixed partial-state recovery, and rollback guards | PR 1, commit 1 | `npm test -- tests/integration/migrations.test.js` | N/A — migration safety is exercised through the guarded MySQL migration fixture rather than an application runtime harness | Revert `backend/migrations/005_enable_backlog_planning.up.sql`, `backend/migrations/005_enable_backlog_planning.down.sql`, the migration-005 branches in `backend/scripts/migrate.js`, and their migration assertions without changing migrations 001–004 |
| 2 | Add strict backlog generation, atomic first-writer persistence, cached repeat behavior, and the HTTP endpoint | PR 1, commit 2 | `npm test -- tests/integration/proyectos.api.test.js` | Controlled-gateway API scenario: request an analyzed project twice, request a non-analyzed project once, and request malformed provider JSON once; no live Gemini service | Revert the backlog schema, prompt, gateway extension, historias repository, service/controller/route additions, focused API tests, and the optional single README endpoint row; leave Cycle 2 analysis behavior and migration 005 intact |

The single PR is intentionally a `size:exception`; work-unit commits keep the review story and rollback boundaries coherent without leaving a decision pending. The apply worker must not execute verification commands. The maintainer will later run the focused commands above, then `npm test`, `npm run lint`, and `npm run format:check` as one consolidated verification.

The design threat matrix is explicitly `N/A`; no threat-specific RED tasks are added.

## Phase 1: Focused RED Coverage

- [x] 1.1 Add the controlled-provider success test in `backend/tests/integration/proyectos.api.test.js`: seed one `analizado` project with persisted analysis and no stories, return exactly 12 valid eight-field stories, request `POST /api/proyectos/:id/backlog` twice, and assert both stable responses, `planificado`, 12 stored rows, one provider call, and no second write.
- [x] 1.2 Add the not-analyzed RED case in `backend/tests/integration/proyectos.api.test.js`: seed a `nuevo` project without stories, request the backlog endpoint, and assert HTTP 409 with the exact `PROJECT_NOT_ANALYZED` envelope, zero provider calls, zero story rows, and unchanged project state.
- [x] 1.3 Add the invalid-provider-JSON RED case in `backend/tests/integration/proyectos.api.test.js`: seed an `analizado` project without stories, return malformed JSON from the controlled `generateProjectBacklog` double, and assert the sanitized HTTP 502 `AI_ANALYSIS_FAILED` envelope, no story rows, and state still `analizado`.
- [ ] 1.4 Extend `backend/tests/integration/migrations.test.js` with minimal migration-005 proof: exact target status and role checks, unchanged `historias` columns, unchanged migrations 001–004 checksums, a second `up` accepting the verified 005 descendant, one representative fixed partial-state recovery, safe ordered rollback, and retained-data rollback refusal; do not add an exhaustive state matrix.
  - Deferred/non-blocking known issue: migration 005 safe ordered rollback fails and leaves the documented 10 cleanup-residue consequences. Individual migration 005 up and recovery evidence is green.

## Phase 2: Migration and Persistence Foundation

- [x] 2.1 Create `backend/migrations/005_enable_backlog_planning.up.sql` and `backend/migrations/005_enable_backlog_planning.down.sql` containing only the exact `proyectos.estado` and `historias.rol_sugerido` constraint replacements; add `planificado` and the four missing generated role labels while retaining all legacy labels, and add no story columns.
- [ ] 2.2 Modify `backend/scripts/migrate.js` to register migration 005 as a specialized two-constraint migration, recognize exact source/target/incompatible states, repair only `source/source`, `target/source`, and `source/target`, verify `target/target` before recording success, preserve migration 001–004 bytes/checksums, accept only the exact migration-005 descendant in migration-004 verification, and refuse rollback when `planificado` projects or newly permitted roles remain.
  - Deferred/non-blocking known issue: migration 005 rollback is not accepted as complete because its target-to-source transition fails; all up/recovery behavior is established.
- [x] 2.3 Create `backend/src/schemas/project-backlog.schema.js` with shared constants and strict runtime/provider contracts for 12–25 stories: exactly the eight public fields, existing six phases, three priorities, six requested roles, seven Fibonacci values, strict objects, non-blank text, and matching supported provider JSON-schema keywords without unsupported `minLength` or `pattern` keywords.
- [x] 2.4 Create `backend/src/repositories/historias.repository.js` with stable `id ASC` reads of the eight public story fields and `persistGeneratedBacklog(configuration, projectId, stories)` backed by `withTransaction()`: lock the project, re-read stories, preserve an existing race winner, require locked `analizado` state, bulk-insert the validated candidate, set `planificado`, verify the stored count, and return `existing`, `committed`, or `ineligible` outcomes. Keep provider I/O outside the transaction and make failures roll back both stories and state.

## Phase 3: Generation and API Wiring

- [x] 3.1 Create `backend/src/prompts/project-backlog.prompt.js` with deterministic trusted backlog instructions and separate `BEGIN_UNTRUSTED_PROJECT_PAYLOAD_JSON` / `END_UNTRUSTED_PROJECT_PAYLOAD_JSON` and `BEGIN_UNTRUSTED_PROJECT_ANALYSIS_JSON` / `END_UNTRUSTED_PROJECT_ANALYSIS_JSON` regions, using only persisted project data and analysis and ignoring request-body generation content.
- [x] 3.2 Modify `backend/src/integrations/gemini.gateway.js` to factor the existing structured-content request into a private reusable helper and add `generateProjectBacklog(prompt)` using `projectBacklogJsonSchema`, while preserving Cycle 2 analysis inputs, lazy configuration, client creation, and exchange-capture behavior unchanged.
- [x] 3.3 Modify `backend/src/services/proyectos.service.js` to inject the historias repository and backlog prompt builder, load the project, return stored stories before eligibility/provider work, reject storyless non-`analizado` projects with HTTP 409 `PROJECT_NOT_ANALYZED`, call the existing gateway, parse and strictly validate provider JSON, normalize only provider/output failures to the existing sanitized 502 error, persist through the transactional repository, and reload the server-owned race winner when necessary.
- [x] 3.4 Modify `backend/src/controllers/proyectos.controller.js` and `backend/src/routes/proyectos.routes.js` to expose `POST /api/proyectos/:id/backlog` with existing identifier validation and success envelopes, place the route before `GET /:id`, and leave request-body content unused.
- [x] 3.5 Add at most one backlog endpoint row to `backend/README.md` if needed to keep the existing endpoint list complete; do not add a new README, live-Gemini instructions, broad provider documentation, or any unrelated operational guidance.

## Phase 4: Scope and Handoff Review

- [x] 4.1 Review the final diff against the approved file list and confirm there are no frontend changes, new provider/configuration/error/state architectures, retries, authentication, semantic scoring, live-provider harnesses, exhaustive matrices, story columns, or Fibonacci-to-days behavior; retain the maintainer-only verification commands and the authorized `size:exception` single-PR boundary.
