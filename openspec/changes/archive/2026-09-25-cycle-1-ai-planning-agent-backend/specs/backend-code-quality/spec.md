# Backend Code Quality Specification

## Purpose

Define the independently operable backend package, automated JavaScript quality checks, documentation obligations, and scope protections for Cycle 1.

## Requirements

### Requirement: Independent Node.js and Express Backend

The repository MUST provide a Node.js and Express application under `backend/` that can be installed, configured, started, checked, and tested independently of the completed React/Vite frontend. The backend MUST maintain clear boundaries among HTTP handling, application behavior, persistence, configuration, and error middleware without requiring frontend changes.

#### Scenario: Install and start the backend independently

- GIVEN a supported Node.js/npm runtime, valid environment values, and an accessible prepared MySQL database
- WHEN a developer follows the backend installation and start instructions from `backend/`
- THEN the Express application starts without running or rebuilding the frontend
- AND the documented project endpoints become available

#### Scenario: Keep backend concerns separable

- GIVEN the Cycle 1 backend source
- WHEN a reviewer traces an HTTP request from routing to persistence and error handling
- THEN HTTP, application, persistence, configuration, and middleware responsibilities are distinguishable
- AND no AI-provider or dashboard abstraction is required to understand the project flow

### Requirement: ESLint Verification

The backend MUST configure ESLint for its JavaScript source and tests. It MUST expose a documented non-mutating `lint` npm script that checks the applicable backend files and returns a non-zero exit code when a lint violation is found.

#### Scenario: Pass lint verification

- GIVEN the backend JavaScript conforms to the configured lint rules
- WHEN a developer runs the documented `lint` script
- THEN ESLint checks the applicable backend files without rewriting them
- AND the command exits successfully

#### Scenario: Fail on a lint violation

- GIVEN an applicable backend JavaScript file contains a configured lint violation
- WHEN a developer runs the documented `lint` script
- THEN the command exits with a non-zero status
- AND it identifies the violating file and rule

### Requirement: Prettier Formatting and Verification

The backend MUST configure Prettier and expose documented npm scripts for applying formatting and checking formatting. The format-check script MUST be non-mutating and MUST return a non-zero exit code when an applicable backend file is not formatted.

#### Scenario: Apply formatting explicitly

- GIVEN an applicable backend file is not formatted
- WHEN a developer runs the documented formatting script
- THEN Prettier rewrites the file to the configured format

#### Scenario: Verify formatting without mutation

- GIVEN all applicable backend files are formatted
- WHEN a developer runs the documented format-check script
- THEN Prettier checks the files without rewriting them
- AND the command exits successfully

#### Scenario: Detect unformatted content

- GIVEN an applicable backend file is not formatted
- WHEN a developer runs the documented format-check script
- THEN the command exits with a non-zero status
- AND the file remains unchanged by the check

### Requirement: Backend Operational README

`backend/README.md` MUST document the prerequisites and commands needed to install dependencies, configure environment values from `.env.example`, start the backend, create or migrate the schema, run the aggregate team seed, run tests, run lint checks, apply formatting, and run the non-mutating format check. It MUST describe the three project endpoints, their uniform envelopes, and the current unauthenticated controlled-environment limitation.

#### Scenario: Follow the README from a clean backend checkout

- GIVEN a developer has the repository, the documented prerequisites, and access to MySQL
- WHEN the developer follows `backend/README.md` in order
- THEN the developer can install and configure the backend
- AND can prepare the schema and roster
- AND can start, test, lint, format, and format-check the backend using documented commands

#### Scenario: Identify the public Cycle 1 API contract

- GIVEN a reader has only `backend/README.md`
- WHEN the reader reviews the endpoint documentation
- THEN the reader can identify the method and path for project creation, collection retrieval, and detail retrieval
- AND can identify the success and error envelope shapes

#### Scenario: Warn against unauthenticated public exposure

- GIVEN authentication and login are outside Cycle 1
- WHEN a reader reviews the deployment limitations in `backend/README.md`
- THEN the README states that the API is unauthenticated
- AND it states that the API MUST remain in a controlled environment rather than being publicly exposed

### Requirement: Non-Mutating Quality Gate

The backend MUST provide documented commands that allow automation to run tests, ESLint checks, and Prettier format verification without modifying source files. Each command MUST fail with a non-zero exit code when its verification detects a problem.

#### Scenario: Verify clean backend quality

- GIVEN the backend behavior, lint, and formatting all conform to their contracts
- WHEN automation runs the documented test, lint, and format-check commands
- THEN every command completes without modifying source files
- AND every command exits successfully

#### Scenario: Block on a quality failure

- GIVEN at least one required test, lint rule, or formatting check fails
- WHEN automation runs the non-mutating quality commands
- THEN at least one command exits with a non-zero status
- AND the output identifies the failing check

### Requirement: Cycle 1 Scope Protection

Cycle 1 implementation MUST be limited to backend work under `backend/` and its approved OpenSpec planning artifacts. Existing React/Vite frontend files at the repository root MUST remain unchanged. The implementation MUST NOT add AI calls or prompts, Kanban or dashboard frontend behavior, authentication or login, `historias` endpoints or business logic, individual team names, card-movement permissions, or a Fibonacci-to-days conversion rule.

#### Scenario: Preserve the completed frontend

- GIVEN the repository state before Cycle 1 implementation
- WHEN the completed change is compared with that state
- THEN existing React/Vite frontend files at the repository root are unchanged
- AND application implementation changes are confined to `backend/`

#### Scenario: Exclude deferred product behavior

- GIVEN the completed Cycle 1 backend and its route inventory
- WHEN its behavior and dependencies are reviewed
- THEN it contains no AI-provider call or prompt
- AND it contains no Kanban or dashboard frontend behavior
- AND it contains no authentication or login flow
- AND it contains no `historias` endpoint or story-generation behavior

#### Scenario: Preserve unresolved decisions

- GIVEN card permissions and Fibonacci-to-days conversion remain undecided
- WHEN the completed Cycle 1 behavior and configuration are inspected
- THEN no card-movement permission rule is implemented
- AND no conversion from Fibonacci points to days is implemented

#### Scenario: Preserve aggregate-only team data

- GIVEN the completed Cycle 1 seed and documentation
- WHEN team data is inspected
- THEN no individual team member name has been invented or required
- AND only the approved role, profile, and quantity aggregates are defined
