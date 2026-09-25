# Planning Data Persistence Specification

## Purpose

Define the MySQL environment and version-controlled data foundations for Cycle 1. Runtime persistence is limited to projects, while the `historias` and `equipo` schemas establish approved foundations for later planning cycles.

## Requirements

### Requirement: MySQL Environment Contract

The backend MUST connect to MySQL using environment-provided configuration. It MUST provide a version-controlled `backend/.env.example` that documents every value needed to configure the database connection without containing real credentials, and it MUST keep `backend/.env` ignored by version control.

#### Scenario: Configure a local backend from the example

- GIVEN a developer has an accessible MySQL instance
- AND the developer copies the documented example values into a local `backend/.env`
- WHEN valid environment-specific connection values are supplied
- THEN the backend can use those values to connect to the configured MySQL database
- AND no source-code edit is required to select that database

#### Scenario: Protect local credentials

- GIVEN a developer creates `backend/.env` with real database credentials
- WHEN version-control status is inspected
- THEN `backend/.env` is ignored
- AND `backend/.env.example` contains placeholders or non-secret examples rather than real credentials

#### Scenario: Report invalid database configuration

- GIVEN a required database environment value is missing or invalid
- WHEN the backend attempts to initialize database access
- THEN startup or the dependent operation fails clearly
- AND the failure is not reported as a successful connection

### Requirement: Version-Controlled Planning Schema

The backend MUST provide version-controlled schema creation for the MySQL tables `proyectos`, `historias`, and `equipo`. Applying the approved schema creation to a database without those tables MUST create all three tables. SQL column types, migration tooling, and persistence-library selection remain Design decisions.

#### Scenario: Create the Cycle 1 schema on a fresh database

- GIVEN an empty compatible MySQL database
- WHEN the documented schema-creation procedure is applied
- THEN the database contains `proyectos`, `historias`, and `equipo`
- AND the resulting schema can support the data contracts defined by this specification

#### Scenario: Preserve schema sources for review

- GIVEN the Cycle 1 backend source tree
- WHEN the repository is inspected without access to a prepared database
- THEN the complete schema creation for all three required tables is available in version control
- AND a reviewer can identify the documented order in which it is applied

### Requirement: Project Persistence Model

The `proyectos` schema MUST support a server-generated project identifier, the complete accepted configurator payload, and the project status. A successfully created project MUST retain enough information to reproduce the API representation returned by project collection and detail retrieval.

#### Scenario: Round-trip a created project

- GIVEN a valid configurator payload has been accepted and persisted with status `nuevo`
- WHEN that project is retrieved by its identifier
- THEN the returned project contains the same accepted configurator data
- AND it contains the same generated identifier and status `nuevo`

#### Scenario: Keep project status server-controlled

- GIVEN a project is created through the Cycle 1 API
- WHEN its persisted representation is inspected
- THEN the stored initial status is `nuevo`
- AND no client-selected initial status has replaced it

### Requirement: User Story Schema Foundation

The `historias` schema MUST be capable of associating a future story with a project and representing the report-approved story attributes: priority, user-story statement, description, acceptance criteria, technical scope, Fibonacci estimate, suggested team role, phase, board column, and estimated dates. Cycle 1 MUST NOT populate stories automatically and MUST NOT introduce story endpoints or story business logic.

#### Scenario: Verify the story data foundation

- GIVEN the Cycle 1 schema has been applied
- WHEN the `historias` schema is inspected
- THEN it can represent each report-approved story attribute
- AND it can associate a story with its project

#### Scenario: Keep story behavior out of Cycle 1

- GIVEN a valid project has been created
- WHEN project creation completes
- THEN no AI-generated or automatically derived story is created
- AND no Fibonacci-to-days conversion or estimated-date calculation is performed

### Requirement: Aggregate Team Roster

The `equipo` schema MUST represent aggregate team composition by role, profile, and quantity without requiring or inventing individual names. A version-controlled seed or equivalent documented script MUST establish exactly this roster:

| Role | Profile | Quantity |
|------|---------|----------|
| Frontend Developer | High performance | 3 |
| Backend Developer | High performance | 3 |
| QA Analyst | High performance | 2 |
| Cybersecurity Analyst | High performance | 1 |
| Requirements Analyst | Administrative | 2 |
| Project Manager | Administrative | 1 |

#### Scenario: Seed the exact aggregate roster

- GIVEN the `equipo` table exists without Cycle 1 roster entries
- WHEN the documented team seed or script runs successfully
- THEN the table represents exactly the six role/profile aggregates and quantities defined above
- AND the aggregate quantity is 12
- AND no individual person's name is inserted

#### Scenario: Reject accidental individualization of the roster

- GIVEN the version-controlled team seed or script
- WHEN its roster data is inspected
- THEN each entry describes a role, profile, and aggregate quantity
- AND it contains no fabricated member name or per-person assignment

### Requirement: Safely Repeatable Team Seed

The team seed or script MUST be safely repeatable. Re-running it against a database already containing the exact Cycle 1 roster MUST NOT create duplicate aggregates, increase quantities, or destructively alter unrelated team data.

#### Scenario: Repeat the seed without duplicates

- GIVEN the exact Cycle 1 aggregate roster has already been seeded
- WHEN the same seed or script runs again
- THEN the roster still contains one aggregate for each of the six defined role/profile pairs
- AND every quantity remains unchanged
- AND the aggregate quantity remains 12

#### Scenario: Preserve unrelated team data

- GIVEN the `equipo` table contains the Cycle 1 roster and an unrelated entry not managed by this seed
- WHEN the seed or script runs again
- THEN the Cycle 1 roster is brought to the exact approved aggregate values
- AND the unrelated entry is not deleted or overwritten

### Requirement: Cycle 1 Persistence Boundary

Cycle 1 persistence behavior MUST be limited to storing and retrieving projects plus creating the approved schema and aggregate roster foundations. It MUST NOT persist AI analysis, generated backlog content, card permissions, individual team assignments, or a Fibonacci-to-days rule.

#### Scenario: Audit persisted Cycle 1 behavior

- GIVEN the Cycle 1 schema and runtime persistence flows
- WHEN their writable behavior is reviewed
- THEN project requests and the fixed aggregate roster are the only business data written by this cycle
- AND no AI result, generated story, card permission, named team member, or Fibonacci-to-days mapping is written
