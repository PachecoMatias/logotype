# Proposal: Cycle 1 AI Planning Agent Backend

## Intent

Establish the first backend foundation for Logotype's AI-assisted planning workflow. The completed React/Vite frontend remains at the repository root and is not changed. This cycle stores project requests from the existing configurator and exposes basic project retrieval endpoints, creating a stable base for later viability analysis and backlog generation without introducing AI, board, or frontend work.

The report `informe-agente-scrum-master-ia.md` is the source of truth. Where it describes desired data but not a concrete SQL contract, exact columns, types, relationships, and required configurator fields must be finalized during Specification and Design rather than inferred here.

## Scope

### In Scope

- Initialize a Node.js and Express application under `backend/` with a small layered structure and clear separation among HTTP, application, persistence, configuration, and middleware concerns.
- Configure MySQL through environment variables, provide a version-controlled `backend/.env.example`, and keep `backend/.env` out of version control.
- Add version-controlled migrations or SQL scripts for `proyectos`, `historias`, and `equipo`, aligned with the report's project flow, story attributes, and team roles/quantities. Exact schema details remain subject to Specification and Design approval.
- Add a version-controlled seed or script for `equipo` using the report's fixed aggregate roster, without inventing individual names: 3 Desarrolladores Frontend — Alto rendimiento; 3 Desarrolladores Backend — Alto rendimiento; 2 Analistas QA — Alto rendimiento; 1 Analista de Ciberseguridad — Alto rendimiento; 2 Analistas de requerimientos — Administrativo; and 1 Project Manager — Administrativo. Specification and Design must define idempotent or otherwise safely repeatable execution.
- Implement `POST /api/proyectos` to validate the minimum configurator payload, persist the project with initial status `nuevo`, and return the created project including its ID.
- Implement `GET /api/proyectos` and `GET /api/proyectos/:id`, including an explicit not-found response for an unknown project ID.
- Use centralized error middleware, one uniform success/error response format, and Zod for boundary validation because it provides concise runtime schemas without requiring a larger validation framework.
- Add basic endpoint tests for successful creation, missing required data, and retrieval of a non-existent project ID.
- Configure ESLint and Prettier for the JavaScript backend, with documented npm scripts for linting, formatting, and format verification. A justified equivalent may be selected during Specification or Design only if implementation evidence requires it.
- Add `backend/README.md` with installation, environment, migration, seed, lint, format, and test instructions.

### Out of Scope

- Gemini or other AI calls, prompt design, viability analysis, backlog generation, or date calculation.
- Kanban UI, board behavior, card movement, or internal dashboard frontend.
- Authentication or login. No strict need is evidenced for this isolated foundation cycle; authentication is deferred and must be added before exposing the API beyond a controlled environment.
- Any `historias` endpoint, service, or business logic beyond creating its table through version-controlled migration SQL.
- Any modification to the completed React/Vite frontend files at the repository root.
- Reconsidering fixed product choices from the report, including the custom board, Fibonacci estimation, Gemini provider, team roles, or board columns.
- Final decisions that the report leaves open, including detailed table schemas, card movement permissions, or Fibonacci-to-time conversion.

## Capabilities

### New Capabilities

- `project-management-api`: Create projects from the minimum configurator payload and retrieve project collections or individual projects, with defined validation and not-found behavior.
- `planning-data-persistence`: Configure MySQL and provide version-controlled schema foundations for projects, user stories, and team composition while limiting Cycle 1 persistence behavior to projects.
- `api-reliability-contract`: Provide consistent success/error envelopes, centralized error handling, request validation, and basic endpoint-level regression coverage.
- `backend-code-quality`: Provide ESLint and Prettier configuration, documented lint/format scripts, and automated verification for the JavaScript backend.

### Modified Capabilities

None. No existing OpenSpec capabilities are present in this workspace.

## Approach

Create a standalone Express backend with a readable flow from routes and controllers through services to repositories, plus dedicated configuration and error middleware. Keep abstractions proportional to three project endpoints; no plugin system, provider abstraction, or AI-oriented architecture is needed in this cycle.

Use environment-driven MySQL connectivity and ordered, version-controlled SQL migrations. Include a version-controlled `equipo` seed or script for the report's fixed aggregate roster; Specification and Design must define how repeated execution remains idempotent or otherwise safe. They must also finalize the minimum configurator contract and the `proyectos`, `historias`, and `equipo` schema details from the report before implementation. Zod validates incoming requests at the HTTP boundary, while centralized middleware converts validation, not-found, persistence, and unexpected failures into the shared response envelope. Endpoint tests exercise the public HTTP behavior against an isolated test database or equivalent controlled persistence setup selected during Design.

Adopt ESLint and Prettier as the default JavaScript quality toolchain, expose documented npm scripts for linting, formatting, and format checks, and include those checks in implementation verification. The cycle creates only `backend/` implementation files and OpenSpec planning artifacts; existing root-level React/Vite frontend files remain untouched.

Authentication remains deferred. Until a later security capability is approved, deployment must avoid public exposure and treat network restriction as an interim operational safeguard, not a replacement for authentication.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/` | New | Standalone Node.js and Express backend foundation. |
| `backend/src/` | New | Layered API, validation, configuration, middleware, and project persistence code. |
| `backend/migrations/` | New | Ordered SQL for `proyectos`, `historias`, and `equipo`. |
| `backend/seeds/` or an equivalent documented backend path | New | Safely repeatable seed/script for the fixed aggregate `equipo` roster from the report. |
| `backend/tests/` | New | Basic HTTP endpoint coverage for the required success and failure cases. |
| `backend/package.json` and backend lint/format configuration | New | ESLint and Prettier dependencies, configuration, and documented npm scripts. |
| `backend/.env.example` and `backend/.gitignore` | New | Documented environment contract and protection of local secrets. |
| `backend/README.md` | New | Install, environment, migration, seed, lint, format, and test instructions. |
| `openspec/changes/cycle-1-ai-planning-agent-backend/` | Modified | Planning artifacts for this backend-only cycle. |
| Existing React/Vite frontend files at repository root | Unchanged | The finished frontend is explicitly untouched; there is no separate frontend application directory in this cycle's repository structure. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| The report does not define a complete SQL schema or exact minimum payload. | High | Finalize fields, types, relationships, required values, and constraints during Specification and Design; keep initial migrations reviewable and reversible. |
| Backend expectations may diverge from the existing configurator payload. | Medium | Define and verify the boundary contract before implementation without changing the root-level frontend files. |
| An unauthenticated API could expose project data if deployed publicly. | Medium | Keep Cycle 1 in a controlled environment, document the exposure, and require authentication/authorization as a future capability before broader deployment. |
| MySQL-dependent tests may become environment-sensitive. | Medium | Define an isolated test database lifecycle and deterministic migration/setup commands during Design. |
| Re-running the `equipo` seed could create duplicates or overwrite intended data. | Medium | Specify a stable uniqueness strategy and idempotent or otherwise safely repeatable seed behavior before implementation, then verify repeated execution. |
| Lint and format rules could conflict or produce noisy churn. | Low | Use a compatible ESLint/Prettier setup, document scripts, and run non-mutating checks in verification. |
| Story or AI behavior could leak into the foundation cycle. | Low | Limit implementation and tests to project persistence/retrieval plus creation of the three schema tables. |

## Rollback Plan

Revert the cycle's changes under `backend/` and its OpenSpec planning artifacts. Reverse create-only migrations in reverse order, or restore the pre-change database backup if an environment already contains data; remove only roster data proven to have been inserted by this cycle's seed strategy. Do not drop shared or pre-existing database objects. No frontend rollback is required because the existing React/Vite files at the repository root remain untouched.

## Dependencies

- A supported Node.js/npm runtime and an accessible MySQL instance.
- Approved Specification and Design decisions for the minimum configurator payload and the concrete schema of `proyectos`, `historias`, and `equipo`.
- The existing root-level configurator payload contract for compatibility verification, without frontend modification.
- `informe-agente-scrum-master-ia.md` as the authoritative product and domain reference.

## Success Criteria

- [ ] `backend/` can be installed and started independently with documented environment variables, while local `.env` values remain untracked.
- [ ] Version-controlled migrations create `proyectos`, `historias`, and `equipo` according to the subsequently approved Specification and Design.
- [ ] A version-controlled seed or script populates `equipo` with exactly the report's aggregate roster: 3 Desarrolladores Frontend (Alto rendimiento), 3 Desarrolladores Backend (Alto rendimiento), 2 Analistas QA (Alto rendimiento), 1 Analista de Ciberseguridad (Alto rendimiento), 2 Analistas de requerimientos (Administrativo), and 1 Project Manager (Administrativo), without invented individual names.
- [ ] The approved seed behavior can be run repeatedly without unintended duplicate roster entries or destructive changes, as defined in Specification and Design.
- [ ] `POST /api/proyectos` rejects missing required data and persists a valid request with status `nuevo`, returning the created project and ID.
- [ ] `GET /api/proyectos` returns the project collection using the uniform success format.
- [ ] `GET /api/proyectos/:id` returns an existing project and the defined uniform not-found response for an unknown ID.
- [ ] Centralized middleware and Zod produce consistent validation and server error responses.
- [ ] Automated endpoint tests cover successful creation, missing required data, and a non-existent project ID and pass through the documented test command.
- [ ] ESLint and Prettier are configured for the backend, documented lint/format/format-check scripts run successfully, and non-mutating quality checks are included in verification.
- [ ] `backend/README.md` documents installation, environment setup, migrations, seeding, linting, formatting, and tests.
- [ ] Existing root-level React/Vite frontend files remain unchanged; the cycle affects only `backend/` and OpenSpec planning artifacts.
- [ ] No AI calls, Kanban behavior, dashboard frontend, authentication, or `historias` business logic/endpoints are introduced.
