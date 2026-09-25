# Proposal: Cycle 2 Gemini Project Viability

## Intent

Add a controlled project-viability analysis flow that evaluates the persisted configurator payload with Gemini, validates the structured result, and stores it for later retrieval. The change must preserve existing API contracts, avoid duplicate provider billing for already analyzed projects, and evolve deployed MySQL databases without modifying checksum-protected migrations.

## Scope

### In Scope

- Add `POST /api/proyectos/:id/analizar`, preserving the existing project 404 and uniform response envelopes.
- Build a prompt from the persisted project `payload`, treating its contents as untrusted data, and request viability/completeness through official `@google/genai` structured output.
- Use `GEMINI_API_KEY` from the environment, default to `gemini-2.5-flash`, and configure `responseMimeType: application/json` with a response JSON schema matching the runtime contract.
- Parse and Zod-validate `viable`, `completitud`, `campos_faltantes`, `observaciones`, and `mensaje_para_cliente` before persistence.
- Add an additive migration for nullable `analisis_ia` and status `analizado`; preserve prior migration checksums and safely extend interrupted-ALTER recovery.
- Persist a validated analysis and status `analizado` atomically after the provider call, without holding a database transaction during network I/O.
- Return the stored analysis without another Gemini call when a project is already analyzed.
- Normalize provider, empty, malformed, and schema-invalid responses to a controlled HTTP 502 without exposing secrets or implementation details.
- Add mocked automatic coverage and an explicit opt-in, exactly-one-call live Gemini evidence harness; update environment examples, package files, and concise backend guidance.

### Out of Scope

- Backlog or user-story generation and persistence.
- Email delivery or other client notification mechanisms.
- Sophisticated provider retry, backoff, or failover policies.
- Frontend changes, authentication, or public-exposure hardening.
- Unrelated refactors or changes to existing configurator behavior.

## Capabilities

### New Capabilities

- `gemini-viability-analysis`: Analyze a persisted project through Gemini structured output, validate and cache the result, prevent repeat billing, and expose a guarded live-evidence workflow.

### Modified Capabilities

- `project-management-api`: Extend the project API with the analysis operation, existing-project lookup semantics, and cached repeat-call behavior.
- `planning-data-persistence`: Extend the project schema and migration guarantees to store validated AI analysis with status `analizado` atomically.
- `api-reliability-contract`: Add safe `AI_ANALYSIS_FAILED` HTTP 502 behavior and endpoint regression coverage for analysis outcomes.
- `backend-code-quality`: Document Gemini configuration and the opt-in live harness while preserving independent operation and automated quality gates.

## Approach

Introduce a Gemini gateway around `@google/genai` and an injectable project service that owns orchestration. The service loads the project first, short-circuits when a stored analysis already exists, builds a deterministic prompt from `payload`, invokes `gemini-2.5-flash`, parses `response.text`, and validates it against a strict Zod schema matching the provider JSON schema. Any provider or response-contract failure becomes one safe 502 error.

After successful validation, perform one atomic database update for `analisis_ia` and `estado = 'analizado'`; the network call occurs before, and outside, any database transaction. Add a new reversible migration rather than editing prior migrations, and extend migration recovery to verify ALTER-specific schema state. Automatic tests mock Gemini. A separately gated live harness creates a guarded real test project, permits exactly one provider invocation, and records sanitized prompt/configuration/provider/API/persistence evidence without the API key.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/routes/proyectos.routes.js`, `backend/src/controllers/proyectos.controller.js` | Modified | Expose the analysis endpoint through existing HTTP conventions. |
| `backend/src/services/proyectos.service.js`, `backend/src/repositories/proyectos.repository.js` | Modified | Orchestrate cached analysis and atomically persist validated results. |
| `backend/src/integrations/gemini.gateway.js`, `backend/src/prompts/project-viability.prompt.js` | New | Isolate the SDK call and deterministic untrusted-payload prompt. |
| `backend/src/schemas/project-analysis.schema.js`, `backend/src/config/env.js` | New/Modified | Define matching provider/runtime schemas and lazy Gemini configuration. |
| `backend/migrations/004_add_project_ai_analysis.*.sql`, `backend/scripts/migrate.js` | New/Modified | Add analysis storage and recover additive ALTER migration state safely. |
| `backend/tests/integration/`, `backend/tests/live/`, `backend/tests/unit/` | New/Modified | Cover mocked API behavior, migrations, configuration, and one-call live evidence. |
| `backend/.env.example`, `backend/package.json`, `backend/package-lock.json`, `backend/README.md` | Modified | Add non-secret configuration, SDK/scripts, and concise operating guidance. |
| `openspec/specs/` via change deltas | Modified | Evolve the four canonical capabilities listed above. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Project payloads contain customer and business data sent to an external provider. | High | Document the boundary, delimit payload as untrusted data, sanitize all errors/evidence, and never log or return the complete payload unintentionally. |
| API key or provider internals leak through configuration, errors, or evidence. | Medium | Read the key lazily from the environment, keep `.env` ignored, use placeholders only, and expose one normalized 502 without SDK messages, headers, or environment dumps. |
| MySQL ALTER DDL is partially applied or migration history drifts. | Medium | Add a checksum-protected new migration, verify column/constraint state during recovery, and test apply/rollback/recovery paths against guarded MySQL. |
| Concurrent first-time requests can trigger duplicate Gemini billing before either result is stored. | Medium | Re-check persisted state before the atomic write and cover repeat behavior; document that cross-request provider deduplication beyond this guard is deferred. |
| Structured output is syntactically valid but semantically poor or prompt-influenced. | Medium | Treat payload as data, constrain provider output with JSON schema, and reject every result that fails strict Zod validation. |

## Rollback Plan

Disable and remove the analysis route, gateway, prompt, service orchestration, SDK dependency, scripts, and documentation, then deploy the pre-change application before running the new migration's down path. The down migration must restore the prior status constraint and remove `analisis_ia`; export any stored analyses first if they must be retained. Revert only the migration-runner support added for ALTER-state recovery and leave all prior migration files and checksums unchanged.

## Dependencies

- Official `@google/genai` runtime package.
- A valid `GEMINI_API_KEY` only for real provider execution; automatic tests require no real key.
- An accessible guarded MySQL test database for migration and persistence verification.
- Existing centralized errors, project route/service/repository layering, and migration checksum controls.

## Success Criteria

- [ ] `POST /api/proyectos/:id/analizar` returns HTTP 200 with the exact schema-valid analysis contract for an existing unanalyzed project.
- [ ] A missing project returns the existing HTTP 404 contract and causes zero Gemini calls.
- [ ] Provider failure, empty text, malformed JSON, and schema-invalid JSON each return the same sanitized HTTP 502 contract and persist no analysis.
- [ ] The validated analysis and status `analizado` are committed atomically, with no database transaction held during the provider call.
- [ ] A repeated request returns the stored analysis and causes zero additional Gemini calls.
- [ ] The additive migration applies, rolls back, and recovers interrupted ALTER state without changing prior migration checksums.
- [ ] Automatic tests mock Gemini and cover success, missing-project/no-call, malformed JSON, and cached repeat behavior.
- [ ] The explicit live harness performs exactly one real Gemini call for one guarded test project and emits sanitized complete prompt/configuration/provider response/API response/persisted-result evidence without the key.
- [ ] `npm test`, lint, and format verification pass, and README/environment guidance is sufficient to configure and run both mocked and opt-in live workflows.
