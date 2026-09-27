# Apply Progress: Cycle 2 Gemini Project Viability

**Mode**: Standard; RED coverage is preserved, migration GREEN tasks 1.6–1.7 are verified by maintainer evidence, and Unit 2 boundary verification is complete.

**Delivery**: Single PR with maintainer-authorized `size:exception`; Unit 1 committed as `67623e5 feat(db): add recoverable project analysis migration`.

## Completed RED Tasks

- [x] 1.1–1.5 Migration target, recovery, ambiguity, rollback, and child-process boundary coverage.
- [x] 2.1–2.3 Schema parity, untrusted-payload prompt, and lazy configuration/gateway coverage.
- [x] 3.1–3.6 Repository mapping, orchestration, route validation, failure isolation, cache/health, and concurrent-winner coverage.
- [x] 4.1 Normal-discovery and live-guard preparation coverage.
- [x] 1.6 Additive migration SQL.
- [x] 1.7 Migration runner recovery, classification, safe repair, and rollback preflight.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npm test -- tests/unit/project-analysis.test.js tests/unit/bootstrap.test.js` (from `backend/`): exit 1; 11 tests, 2 passed, 9 RED failures. Every failure is an assertion for missing Cycle 2 behavior: live command/configuration placeholders, strict schema, prompt builder, lazy Gemini configuration/gateway, or service factory. No syntax, uncaught import, fixture, or live-provider failure occurred. |
| Runtime harness command | `npm test -- tests/integration/migrations.test.js tests/integration/proyectos.api.test.js` (from `backend/`): exit 1; 49 tests, 22 passed, 27 RED failures. Guarded MySQL was available. Failures identify absent migration 004/recovery/refusal behavior, analysis repository mapping, Gemini gateway, and analysis route/envelopes; no real Gemini call occurred. |
| Live-provider command | N/A — deliberately not run. This RED-only batch must not invoke the live harness or a real Gemini provider. |
| Rollback boundary | Revert only `backend/tests/helpers/test-database.js`, `backend/tests/integration/migrations.test.js`, `backend/tests/integration/proyectos.api.test.js`, `backend/tests/unit/bootstrap.test.js`, `backend/tests/unit/project-analysis.test.js`, and `backend/tests/live/gemini-analysis.live.js`. No production behavior changes were made. |

## Remaining RED Work

- [ ] 4.2 Complete live-evidence RED assertions remains unchecked because its opt-in live command was intentionally not executed.

## Remaining GREEN Work

- [ ] 3.7–3.9, 4.3–4.5, and 5.1–5.5.

## Completed GREEN Work Unit: 1.6–1.7

- [x] 1.6 Additive migration SQL provides the required atomic up and down ALTER statements.
- [x] 1.7 Migration 004 registration, schema inventory/classification, fixed-clause recovery, ambiguity refusal, rollback data preflight, and post-DDL source/target verification are complete.

The maintainer supplied observed GREEN results after the MySQL 9.1 singleton-CHECK correction. No database reset was required.

## Migration GREEN Correction and Verification

The maintainer observed that the focused migration suite failed with 36 tests total, 5 passing, and 31 failing (exit 1); `npm run db:migrate:test` and `npm run db:rollback:test` also exited 1. Each failure reported `Migration 004 cannot recover: Project analysis schema is ambiguous or incompatible`.

Read-only metadata inspection of guarded `logotype_test` on MySQL 9.1.0 confirmed the valid Cycle 1 source state: `estado` is `varchar(32)`/NOT NULL/default `nuevo`; `analisis_ia` is absent; `chk_proyectos_estado` is canonicalized by MySQL as `(estado = 'nuevo')`; and `chk_proyectos_payload_objeto` is `(json_type(payload) = 'OBJECT')`.

The root cause was a narrow semantic-normalization gap: migration 001 declares singleton source status as `estado IN ('nuevo')`, while MySQL 9.1 reports the exact equivalent singleton equality form. Migration 004 classified the equality as incompatible.

The correction in `backend/scripts/migrate.js` accepts only the canonicalized exact source forms `estado IN ('nuevo')` and `estado = 'nuevo'`; quoted values remain case-sensitive and no broader SQL equivalence is introduced. `backend/tests/integration/migrations.test.js` now covers the MySQL singleton-equality source path, rejects `Nuevo` and `other` singleton drift, and updates stale complete-up/complete-down expectations for migration 004.

Tasks 1.6 and 1.7 are checked complete after maintainer GREEN evidence.

## Completed Migration Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | Maintainer ran `npm test -- tests/integration/migrations.test.js` from `backend/`: 38/38 pass, 0 fail, exit 0. |
| Runtime harness command | Maintainer ran `npm run db:migrate:test`: no errors, exit 0; then `npm run db:rollback:test`: no errors, exit 0. No database reset was required. |
| Rollback boundary | Revert `backend/migrations/004_add_project_ai_analysis.up.sql`, `backend/migrations/004_add_project_ai_analysis.down.sql`, migration-004-specific logic in `backend/scripts/migrate.js`, and the paired migration helper/integration coverage in `backend/tests/helpers/test-database.js` and `backend/tests/integration/migrations.test.js` together. Existing migrations 001–003 remain untouched. |

## Completed GREEN Work Unit: 2.4

- [x] 2.4 Dependency, lazy configuration, strict schema, persisted-payload prompt, and Gemini gateway implementation are complete.

| Evidence | Result |
|---|---|
| Focused test command | Maintainer reran `npm test -- tests/unit/project-analysis.test.js tests/unit/bootstrap.test.js` from `backend/`: 11 total, 7 pass, 4 fail, exit 1. The four failures are exactly the two planned Phase 3 service-factory tests and two planned Phase 4 live-command/harness tests; there are no new failures. The shared RED scaffold therefore still exits 1 even though the Unit 2 implementation tests pass. |
| Runtime harness command | N/A for real provider by design. This unit uses an injectable fake client in automated tests; no provider-call or application-execution result is inferred beyond the supplied test evidence. |
| Rollback boundary | Revert `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`, `backend/src/config/env.js`, `backend/src/schemas/project-analysis.schema.js`, `backend/src/prompts/project-viability.prompt.js`, and `backend/src/integrations/gemini.gateway.js` together. No service, repository, controller, or route wiring is included. |

### Unit 2 Secret-Boundary Guarantees

- `GEMINI_API_KEY` is parsed only when `generateProjectAnalysis()` reaches the real provider boundary; imports, startup, and unrelated routes do not parse it.
- The gateway constructs `GoogleGenAI` only at call time and exposes `captureExchange` only a key-free request snapshot plus raw provider text.
- The tracked environment example contains only the non-secret placeholder `replace-with-gemini-api-key` and model default `gemini-2.5-flash`.
- The prompt serializes only the persisted payload inside explicit untrusted-data delimiters; it does not add a client analysis body, key, or provider configuration.

### Unit 2 Install Result

`npm --userconfig NUL --registry https://registry.npmjs.org/ install @google/genai@^2.24.0` completed from `backend/`: added 36 packages, audited 226 packages, and reported 0 vulnerabilities. The lockfile resolves `@google/genai` 2.24.0 from `https://registry.npmjs.org/`.

## Unit 2 Maintainer Failure Triage and Correction

The maintainer ran `npm test -- tests/unit/project-analysis.test.js tests/unit/bootstrap.test.js` from `backend/` and observed 11 tests: 5 passed, 6 failed, exit 1. The test files define six named `project-analysis` tests and five named `bootstrap` tests.

Four failures remain intentionally pending later work:

- `package scripts use only approved fixed local entry points` requires the Phase 4 `test:gemini:live` script (task 4.4).
- `keeps normal discovery quota-free and requires every live guard before a provider call` requires the Phase 4 live-harness scaffold and its guards (tasks 4.3–4.4).
- `orders project analysis work, returns a valid cache, and resolves a first-writer race` requires the Phase 3 project-service factory (task 3.7).
- `fails closed when a race reload is not a valid stored analysis` also requires the Phase 3 project-service factory (task 3.7).

The two Unit 2 defects were corrected without implementing Phase 3 or Phase 4 behavior:

- The schema-parity helper was called without the provider JSON schema, causing `schema.required` to read from `undefined`. The test now passes `projectAnalysisJsonSchema` explicitly, so it checks the existing exact five-field root schema, its `required` list, `additionalProperties: false`, enums, and types against strict Zod validation.
- The prompt test used the first `END_UNTRUSTED_PROJECT_PAYLOAD_JSON` occurrence, which can be a delimiter-like string serialized from persisted untrusted text. The prompt now states that only the final standalone end marker closes the data region, and the test selects the final marker, asserts it ends the prompt, and verifies the complete `JSON.stringify(persistedPayload)` is between the real boundaries.

No test, application, provider, Gemini, migration/MySQL, lint, formatter, or install command was run for this correction. The maintainer's subsequent 7-pass/4-planned-fail rerun supplies the separate task-2.5 evidence recorded below.

## Unit 2 Correction Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | Superseded by the maintainer rerun recorded above: `npm test -- tests/unit/project-analysis.test.js tests/unit/bootstrap.test.js` from `backend/` produced 11 tests, 7 pass, 4 planned later-phase failures, exit 1. The agent did not run it. |
| Runtime harness command | N/A — this narrow schema/prompt correction has no runtime boundary and must not invoke application or provider code. The live provider harness remains Phase 4 work. |
| Rollback boundary | Revert `backend/src/prompts/project-viability.prompt.js`, the related parity/prompt assertions in `backend/tests/unit/project-analysis.test.js`, and this correction record together. No service, repository, controller, route, live harness, or package-script behavior is included. |

## Notes

- The focused unit and integration tests use controlled assertion failures for absent Cycle 2 modules/behavior, rather than failing at module import, syntax, fixtures, or harness setup.
- MySQL check-clause inspection normalizes MySQL-added quoting, character-set introducers, escapes, parentheses, and spaces before comparing the exact expected clauses.
- `git diff --check -- backend/scripts/migrate.js backend/tests/integration/migrations.test.js openspec/changes/cycle-2-gemini-project-viability/apply-progress.md` completed with exit code 0 and no output after this correction.

## Completed GREEN Task: 2.5 Boundary Verification

- [x] 2.5 Boundary verification is complete before application wiring.

| Evidence | Result |
|---|---|
| Focused test command | Maintainer ran the required combined command from `backend/`: `npm test -- tests/unit/project-analysis.test.js tests/unit/bootstrap.test.js`. Exact result: 11 total, 7 pass, 4 fail, exit 1. The seven passing assertions cover every Unit 2 schema, prompt, lazy-configuration, fake-client gateway, startup/key-free, and unrelated bootstrap acceptance path. |
| Scoped failure disposition | The four failures are exactly two planned Phase 3 service-factory RED tests and two planned Phase 4 live-command/harness RED tests. They do not exercise an unmet Unit 2 acceptance criterion and remain intentionally pending. No other failure occurred. |
| Runtime harness command | N/A for a real provider by Unit 2 design. The passing fake-client gateway and key-free/startup assertions prove the automatic boundary uses no real Gemini call by construction; the preserved live guards retain the real-provider path outside ordinary verification. |
| Rollback boundary | Revert `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`, `backend/src/config/env.js`, `backend/src/schemas/project-analysis.schema.js`, `backend/src/prompts/project-viability.prompt.js`, and `backend/src/integrations/gemini.gateway.js` together with their Unit 2 tests. |

Task 2.5 is scoped successful despite the command's non-zero aggregate exit: its explicit acceptance criteria are proved by the seven passing Unit 2 assertions, while the four failures belong only to deliberately preserved later-phase RED work. No real Gemini call occurred.

## Implemented but Unverified Work Unit: 3.7–3.8

- [ ] 3.7 Repository/service implementation is present: project selects map `analisis_ia`, string-valued stored JSON is strictly validated as a persistence invariant, `storeAnalysisIfPending()` conditionally updates both analysis and status, and the injectable service handles lookup-first cache, provider normalization, validated persistence, and first-writer reload behavior.
- [ ] 3.8 Controller/route integration is present: `POST /api/proyectos/:id/analizar` uses the existing positive-integer parameter schema and success envelope while preserving centralized error handling.
- [ ] 3.9 Mocked public API verification remains maintainer-owned and pending.

| Evidence | Result |
|---|---|
| Focused test commands | Not run by instruction. Maintainer must separately run, in order: (1) `npm test -- tests/unit/project-analysis.test.js` from `backend/` for Phase 3 service-factory evidence; and (2) `npm test -- tests/integration/proyectos.api.test.js tests/integration/proyectos.validation.test.js` from `backend/` for mocked public API evidence. These commands do not replace the already-observed task-2.5 combined command. |
| Runtime harness command | Not run by instruction. The guarded `logotype_test` listener-free Supertest path remains unverified. |
| Rollback boundary | Revert `backend/src/repositories/proyectos.repository.js`, `backend/src/services/proyectos.service.js`, `backend/src/controllers/proyectos.controller.js`, and `backend/src/routes/proyectos.routes.js` together; preserve Unit 1 migration and Unit 2 Gemini-boundary work. |

No tests, application/provider/Gemini calls, MySQL or migration commands, lint, formatter, package install, or live harness were run for Unit 3. The error handler remains unchanged because no RED evidence demonstrated a compatibility defect.

## Maintainer Scope Decision — Minimum Viable Closeout

The maintainer approved this minimum viable closeout because remaining quota is low. This record changes neither implementation nor task completion state.

### Task Accounting

- **Complete:** 19/31 tasks.
- **Closing scope:** 6 pending tasks — 3.7, 3.8, 3.9, 5.2, 5.4, and 5.5.
- **Deferred:** 6 pending tasks — 4.2, 4.3, 4.4, 4.5, 5.1, and 5.3.
- Deferred tasks are postponed after delivery, only if time remains; they are neither completed nor cancelled.
- No task was marked complete by this decision record.

Tasks 3.7 and 3.8 are already implemented but remain unchecked. Tasks 3.7–3.9 close together only after task 3.9 has real mocked-public-API evidence. The automatic gate in task 5.2 is explicitly not trimmed.

### Task 5.3 Ad-hoc Substitution

Instead of the committed live harness, the maintainer accepts one direct real Gemini call against an existing project. The full request and response must be shown as the primary evidence. This substitute is ad-hoc: its guards are procedural rather than code-enforced, and no `test:gemini:live` script or committed harness exists.

### Real-Call Blocker and Environment Facts

- A redacted presence check of `backend/.env` shows `GEMINI_API_KEY` and `GEMINI_MODEL` are absent.
- No key value was read, recorded, or echoed.
- MySQL is reachable on `127.0.0.1:3306`.
- The absent Gemini variables block the direct real Gemini call until the maintainer provides the required local configuration without exposing it.

### Maintainer Automatic-Gate Commands

From `backend/`:

1. `npm test -- tests/unit/project-analysis.test.js`
2. `npm test -- tests/integration/proyectos.api.test.js tests/integration/proyectos.validation.test.js`
3. `npm run db:migrate:test`
4. `npm run db:seed:test`
5. `npm test`
6. `npm run lint`
7. `npm run format:check`

Then repeat the automatic gate once with no `GEMINI_API_KEY` present and once with Gemini variables present, to prove quota-free behavior.

### Permanent Dispatcher Rule

Duplicate authority/metadata errors get one attempt at most, then direct cleanup; interrupt only if it persists.

### Documentation-Only Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | Not run by instruction; this pass changes documentation and tracking only. |
| Runtime harness command | N/A — no runtime boundary was changed. |
| Rollback boundary | Revert only `openspec/changes/cycle-2-gemini-project-viability/tasks.md` and `openspec/changes/cycle-2-gemini-project-viability/apply-progress.md`. |

## Maintainer-Confirmed Application Closeout: 3.7–3.9 and 5.2

- [x] 3.7 Repository and service implementation is complete.
- [x] 3.8 Controller and route integration is complete.
- [x] 3.9 Mocked public API verification is complete.
- [x] 5.2 Complete automatic gate is complete.

The maintainer explicitly confirmed these tasks pass with green tests. This Apply batch did not rerun the full automatic gate, as directed. Exact per-command counts and transcripts were not supplied; they are not inferred here.

| Evidence | Result |
|---|---|
| Focused test command | Maintainer-confirmed green: `npm test -- tests/integration/proyectos.api.test.js tests/integration/proyectos.validation.test.js` from `backend/`. Exact test count/output was not provided. |
| Automatic gate | Maintainer-confirmed green for task 5.2: `npm run db:migrate:test`, `npm run db:seed:test`, `npm test`, `npm run lint`, and `npm run format:check` from `backend/`. Exact test counts and command transcripts were not provided. |
| Runtime harness command | Guarded MySQL with listener-free Supertest and a fully mocked Gemini gateway; maintainer-confirmed passing evidence. No real Gemini call is part of this evidence. |
| Rollback boundary | Revert the Unit 3 repository/service/controller/route files and associated mocked API tests together; the completed automatic-gate record can be reverted independently from the two OpenSpec artifacts. |

## Completed Work Unit: 5.4 Single-PR Boundary Review

- [x] 5.4 Single-PR boundary review is complete.

| Evidence | Result |
|---|---|
| Focused review commands | Ran from repository root: `git diff --stat`, `git status --short`, `git diff --name-only`, and `git diff --check`. `git diff --check` exited 0 with no whitespace diagnostics; Git emitted LF-to-CRLF warnings while inspecting pre-existing modified files. The tracked diff reported 14 files, 1,164 insertions, and 69 deletions. |
| Runtime harness command | N/A — this work unit changes review metadata only; its implementation/runtime evidence is carried by the underlying completed Units 1–3 and maintainer-confirmed 5.2 gate. |
| Boundary | One human-managed PR remains authorized under `size:exception`; no PR, branch, commit, push, or split was created in this batch. The worktree also contains pre-existing modified and untracked backend files outside the tracked-diff list, which were preserved untouched. |
| Rollback boundary | Revert only the 5.4 tracking/report additions in `tasks.md` and `apply-progress.md`; do not reset, clean, stash, or overwrite any existing backend worktree change. |

## Pending Direct Live-Call Addendum

The authorized one-off real Gemini call was scheduled after this review. It is procedural evidence only and does not implement or complete deferred task 5.3. Its observed disposition is recorded in the final acceptance report below.

## Completed Work Unit: 5.5 Final Acceptance Report

- [x] 5.5 Final acceptance report is complete.

### Acceptance Summary

| Acceptance area | Evidence and disposition |
|---|---|
| Migration checksum and recovery | Completed previously: maintainer recorded `npm test -- tests/integration/migrations.test.js` as 38/38 pass (exit 0), plus successful guarded `npm run db:migrate:test` and `npm run db:rollback:test`. Migration 001–003 remain unchanged by this work unit. |
| Mocked provider and automatic gate | Tasks 3.7–3.9 and 5.2 are complete from explicit maintainer-provided green evidence. The mocked API boundary is quota-free; this batch did not rerun its full gate. Exact transcripts beyond the reported pass state were not provided and are not invented. |
| One-off real Gemini receipt | Not observed. A sanitized local configuration presence check confirmed `backend/.env` exists but has no non-empty `GEMINI_API_KEY` or `GEMINI_MODEL`. The listener-free project list returned HTTP 500, leaving no eligible project selection. No provider request, provider call, persistence write, API analysis request, or receipt artifact was attempted; provider-call count is 0. No secret value was read or emitted. |
| Deferred live harness task | Task 5.3 remains unchecked. The one-off direct-call substitute does not create or complete the deferred committed harness. |
| Single-PR boundary | One human-managed `size:exception` PR remains the selected delivery path. No commit, PR, push, merge, formatter, migration, or test-suite rerun was performed in this batch. |

### Remaining Risks

- Simultaneous first analysis requests may produce two billable provider calls; the conditional write preserves first-writer-wins persistence but does not deduplicate overlapping provider work.
- A real Gemini receipt is blocked until a non-empty local Gemini key is configured and an existing local project can be selected through a healthy application path. This is not claimed as completed evidence.
- The six deferred tasks remain pending: 4.2, 4.3, 4.4, 4.5, 5.1, and 5.3.

### Cumulative Task Accounting

- **Complete:** 25/31 — 1.1–1.7, 2.1–2.5, 3.1–3.9, 4.1, 5.2, 5.4, and 5.5.
- **Deferred and unchecked:** 4.2–4.5, 5.1, and 5.3.

| Evidence | Result |
|---|---|
| Focused test command | N/A for this report-only work unit. It records maintainer-provided automatic verification and this batch's bounded review/configuration observations without rerunning the suite. |
| Runtime harness command | One-off listener-free Supertest preflight: `GET /api/proyectos` from the application path returned HTTP 500. It made zero Gemini/provider calls and selected no project. |
| Rollback boundary | Revert only the closeout reporting/checkmarks in `openspec/changes/cycle-2-gemini-project-viability/tasks.md` and `openspec/changes/cycle-2-gemini-project-viability/apply-progress.md`; preserve all existing backend worktree changes. |

## Corrective Live-Call Attempt 2/2

This corrective attempt verified the dotenv location without reading or emitting values. Repository-root `.env` is absent. `backend/.env` exists, but its `GEMINI_API_KEY` and `GEMINI_MODEL` values are both absent or empty. The listener-free application was then run from `backend/` with Node 22 `--env-file=.env`, so the prior list result is not attributable to using the repository root as the dotenv source.

| Evidence | Observed result |
|---|---|
| Dotenv source check | Root `.env`: absent; `backend/.env`: present; non-empty `GEMINI_API_KEY`: false; non-empty `GEMINI_MODEL`: false. No values or raw environment content were read, logged, or persisted. |
| Guarded application preflight | `GET /api/proyectos` through listener-free Supertest with `Accept: application/json`, no request body, and `backend/.env` loaded explicitly returned HTTP 500 with `{ "success": false, "error": { "code": "INTERNAL_ERROR", "message": "Internal server error" } }`. It yielded no eligible project. |
| Real analysis POST | Not sent. The pre-POST Gemini configuration guard failed, and list routing did not provide a project candidate. Provider-call count: 0. No gateway call, provider request, persistence write, retry, timeout retry, or receipt artifact occurred. |
| Sanitized application receipt | `POST /api/proyectos/:id/analizar` has no selected project ID, headers, body, status, or response because it was intentionally not issued. The code fallback model is `gemini-2.5-flash`; it was not selected for or sent to a provider call. |
| Rollback boundary | Revert only this corrective-attempt section from `openspec/changes/cycle-2-gemini-project-viability/apply-progress.md`; preserve all existing backend worktree changes and all task checkboxes. |

The ad-hoc direct-call substitute remains unavailable. Task 5.3 stays deferred and unchecked; cumulative task accounting remains 25/31.

## Runtime Evidence Addendum — Corrective Attempt 2/2

This corrective read resolves the prior list-shape uncertainty without exposing project data. The list controller returns the project collection directly in `{ success: true, data: projects }`; the repository maps each project as `estado` and `analisisIa`. The real running API returned that exact envelope with an empty `data` array, so no existing project is eligible for a first analysis.

| Evidence | Observed result |
|---|---|
| Sanitized GET request | `GET http://127.0.0.1:3000/api/proyectos` with explicit `Accept: application/json` and no body. |
| Actual response shape | HTTP 200; envelope fields: `success`, `data`; `success: true`; list path: `data`; list count: `0`. |
| Actual DTO mapping | `id`, status field `estado`, analysis field `analisisIa`. An absent or null `analisisIa` would be eligible with `estado: nuevo`; no rows were present to evaluate. |
| Analysis request | Not issued: the successful list contains zero existing projects. Request headers/body, response status/headers/body, model, provider-call count, and persistence evidence are N/A; no provider call or write occurred. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | N/A — tests are prohibited for this bounded runtime-evidence action. |
| Runtime harness command | One local public-API GET with shape-aware envelope parsing: HTTP 200, `{ success: true, data: [] }`; no eligible project and therefore no analysis POST. |
| Rollback boundary | Revert only this addendum in `openspec/changes/cycle-2-gemini-project-viability/apply-progress.md`; task 5.3 remains unchecked and all backend work is untouched. |

Task 5.3 remains deferred and unchecked. Cumulative task accounting remains 25/31.
