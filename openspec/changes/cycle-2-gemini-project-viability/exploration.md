## Exploration: Cycle 2 Gemini Project Viability

### Current State
The backend is an ESM Node.js 22/Express 5 application with route, controller, service, repository, Zod schema, centralized error, and MySQL configuration layers. Project routes already validate numeric IDs, return uniform success/error envelopes, and map missing projects to `PROJECT_NOT_FOUND`. Tests use Node's test runner, Supertest, real guarded MySQL migrations, and `test.mock.method` on exported dependency objects.

`@google/genai` is absent from `package.json`, `package-lock.json`, and the installed dependency tree, so the smallest SDK change is one new runtime dependency. The official SDK pattern is compatible with the requested flow: `new GoogleGenAI({ apiKey })`, `ai.models.generateContent(...)`, `responseMimeType: 'application/json'`, `responseJsonSchema`, and `response.text`.

The canonical database does **not** support the requested persistence yet. `001_create_proyectos.up.sql` has no `analisis_ia` column and its case-sensitive `chk_proyectos_estado` permits only `nuevo`. A new migration is mandatory. The migration runner currently assumes every migration creates a previously absent table and uses table existence to recover interrupted DDL; it cannot safely apply an `ALTER TABLE proyectos` migration without a small runner extension. Editing migration 001 is not viable because applied migrations are checksum-protected.

CodeGraph could not be used: `.codegraph/` was absent and lazy initialization failed because the upstream executable is unavailable. This exploration therefore used the requested narrow filesystem fallback. `openspec/config.yaml` is also absent; the four canonical specs under `openspec/specs/` were read directly.

### Affected Areas
- `backend/package.json`, `backend/package-lock.json` — add only `@google/genai` as a runtime dependency and add an explicit opt-in live-test command.
- `backend/.env.example`, `backend/src/config/env.js` — document a non-secret `GEMINI_API_KEY` placeholder and centralize lazy Gemini key/model parsing without making unrelated routes require the key.
- `backend/migrations/004_add_project_ai_analysis.{up,down}.sql` — add nullable JSON `analisis_ia` and expand/reverse the status constraint for `analizado`.
- `backend/scripts/migrate.js` — support and recover an additive ALTER migration using schema-state verification rather than the current table-absence assumption.
- `backend/src/schemas/project-analysis.schema.js` — define the strict Zod contract and the provider JSON schema.
- `backend/src/prompts/project-viability.prompt.js` — build a deterministic prompt that treats the serialized project payload as data and requests only the required contract.
- `backend/src/integrations/gemini.gateway.js` — own SDK initialization and the single `generateContent` call.
- `backend/src/services/proyectos.service.js` — orchestrate load, provider call, JSON parsing, Zod validation, safe error mapping, and persistence through injected dependencies.
- `backend/src/repositories/proyectos.repository.js` — map `analisis_ia` and atomically update analysis plus status.
- `backend/src/controllers/proyectos.controller.js`, `backend/src/routes/proyectos.routes.js` — expose `POST /:id/analizar` and return the existing success envelope.
- `backend/tests/integration/proyectos.api.test.js`, `backend/tests/integration/migrations.test.js` — cover mocked success, missing project without an AI call, malformed provider JSON as controlled 502, storage, and migration round trips.
- `backend/tests/live/gemini-analysis.live.test.js` — opt-in, exactly-one-call evidence harness excluded from quota-consuming normal runs.
- `backend/tests/unit/bootstrap.test.js`, `backend/README.md` — update environment/script assertions and operational documentation.

### Approaches
1. **Provider gateway plus injectable project service and additive migration** — isolate Gemini behind an object/factory seam, keep parsing and persistence in the application service, and extend the migration runner for ALTER-state recovery.
   - Pros: mockable without network calls; preserves current layering; keeps SDK errors and secrets out of HTTP responses; supports existing databases; enables one controlled live-call harness.
   - Cons: migration recovery support adds scope; provider and runtime schemas must be kept aligned.
   - Effort: Medium

2. **Call Gemini directly from the controller/service and rewrite migration 001** — inline the SDK call and modify the original table definition.
   - Pros: fewer new modules and superficially less code.
   - Cons: breaks checksum-protected deployed schemas, provides a weak mocking seam, couples HTTP/application logic to the SDK, risks requiring secrets during normal tests, and makes safe 502 normalization harder.
   - Effort: Low initially, High operational risk

### Recommendation
Use Approach 1.

Create a strict Zod object with `viable: boolean`, `completitud: z.enum(['completo', 'falta_info'])`, `campos_faltantes: string[]`, `observaciones: string`, and `mensaje_para_cliente: string`. Send a matching plain JSON schema through `responseJsonSchema` with `responseMimeType: 'application/json'`. Parse `response.text` with `JSON.parse`, then validate it with Zod before any write. Delimit the serialized `proyecto.payload` in the prompt and explicitly state that payload content is untrusted data, not instructions.

Use `gemini-2.5-flash` as the centralized default model. Parse `GEMINI_API_KEY` lazily only when the analysis operation invokes the real gateway; this prevents normal mocked tests and unrelated project routes from needing a real secret. An optional `GEMINI_MODEL` override may be documented, but the default must remain explicit and testable.

Expose a `createProyectosService({ repository, geminiGateway, getConfiguration })` factory and retain a production singleton for controllers. The gateway should return raw `response.text`; the service owns JSON/Zod validation so tests can inject malformed model text. Map SDK failures, absent response text, malformed JSON, and schema mismatch to one safe `AppError(502, 'AI_ANALYSIS_FAILED', 'AI analysis failed')`. Never include SDK messages, status bodies, prompts, payloads, or keys in the HTTP error envelope.

Load the project before invoking Gemini and return the existing 404 when absent. Do not hold a MySQL transaction open during the network call. After validation, use one atomic update to set `analisis_ia = CAST(? AS JSON)` and `estado = 'analizado'`; a follow-up read may return the updated project in `{ success: true, data: ... }`. The migration should make `analisis_ia` nullable for existing/new unanalyzed projects, protect it as a JSON object, and replace the status check with `IN ('nuevo', 'analizado')`. Migration recovery must verify the presence/absence of the new column and the expanded/reverted constraint instead of relying only on table existence.

Keep normal tests fully mocked. Add an explicit live harness that inserts a real guarded test project, constructs the production service with an instrumented real gateway, performs exactly one analysis call, verifies the persisted JSON/status, and emits sanitized evidence containing the model, prompt/contents, structured-output config, raw `response.text`, validated result, and database result. The evidence must exclude API keys, authorization headers, environment dumps, and SDK client internals. Suggested PowerShell sequence after apply:

```powershell
Set-Location D:\Proyectos\logotype\backend
npm ci
npm run db:migrate:test
npm test
npm run lint
npm run format:check
$env:RUN_REAL_GEMINI_TEST = 'true'
npm run test:gemini:live
Remove-Item Env:RUN_REAL_GEMINI_TEST
```

The real key should exist only in the ignored `backend/.env`; it must not be pasted into commands or evidence. Expected live evidence is one provider invocation, HTTP/service success, a schema-valid analysis, and the same analysis persisted with `estado = 'analizado'`.

### Risks
- Repeated `POST /analizar` behavior is unspecified: re-calling Gemini and overwriting consumes quota, while returning the stored result or rejecting the request changes API semantics. This product decision blocks a complete proposal/spec and must be made by the user.
- The existing migration runner cannot safely recover ALTER migrations until its state verification is generalized; modifying migration 001 would trigger checksum drift on existing databases.
- The complete project payload includes customer contact and business data sent to an external provider; evidence and errors must not leak that data beyond the explicitly captured, access-controlled live artifact.
- Preserved unknown payload fields and free text create prompt-injection risk; structured output plus Zod controls shape, not semantic truth.
- Concurrent analysis requests can duplicate billing and race to overwrite the stored result unless repeat-call semantics define a guard.

### Ready for Proposal
No — the codebase is technically ready, but the orchestrator must ask the user what `POST /api/proyectos/:id/analizar` should do when the project is already `analizado` (re-run and overwrite, return the stored analysis without a call, or reject). After that single product decision, proceed to `sdd-propose` using the recommended gateway/service/migration approach.
