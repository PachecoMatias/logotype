# Design: Cycle 2 Gemini Project Viability

## Technical Approach

Add the analysis operation within the existing Express controller/service/repository structure, with Gemini isolated behind an injectable gateway. The service will load the persisted project first, return a valid stored analysis without side effects, build a prompt only from the persisted payload, obtain raw text from Gemini, parse and strictly validate it, and then ask the repository to perform one conditional atomic update of `analisis_ia` and `estado`.

The implementation remains under `backend/`. It adds migration 004 instead of changing checksum-protected migration 001. Migration 004 uses one atomic `ALTER TABLE` in each direction, while the migration runner gains schema inventory and fixed-clause recovery for recognized source, target, and partial apply states. Ambiguous states are refused.

The provider dependency is the official `@google/genai` package at the current compatible 2.x line (`^2.24.0`, resolved exactly in `package-lock.json`). Its declared runtime is Node.js 20 or later, so the repository's existing Node.js 22 engine remains compatible. SDK construction and `GEMINI_API_KEY` parsing occur only inside a real gateway call; importing the application, starting unrelated routes, and running mocked tests have no Gemini network or key dependency.

The guarded live harness exercises the same public HTTP boundary as clients: it creates a fresh approved synthetic project in the real guarded MySQL test database, then uses listener-free Supertest against `app` to invoke `POST /api/proyectos/:id/analizar`. The production gateway method is temporarily wrapped with an instrumented real gateway so the route still traverses validation, controller, service, repository, centralized response handling, and persistence while recording exactly one real provider invocation and the complete approved evidence set.

CodeGraph was unavailable: `.codegraph/` is absent and the prior lazy initialization attempt failed because the `codegraph` executable is unavailable. This design therefore used the required narrow filesystem fallback over the affected backend modules, migrations, and tests. `openspec/config.yaml` is absent, so there are no project-specific `rules.design` additions to apply.

Delivery remains one Single PR under a `size:exception` directly authorized by the maintainer in the current parent-confirmed session preflight and user instruction. The exception is not inferred from the proposal or specs, and this document does not expand scope beyond Cycle 2.

## Architecture Decisions

### Decision: Keep SDK use behind a lazy, injectable gateway

**Choice**: Add `createGeminiGateway(...)` and a production `geminiGateway` object. `generateProjectAnalysis(prompt)` constructs `GoogleGenAI` at call time, sends the structured-output request, and returns only `response.text`. An optional evidence observer receives a key-free request snapshot and raw response text for the guarded live harness.

**Alternatives considered**: Instantiate the SDK at module load; call Gemini directly from the controller or service; let the gateway parse and validate the response.

**Rationale**: Call-time construction keeps startup and unrelated routes independent of `GEMINI_API_KEY`. Returning raw text lets service tests inject empty, malformed, and schema-invalid responses without mocking SDK internals. Keeping parsing in the service separates provider transport from the application contract.

### Decision: Define runtime and provider schemas together, then test structural parity

**Choice**: `project-analysis.schema.js` exports a strict Zod object and a plain JSON Schema with the same five required fields, `additionalProperties: false`, and identical enum/type constraints.

**Alternatives considered**: Generate JSON Schema dynamically from Zod; maintain schemas in unrelated modules; accept and strip extra provider fields.

**Rationale**: A small explicit pair avoids another conversion dependency and uses the exact `responseJsonSchema` shape supported by `@google/genai`. Strict rejection, rather than stripping, makes contract drift visible. Unit tests will assert both schemas accept and reject the same representative objects and that the provider schema has the exact required field set.

### Decision: Treat persisted payload as untrusted prompt data

**Choice**: A pure prompt builder serializes only `project.payload`, places the complete JSON inside explicit untrusted-data delimiters, includes its UTF-8 byte length, and states that content inside the region is data and must never override the task or output contract. Client request bodies are ignored by the analysis controller.

**Alternatives considered**: Concatenate selected fields; pass the analysis request body to Gemini; rely on structured output without prompt-injection instructions.

**Rationale**: The persisted payload is the source of truth and includes preserved unknown/free-text fields. Explicit delimiting and instructions reduce instruction confusion, while structured output and strict validation constrain shape. They do not claim to guarantee semantic truth, so no backlog generation or other inferred behavior is permitted.

### Decision: Use a service factory while preserving current imports and mock patterns

**Choice**: Export `createProyectosService({ repository, geminiGateway, getConfiguration, buildPrompt })`, a production `proyectosService`, and thin named exports used by the existing controller. Dependencies remain objects whose methods are looked up at call time.

**Alternatives considered**: Replace the application with a dependency-injection container; pass dependencies from every route; keep only hard-coded module imports.

**Rationale**: The factory enables focused service and live-harness construction without changing the application's simple ESM architecture. The production singleton preserves existing controller imports, while object methods remain compatible with Node's `test.mock.method` convention already used by endpoint tests.

### Decision: Let the first conditional database update win concurrent races

**Choice**: The repository performs one autocommit `UPDATE` that sets both fields only when `estado = 'nuevo' AND analisis_ia IS NULL`. A successful update returns the validated result. If `affectedRows` is zero after provider work, the service reloads the project and returns the now-valid stored analysis. Any other state is treated as an internal persistence invariant failure.

**Alternatives considered**: Hold a transaction or row lock across Gemini I/O; use a distributed lock; allow last-writer-wins overwrites.

**Rationale**: No production transaction is held during network I/O, and stale provider results cannot overwrite a winner. Two simultaneous first requests may still make two billable calls, which is explicitly accepted this cycle. A later request sees `analizado` and makes zero calls and zero writes.

### Decision: Extend the migration runner with migration-specific state inspection

**Choice**: Keep create-table migrations 001-003 on their current table-existence strategy. Register migration 004 as an ALTER migration with an inspector, target verifier, fixed recovery clauses, and rollback preflight. Normal up/down each use one atomic `ALTER TABLE` from the versioned SQL file.

**Alternatives considered**: Edit migration 001; treat `proyectos` existence as migration 004 completion; introduce a general migration framework; blindly replay the full ALTER after interruption.

**Rationale**: Prior checksums must remain unchanged, and table existence cannot describe an ALTER state. A narrowly scoped state strategy is enough for this migration and avoids an unrelated migration-framework rewrite. Fixed SQL fragments prevent live schema metadata from becoming executable SQL.

### Decision: Separate quota-free automation from an explicit live evidence command

**Choice**: Keep all normal tests mocked. Name the live harness `gemini-analysis.live.js` so default Node test discovery does not execute it, and run it only through `npm run test:gemini:live`. The command and harness both enforce the opt-in/test-database guards. The harness creates the approved synthetic project in guarded MySQL, invokes the public analysis route with listener-free Supertest, and temporarily wraps the shared gateway object's method with an instrumented real gateway whose counter is asserted to equal one. Evidence is written to ignored `backend/test-results/gemini-live-evidence.json`.

**Alternatives considered**: Put a `.test.js` live file in normal discovery and skip conditionally; print incomplete evidence only to the console; reuse production data.

**Rationale**: Excluding the file from normal discovery provides a stronger zero-quota guarantee even if a developer has Gemini variables in the environment. Exercising `request(app)` instead of calling the service directly proves the exact public status and envelope without opening a listener, while the dynamic object-method lookup already chosen for the service permits narrow gateway instrumentation without replacing production routing. A file artifact is reviewable and can contain the complete approved synthetic request and raw response without committing it or exposing secrets.

## Data Flow

### First successful analysis

```text
POST /api/proyectos/:id/analizar
        |
        v
Zod route validation --invalid--> centralized HTTP 400
        |
        v
controller -> proyectosService.analyzeProject(id)
        |
        v
repository.findById(configuration, id)
        |--missing----------------> PROJECT_NOT_FOUND HTTP 404
        |--valid cached-----------> return stored analysis; 0 calls, 0 writes
        v
build prompt from persisted payload only
        |
        v
geminiGateway.generateProjectAnalysis(prompt)
  lazy env/key -> lazy SDK client -> one generateContent call -> raw text
        |
        v
non-empty check -> JSON.parse -> strict Zod validation
        |--provider/shape failure-> AI_ANALYSIS_FAILED HTTP 502; 0 writes
        v
repository.storeAnalysisIfPending(configuration, id, analysis)
        |
        |--updated---------------> return validated analysis
        `--race lost-------------> reload and return winner's stored analysis
```

The repository update is a single SQL statement; there is no explicit transaction around the provider call or update:

```sql
UPDATE proyectos
SET analisis_ia = CAST(? AS JSON), estado = 'analizado'
WHERE id = ? AND estado = 'nuevo' AND analisis_ia IS NULL;
```

### Simultaneous first requests

```text
Request A: read nuevo -> Gemini A -> conditional UPDATE wins -> result A stored
Request B: read nuevo -> Gemini B -> conditional UPDATE affects 0 rows
                                              |
                                              v
                                     reload -> return stored result A
```

Duplicate provider calls are possible only for overlapping first requests. There is no distributed lock in Cycle 2. The compare-and-set update prevents result B from overwriting result A or creating an `analizado`/analysis mismatch.

### Guarded live evidence path

```text
explicit live command + test-database guards
        |
        v
POST /api/proyectos with approved synthetic fixture via request(app)
        |
        v
fresh `nuevo` row in guarded real MySQL
        |
        v
install temporary instrumented real-gateway wrapper; counter = 0
        |
        v
POST /api/proyectos/:id/analizar via listener-free request(app)
        |
        +--> route validation -> controller -> service -> repository lookup
        |                                      |
        |                                      v
        |                          counter += 1 -> one real Gemini call
        |                                      |
        |                                      v
        |                          raw text -> strict validation -> atomic write
        v
capture exact HTTP status + response envelope
        |
        v
reload persisted row from guarded MySQL
        |
        v
assert counter === 1, HTTP 200, validated/API/persisted equality, and exclusions
        |
        v
write ignored sanitized evidence artifact; restore gateway wrapper
```

Every guard is evaluated before installing or invoking the real gateway. Project creation and analysis both use the existing listener-free HTTP test boundary; direct service invocation is not accepted as live API evidence. Failure before or during the API request must restore the gateway wrapper and must not attempt a second provider call.

## Interfaces / Contracts

### Exact analysis contract

`backend/src/schemas/project-analysis.schema.js` will expose:

```js
export const projectAnalysisSchema = z.strictObject({
  viable: z.boolean(),
  completitud: z.enum(['completo', 'falta_info']),
  campos_faltantes: z.array(z.string()),
  observaciones: z.string(),
  mensaje_para_cliente: z.string(),
});

export const projectAnalysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'viable',
    'completitud',
    'campos_faltantes',
    'observaciones',
    'mensaje_para_cliente',
  ],
  properties: {
    viable: { type: 'boolean' },
    completitud: { type: 'string', enum: ['completo', 'falta_info'] },
    campos_faltantes: { type: 'array', items: { type: 'string' } },
    observaciones: { type: 'string' },
    mensaje_para_cliente: { type: 'string' },
  },
};
```

Missing fields, extra fields, wrong types, non-string array members, arrays at the root, and any other `completitud` value fail validation.

### Prompt builder

```js
export function buildProjectViabilityPrompt(payload) => string;
```

The output is deterministic for the mapped persisted payload and contains:

1. The viability/completeness task and exact five-field output purpose.
2. A rule that the payload is untrusted data, including any instruction-like text inside it.
3. The serialized payload's UTF-8 byte length.
4. `BEGIN_UNTRUSTED_PROJECT_PAYLOAD_JSON` and `END_UNTRUSTED_PROJECT_PAYLOAD_JSON` delimiters around the complete `JSON.stringify(payload)` result.
5. No API key, provider configuration, or client-supplied analysis body.

Normal logs and errors never receive or emit this string.

### Gemini gateway

```js
export function createGeminiGateway({
  createClient,
  getConfiguration,
  captureExchange,
} = {}) => {
  generateProjectAnalysis(prompt): Promise<string | undefined>
};

export const geminiGateway = createGeminiGateway();
```

At `generateProjectAnalysis` invocation only:

```js
const { apiKey, model } = parseGeminiEnvironment();
const ai = new GoogleGenAI({ apiKey });
const config = {
  responseMimeType: 'application/json',
  responseJsonSchema: projectAnalysisJsonSchema,
};
const response = await ai.models.generateContent({ model, contents: prompt, config });
return response.text;
```

`captureExchange`, when explicitly supplied by the live harness, receives only `{ request: { contents, model, config }, rawProviderText }`. It never receives the SDK client, API key, headers, or environment object. The production singleton has no observer.

### Lazy Gemini configuration

`backend/src/config/env.js` keeps `parseEnvironment()` unchanged for server/database configuration and adds a separate function:

```js
export function parseGeminiEnvironment(environment = process.env) {
  // returns { apiKey, model }
  // GEMINI_API_KEY: required non-empty string
  // GEMINI_MODEL: optional non-empty string, default 'gemini-2.5-flash'
}
```

Nothing calls this function during module import, server startup, project creation/list/detail, or a cached analysis response. A missing key reached through the real gateway is caught at the provider boundary and normalized to `AI_ANALYSIS_FAILED`.

### Project service

```js
export function createProyectosService({
  repository,
  geminiGateway,
  getConfiguration,
  buildPrompt,
} = {}) => {
  createProject(payload): Promise<Project>,
  listProjects(): Promise<Project[]>,
  getProjectById(id): Promise<Project>,
  analyzeProject(id): Promise<ProjectAnalysis>,
};
```

Only the gateway invocation, empty-text check, `JSON.parse`, and provider-result Zod validation are inside the analysis-failure normalization block. Repository lookup/write errors stay outside that block and continue through the existing safe `INTERNAL_ERROR` behavior. This prevents database failures from being mislabeled as provider failures.

The fixed known error is:

```js
new AppError(502, 'AI_ANALYSIS_FAILED', 'AI analysis failed');
```

No `details` are attached. The existing centralized `errorHandler` already preserves known `AppError` status/code/message and converts unknown errors to the safe 500 envelope, so it requires no production change.

### Repository and mapped project

Repository methods remain configuration-first and gain:

```js
storeAnalysisIfPending(configuration, id, analysis)
  => Promise<{ updated: boolean }>;
```

All project selects include `analisis_ia`. `mapProject` exposes:

```js
{
  id,
  estado,
  payload,
  analisisIa: null | ProjectAnalysis,
  creadoEn,
  actualizadoEn,
}
```

String-valued MySQL JSON is parsed. Non-null stored analysis is checked with `projectAnalysisSchema`; corrupted persisted data becomes an internal invariant failure rather than triggering Gemini or being returned as a valid cache entry.

### HTTP contract

```http
POST /api/proyectos/:id/analizar
```

- Valid positive integer, existing `nuevo` project, valid provider response: HTTP 200 `{ "success": true, "data": <ProjectAnalysis> }`.
- Existing `analizado` project with valid stored analysis: the same HTTP 200 shape, zero provider calls, zero writes.
- Missing project: existing HTTP 404 `PROJECT_NOT_FOUND`, zero provider calls/writes.
- Invalid ID: existing HTTP 400 `VALIDATION_ERROR`, zero lookup/calls/writes.
- Provider exception, missing key at real gateway use, absent/blank text, malformed JSON, or schema-invalid JSON: HTTP 502 `{ "success": false, "error": { "code": "AI_ANALYSIS_FAILED", "message": "AI analysis failed" } }`, zero writes.
- Persistence/invariant failure: existing sanitized HTTP 500 `INTERNAL_ERROR`.

The controller does not read analysis data from `request.body`.

## Migration 004 Design

### Versioned SQL

`004_add_project_ai_analysis.up.sql` performs one atomic ALTER:

```sql
ALTER TABLE proyectos
  ADD COLUMN analisis_ia JSON NULL AFTER estado,
  ADD CONSTRAINT chk_proyectos_analisis_ia_objeto
    CHECK (analisis_ia IS NULL OR JSON_TYPE(analisis_ia) = 'OBJECT'),
  DROP CHECK chk_proyectos_estado,
  ADD CONSTRAINT chk_proyectos_estado
    CHECK (estado IN ('nuevo', 'analizado'));
```

`004_add_project_ai_analysis.down.sql` performs the inverse only after runner preflight confirms there is no retained analysis/status data:

```sql
ALTER TABLE proyectos
  DROP CHECK chk_proyectos_estado,
  ADD CONSTRAINT chk_proyectos_estado
    CHECK (estado IN ('nuevo')),
  DROP CHECK chk_proyectos_analisis_ia_objeto,
  DROP COLUMN analisis_ia;
```

Migration 001 remains byte-for-byte unchanged.

### Inventory and classification

The runner queries `INFORMATION_SCHEMA.COLUMNS`, `TABLE_CONSTRAINTS`, and `CHECK_CONSTRAINTS` for `proyectos`. It verifies the existing `estado` column's current type, nullability, default, and case-sensitive collation before classifying status checks. Check clauses are canonicalized only to remove database-added identifier quoting, character-set introducers, redundant parentheses, and whitespace; quoted values retain case.

The analysis facts are:

- Column: absent, exact nullable `JSON`, or incompatible.
- Analysis check: absent, exact named object-or-null check, or incompatible/extra.
- Status check: exact source `nuevo`, exact target `nuevo | analizado`, or incompatible/extra.
- Data compatibility: when the analysis column exists, every non-null value is a JSON object.

| Live facts | Classification | Recovery behavior |
|---|---|---|
| No analysis column/check + source status | Source | Run the complete up SQL, verify target, then record applied. |
| Exact column, check absent + source or target status | Recognized partial | Add only the fixed missing object check and any missing status expansion. |
| Exact column/check + source status | Recognized partial | Replace only the status check. |
| No analysis column/check + target status | Recognized partial | Add only the fixed analysis column and object check. |
| Exact column/check + target status | Target | Verify and record/finalize applied without replaying ALTER. |
| Check without its column, wrong type/nullability/check semantics/status set, extra conflicting checks, or non-object stored analysis | Ambiguous | Fail clearly; do not execute repair SQL or record success. |

Recovery SQL is assembled exclusively from constant clauses owned by migration 004. Metadata values are never interpolated as identifiers or SQL.

### History-state behavior

- No 004 history + source: insert `applying`, execute up, verify exact target, mark `applied`.
- No 004 history + target: insert one verified `applied` record with migration 004's checksum.
- No 004 history + recognized partial: insert `applying`, complete only missing fixed clauses, verify target, mark `applied`.
- `applying` + target: mark `applied` once after verification.
- `applying` + source/recognized partial: complete deterministically, verify, then mark `applied`.
- `applied` + anything other than exact target: fail without repair or history mutation.
- `rolling_back` + exact source: delete the 004 history row; the next requested action may proceed normally.
- `rolling_back` + exact target: on `down`, re-run rollback only after safety preflight; on `up`, restore `applied` because rollback DDL did not occur.
- `rolling_back` + partial/ambiguous state: refuse. Atomic down is expected to leave source or target, so a partial rollback needs operator review.

The runner continues to acquire the existing advisory lock before inventory or mutation. Migration 004 is marked applied only after a fresh target inspection.

### Rollback safety

Before changing history to `rolling_back`, the runner requires:

```sql
SELECT COUNT(*) AS blocking_count
FROM proyectos
WHERE estado <> 'nuevo' OR analisis_ia IS NOT NULL;
```

Any positive count aborts with a fixed data-preservation message and leaves schema/history applied. Operators must export required analyses and explicitly return rows to the source-compatible state before retrying. The runner never deletes or rewrites business data automatically. After down SQL, exact source state is verified before deleting migration history.

## Real-Call Evidence Contract

The live harness uses only a committed synthetic fixture with non-routable contact values and a distinctive test marker. It refuses to start unless all of these are true:

- It is invoked through the explicit live command/flag.
- `NODE_ENV` is `test`.
- The selected database is exactly the guarded `logotype_test`, differs from the application database, ends in `_test`, and has `TEST_DB_RESET_ALLOWED=true` through existing configuration validation.
- A real Gemini key is available at the gateway boundary.

It creates one fresh `nuevo` project from the committed fixture through listener-free `request(app).post('/api/proyectos')`, then temporarily wraps `geminiGateway.generateProjectAnalysis` with an instrumented real gateway. It calls `request(app).post('/api/proyectos/:id/analizar')` exactly once, increments the counter immediately before the real SDK call, asserts `providerCallCount === 1`, asserts the exact HTTP status and success envelope, strictly validates `response.body.data`, reloads the row from real guarded MySQL, and asserts the validated API result equals the persisted analysis before writing:

```json
{
  "evidenceVersion": 1,
  "providerCallCount": 1,
  "providerRequest": {
    "contents": "complete approved synthetic prompt",
    "model": "gemini-2.5-flash",
    "structuredOutputConfiguration": {
      "responseMimeType": "application/json",
      "responseJsonSchema": {}
    }
  },
  "rawProviderText": "complete provider response text",
  "validatedResult": {},
  "httpResponse": {
    "status": 200,
    "envelope": {
      "success": true,
      "data": {}
    }
  },
  "persistedResult": {
    "id": 0,
    "estado": "analizado",
    "analisisIa": {}
  }
}
```

`providerRequest.contents` is the complete prompt derived only from the approved synthetic fixture; `providerRequest.model` is the selected model; and `providerRequest.structuredOutputConfiguration` is the complete key-free structured-output configuration passed to the SDK. `rawProviderText` preserves the complete provider text. `validatedResult` is obtained by strictly parsing the successful API `data`; `httpResponse.status` and `httpResponse.envelope` preserve the exact public API outcome; and `persistedResult` is a fresh database read containing the stored analysis and status.

Before writing, the harness asserts that the serialized evidence does not contain the actual API key, any authentication or authorization header, environment object or dump, SDK client/internal fields, or data outside the approved synthetic fixture. The evidence object has no headers or environment field. Sanitization is achieved primarily by controlled synthetic input and a key-free capture interface; raw provider text is otherwise preserved in full for review. No production payload, production-derived prompt, or unapproved personal or business data enters this path. The temporary gateway wrapper is always restored in cleanup.

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/package.json` | Modify | Add `@google/genai` `^2.24.0` and the explicit `test:gemini:live` script. |
| `backend/package-lock.json` | Modify | Lock the SDK and transitive dependency graph under Node 22. |
| `backend/.env.example` | Modify | Add non-secret `GEMINI_API_KEY` placeholder and `GEMINI_MODEL=gemini-2.5-flash`. |
| `backend/.gitignore` | Modify | Ignore generated `test-results/` live evidence. |
| `backend/README.md` | Modify | Document the fourth endpoint, cache/failure behavior, lazy configuration, migration/rollback, quota-free tests, live command/evidence, and controlled-environment warning. |
| `backend/migrations/004_add_project_ai_analysis.up.sql` | Create | Add nullable object-constrained analysis JSON and expand status to `nuevo | analizado`. |
| `backend/migrations/004_add_project_ai_analysis.down.sql` | Create | Restore `nuevo`-only status and remove analysis storage after runner preflight. |
| `backend/scripts/migrate.js` | Modify | Register 004; add ALTER inventory, classification, fixed repair, verification, history recovery, and safe rollback preflight. |
| `backend/src/config/env.js` | Modify | Add separately invoked lazy Gemini key/model parsing without changing normal environment parsing. |
| `backend/src/schemas/project-analysis.schema.js` | Create | Export strict Zod and matching provider JSON schemas. |
| `backend/src/prompts/project-viability.prompt.js` | Create | Build deterministic untrusted-payload prompt text. |
| `backend/src/integrations/gemini.gateway.js` | Create | Wrap lazy SDK construction, structured request, raw-text return, and a safe optional observer that exposes only complete key-free request content/configuration plus raw provider text. |
| `backend/src/services/proyectos.service.js` | Modify | Add factory/singleton, cache short-circuit, provider parsing/validation, failure normalization, and race-loser reload. |
| `backend/src/repositories/proyectos.repository.js` | Modify | Select/map `analisis_ia` and add conditional atomic analysis/status persistence. |
| `backend/src/controllers/proyectos.controller.js` | Modify | Add the analysis controller and existing success envelope. |
| `backend/src/routes/proyectos.routes.js` | Modify | Register validated `POST /:id/analizar`. |
| `backend/tests/integration/migrations.test.js` | Modify | Add migration 004 apply/down/checksum/recovery/ambiguity/rollback RED tests. |
| `backend/tests/integration/proyectos.api.test.js` | Modify | Add mocked success, invalid/404/cached/no-call, provider/empty/malformed/schema failure, privacy, persistence, race, and health tests. |
| `backend/tests/unit/project-analysis.test.js` | Create | Test schema parity, prompt isolation, lazy gateway/configuration, service ordering, and conditional-race behavior. |
| `backend/tests/unit/bootstrap.test.js` | Modify | Update fixed scripts and environment-example assertions; prove normal configuration does not require a Gemini key. |
| `backend/tests/fixtures/gemini-live-project.js` | Create | Define the review-approved synthetic live payload with non-routable contact values and a distinctive marker, excluding real personal or business data. |
| `backend/tests/live/gemini-analysis.live.js` | Create | Implement the opt-in guarded MySQL harness: create the synthetic project through Supertest, invoke the public analysis route listener-free, wrap and count exactly one real gateway call, validate/reload results, enforce evidence exclusions, and write the complete API-level evidence artifact outside default discovery. |

No files are deleted. `backend/src/middleware/error-handler.js`, `backend/src/app.js`, migration 001, and existing frontend files remain unchanged.

## Testing Strategy

Tests are written RED before production changes for each behavior below. Normal automation never instantiates the real SDK client.

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Exact Zod contract | Accept the exact object; reject missing/extra fields, bad enum, bad root, bad array member, and wrong field types. |
| Unit | Provider JSON Schema parity | Assert exact required/property sets, `additionalProperties: false`, types, enum, and representative parity with Zod. |
| Unit | Prompt isolation | Include instruction-like text and delimiter-like text in persisted free text; assert it remains serialized inside the untrusted region and contract instructions remain fixed. |
| Unit | Lazy configuration/gateway | Import/create app and gateway without a key; assert no failure/client/network call. Invoke a fake-client gateway and assert model/config/content plus raw-text return. Invoke real boundary configuration without key and assert the service maps it safely. |
| Unit | Service ordering | Assert lookup precedes prompt/provider, update occurs only after gateway resolution and validation, and no transaction callback surrounds gateway I/O. |
| Unit | Cache and races | Assert cached analysis returns with zero gateway/update calls; assert a zero-row conditional update reloads and returns the winner; assert inconsistent loser state becomes internal failure. |
| Integration | Migration 004 normal path | Apply from migration 003, inspect exact column/check/status/history, verify old checksums unchanged, then safely roll back to exact source. |
| Integration | Migration 004 recovery | RED cases for target-without-history, `applying` target, column-only, analysis-complete/status-old, status-new/analysis-absent, and history recording only after target verification. |
| Integration | Migration ambiguity and rollback | Wrong JSON nullability/type, wrong object check, unknown status set/case, extra conflicting checks, non-object stored JSON, retained analysis rows on down, and interrupted rollback source/target behavior. Each refusal preserves history/schema/data as designed. |
| Integration | Mocked API success | Real guarded MySQL plus mocked gateway raw text; assert HTTP 200 exact analysis, one mock call, and atomic persisted analysis/status. |
| Integration | Validation and 404 short-circuits | Invalid IDs assert zero lookup/provider/write; missing project asserts one lookup and zero provider/write. |
| Integration | Persisted source only | Send a malicious analysis request body and assert the gateway prompt reflects only the persisted payload. |
| Integration | Cached repeat | Analyze once through the mock, call again, assert stored result, no additional provider call, and no second update. |
| Integration | Failure normalization | Separate provider throw, `undefined`, empty/whitespace, malformed JSON, extra/missing field, invalid enum/type cases; all yield identical sanitized HTTP 502 and leave project `nuevo` with null analysis. |
| Integration | Privacy and health | Seed recognizable payload/key/provider diagnostic strings; assert absent from HTTP and captured normal output, then prove a subsequent unrelated route succeeds. |
| Integration | Concurrent first requests | Gate two mocked responses so both read `nuevo`; assert two calls are allowed, exactly one conditional write wins, both responses resolve to the stored winner, and the contract is not corrupted. |
| Live | Public API path with exactly one real call | RED guard cases stop before provider use. The explicit script creates the approved synthetic project in guarded real MySQL through listener-free Supertest, invokes `POST /api/proyectos/:id/analizar` once, asserts the real-provider counter is exactly one, asserts HTTP 200 and the exact success envelope, strictly validates `data`, reloads status/analysis from MySQL, asserts equality, and writes complete sanitized request/model/config/raw-provider/validated/API/persistence evidence. |

The automatic completion gate remains `npm test`, `npm run lint`, and `npm run format:check`, plus guarded migration apply/rollback tests. `npm run test:gemini:live` is separate and is never part of automatic verification.

## Task Implications

The task plan must preserve all existing implementation work and make the following live-evidence corrections explicit:

1. Write RED coverage proving normal `npm test` discovery never loads the live harness or invokes the real gateway, even when Gemini environment values are present.
2. Implement the committed synthetic fixture and pre-call guards so an absent opt-in, non-`test` environment, wrong database name, application/test database collision, missing reset authorization, or non-approved fixture stops with `providerCallCount === 0`.
3. Instrument one real `createGeminiGateway({ captureExchange })` instance, temporarily wrap the shared gateway method used by the production service, increment a dedicated counter immediately before SDK invocation, and restore the wrapper in cleanup.
4. Create the guarded synthetic project in real MySQL through `request(app).post('/api/proyectos')`; then invoke `request(app).post('/api/proyectos/:id/analizar')` exactly once. Do not substitute a direct service call for API evidence and do not open a network listener.
5. Assert `providerCallCount === 1`, exact HTTP status `200`, exact `{ success: true, data }` envelope, strict validity of `data`, persisted `estado === 'analizado'`, and equality among the validated API result and persisted `analisisIa`.
6. Write the ignored evidence artifact with `providerRequest.contents`, selected `model`, complete `structuredOutputConfiguration`, `rawProviderText`, `validatedResult`, `httpResponse.status`, `httpResponse.envelope`, and `persistedResult`; do not add any service-level response substitute.
7. Add failing exclusion checks for the actual key, authentication/authorization headers, environment dumps or objects, SDK internals, production-derived payloads/prompts, and unapproved personal or business data before evidence is written.
8. Keep the live command outside automatic verification and document its explicit opt-in, guarded database, exactly-one-call, API-level evidence, and cleanup behavior in `backend/README.md`.

These task implications are mandatory corrections for `tasks.md`; the accepted simultaneous-first-request limitation and every existing route/child-process RED case below remain unchanged.

## Threat Matrix

The matrix is included because the change adds an Express route and migration tests cross a Node child-process boundary. The reference matrix's rows concern executable-file classification and VCS/PR automation; this Cycle 2 change does not alter those domains.

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, `CMakeLists.txt`, executable Markdown/MDX, `README.sh` | N/A: no file is classified or executed by extension/path in this change | No classification or execution boundary is introduced | None; do not create irrelevant classification tasks |
| Git repository selection | `git -C`, relative paths, absolute paths | N/A: no Git repository selection or Git invocation is added or changed | Existing unrelated bootstrap `git check-ignore` assertion remains untouched | None |
| Commit state | staged, `commit -a`, empty index | N/A: no commit automation is designed | No index/worktree behavior | None |
| Push state | tracking branch, first push, explicit refspec | N/A: no push automation is designed | No destination/ref resolution | None |
| PR commands | explicit `--head`, environment prefix, composed commands | N/A: delivery is a human-managed Single PR and no PR command is implemented | No command composition or remote ownership behavior | None |

### Route and child-process boundary RED tests

These are required by the actual boundaries even though they do not map to a VCS-oriented matrix row:

- Route safe behavior: positive integer IDs reach the service; invalid, zero, negative, fractional, overflow, and non-numeric IDs return the existing 400 envelope before lookup/provider/write.
- Route failure behavior: provider/response failures reach centralized handling as the fixed 502 envelope, with no payload, prompt, key, provider diagnostic, SDK internals, or filesystem data.
- Child-process safe behavior: migration tests continue to spawn `process.execPath` with a fixed absolute migration script and an argv array; no shell or composed command string is used.
- Child-process failure behavior: any command other than exact `up` or `down` exits non-zero before schema/history mutation; non-zero migration results reject the test helper without retrying or interpreting stderr as executable input.

These RED cases must be carried unchanged into `tasks.md`.

## Migration / Rollout

1. Install and lock `@google/genai` while retaining the existing Node 22 engine declaration.
2. Run automatic unit/API tests with the gateway mocked and no Gemini key requirement.
3. Apply migration 004 under the existing advisory lock. The application may be deployed only after exact target verification and history recording.
4. Deploy the route/service/gateway code. Existing projects remain `nuevo` with null analysis until explicitly analyzed.
5. Optionally run the separate live harness once against guarded MySQL test data and retain the ignored evidence artifact in the approved review channel.

No data backfill is required.

Rollback order:

1. Disable/remove the analysis endpoint and deploy the pre-change application code before schema rollback.
2. Export any analysis records that must be retained.
3. Explicitly return all project rows to `estado = 'nuevo'` with `analisis_ia = NULL` through an audited operator action; the migration runner will refuse to do this destructively.
4. Run one guarded migration down. The runner verifies safety, executes the atomic down ALTER, verifies exact source state, and removes only migration 004 history.
5. Remove the SDK/configuration/live-harness additions. Never edit migrations 001-003 or their history checksums.

## Open Questions

None. The accepted duplicate-call behavior for simultaneous first requests, first-writer-wins persistence, stored-result cache policy, SDK/model choice, migration strategy, and live-evidence boundary are sufficiently defined for task planning.
