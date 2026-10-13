# Admin Workflow

## Objective

Deliver the three-unit administrator workflow: persisted Kanban columns, evidence-based project analysis, and administrator-controlled project viability before backlog generation.

Branch: `feat/admin-workflow`. Delivery strategy: `ask-on-risk`, with three work-unit commits across the feature. Test runners: backend Vitest focused files and frontend Vite build to temporary output.

## Specs

- **S1 — Persisted board columns (Unit 1).** Preserve the completed behavior recorded in ADMIN-1: dedicated column persistence, camelCase API mapping, optimistic ordered moves, and guarded rollback.
- **S2 — Three-layer analysis, Part A.** Implement: "1) señales objetivas calculadas por código; 2) evaluación por criterios hecha por Gemini con contexto de la empresa, SIN veredicto global; 3) decisión humana del administrador (VIABLE / NO_VIABLE) que habilita o bloquea la generación del backlog." Part A covers the editable company context, defensive `calcularSenales(payload, contexto)`, the exact requested budget/deadline/size/security mappings, a strict v2 Zod response with exactly the six criterion IDs (`completitud`, `ajuste_servicios`, `alcance_vs_plazo`, `presupuesto_vs_alcance`, `capacidad_equipo`, `riesgos_tecnicos`), the existing standalone `BEGIN/END_UNTRUSTED_PROJECT_PAYLOAD_JSON` framing, a simple provider JSON schema, v2 caching compatibility, and the ordered analysis presentation. Preserve the visible copy exactly: "Opinión de la IA · orientativa", "calculado por reglas", "Opinión de la IA, orientativa. Decide el administrador.", and "Re-analizar con el nuevo criterio". Store `analisisIa = { version: 2, ...respuesta validada, senales }`.
- **S3 — Administrator decision, Part B.** Add migration 006 with nullable `decision_viabilidad`, `decision_motivo`, and `decision_fecha`; backfill `planificado` projects to `VIABLE`; use migration 004 recovery/checksum conventions; do not fix the known migration 005 rollback issue; and stop if 006 recovery requires more than approximately 150 new lines in `migrate.js`. Add `PUT /api/proyectos/:id/decision` with `{ decision, motivo }`, v2-analysis and no-backlog guards, the NO_VIABLE 10-character reason rule, response mapping, analysis regeneration only "sin decisión", and backlog generation blocked unless decision is `VIABLE`. Preserve visible copy exactly: "La IA no decide: la decisión es del administrador", "Marcar como viable", "Marcar como no viable", and "Requiere marcar el proyecto como viable".
- **S4 — Verification and delivery.** Mock Gemini in automated tests. Use only focused tests, test migration 006 up/down against the test database, make exactly one commit after Part A and one after Part B, never commit `frontend/dist`, never push, and report touched files, exact checks, the complete bounded real-Gemini analysis (at most two calls) when credentials/runtime make it available, plus manual verification steps.
- **S5 — Readable v2 analysis contract.** Replace `lectura_general` with `sintesis` ("máximo 2 frases (unas 40 palabras)") and `claves_para_decidir` ("lista de 3 a 5 strings", each "hasta 20 palabras" and formatted as "Rótulo: dato"). Keep the provider schema simple, with only string, array, object, and required. Require non-empty `sintesis` and at least one key in Zod; validate first, then clip keys to 5 and other lists to 8 without rejecting word length. Keep version 2 and read both new analyses and persisted v2 analyses containing `lectura_general`. Preserve every current anti-verdict, exact-figures, bottleneck, and untrusted-zone rule. Prompt limits are exactly: criterion justification one sentence up to 25 words citing the datum; strength/weakness detail up to 25 words; risk detail up to 30 words; mitigation up to 25 words; each condition up to 20 words; no long paragraphs; place each datum once so weakness is the gap, risk is the consequence, and condition is the adjustment.
- **S6 — Ordered analysis presentation.** In the internal panel, use only `adm-` classes and `panel.css`, plain CSS, no Framer Motion, no nested cards, and keep all content visible. Constrain reading measure to about 70 characters with comfortable leading and clear ruled section headings. New v2 order is: "Opinión de la IA · orientativa" with risk badge/reason; "Resumen"; "Claves para decidir" with the label before `:` bold; "Señales objetivas"; "Criterios" rows; two-column "Fortalezas"/"Debilidades"; "Riesgos" rows; "Información faltante"/"Condiciones para avanzar"; lower-hierarchy "Preguntas para el cliente"/"Supuestos"; and "Opinión de la IA, orientativa. Decide el administrador." Persisted v2 without `sintesis` renders `lectura_general` in two-sentence paragraphs. Version 1 renders every stored field under the exact legacy labels requested, including neutral "Veredicto anterior de la IA (ya no se usa para decidir)". The decision warning appears only with no decision and no new analysis. A backfilled `VIABLE` decision without reason on a non-v2 analysis displays "Decisión registrada automáticamente al migrar: el proyecto ya estaba planificado" and uses a coherent migration-date label without new columns.
- **S7 — Readable-analysis verification and delivery.** Add deterministic prompt/schema/compatibility tests, make exactly one real Gemini call with the specified 14-function Web/Android, "Menos de USD 1.000", "1 - 3 meses" sample, and report only `sintesis`, `claves_para_decidir`, one criterion, one risk, and one condition. Run focused tests only, touched lint/Prettier, a temporary-output frontend build, `git diff --check`, and confirm `frontend/dist` unchanged. Do not touch `backend/src/config/company-context.js`, launch a verification subagent, push, clean, checkout, or stash. Commit as `feat(admin): readable AI analysis`.

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
- [x] **ADMIN-2A — Build evidence-based v2 analysis**
  - Specs: S2, S4.
  - Route: inline; no writer trigger applies. The parent owns prompt/schema/service/gateway/tests and the panel presentation as one coherent behavior.
  - Checks: RED observed for missing signal modules and for missing-context deadline compatibility; unit tests passed 11/11; focused analysis integration tests passed 7/7; frontend temporary-output build passed with 440 modules; touched backend ESLint and `git diff --check` passed; independent verification found one blocker, which was corrected and rechecked; `frontend/dist` remained untouched. Two bounded real Gemini calls were used; `maxOutputTokens` is 16384 and `thinkingBudget` is 1024 for analysis only.
  - Commit: this Part A work-unit commit, `feat(admin): add evidence-based project analysis`; exact hash is mirrored in Engram after creation.
  - Review: high risk item 3 because the persisted/API analysis contract changes from legacy to v2; independent verification passed after one scoped correction.
- [x] **ADMIN-2B — Add administrator viability decision**
  - Specs: S3, S4.
  - Route: inline; no writer trigger applies. Migration, API gate, focused tests, and decision UI form one rollback-safe work unit.
  - Checks: migration 006 focused up/down passed 1/1; the complete migration file produced exactly the 15 accepted pre-existing/cascade failures (26 passed) and no migration 006 or `decision_viabilidad` failure; decision/backlog API tests passed 4/4; analysis unit tests passed 11/11; touched backend ESLint and Prettier passed; frontend temporary-output build passed with 441 modules; `git diff --check` passed; `frontend/dist` remained untouched. Browser verification remains user-owned.
  - Commit: `c9cf952 feat(admin): add viability decision workflow`.
  - Review: user explicitly declined a verification subagent and owns functional browser verification; no native review was started.
- [x] **ADMIN-3 — Make AI analysis readable**
  - Specs: S5, S6, S7.
  - Route: inline; no writer trigger applies. The backend response contract, compatibility rendering, and one ordered panel surface form one coherent work unit.
  - Checks: RED observed with the new response/prompt expectations before implementation; analysis/signal unit tests passed 11/11; seven focused analysis API tests passed 7/7; touched backend ESLint and backend/frontend Prettier passed; the frontend temporary-output build passed with 442 modules; the one authorized real Gemini request returned a schema-valid bounded sample; `git diff --check` and `frontend/dist` checks are required immediately before commit. A broader integration pattern was abandoned after seven passes because the known concurrent-analysis test stalled; it was replaced by the exact seven-test pattern.
  - Commit: this work-unit commit, `feat(admin): readable AI analysis`; exact hash will be mirrored in Engram after creation.
  - Review: browser verification is explicitly user-owned; no verification subagent is permitted.

## Progress

- Confirmed a clean starting worktree and created `feat/admin-workflow` from the latest redesigned panel branch.
- Confirmed the exact database column and constraint already exist; no migration is required.
- Mapped the existing backend response conventions, shared backlog mapper, App-owned state, and board-local movement behavior.
- Implemented the dedicated endpoint, persisted response mapping, optimistic frontend movement, per-story request queues, guarded rollback, and inline failure notice.
- Completed focused backend checks, frontend build verification, and the required parent spot check without touching `frontend/dist`.

## Next Step

Run the final diff and protected-path checks, commit ADMIN-3 without push, then hand off the ordered manual browser scenarios.

## Log

- **L1 — Original Unit 1 request.** Implement persisted Kanban story columns as the first admin-workflow unit on `feat/admin-workflow`.
- **L2 — 2026-10-12 user authorization.** "Usá ODD (no SDD). Avanzá directo, sin pedirme confirmación de proceso. Misma rama feat/admin-workflow, unidad 2 de 3. Verificá que la unidad 1 esté commiteada; si no, frená y avisame. Sin push. No commitear frontend/dist. Dos commits: uno al terminar la PARTE A y otro al terminar la PARTE B." The authorized objective is the three-layer analysis and administrator decision described in S2-S4, including the exact API, migration, UI, test, Gemini-call, and reporting constraints in the user request.
- **L3 — Starting evidence.** Unit 1 is committed at `ce338eddfbae8745c48b804e29021bf7f3f51e0a`; the worktree was clean on `feat/admin-workflow`. CodeGraph initialization was attempted but the upstream executable is unavailable, so bounded repository mapping was used. Forecast for Unit 2 exceeds 400 authored lines; the user fixed the delivery boundary as exactly two commits on the existing feature branch and prohibited push.
- **L4 — Part A evidence.** Added trusted company context, defensive deterministic signals, strict/provider-simple v2 analysis schemas, legacy-compatible regeneration and caching, analysis-only Gemini output/thinking limits, and the ordered plain-text panel presentation. The first RED failed because the context/signals modules did not exist. Independent verification then found that a requested deadline with missing company duration context incorrectly produced `no`; a focused RED reproduced it, the implementation now returns `null`, and the verifier recheck passed. Focused unit, integration, build, lint, diff, and `frontend/dist` checks passed. Two real Gemini calls exercised the requested 14-function sample; no further live call is permitted in this unit.
- **L5 — Part B evidence.** Added migration 006 with guarded recovery, administrator decision persistence and API, the `VIABLE` backlog gate, and panel decision controls. The complete migration test file closed with 26 passes and exactly 15 accepted pre-existing/cascade migration-004/005 failures; migration 006 passed and no failure named `decision_viabilidad`. The user owns browser verification and explicitly prohibited a verification subagent. No push was performed and `frontend/dist` stayed untouched.
- **L6 — 2026-10-12 readable-analysis authorization.** The user authorized direct ODD work on `feat/admin-workflow` without push, prohibited committing `frontend/dist`, prohibited verification subagents, reserved browser verification, and prohibited changing `backend/src/config/company-context.js`. The requested work is: "Reemplazá lectura_general por dos campos" (`sintesis` and `claves_para_decidir`), retain persisted version-2 compatibility without a version bump, enforce the exact prompt brevity and non-repetition rules in S5, render the exact ordered new/legacy layouts and decision-state exceptions in S6, make "UNA sola llamada real a Gemini" with the specified sample and bounded report, and close with focused checks plus commit `feat(admin): readable AI analysis`. Part B was committed first at `c9cf952`.
- **L7 — Readable-analysis evidence.** The generated v2 contract now uses non-empty `sintesis` and `claves_para_decidir`, clips lists only after strict validation, and retains stored v2 `lectura_general` compatibility without a version bump. The panel presents new v2, stored v2, and version-1 analysis as explicit ruled sections, with two-sentence fallback paragraphs and the migration-backfill decision label/date behavior. One real Gemini request used the authorized 14-function Web/Android, "Menos de USD 1.000", "1 - 3 meses" sample and returned schema-valid output; no second request was made. Focused unit/API checks, touched lint/format, and a 442-module temporary frontend build passed. `backend/src/config/company-context.js` and `frontend/dist` were not modified.
