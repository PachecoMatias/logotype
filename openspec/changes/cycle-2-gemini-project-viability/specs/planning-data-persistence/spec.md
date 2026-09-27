# Delta for Planning Data Persistence

## ADDED Requirements

### Requirement: Additive and Reversible Analysis Schema Migration

The backend MUST add a new checksum-protected migration that leaves every prior migration file and checksum unchanged. The migration MUST add nullable `analisis_ia` storage constrained to a JSON object and MUST expand the exact case-sensitive project status domain from `nuevo` to `nuevo | analizado`. Its rollback MUST restore the prior status domain and remove the analysis field. Migration recovery MUST inspect the actual column and constraint state, MUST deterministically complete supported interrupted states, and MUST record the migration as applied only after the exact target schema exists.

#### Scenario: Apply the analysis migration to an existing database

- GIVEN a compatible database has all prior migrations applied and projects with status `nuevo`
- WHEN the analysis migration is applied
- THEN `proyectos.analisis_ia` exists as nullable JSON-object storage
- AND the exact case-sensitive allowed statuses are `nuevo` and `analizado`
- AND existing projects remain valid with a null analysis

#### Scenario: Preserve prior migration checksums

- GIVEN migration history contains the checksums of all migrations preceding the analysis migration
- WHEN the new migration is introduced and applied
- THEN every preceding migration file and recorded checksum remains unchanged
- AND the analysis migration has its own versioned checksum

#### Scenario: Recover after ALTER completed before history was recorded

- GIVEN an interrupted migration left the exact target analysis column and status constraint in place
- AND the analysis migration is absent from migration history
- WHEN migration recovery runs
- THEN it validates the complete target schema without repeating incompatible ALTER operations
- AND it records the analysis migration exactly once

#### Scenario: Recover a supported partially applied ALTER

- GIVEN an interrupted migration left only a recognized subset of the target column and status-constraint changes
- WHEN migration recovery runs
- THEN it deterministically completes the missing target changes
- AND it records the migration only after the exact target schema is verified

#### Scenario: Reject an ambiguous migration state

- GIVEN the live analysis column or status constraint is incompatible with both the recognized source and target states
- WHEN migration recovery runs
- THEN migration fails clearly without recording success
- AND it does not silently replace or discard the incompatible schema state

#### Scenario: Roll back the analysis migration

- GIVEN the analysis migration is applied and no retained analysis data blocks the documented rollback
- WHEN its down migration runs
- THEN the allowed status domain is restored to exactly the case-sensitive value `nuevo`
- AND `analisis_ia` is removed
- AND preceding migration files and checksums remain unchanged

### Requirement: Atomic Analysis Persistence After Provider I/O

The backend MUST complete provider I/O before beginning any database transaction used to store the result. After strict validation, it MUST persist the complete analysis object and `estado = analizado` atomically. If persistence fails, neither the new analysis nor the status transition MAY be committed.

#### Scenario: Persist a validated result atomically

- GIVEN an existing project has status `nuevo`
- AND provider I/O has completed with a schema-valid analysis
- WHEN the backend stores the result
- THEN the complete analysis object and status `analizado` become visible together
- AND no observer can retrieve only one of those two changes

#### Scenario: Keep the database transaction off the network call

- GIVEN an existing unanalyzed project is eligible for analysis
- WHEN the backend waits for the provider response
- THEN no database transaction for the analysis update is held open
- AND any transaction used for persistence begins only after provider I/O and validation complete

#### Scenario: Roll back a failed analysis write

- GIVEN provider I/O completed with a schema-valid analysis
- AND the atomic persistence operation fails
- WHEN the failure is handled
- THEN the project does not retain the new analysis
- AND its status does not transition to `analizado`

## MODIFIED Requirements

### Requirement: Project Persistence Model

The `proyectos` schema MUST support a server-generated project identifier, the complete accepted configurator payload, the exact case-sensitive status values `nuevo | analizado`, and a nullable JSON-object AI analysis. A successfully created project MUST retain enough information to reproduce the API representation returned by project collection and detail retrieval. A successfully analyzed project MUST retain the exact validated analysis contract and status `analizado`.

(Previously: The project model stored the configurator payload and a server-controlled status whose only defined value was `nuevo`.)

#### Scenario: Round-trip a created project

- GIVEN a valid configurator payload has been accepted and persisted with status `nuevo`
- WHEN that project is retrieved by its identifier
- THEN the returned project contains the same accepted configurator data
- AND it contains the same generated identifier and status `nuevo`
- AND its analysis is null

#### Scenario: Keep project status server-controlled

- GIVEN a project is created through the project API
- WHEN its persisted representation is inspected
- THEN the stored initial status is `nuevo`
- AND no client-selected initial status has replaced it

#### Scenario: Round-trip an analyzed project

- GIVEN a validated analysis has been atomically persisted for a project
- WHEN that project is retrieved by its identifier
- THEN its persisted representation has status `analizado`
- AND its analysis is the same complete JSON object that passed validation

### Requirement: Cycle 1 Persistence Boundary

Runtime persistence MUST remain limited to project submission data, the authorized validated viability analysis and status transition, and the approved aggregate roster foundations. It MUST NOT persist generated backlog content, card permissions, individual team assignments, email-delivery state, or a Fibonacci-to-days rule.

(Previously: Runtime persistence prohibited AI analysis and allowed only project requests plus the fixed aggregate roster.)

#### Scenario: Audit persisted behavior after the viability change

- GIVEN the current schema and runtime persistence flows
- WHEN their writable behavior is reviewed
- THEN project requests, validated project viability analyses, and the fixed aggregate roster are the only business data written
- AND no generated story, card permission, email-delivery state, named team member, or Fibonacci-to-days mapping is written
