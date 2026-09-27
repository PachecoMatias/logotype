# Delta for Backend Code Quality

## ADDED Requirements

### Requirement: Backlog Change Scope Protection

The backlog change MUST remain confined to the existing backend and its approved OpenSpec artifacts. It MUST reuse the existing provider, validation, state, error, and quality-gate patterns. It MUST NOT add provider retries or failover, authentication or authorization, frontend behavior, story editing, team assignment, date estimation, Fibonacci-to-days conversion, semantic backlog scoring, an automated live-provider harness, new guides, or broad provider documentation.

#### Scenario: Keep implementation within the approved backend scope

- GIVEN the completed backlog change is compared with its starting revision
- WHEN changed application files are reviewed
- THEN existing frontend files remain unchanged
- AND the behavior is implemented through the established backend boundaries
- AND no excluded product behavior has been added

#### Scenario: Keep provider verification controlled

- GIVEN automated backlog tests are executed
- WHEN provider behavior is needed by a test
- THEN a controlled provider double is used
- AND no automated test consumes live Gemini quota

#### Scenario: Preserve maintainer-owned quality verification

- GIVEN implementation is ready for verification
- WHEN the change is handed to the maintainer as the authorized single PR with `size:exception`
- THEN the existing focused tests, full test suite, lint, and format-check commands remain available
- AND this specification does not claim those maintainer-run checks have already passed

## MODIFIED Requirements

### Requirement: Backend Operational README

`backend/README.md` MUST document the prerequisites and commands needed to install dependencies, configure environment values from `.env.example`, start the backend, create or migrate the schema, run the aggregate team seed, run tests, run lint checks, apply formatting, and run the non-mutating format check. It MUST describe the four project endpoints, their uniform envelopes, and the current unauthenticated controlled-environment limitation. This change MAY add at most one endpoint line for `POST /api/proyectos/:id/backlog` and MUST NOT add a new README or broader backlog/provider guidance.

(Previously: The README was required to describe only the three Cycle 1 project endpoints, without the backlog endpoint.)

#### Scenario: Follow the README from a clean backend checkout

- GIVEN a developer has the repository, the documented prerequisites, and access to MySQL
- WHEN the developer follows `backend/README.md` in order
- THEN the developer can install and configure the backend
- AND can prepare the schema and roster
- AND can start, test, lint, format, and format-check the backend using documented commands

#### Scenario: Identify the public project API contract

- GIVEN a reader has only `backend/README.md`
- WHEN the reader reviews the endpoint documentation
- THEN the reader can identify the method and path for project creation, collection retrieval, detail retrieval, and backlog generation
- AND can identify the success and error envelope shapes
- AND the backlog addition occupies at most one endpoint line

#### Scenario: Warn against unauthenticated public exposure

- GIVEN authentication and login remain outside the backend scope
- WHEN a reader reviews the deployment limitations in `backend/README.md`
- THEN the README states that the API is unauthenticated
- AND it states that the API MUST remain in a controlled environment rather than being publicly exposed
