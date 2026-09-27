# Design: Cycle 3 Gemini Backlog Generation

## Technical Approach

Extend the Cycle 2 project-analysis path with one backlog operation rather than introducing a second AI stack. `POST /api/proyectos/:id/backlog` will reuse identifier validation, controller envelopes, lazy Gemini configuration, structured output, centralized errors, and the `createProyectosService()` dependency seam. The service will return persisted stories before eligibility or provider work, generate and strictly validate a candidate only for an `analizado` project, and then delegate transaction ownership to a dedicated historias repository.

The repository will keep provider I/O outside the transaction. Inside one `withTransaction()` callback it will lock the project, re-read stories, preserve a concurrent first writer, insert one complete validated backlog, transition the project to `planificado`, and read the stored result in `id ASC` order. Migration 005 will alter only the project-state and story-role checks, with exact source/target recognition and deterministic recovery for the two fixed partial states created by cross-table MySQL DDL.

## Architecture Decisions

### Decision: Extend the existing Gemini gateway without changing analysis behavior

**Choice**: Add `generateProjectBacklog(prompt)` to `createGeminiGateway()` and factor the existing request body into a private `generateStructuredContent(prompt, responseJsonSchema)` helper. `generateProjectAnalysis()` keeps its current input, schema, output, lazy configuration timing, client creation, and `captureExchange` shape.

**Alternatives considered**: Create a second Gemini client/configuration module; put JSON parsing in the gateway; modify the analysis operation while adding backlog behavior.

**Rationale**: Cycle 2 already owns configuration and provider I/O. Sharing only the structured request mechanism avoids duplicate credentials and keeps JSON parsing plus Zod validation at the existing service boundary. Preserving the public analysis method and exchange capture prevents an unrelated Cycle 2 behavior change.

### Decision: Keep the runtime schema authoritative while mirroring every provider-supported constraint

**Choice**: Export `projectBacklogStorySchema`, `projectBacklogSchema`, and `projectBacklogJsonSchema` from one schema module backed by shared field, enum, and ordering constants. Both schemas define the same eight fields, required keys, types, six phases, three priorities, six generated roles, seven Fibonacci values, strict objects, and 12–25 array bounds. Zod additionally rejects blank text by trimming for validation while retaining the trimmed value.

**Alternatives considered**: Trust Gemini structured output without runtime validation; maintain unrelated provider and runtime definitions; send unsupported JSON Schema keywords.

**Rationale**: `@google/genai` supports the required object, enum, `additionalProperties`, `required`, `minItems`, and `maxItems` constraints in `responseJsonSchema`, but not `minLength` or `pattern`. Therefore exact structural parity is shared, and Zod remains the authoritative post-provider boundary for the non-blank invariant before database checks run. This preserves strict failure behavior without relying on unsupported provider schema features.

### Decision: Give the historias repository transaction ownership

**Choice**: Add a dedicated repository with `findByProjectId(configuration, projectId)` and `persistGeneratedBacklog(configuration, projectId, stories)`. The second method owns `withTransaction()` and returns a tagged result: an existing or newly committed backlog, or an ineligible locked state.

**Alternatives considered**: Put story SQL in `proyectos.repository.js`; let the service manage connections and transaction boundaries; hold a transaction open during Gemini I/O.

**Rationale**: Story persistence is a separate database concern, while project lookup and analysis persistence already have stable behavior. Repository-owned transactions prevent the service from coordinating low-level connection state and keep the provider call outside the lock duration.

### Decision: Use lock/recheck first-writer semantics without provider deduplication

**Choice**: Perform an unlocked cache read before Gemini. After generation, lock the project row with `SELECT estado FROM proyectos WHERE id = ? FOR UPDATE`, then re-read stories on that same connection. Existing stories win; otherwise only a locked `analizado` project can receive the candidate backlog.

**Alternatives considered**: Lock before calling Gemini; add an idempotency table or distributed lock; allow duplicate story inserts and reconcile later.

**Rationale**: This keeps external latency outside the transaction and matches Cycle 2's accepted concurrency model. Overlapping requests may spend two provider calls, but row serialization plus the in-transaction story recheck guarantees one persisted backlog.

### Decision: Model migration 005 as a specialized two-constraint migration

**Choice**: Register migration 005 with a dedicated migration kind. Inspect the named status and role checks as exact `source`, exact `target`, or `incompatible`; repair only `source/source`, `target/source`, and `source/target`; verify `target/target` before recording `applied`. Rollback performs a data preflight and restores only the two source checks.

**Alternatives considered**: Edit migration 004; treat migration 005 as a generic table migration; accept arbitrary supersets; rewrite or delete incompatible rows during rollback.

**Rationale**: MySQL DDL implicitly commits, and two tables cannot be altered atomically by one statement. Explicit state inspection makes interruption recovery deterministic while preserving all prior migration bytes and business data. Arbitrary states remain failures rather than guessed repairs.

### Decision: Treat the exact `planificado` status check as migration 004's descendant

**Choice**: Migration 004 inspection will accept its original target status check or the exact migration 005 target status check when the analysis column and analysis-object check remain exact. Migration 005 remains solely responsible for verifying its complete two-constraint target.

**Alternatives considered**: Require migration 004's exact two-value status forever; rewrite migration 004 and its checksum; let migration 004 validate the historias role check.

**Rationale**: Running migrations again must not reject a legitimate later status expansion, including a recoverable migration 005 partial state. Recognition is limited to the exact three-state descendant and does not broaden migration 004's ownership or mutate its history.

## Data Flow

### Request and cache flow

```text
POST /api/proyectos/:id/backlog
        |
        v
validate project id --> controller --> proyectos service
                                         |
                                         +--> load persisted project -- missing --> 404 PROJECT_NOT_FOUND
                                         |
                                         +--> read historias ORDER BY id ASC
                                         |       |
                                         |       +-- non-empty --> 200 cached stories
                                         |
                                         +-- estado != analizado --> 409 PROJECT_NOT_ANALYZED
                                         |
                                         +--> build prompt from persisted payload + analysis
                                         +--> Gemini structured output
                                         +--> JSON parse + strict Zod validation
                                         |       |
                                         |       +-- unusable --> 502 AI_ANALYSIS_FAILED
                                         |
                                         +--> historias repository transaction
                                                 |
                                                 +--> lock project
                                                 +--> re-read historias
                                                 +--> keep race winner OR insert candidate
                                                 +--> set estado = planificado
                                                 +--> read stories ORDER BY id ASC
                                                 +--> commit
                                         |
                                         +--> 200 committed stories
```

Request-body content is intentionally unused. The backlog prompt contains two separately delimited untrusted regions with final standalone end markers and UTF-8 byte lengths:

```text
trusted backlog instructions and exact output contract
BEGIN_UNTRUSTED_PROJECT_PAYLOAD_JSON
<JSON.stringify(project.payload)>
END_UNTRUSTED_PROJECT_PAYLOAD_JSON
BEGIN_UNTRUSTED_PROJECT_ANALYSIS_JSON
<JSON.stringify(project.analisisIa)>
END_UNTRUSTED_PROJECT_ANALYSIS_JSON
```

### Transaction flow

```text
persistGeneratedBacklog(configuration, projectId, candidate)
  |
  +-- withTransaction(configuration, connection)
        |
        +-- SELECT estado FROM proyectos WHERE id = ? FOR UPDATE
        +-- SELECT eight public fields FROM historias
        |     WHERE proyecto_id = ? ORDER BY id ASC
        |
        +-- rows exist ----------------------> return { outcome: 'existing', stories }
        +-- locked estado != analizado -----> return { outcome: 'ineligible' }
        +-- INSERT all candidate stories in one parameterized statement
        +-- UPDATE proyectos SET estado = 'planificado'
        |     WHERE id = ? AND estado = 'analizado'
        +-- require exactly one affected project row
        +-- re-read and verify stored story count
        +-- return { outcome: 'committed', stories }
  |
  +-- commit occurs before the result resolves
```

Any insert, update, mapping, count, or invariant failure escapes the callback and causes `withTransaction()` to roll back. Persistence failures are not converted to AI failures; the existing middleware sanitizes unexpected failures as HTTP 500 `INTERNAL_ERROR`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/migrations/005_enable_backlog_planning.up.sql` | Create | Declare the exact three-state project check and ten-role story check. |
| `backend/migrations/005_enable_backlog_planning.down.sql` | Create | Declare restoration of the migration 004 status check and migration 002 role check. |
| `backend/scripts/migrate.js` | Modify | Register specialized migration 005 inspection, fixed partial recovery, target verification, safe rollback, and migration 004 descendant recognition. |
| `backend/src/schemas/project-backlog.schema.js` | Create | Define shared constants, strict Zod story/backlog schemas, and matching provider JSON schema. |
| `backend/src/prompts/project-backlog.prompt.js` | Create | Build deterministic instructions with separate persisted payload and analysis trust boundaries. |
| `backend/src/integrations/gemini.gateway.js` | Modify | Share structured generation internals and add `generateProjectBacklog()` without changing analysis behavior. |
| `backend/src/repositories/historias.repository.js` | Create | Map stored stories, provide stable reads, and own atomic first-writer persistence. |
| `backend/src/services/proyectos.service.js` | Modify | Add cache, eligibility, prompt, provider validation, and transactional persistence orchestration. |
| `backend/src/controllers/proyectos.controller.js` | Modify | Add the backlog success-envelope handler. |
| `backend/src/routes/proyectos.routes.js` | Modify | Add validated `POST /:id/backlog` before `GET /:id`. |
| `backend/tests/integration/proyectos.api.test.js` | Modify | Add only the three agreed core API tests with a controlled gateway double. |
| `backend/tests/integration/migrations.test.js` | Modify | Add minimal target, descendant, representative partial recovery, checksum, and rollback-refusal proof. |
| `backend/README.md` | Modify | Add exactly one backlog endpoint row and no broader guidance. |

No existing migration file is modified or regenerated.

## Interfaces / Contracts

### Generated backlog contract

```js
// backend/src/schemas/project-backlog.schema.js
export const projectBacklogStorySchema = z.strictObject({
  fase: z.enum([
    'Análisis',
    'Diseño',
    'Desarrollo Frontend',
    'Desarrollo Backend',
    'Testing',
    'Despliegue',
  ]),
  prioridad: z.enum(['Alta', 'Media', 'Baja']),
  historia_usuario: nonBlankText,
  descripcion: nonBlankText,
  criterios_aceptacion: z.array(nonBlankText).min(1),
  alcance_tecnico: nonBlankText,
  estimacion_fibonacci: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(5),
    z.literal(8), z.literal(13), z.literal(21),
  ]),
  rol_sugerido: z.enum([
    'Frontend',
    'Backend',
    'QA',
    'Ciberseguridad',
    'Analista de requerimientos',
    'Project Manager',
  ]),
});

export const projectBacklogSchema = z.array(projectBacklogStorySchema).min(12).max(25);
```

The provider schema is an array with `minItems: 12`, `maxItems: 25`, an object item with `additionalProperties: false`, the same eight-entry `required` and `properties` order, string/array/integer types, and identical enums. Unsupported provider string-length keywords are omitted; Zod rejects blank strings before persistence.

### Gateway and service interfaces

```js
// Existing method remains unchanged.
geminiGateway.generateProjectAnalysis(prompt) -> Promise<string | undefined>

// New method uses projectBacklogJsonSchema.
geminiGateway.generateProjectBacklog(prompt) -> Promise<string | undefined>

// New service operation.
proyectosService.generateProjectBacklog(projectId) -> Promise<ProjectBacklogStory[]>
```

`createProyectosService()` gains two injectable dependencies while retaining the current ones:

```js
createProyectosService({
  repository = proyectosRepository,
  historiasRepository: storyRepository = historiasRepository,
  geminiGateway: analysisGateway = geminiGateway,
  getConfiguration = parseEnvironment,
  buildPrompt = buildProjectViabilityPrompt,
  buildBacklogPrompt = buildProjectBacklogPrompt,
} = {})
```

Provider exceptions, absent/blank text, malformed JSON, and Zod failures are caught only around provider-output handling and mapped to:

```js
new AppError(502, 'AI_ANALYSIS_FAILED', 'AI analysis failed')
```

### Historias repository contract

```js
historiasRepository.findByProjectId(configuration, projectId)
  -> Promise<ProjectBacklogStory[]>

historiasRepository.persistGeneratedBacklog(configuration, projectId, stories)
  -> Promise<
       | { outcome: 'committed', stories: ProjectBacklogStory[] }
       | { outcome: 'existing', stories: ProjectBacklogStory[] }
       | { outcome: 'ineligible' }
     >
```

The service maps `ineligible` to the same 409 conflict used by the pre-provider guard. A missing locked project, failed conditional update, invalid stored JSON, invalid stored story shape, or stored-count mismatch is an internal invariant failure and reaches the existing sanitized 500 handler.

Each generated story maps without translation:

| Public field | `historias` column | Persistence rule |
|--------------|--------------------|------------------|
| `fase` | `fase` | Validated generated enum |
| `prioridad` | `prioridad` | Validated generated enum |
| `historia_usuario` | `historia_usuario` | Validated non-blank text |
| `descripcion` | `descripcion` | Validated non-blank text |
| `criterios_aceptacion` | `criterios_aceptacion` | `JSON.stringify()` and `CAST(? AS JSON)` |
| `alcance_tecnico` | `alcance_tecnico` | Validated non-blank text |
| `estimacion_fibonacci` | `estimacion_fibonacci` | Validated integer enum |
| `rol_sugerido` | `rol_sugerido` | Persist requested labels directly; no legacy translation |

`proyecto_id` comes from the validated route identifier. `id`, timestamps, default `columna_tablero = 'Backlog'`, and nullable estimated dates remain database-owned. Reads select only the eight public fields, parse `criterios_aceptacion` when the driver returns text, validate any non-empty stored array, and order by `id ASC`; the database identifier establishes order but is not exposed.

### HTTP contracts

| Condition | Status | Envelope |
|-----------|--------|----------|
| First commit or stored backlog | 200 | `{ success: true, data: stories }` |
| Invalid project identifier | 400 | Existing `VALIDATION_ERROR` envelope |
| Unknown project identifier | 404 | Existing `PROJECT_NOT_FOUND` envelope |
| No stories and state is not `analizado` | 409 | `{ success: false, error: { code: 'PROJECT_NOT_ANALYZED', message: 'Project must be analyzed before backlog generation' } }` |
| Provider/output failure | 502 | `{ success: false, error: { code: 'AI_ANALYSIS_FAILED', message: 'AI analysis failed' } }` |
| Database or internal invariant failure | 500 | Existing sanitized `INTERNAL_ERROR` envelope |

### Migration 005 state contract

| Constraint | Source definition | Target definition |
|------------|-------------------|-------------------|
| `chk_proyectos_estado` | `estado IN ('nuevo', 'analizado')` | `estado IN ('nuevo', 'analizado', 'planificado')` |
| `chk_historias_rol` | `rol_sugerido IN ('Desarrollador Frontend', 'Desarrollador Backend', 'Analista QA', 'Analista de Ciberseguridad', 'Analista de requerimientos', 'Project Manager')` | `rol_sugerido IN ('Desarrollador Frontend', 'Desarrollador Backend', 'Analista QA', 'Analista de Ciberseguridad', 'Analista de requerimientos', 'Project Manager', 'Frontend', 'Backend', 'QA', 'Ciberseguridad')` |

Migration 005 recognizes exactly these pairs:

| Status check | Role check | `up` behavior |
|--------------|------------|---------------|
| source | source | Record `applying`, replace status, replace role, verify target/target, record `applied`. |
| target | source | Replace only role, verify target/target, record `applied`. |
| source | target | Replace only status, verify target/target, record `applied`. |
| target | target | Verify and finalize/adopt history without DDL. |
| incompatible/absent | any | Refuse without recording success or rewriting data. |

Migration 004 treats only the exact target status definition above as its recognized descendant; it does not accept arbitrary additional states. This recognition is required before migration 005 can repair a status-target/role-source interruption.

Before migration 005 rollback changes history or constraints, it checks for both blockers:

```sql
SELECT COUNT(*) FROM proyectos WHERE estado = 'planificado';
SELECT COUNT(*) FROM historias
WHERE rol_sugerido IN ('Frontend', 'Backend', 'QA', 'Ciberseguridad');
```

Any positive count refuses rollback with no data rewrite and leaves migration 005 applied. With zero blockers, the runner records `rolling_back`, restores the exact source role and status checks, verifies source/source, and then removes the migration 005 history row. A recognized one-source/one-target state with `rolling_back` history resumes only the remaining fixed restoration after repeating the blocker preflight.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | No new standalone unit matrix | Keep the change within the agreed core tests; schema, prompt, and gateway behavior are exercised through the controlled API provider path. |
| Integration — API | Success, persistence, repeat cache | In `proyectos.api.test.js`, seed one `analizado` project, return exactly 12 valid stories from a mocked `generateProjectBacklog`, request twice, assert exact eight-field responses in stable order, 12 stored rows, `planificado`, one provider call, and no second write. |
| Integration — API | Not analyzed | Seed a `nuevo` project with no stories; assert exact 409 `PROJECT_NOT_ANALYZED`, zero provider calls, zero stories, and unchanged state. |
| Integration — API | Invalid provider JSON | Seed an `analizado` project, return malformed JSON, assert exact sanitized 502 `AI_ANALYSIS_FAILED`, zero stories, and state still `analizado`. |
| Integration — migration | Minimal migration 005 proof | Extend `migrations.test.js` to assert exact target checks and unchanged story columns, migration 001–004 checksum continuity, a second `up` accepting the 005 descendant, one representative fixed partial recovery, safe empty rollback through the existing ordered rollback test, and one retained-data rollback refusal. Do not add an exhaustive state matrix. |
| E2E/live provider | Not in scope | Use no live Gemini harness and consume no provider quota. |

Maintainer-run verification from `backend/`:

```powershell
npm test -- tests/integration/migrations.test.js tests/integration/proyectos.api.test.js
npm test
npm run lint
npm run format:check
```

These commands are documented for later execution; this design does not claim they have passed.

## Threat Matrix

N/A — this change adds a normal validated Express route and extends existing database migration logic, but introduces no shell-command construction, new subprocess boundary, VCS/PR automation, executable-file classification, or process integration. The existing fixed migration test subprocess invocation is unchanged.

## Migration / Rollout

1. Apply migration 005 before enabling backlog writes. The runner first verifies migration 004 and then the exact migration 005 source/target pair under the existing advisory lock.
2. Deploy the schema, prompt, gateway extension, historias repository, service, controller, and route together. No feature flag or data backfill is required.
3. Existing projects remain `nuevo` or `analizado`; no backlog is generated until the endpoint is called.
4. Sequential repeat calls use stored stories and do not require Gemini configuration.
5. To roll back, disable or pause the backlog route, remove or export incompatible planning data through an explicit business decision, then run migration 005 down. The runner refuses while any `planificado` project or newly permitted role remains; it never deletes or rewrites that data.
6. Revert application files only after the source constraints have been safely restored. Migrations 001–004 and their checksums remain untouched throughout.

## Open Questions

None. The implementation boundaries, state transitions, error contracts, migration states, and verification commands are settled.
