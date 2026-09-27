## Exploration: Cycle 3 Gemini Backlog Generation

### Current State
Cycle 2 already supplies the required integration pattern: `createGeminiGateway()` and the shared `geminiGateway`, lazy `parseGeminiEnvironment()`, matching Zod/provider schemas, persisted-untrusted-data prompt construction, `createProyectosService()`, centralized `AppError` handling, validated project IDs, and cached server-owned results. The new endpoint can extend those seams; it does not need another Gemini client, configuration path, or error middleware.

The `historias` table already has every requested backlog column: `fase`, `prioridad`, `historia_usuario`, `descripcion`, `criterios_aceptacion`, `alcance_tecnico`, `estimacion_fibonacci`, and `rol_sugerido`. No column addition is justified. Its Fibonacci constraint already matches `{1,2,3,5,8,13,21}`, while its phase and priority constraints provide usable bounded enums. However, `chk_historias_rol` permits legacy labels such as `Desarrollador Frontend`, not the requested `Frontend`, `Backend`, `QA`, and `Ciberseguridad` values. The current project-status constraint permits only `nuevo | analizado`; it does not include `planificado`.

There is no historias repository or runtime story behavior yet. `database.js` already exports `withTransaction()`, and the existing migration runner has checksum, advisory-lock, schema-inspection, partial-recovery, and rollback-preflight machinery specialized for migration 004. Migration 005 must preserve prior migration bytes and account for a subtle dependency: migration 004 currently re-verifies the exact `nuevo | analizado` status constraint on every `up`, so it would reject the legitimate descendant `nuevo | analizado | planificado` state unless the runner becomes aware of migration 005.

CodeGraph was not retried because the parent-confirmed initialization attempt failed with the executable unavailable. This exploration used focused filesystem reads and searches instead. `openspec/config.yaml` is absent, so there are no additional project-specific exploration rules to apply.

### Affected Areas
- `backend/migrations/005_enable_backlog_planning.{up,down}.sql` — add no columns; expand the project-state check to include `planificado` and expand the story-role check with the requested labels while retaining legacy values.
- `backend/scripts/migrate.js` — register migration 005, recognize its two-table constraint state, recover fixed partial states, protect rollback data, and stop migration 004 from rejecting a verified 005 descendant state.
- `backend/src/schemas/project-backlog.schema.js` — define one strict 12–25 item array and a matching provider JSON schema with the exact seven fields, allowed roles, Fibonacci estimates, and existing phase/priority enums.
- `backend/src/prompts/project-backlog.prompt.js` — deterministically delimit persisted `project.payload` and `project.analisisIa` together as untrusted data and request only the backlog contract.
- `backend/src/integrations/gemini.gateway.js` — reuse `createGeminiGateway()` and its lazy client/configuration by adding `generateProjectBacklog()` through the same structured-content helper.
- `backend/src/repositories/historias.repository.js` — query a project backlog in stable ID order and atomically persist a first-writer backlog plus the `planificado` transition.
- `backend/src/services/proyectos.service.js` — add backlog orchestration to the existing factory/singleton: project lookup, cache short-circuit, analyzed-state guard, provider parsing/validation, and race-winner reload.
- `backend/src/controllers/proyectos.controller.js`, `backend/src/routes/proyectos.routes.js` — expose validated `POST /:id/backlog` with the existing success envelope.
- `backend/tests/integration/proyectos.api.test.js` — add only focused success/persistence/repeat-cache, not-analyzed 409/no-call, and malformed-provider-JSON 502/no-write coverage.
- `backend/tests/integration/migrations.test.js` — minimally verify migration 005 target constraints, preserved prior checksums, safe rollback refusal, and the 004-to-005 descendant-state path.
- `backend/README.md` — optional one-line endpoint addition only; no new README or expanded live-harness documentation.

### Approaches
1. **Extend Cycle 2 with a dedicated historias repository and transactional first-writer persistence** — keep provider I/O in the existing project service/gateway flow, then use `withTransaction()` to lock the project, re-check the stored backlog, insert all stories, and update the project state.
   - Pros: reuses every Cycle 2 boundary; gives one atomic database commit; prevents duplicate rows during overlapping first requests; keeps story SQL out of the project repository; returns the stored winner after a race.
   - Cons: requires a small repository module and migration-runner support for a two-table constraint migration.
   - Effort: Medium

2. **Map requested role labels to legacy database labels and persist through `proyectosRepository`** — avoid changing the story-role check by translating provider output on write/read and place all backlog SQL in the existing project repository.
   - Pros: one less schema constraint change and fewer modules initially.
   - Cons: persisted data no longer matches the requested contract, cache reads require reversible translation, project and story persistence concerns become coupled, and the `planificado` migration plus runner fix is still unavoidable.
   - Effort: Low initially, Medium long-term risk

### Recommendation
Use Approach 1 and make the implementation a direct Cycle 2 extension.

Define the backlog contract as `z.array(z.strictObject(...)).min(12).max(25)`. Use existing database-compatible enums for `fase` (`Análisis`, `Diseño`, `Desarrollo Frontend`, `Desarrollo Backend`, `Testing`, `Despliegue`) and `prioridad` (`Alta`, `Media`, `Baja`); use exactly the six requested role labels and the seven Fibonacci values. The provider JSON schema must mirror that array/object contract with `minItems`, `maxItems`, `required`, and `additionalProperties: false`.

Generalize the internals of `createGeminiGateway()` into one private structured-response operation and retain `generateProjectAnalysis()` unchanged. Add `generateProjectBacklog(prompt)` using `projectBacklogJsonSchema`. Keep JSON parsing and Zod validation in `createProyectosService()`, and normalize provider exceptions, blank text, malformed JSON, and schema failure to the existing sanitized `AppError(502, 'AI_ANALYSIS_FAILED', 'AI analysis failed')` convention unless the proposal deliberately introduces a backlog-specific code. Reusing the existing code is the smallest and most consistent path.

The service flow should be:

1. Load the project through `proyectosRepository.findById()`; preserve `PROJECT_NOT_FOUND`.
2. Query `historiasRepository.findByProjectId(configuration, id)` using the seven contract columns ordered by `id ASC`.
3. If `estado === 'planificado'` and a backlog exists, return it with zero Gemini calls and zero writes.
4. If the project is not `analizado`, throw `AppError(409, 'PROJECT_NOT_ANALYZED', 'Project must be analyzed before backlog generation')` before provider work. Treat impossible state/backlog combinations as internal invariants rather than asking the user.
5. Build the prompt from persisted `payload` plus persisted `analisisIa`, call `geminiGateway.generateProjectBacklog()`, parse, and validate outside any transaction.
6. Call one repository transaction. Inside it, lock the project row with `SELECT ... FOR UPDATE`, re-query stories, return an existing race winner if present, require the locked state to remain `analizado`, bulk-insert all validated stories, conditionally update `proyectos.estado = 'planificado'`, then commit. Any insert or state-update failure rolls back the complete backlog.

This preserves Cycle 2 semantics: sequential repeats make no provider call, overlapping first requests may still make duplicate provider calls, but only the first transaction persists and every caller returns the server-owned stored backlog. The idempotency query is the indexed `WHERE proyecto_id = ? ORDER BY id ASC` lookup; no extra idempotency table or client token is needed.

Migration 005 should contain only constraint changes. Its target story-role check should retain all legacy role labels and add the four genuinely missing requested labels; the two already-supported requested labels remain unchanged. Its down path must refuse while any project is `planificado` or any story uses a newly added role label. The runner should inspect both project and story constraints, repair only recognized fixed partial states, verify the complete target before marking history applied, and permit migration 004's applied history to coexist with the verified 005 descendant status constraint.

Keep tests deliberately narrow. One successful API test can assert 12 returned stories, exact fields, persisted rows, `planificado`, and a repeated request with the provider call count still one and row count still 12. Add one `nuevo` project case asserting 409 and zero calls/writes, and one malformed JSON case asserting the existing sanitized 502 and no stories/state transition. Extend migration coverage only enough to prove the target constraints, prior checksum preservation, descendant-state compatibility, and data-preserving rollback refusal. No real-Gemini harness or broad corrupt-state matrix is needed.

Suggested later maintainer verification, run locally from `backend/` and reported once as a consolidated result:

```powershell
npm test -- tests/integration/migrations.test.js tests/integration/proyectos.api.test.js
npm test
npm run lint
npm run format:check
```

### Risks
- Migration 004's exact-target verifier will reject the expanded Cycle 3 status unless migration 005 descendant awareness is implemented and tested.
- MySQL DDL across `proyectos` and `historias` is not one cross-table atomic statement; migration 005 needs explicit recognized partial-state recovery and verification.
- Overlapping first requests can still incur multiple Gemini calls, matching the accepted Cycle 2 semantics, although transactional re-checking prevents duplicate persisted stories.
- Stored payload and analysis remain untrusted prompt input; structured output constrains shape but not story quality or semantic correctness.
- A bulk insert that returns provider order must be read back in stable `id ASC` order so first and cached responses have the same server-owned representation.

### Ready for Proposal
Yes — all product decisions needed for the smallest safe path are settled. The proposal should specify direct Cycle 2 reuse, no new story columns, migration 005 constraint-only evolution, HTTP 409 `PROJECT_NOT_ANALYZED`, transactional first-writer story persistence plus `planificado`, cached repeat behavior, the narrow test set, no automated live Gemini harness, and the authorized single-PR `size:exception`.
