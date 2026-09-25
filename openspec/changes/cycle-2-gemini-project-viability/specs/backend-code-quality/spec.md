# Delta for Backend Code Quality

## ADDED Requirements

### Requirement: Lazy Gemini Configuration

The backend MUST document a non-secret `GEMINI_API_KEY` placeholder in `backend/.env.example` and MUST keep real keys out of version control. It MUST require and read a real key only when a real analysis provider call is attempted. Startup, unrelated routes, and mocked automated tests MUST operate without a real Gemini key. The default model MUST be `gemini-2.5-flash` when no documented model override is supplied.

#### Scenario: Configure Gemini from the example safely

- GIVEN a developer inspects `backend/.env.example`
- WHEN the Gemini settings are reviewed
- THEN a placeholder documents `GEMINI_API_KEY` without containing a usable secret
- AND the default model behavior is documented as `gemini-2.5-flash`

#### Scenario: Run unrelated behavior without a Gemini key

- GIVEN `GEMINI_API_KEY` is absent
- WHEN the backend starts, an unrelated project route runs, or the mocked automatic suite executes
- THEN that operation can complete without configuration failure caused by the missing key
- AND no real Gemini call is attempted

#### Scenario: Require the key only at the real provider boundary

- GIVEN `GEMINI_API_KEY` is absent
- WHEN an unanalyzed project reaches the real Gemini provider boundary
- THEN the analysis fails through the sanitized `AI_ANALYSIS_FAILED` contract
- AND no analysis or status transition is persisted
- AND the server remains healthy

### Requirement: Quota-Safe Automated and Live Verification

Normal automated test, lint, and format-check commands MUST NOT make real Gemini calls or require a real key. A separate, explicit opt-in live harness MAY use a real key, but it MUST operate only against guarded MySQL test data, MUST make exactly one real provider call per invocation, and MUST fail unless the opt-in and database safeguards are satisfied.

#### Scenario: Run normal verification without spending quota

- GIVEN normal backend verification is invoked with or without a real Gemini key in the environment
- WHEN tests, lint, and format checks run without the explicit live opt-in
- THEN zero real Gemini calls are made
- AND no Gemini quota is spent

#### Scenario: Refuse an unguarded live run

- GIVEN the explicit live opt-in is absent or the configured database fails the documented test-data guard
- WHEN the live harness is invoked
- THEN it fails or skips before any provider call
- AND it makes zero real Gemini calls

#### Scenario: Perform exactly one guarded live call

- GIVEN the explicit live opt-in is enabled, a real key is available, and the MySQL target satisfies the test-data guard
- WHEN the live harness runs once
- THEN it creates or selects only guarded test project data
- AND it makes exactly one real Gemini call
- AND it verifies the HTTP or service result, persisted analysis, and status `analizado`

### Requirement: Sanitized Analysis Privacy Boundary

Application logs, HTTP errors, normal test output, and live evidence MUST NOT expose API keys, authorization headers, environment dumps, SDK client internals, or provider diagnostics. They MUST NOT expose customer project payloads or prompts. The only exception is an explicitly produced, access-controlled live evidence artifact, which MAY contain the complete review-approved sanitized request content from guarded test data and MUST exclude secrets and unapproved personal or business data. The live artifact MUST capture enough sanitized evidence to review the request, structured-output configuration, provider text, validated result, API result, and persisted result.

#### Scenario: Sanitize runtime failures

- GIVEN an analysis operation fails after receiving sensitive payload or provider context
- WHEN logs and the HTTP error are inspected
- THEN neither contains the project payload, prompt, key, authorization data, provider body, SDK internals, or environment dump
- AND the HTTP response contains only the controlled error contract

#### Scenario: Capture complete sanitized live evidence

- GIVEN a guarded live run uses review-approved test data
- WHEN its evidence artifact is produced
- THEN the artifact contains the complete sanitized request content, model and structured-output configuration, raw provider text, validated analysis, API response, and persisted result needed for review
- AND it contains no API key, authorization header, environment dump, SDK client internal, or unapproved personal or business data

#### Scenario: Keep production payloads out of evidence

- GIVEN a project payload is not the guarded review-approved live-test fixture
- WHEN automated or live evidence is generated
- THEN that payload and its derived prompt are not captured
- AND no exception to the privacy boundary is applied

## MODIFIED Requirements

### Requirement: Independent Node.js and Express Backend

The repository MUST provide a Node.js and Express application under `backend/` that can be installed, configured, started, checked, and tested independently of the completed React/Vite frontend. The backend MUST maintain clear boundaries among HTTP handling, application behavior, persistence, Gemini integration, configuration, and error middleware without requiring frontend changes. The optional Gemini integration MUST NOT prevent unrelated backend behavior from operating when no real Gemini key is configured.

(Previously: The independent backend separated its existing concerns and required no AI-provider boundary.)

#### Scenario: Install and start the backend independently

- GIVEN a supported Node.js/npm runtime, valid database environment values, and an accessible prepared MySQL database
- WHEN a developer follows the backend installation and start instructions from `backend/`
- THEN the Express application starts without running or rebuilding the frontend
- AND the documented project endpoints become available

#### Scenario: Keep backend concerns separable

- GIVEN the backend source after the viability-analysis change
- WHEN a reviewer traces an analysis request from routing through provider interaction and persistence
- THEN HTTP, application, persistence, provider, configuration, and middleware responsibilities are distinguishable
- AND unrelated project flows do not depend on initializing the Gemini provider

#### Scenario: Preserve unrelated routes without a provider secret

- GIVEN database configuration is valid and `GEMINI_API_KEY` is absent
- WHEN a client uses project creation or retrieval rather than analysis
- THEN the unrelated route behaves according to its existing contract
- AND no Gemini configuration error or provider call occurs

### Requirement: Backend Operational README

`backend/README.md` MUST document the prerequisites and commands needed to install dependencies, configure environment values from `.env.example`, start the backend, create or migrate the schema, run the aggregate team seed, run mocked tests, run lint checks, apply formatting, and run the non-mutating format check. It MUST describe all four project endpoints, their uniform envelopes, analysis caching and failure behavior, lazy Gemini key/model configuration, migration and rollback expectations, the quota-free default test policy, the guarded opt-in live harness, its exactly-one-call guarantee, its sanitized evidence, and the current unauthenticated controlled-environment limitation.

(Previously: The README covered three project endpoints and general backend operation without Gemini configuration, migration, caching, or live-harness guidance.)

#### Scenario: Follow the README from a clean backend checkout

- GIVEN a developer has the repository, the documented prerequisites, and access to MySQL
- WHEN the developer follows `backend/README.md` in order
- THEN the developer can install and configure the backend
- AND can prepare the schema and roster
- AND can start, test without Gemini quota, lint, format, and format-check the backend using documented commands

#### Scenario: Identify the current public API contract

- GIVEN a reader has only `backend/README.md`
- WHEN the reader reviews the endpoint documentation
- THEN the reader can identify the method and path for project creation, collection retrieval, detail retrieval, and viability analysis
- AND can identify the success, cached-success, validation, not-found, and sanitized analysis-failure envelope behavior

#### Scenario: Configure and run guarded live evidence

- GIVEN a reader has only `backend/README.md` and access to the guarded test prerequisites
- WHEN the reader reviews the Gemini verification guidance
- THEN the reader can distinguish quota-free automatic tests from the explicit live opt-in
- AND can identify the required key, database guard, exactly-one-call limit, and sanitized evidence contents without being instructed to print secrets

#### Scenario: Warn against unauthenticated public exposure

- GIVEN authentication and login remain outside scope
- WHEN a reader reviews the deployment limitations in `backend/README.md`
- THEN the README states that the API is unauthenticated
- AND it states that the API MUST remain in a controlled environment rather than being publicly exposed

### Requirement: Cycle 1 Scope Protection

The viability-analysis implementation MUST remain confined to backend work under `backend/` and its approved OpenSpec planning artifacts. Existing React/Vite frontend files at the repository root MUST remain unchanged. The implementation MAY add only the authorized Gemini viability call, prompt, exact result validation, persistence, and guarded verification. It MUST NOT add backlog or user-story generation, email sending, retries or backoff, frontend behavior, authentication, login, `historias` endpoints or business logic, individual team names, card-movement permissions, or a Fibonacci-to-days conversion rule.

(Previously: Scope protection prohibited every AI call and prompt in addition to the other deferred product behavior.)

#### Scenario: Preserve the completed frontend

- GIVEN the repository state before the viability-analysis implementation
- WHEN the completed change is compared with that state
- THEN existing React/Vite frontend files at the repository root are unchanged
- AND application implementation changes are confined to `backend/`

#### Scenario: Exclude deferred product behavior

- GIVEN the completed backend and its route and provider inventory
- WHEN its behavior and dependencies are reviewed
- THEN the only AI-provider behavior is the authorized persisted-project viability analysis
- AND it contains no backlog generation, story generation, email sending, provider retry, backoff, or failover behavior
- AND it contains no authentication or login flow
- AND it contains no Kanban, dashboard, or other frontend behavior

#### Scenario: Preserve unresolved decisions

- GIVEN card permissions and Fibonacci-to-days conversion remain undecided
- WHEN the completed behavior and configuration are inspected
- THEN no card-movement permission or Fibonacci-to-days conversion is implemented

#### Scenario: Preserve aggregate-only team data

- GIVEN the completed seed and documentation
- WHEN team data is inspected
- THEN no individual team member name is invented or required
- AND only the approved role, profile, and quantity aggregates remain defined
