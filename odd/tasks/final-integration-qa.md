# Final Integration QA

## Objective

Verify and correct the manually integrated frontend panel so the complete local flow works against the real backend: create project, analyze it, generate its backlog, and display scheduled stories on the board.

## Problem and Why

Frontend cycles 4–6 were produced without access to the repository and may not match the implemented backend contracts. The final integration must be proven against running local services without reopening the completed backend unless the user explicitly approves it.

## Scope

- Frontend panel components, App navigation, API integration, calculator usage, and local Vite connectivity.
- Existing public site and configurator regression checks.
- Real local backend/frontend execution and API flow.
- Backend source was initially read-only; the user later authorized a narrow technical correction when the backlog failure proved undiagnosable.

## Constraints

- Direct ODD QA/correction route; no SDD artifacts or phases.
- Do not modify backend files without prior user notice and approval.
- Preserve the user's existing uncommitted frontend work.
- Generated technical artifacts remain in English.
- Delivery strategy: `ask-on-risk`.
- TDD mode: not configured for ODD; the frontend has no test runner. Use focused build, server smoke checks, and a real HTTP integration harness.

## Work Unit

- [x] **QA-1 — Correct and prove the complete frontend/backend integration**
  - Route: direct, without delegation.
  - Trigger evidence: integration preparation and corrections span more than two non-trivial frontend files and require reading frontend/backend contracts.
  - Acceptance criteria:
    - Frontend production build succeeds.
    - Frontend and backend development servers start successfully.
    - Configurator creates a project through the real API.
    - Panel list/detail consume actual backend response fields.
    - Analysis and backlog actions handle success and uniform API errors safely.
    - Board navigation works and stories render with calculated dates from real backlog data.
    - Existing public and configurator views still render/build.
    - Backend public API contract remains unchanged; backend edits stay limited to safe backlog-failure observability plus the maintainer-approved provider schema and prompt correction.
  - Checks:
    - `npm run build` in `frontend/`.
    - Bounded startup smoke for `npm run dev` in `backend/` and `frontend/`.
    - Real local HTTP flow: create → list/detail → analyze → backlog.
    - Structural/browser-state verification for board scheduling and legacy App views.
  - Evidence: complete — the minimized provider schema was accepted, 16 strict-runtime-valid stories were persisted, the cached endpoint path succeeded without another Gemini invocation, and the real `Story[]` produced stable unique board IDs plus valid scheduled date ranges.
  - Commit: three authorized work-unit boundaries recorded below; push and PR remain pending explicit authorization.

## Progress

- Branch: `fix/final-integration-qa`.
- Exploration found mismatches in CORS/local origin strategy, board navigation, analysis/backlog response shapes, story identity assumptions, and configurator submission.
- CodeGraph was unavailable because the configured executable is not installed; mapping used direct file inspection.

## Verification Evidence

- `npm run build` in `frontend/`: PASS — Vite 5.4.21 transformed 427 modules and built in 2.75 seconds.
- Frontend dev server: PASS — fresh Vite instance responded on `http://127.0.0.1:5174`; `/api/proyectos` proxy returned HTTP 200 with `success: true`.
- Backend availability: PASS — `GET http://127.0.0.1:3000/api/proyectos` returned HTTP 200 with `success: true`.
- Create through the frontend proxy: PASS — HTTP 201, project ID `1`, initial state `nuevo`.
- Analyze through the frontend proxy: PASS — HTTP 200 in 6.96 seconds; returned the actual analysis-only contract and persisted project state `analizado` with `analisisIa` present.
- Backlog generation after the approved correction: PASS — the second and final Gemini invocation returned HTTP 200 in 33.011461 seconds and persisted 16 stories.
- Project consultation after analysis: PASS — project ID `1` appears exactly once and detail exposes `estado: analizado` plus `analisisIa`.
- Board adapter/calculator contract harness: PASS with two schema-valid representative stories — two unique client IDs and valid `YYYY-MM-DD` ranges were produced without runtime errors.
- Real-story board scheduling: PASS — all 16 persisted stories produced stable unique IDs and valid `YYYY-MM-DD` ranges through the existing frontend adapter/calculator.
- Error UI: corrected to display the actual API error instead of misclassifying every failure as a missing backlog.
- `git diff --check`: PASS.
- Backend source changes: LIMITED — sanitized backlog-failure classification plus the approved provider schema/prompt correction and focused tests; the public API contract is unchanged.

## Next Step

Push the three work-unit commits and open the single `size:exception` PR only after explicit authorization.

## Backlog 502 Observability Correction

- Scope authorization: direct ODD backend-only correction approved after the read-only trace proved that backlog configuration, provider, response-text, JSON, and schema failures were collapsed into the same private 502 with no internal diagnostic.
- Implementation: backlog generation now emits one sanitized diagnostic with a classified stage (`configuration`, `provider`, `response_text`, `json_parse`, `schema_validation`, or the narrowly scoped `prompt_construction`), project ID, safe error name, and only allowlisted optional provider status, network code, model, or Zod issue code/path fields.
- Public contract: unchanged and covered by focused tests — HTTP 502 with `{"success":false,"error":{"code":"AI_ANALYSIS_FAILED","message":"AI analysis failed"}}`.
- Redaction and persistence tests: PASS — provider rejection, malformed JSON, and schema validation each emit only sanitized fields and perform zero backlog persistence calls.
- Focused backend unit checks: PASS — 9/9 tests across `project-backlog-diagnostics.test.js` and the existing `project-analysis.test.js`.
- Changed-file ESLint: PASS with zero warnings.
- Changed-file Prettier check: PASS.
- One permitted live request: `POST http://127.0.0.1:3000/api/proyectos/1/backlog` returned HTTP 502 with the unchanged safe envelope above.
- Recovered first live diagnostic: `stage: provider`, `errorName: ApiError`, `providerStatus: 400`, `model: gemini-2.5-flash`. The earlier claim that logs were inaccessible is obsolete; redirected server logs are available under the authorized temporary runtime location.
- Persisted backlog and real-story board verification: NOT RUN because the single live backlog request failed.
- `git diff --check`: PASS after the correction.
- Frontend isolation: no frontend file was edited by this correction; all frontend changes listed by Git pre-existed this backend work unit and remain preserved.

## Provider Error Classification Extension

- SDK evidence: installed `@google/genai` 2.24.0 constructs `ApiError.message` with `JSON.stringify(errorBody)` and exposes the numeric HTTP status separately. Current SDK documentation confirms `ApiError` name/message/status behavior; supported response JSON Schema fields include the constructs used by the backlog schema, so schema complexity cannot be assumed from field presence alone.
- Implementation: only an `ApiError` JSON body shaped as `{ error: { status, message } }` is parsed. Symbolic status must match a strict uppercase token, and the unrestricted message is reduced to one allowlisted reason category without being retained or logged.
- Focused checks: PASS — 10/10 tests, including status/reason extraction, malformed token rejection, unrestricted-body redaction, zero persistence, and unchanged public 502 behavior. Changed-file ESLint and Prettier checks also pass.
- Watcher reload: confirmed by two additional `Restarting 'src/server.js'` / listening pairs in the existing stdout log after the classifier edits; no process was manually managed.
- One final permitted live request: HTTP 502 with `AI_ANALYSIS_FAILED` / `AI analysis failed`.
- Final sanitized diagnostic: `stage: provider`, `errorName: ApiError`, `projectId: 1`, `providerStatus: 400`, `providerSymbolicStatus: INVALID_ARGUMENT`, `providerReason: other_invalid_argument`, `model: gemini-2.5-flash`.
- Root-cause boundary: the provider rejected an argument, but the safely classified reason does not prove a specific model, API-key, response-schema validity, or response-schema complexity defect. No speculative schema change was made.
- Persisted backlog and real-story board verification: NOT RUN because the final live request failed.

## Bounded Provider Message Diagnostic

- Temporary instrumentation: added only for `ApiError` HTTP 400 with symbolic `INVALID_ARGUMENT`; it redacted API-key-like values, emails, URLs/query strings, control characters, and labeled contents/prompt/payload fragments, then capped output at 500 characters. Focused redaction/bounding tests passed before the live request.
- One diagnostic request: HTTP 502 with the unchanged `AI_ANALYSIS_FAILED` / `AI analysis failed` public envelope.
- Exact redacted provider message: `The specified schema produces a constraint that has too many states for serving. Typical causes of this error are schemas with lots of text (for example, very long property or enum names), schemas with long array length limits (especially when nested), or schemas using complex value matchers (for example, integers or numbers with minimum/maximum bounds or strings with complex formats like date-time)`.
- Deterministic classification: the provider explicitly rejected the response schema because its compiled serving constraint has too many states. The permanent classifier now maps this exact provider phrase to `response_schema_too_complex`.
- Request/schema change: NONE. The message proves a provider serving-complexity limitation but does not identify one schema keyword or request field whose removal is the uniquely correct standards-compatible fix.
- Temporary instrumentation removal: COMPLETE — the temporary message field, sanitizer, logging path, and temporary tests were removed; a repository search returns no matches.
- Final focused checks after removal: PASS — 10/10 tests, changed-file ESLint with zero warnings, and changed-file Prettier.
- Further live calls: NONE. Per the bounded rule for an external/model limitation, no verification POST, backlog query, or real-story board check was performed.

## Maintainer-Approved Provider Schema Correction

- Delivery decision: maintainer approved `size:exception` for one PR containing exactly three work-unit commits: frontend source/config, backend diagnostics/schema/prompt/focused tests, and `odd/**` documentation. Chaining is not required. Push and PR creation remain unauthorized.
- Provider schema: minimized to structural `array`, `object`, `string`, and `integer` types plus `required`. Provider-side enums, item-count limits, nested minimum item counts, and `additionalProperties` were removed.
- Runtime contract: unchanged. The strict Zod schema still enforces exact story fields, allowed phases/priorities/roles, Fibonacci estimates, nonblank text and acceptance criteria, and a 12–25 story count.
- Prompt contract: deterministically requests 12–20 stories; explicitly lists allowed phases, priorities, roles, and Fibonacci values `1, 2, 3, 5, 8, 13, 21`; and keeps persisted project input inside explicitly marked untrusted-data regions.
- Focused backend unit checks: PASS — 7/7 tests across `project-backlog-contract.test.js` and `project-backlog-diagnostics.test.js`, including provider-schema minimization, strict Zod preservation, prompt constraints, safe public 502 behavior, and zero persistence for invalid Gemini output.
- Changed-file ESLint: PASS with zero warnings.
- Changed-file Prettier check: PASS.
- Live invocation 1: `POST http://127.0.0.1:3000/api/proyectos/1/backlog` used the required 120-second client timeout and returned HTTP 500 after 51.785875 seconds with the safe `INTERNAL_ERROR` envelope. No provider-failure diagnostic was emitted, proving the simplified provider schema passed the previous Gemini rejection boundary.
- Initial persistence evidence: project `1` remained `analizado`, and a direct read-only database count confirmed zero persisted stories after invocation 1.
- Local database recovery: before mutation, migration 004's expected SQL was compared with the live `estado` and `analisis_ia` columns, all project checks, and stored analysis values. The live schema exactly matched the intended migration-004 target, including `varchar(32)` status metadata, nullable JSON analysis, the object check, `nuevo|analizado`, no unexpected checks, and zero non-object analyses.
- Migration metadata reconciliation: only the local applied checksum for `004_add_project_ai_analysis` was changed from `854BA15B...` to the repository checksum `D4E4D5CD...`. No migration file or application source was changed for recovery.
- Migration 005: `npm run db:migrate` passed through the normal runner. Both migrations 004 and 005 now report `applied`; project status allows `nuevo|analizado|planificado`, and the story-role constraint includes the six legacy roles plus `Frontend`, `Backend`, `QA`, and `Ciberseguridad`.
- Invocation budget: exactly two actual Gemini invocations were consumed. Invocation 2 succeeded; no further provider invocation is permitted or needed.
- Live backlog evidence: invocation 2 returned HTTP 200 in 33.011461 seconds with 16 stories. Sample: phase `Diseño`, priority `Alta`, estimate `5`, role `Backend`, story `Como administrador de sistemas, quiero configurar el entorno de desarrollo y producción para el sistema de gestión de pedidos.` Project `1` subsequently returned `estado: planificado`.
- Cached endpoint evidence: exactly one post-success cached request returned successfully without a provider diagnostic or new invocation. Its transport-to-harness process failed before JSON parsing because Windows Node rejected `fs/promises.readFile(0)`; the endpoint was not queried again.
- Real persisted-story assertions: the repository returned 16 stories with exactly the eight public backlog fields and non-empty acceptance criteria.
- Board harness: PASS against that real persisted `Story[]` — 16 stable unique IDs (`1-story-1` through `1-story-16`) and valid date ranges. Sample ranges: `2026-09-28`–`2026-09-30` and `2026-10-02`–`2026-10-06`.
- Frontend distribution cleanup: tracked `frontend/dist` files were restored to HEAD and only the two generated untracked assets were removed.
- Delivery boundary: maintainer-approved `size:exception`, no chain. Commit 1 contains only `frontend/src/**` and `frontend/vite.config.js`; commit 2 contains only backend diagnostics, provider schema/prompt correction, and focused tests; commit 3 contains only `odd/**` documentation. Push and PR creation remain unauthorized.
- Commit 1: `3814e36 fix(frontend): integrate project planning panel` — 14 frontend source/config files only.
- Commit 2: `717d239 fix(backend): simplify Gemini backlog schema` — six backend diagnostics/schema/prompt/test files only.
- Commit 3 boundary: this `odd/**` closeout document only; its immutable hash is recorded in the delivery report after commit creation.
