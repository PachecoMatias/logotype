# Proposal: Cycle 3 Gemini Backlog Generation

## Intent

Add a server-owned backlog generation flow for analyzed projects. The API will use the existing Gemini integration to produce a strictly validated backlog, persist it atomically with the `planificado` project transition, and return stored stories on repeat requests without another provider call or write.

## Scope

### In Scope

- Add `POST /api/proyectos/:id/backlog` for persisted projects that are ready after analysis.
- Request and strictly validate 12–25 stories. Every story must contain exactly `fase`, `prioridad`, `historia_usuario`, `descripcion`, `criterios_aceptacion`, `alcance_tecnico`, `estimacion_fibonacci`, and `rol_sugerido`, with no additional fields.
- Restrict estimates to `1 | 2 | 3 | 5 | 8 | 13 | 21` and roles to `Frontend`, `Backend`, `QA`, `Ciberseguridad`, `Analista de requerimientos`, or `Project Manager`; retain the existing bounded phase and priority values.
- Build the prompt only from persisted project payload and analysis, both isolated as untrusted data, and reuse the Cycle 2 Gemini gateway, lazy configuration, provider-schema/Zod pattern, and sanitized 502 behavior.
- Persist the complete first-writer backlog and transition the project to `planificado` in one database transaction, then return stories in stable server-owned order.
- Return an existing stored backlog before eligibility checks, provider work, or writes. Return HTTP 409 `PROJECT_NOT_ANALYZED` when no backlog exists and the project is not analyzed.
- Add migration 005 only for the `planificado` project-status constraint and requested story-role labels, including minimal safe descendant-state recognition, fixed partial-state recovery, verification, and rollback refusal.
- Add focused API coverage for success with persistence and repeat caching, not-analyzed rejection, and invalid provider JSON, plus narrow migration coverage.
- Permit at most a one-line endpoint addition to the existing backend README.

### Out of Scope

- Exhaustive provider-output, migration-corruption, partial-state, concurrency, or rollback test matrices.
- An automated real-Gemini live harness or any quota-consuming verification workflow.
- New READMEs, broad operating guides, or expanded provider documentation.
- Provider retries, backoff, failover, request deduplication, or cross-process locking.
- Authentication, authorization, public-exposure hardening, or frontend changes.
- Semantic evaluation, ranking, or human-quality scoring of generated backlog content beyond strict structural validation.
- Kanban behavior, story editing endpoints, team assignment, date estimation, or Fibonacci-to-days conversion.

## Capabilities

### New Capabilities

- `gemini-backlog-generation`: Generate, strictly validate, transactionally persist, and cache a bounded Gemini-created backlog for an analyzed project.

### Modified Capabilities

- `project-management-api`: Add the backlog endpoint, analyzed-project eligibility behavior, and cached repeat semantics.
- `planning-data-persistence`: Persist generated stories, add the `planificado` state and requested role labels, and preserve migration safety without adding story columns.
- `api-reliability-contract`: Add the uniform `PROJECT_NOT_ANALYZED` 409 response, reuse sanitized provider-failure behavior, and cover the focused backlog endpoint outcomes.
- `backend-code-quality`: Recognize the additional backend endpoint while limiting documentation to the existing README and preserving current quality gates.

## Approach

Extend the Cycle 2 architecture rather than creating a second Gemini integration. Add a strict backlog Zod schema and matching provider JSON schema, a deterministic prompt that delimits persisted `payload` and `analisisIa` as untrusted data, and `generateProjectBacklog()` on the existing lazy Gemini gateway. Keep JSON parsing and runtime validation in `createProyectosService()` and normalize provider, blank-text, malformed-JSON, and schema failures through the existing sanitized HTTP 502 contract.

The service will load the project and its stories, immediately return stored stories when present, and otherwise require `estado === 'analizado'` before calling Gemini. Provider I/O occurs outside a database transaction. A dedicated historias repository will then lock the project, re-check for a race winner, bulk-insert the validated stories, and set `proyectos.estado = 'planificado'` in one transaction. Every caller returns the committed stories in `id ASC` order; overlapping first requests may call Gemini more than once, but only one backlog is persisted.

Migration 005 will alter only the project-status and story-role checks. The migration runner will recognize the verified 005 descendant of migration 004, repair only known fixed partial states across the two constraints, verify the full target before recording success, and refuse rollback while `planificado` projects or newly permitted role values remain.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/migrations/005_enable_backlog_planning.up.sql`, `backend/migrations/005_enable_backlog_planning.down.sql` | New | Expand only project-status and story-role constraints. |
| `backend/scripts/migrate.js` | Modified | Register migration 005, recognize its two-constraint states, recover fixed partial states, and preserve migration 004 descendant compatibility. |
| `backend/src/schemas/project-backlog.schema.js` | New | Define matching strict runtime and provider schemas for 12–25 stories. |
| `backend/src/prompts/project-backlog.prompt.js` | New | Build a deterministic prompt from isolated persisted project data. |
| `backend/src/integrations/gemini.gateway.js` | Modified | Reuse the existing client and lazy configuration for structured backlog generation. |
| `backend/src/repositories/historias.repository.js` | New | Read stories in stable order and perform transactional first-writer persistence. |
| `backend/src/services/proyectos.service.js` | Modified | Orchestrate lookup, cache, eligibility, provider validation, persistence, and race-winner reload. |
| `backend/src/controllers/proyectos.controller.js`, `backend/src/routes/proyectos.routes.js` | Modified | Expose the validated backlog endpoint through existing envelopes. |
| `backend/tests/integration/proyectos.api.test.js` | Modified | Cover the three core API paths without a live provider. |
| `backend/tests/integration/migrations.test.js` | Modified | Cover migration 005 target constraints, checksum preservation, descendant compatibility, and rollback refusal. |
| `backend/README.md` | Modified (optional) | Add at most one endpoint line; no broader documentation work. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration 004 rejects migration 005's legitimate descendant status constraint. | High | Make the runner explicitly recognize and test the verified 005 descendant state without changing prior migration bytes. |
| MySQL DDL leaves one of the two constraints changed after interruption. | Medium | Recognize only fixed partial states, repair deterministically, and verify both constraints before recording migration success. |
| Concurrent first requests incur multiple Gemini calls. | Medium | Accept Cycle 2 provider-call semantics while locking and re-checking inside the persistence transaction so only one backlog is stored. |
| A provider response is structurally valid but semantically weak or influenced by persisted content. | Medium | Isolate persisted inputs as untrusted data and validate shape strictly; semantic backlog-quality evaluation remains deferred. |
| Insert or status-update failure creates partial planning data. | Low | Insert all stories and transition the project within one transaction, rolling back both on failure. |

## Rollback Plan

Disable the backlog route or pause writes, export any backlog data that must be retained, and use the current migration runner to execute migration 005 down only after projects and stories have been returned to source-compatible statuses and role labels. The down path must refuse rather than delete or rewrite incompatible business data. After the source constraints are verified, revert the backlog route, schema, prompt, gateway extension, repository, service orchestration, tests, and optional README line. Leave migrations 001–004 and their checksums unchanged.

## Dependencies

- The existing Cycle 2 Gemini gateway, lazy environment parsing, structured-output pattern, project service, and centralized error handling.
- The existing MySQL `historias` columns, project analysis data, transaction helper, row locking, and migration verification infrastructure.
- A configured Gemini key only for uncached real generation; automated tests use controlled gateway doubles.
- A guarded local MySQL database for maintainer-run integration and migration verification.

## Success Criteria

- [ ] `POST /api/proyectos/:id/backlog` returns 12–25 strictly schema-valid stories for an analyzed project through the existing success envelope.
- [ ] The committed stories use the exact fields, allowed enums, six role labels, and Fibonacci estimates, and the project becomes `planificado` atomically.
- [ ] A repeated request returns the same server-owned stories in stable order with zero additional provider calls and zero writes.
- [ ] A project with no stored backlog that is not analyzed returns HTTP 409 `PROJECT_NOT_ANALYZED` before provider or persistence work.
- [ ] Invalid provider JSON returns the existing sanitized HTTP 502 response and leaves stories and project state unchanged.
- [ ] Migration 005 changes no columns, preserves prior migration bytes/checksums, accepts the valid migration 004 descendant path, recovers only recognized partial states, and refuses unsafe rollback.
- [ ] Focused API and migration tests cover only the agreed core cases; no real-Gemini harness or exhaustive matrix is added.
- [ ] The maintainer runs the focused tests, full test suite, lint, and format check locally and reports the results once.
