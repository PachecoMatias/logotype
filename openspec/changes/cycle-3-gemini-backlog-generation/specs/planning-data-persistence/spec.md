# Delta for Planning Data Persistence

## ADDED Requirements

### Requirement: Atomic First-Writer Backlog Persistence

For a project with no stored backlog, the system MUST persist the complete validated story array and transition the project from `analizado` to `planificado` in one database transaction. The system MUST assign the stored order, and every first or cached response MUST return the committed stories ordered by ascending server-owned story identifier. No provider-supplied order identifier MUST be accepted or exposed.

#### Scenario: Commit stories and planned state together

- GIVEN an `analizado` project has no stored stories
- AND a valid backlog of 12–25 stories has been generated
- WHEN persistence succeeds
- THEN all generated stories are committed for that project
- AND the project state is committed as `planificado` in the same transaction
- AND the committed stories are returned in ascending server-owned story-identifier order

#### Scenario: Roll back an incomplete persistence attempt

- GIVEN a valid generated backlog is ready to persist
- AND any story insert or the project-state transition fails
- WHEN the transaction completes
- THEN no story from that backlog remains committed
- AND the project does not transition to `planificado`

#### Scenario: Preserve a concurrent first writer

- GIVEN overlapping requests generate candidate backlogs for the same `analizado` project
- WHEN one transaction commits the first stored backlog
- THEN later transactions MUST NOT insert another backlog
- AND every caller returns the already committed first-writer backlog in stable order
- AND the project remains `planificado`

#### Scenario: Permit duplicate provider work without duplicate persistence

- GIVEN overlapping first requests pass the pre-provider cache check before either backlog is committed
- WHEN both requests invoke Gemini
- THEN multiple provider calls MAY occur
- AND exactly one complete backlog is persisted
- AND no partial or duplicate story set is committed

### Requirement: Migration 005 Constraint Evolution and Safety

Migration 005 MUST change only the `proyectos.estado` and `historias.rol_sugerido` check constraints. It MUST NOT add, remove, rename, or alter story columns. The target project states MUST be exactly `nuevo`, `analizado`, and `planificado`. The target story-role values MUST be exactly `Desarrollador Frontend`, `Desarrollador Backend`, `Analista QA`, `Analista de Ciberseguridad`, `Analista de requerimientos`, `Project Manager`, `Frontend`, `Backend`, `QA`, and `Ciberseguridad`. Prior migration files and recorded checksums MUST remain unchanged.

#### Scenario: Apply the complete migration 005 target

- GIVEN migrations 001 through 004 are valid and applied
- WHEN migration 005 is applied successfully
- THEN the project-state constraint permits exactly `nuevo`, `analizado`, and `planificado`
- AND the story-role constraint permits exactly the ten specified legacy and generated labels
- AND the `historias` column set is unchanged
- AND prior migration bytes and checksums are unchanged

#### Scenario: Recognize the verified migration 005 descendant state

- GIVEN migration 004 is recorded as applied
- AND the database has the verified migration 005 target constraints
- WHEN migration history and schema state are verified again
- THEN the expanded project-state constraint is accepted as the legitimate migration 005 descendant of migration 004
- AND migration 004 is not rejected, rewritten, or assigned a new checksum

#### Scenario: Recover a recognized fixed partial state

- GIVEN exactly one of the two migration 005 constraints is at its verified source definition
- AND the other is at its verified target definition
- WHEN migration 005 resumes
- THEN the runner repairs the source constraint to its target definition
- AND records migration 005 only after both target constraints are verified

#### Scenario: Refuse an unrecognized constraint state

- GIVEN either migration 005 constraint differs from both its verified source and target definition
- WHEN migration 005 is attempted
- THEN the migration fails without recording success
- AND the runner does not guess, delete, or rewrite business data to force the target

#### Scenario: Refuse an unsafe rollback

- GIVEN at least one project is `planificado` or at least one story uses a role label unavailable in the source constraint
- WHEN rollback of migration 005 is requested
- THEN rollback is refused
- AND no incompatible business data is deleted or rewritten
- AND migration history is not marked as rolled back

#### Scenario: Restore source constraints when rollback is safe

- GIVEN no project is `planificado`
- AND no story uses a role label unavailable in the source constraint
- WHEN migration 005 is rolled back
- THEN only the two source check constraints are restored
- AND story columns and compatible business data remain unchanged

## MODIFIED Requirements

### Requirement: User Story Schema Foundation

The `historias` schema MUST associate every generated story with its project and MUST represent the report-approved story attributes: priority, user-story statement, description, acceptance criteria, technical scope, Fibonacci estimate, suggested team role, phase, board column, and estimated dates. Backlog generation MUST use the existing story columns and MUST NOT require a new story column. It MUST NOT calculate Fibonacci-to-days mappings or estimated dates.

(Previously: The schema was only a future foundation, and Cycle 1 prohibited automatic story population and story business logic.)

#### Scenario: Verify the story data foundation

- GIVEN the planning schema has been applied
- WHEN the `historias` schema is inspected
- THEN it can represent each report-approved story attribute
- AND it can associate a story with its project

#### Scenario: Activate bounded generated-story persistence

- GIVEN a project has an accepted strict generated backlog
- WHEN that backlog is persisted
- THEN each public story field maps to an existing `historias` column
- AND no new story column is required
- AND the project association and server-owned database fields are assigned by the system

#### Scenario: Keep deferred estimation behavior out of backlog generation

- GIVEN a generated story includes an allowed Fibonacci estimate
- WHEN the story is persisted
- THEN no Fibonacci-to-days conversion is performed
- AND no estimated start or end date is derived
