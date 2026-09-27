# Delta for Project Management API

## ADDED Requirements

### Requirement: Project Backlog Generation Endpoint

`POST /api/proyectos/:id/backlog` MUST accept a valid project identifier without requiring a request body. For an existing analyzed project with no stored backlog, the endpoint MUST generate and commit one strict backlog, then respond with HTTP 200 through the uniform success envelope. The `data` member MUST be the committed array of 12–25 stories, each containing exactly `fase`, `prioridad`, `historia_usuario`, `descripcion`, `criterios_aceptacion`, `alcance_tecnico`, `estimacion_fibonacci`, and `rol_sugerido`. The endpoint MUST preserve the existing route-identifier validation and `PROJECT_NOT_FOUND` behavior.

#### Scenario: Generate a backlog for an analyzed project

- GIVEN an existing project has state `analizado`, persisted analysis, and no stored stories
- AND the provider returns a valid strict backlog
- WHEN the client sends `POST /api/proyectos/:id/backlog` with that project's identifier
- THEN the API responds with HTTP 200
- AND the response body is `{ "success": true, "data": [...] }`
- AND `data` contains the complete committed backlog in stable server-owned order
- AND every returned story contains exactly the eight public contract fields

#### Scenario: Generate without client backlog input

- GIVEN an existing analyzed project has no stored backlog
- WHEN the client sends `POST /api/proyectos/:id/backlog` without a request body
- THEN the request can proceed using persisted project data
- AND no client-supplied story, project, or analysis field is required

#### Scenario: Preserve identifier and not-found behavior

- GIVEN the route identifier is invalid or does not identify a persisted project
- WHEN the client sends `POST /api/proyectos/:id/backlog`
- THEN an invalid identifier produces the existing HTTP 400 `VALIDATION_ERROR` contract
- AND an accepted but unknown identifier produces the existing HTTP 404 `PROJECT_NOT_FOUND` contract
- AND no provider call or story write occurs

### Requirement: Stored Backlog Precedence and Eligibility

The endpoint MUST query the stored project backlog before evaluating project-state eligibility, invoking Gemini, or performing any write. When stories already exist, it MUST return those stories in stable server-owned order with zero provider calls and zero writes. When no backlog exists, the project MUST be in state `analizado`; every other state MUST produce HTTP 409 with error code `PROJECT_NOT_ANALYZED` before provider or persistence work.

#### Scenario: Return a stored backlog before all other work

- GIVEN an existing project has stored stories
- WHEN the client sends `POST /api/proyectos/:id/backlog`
- THEN the API responds with HTTP 200 and the stored stories in stable server-owned order
- AND project-state eligibility is not used to reject the request
- AND the provider call count remains zero
- AND no project or story write is attempted

#### Scenario: Reject a project that has not been analyzed

- GIVEN an existing project has no stored stories
- AND its state is not `analizado`
- WHEN the client sends `POST /api/proyectos/:id/backlog`
- THEN the API responds with HTTP 409
- AND `error.code` is `PROJECT_NOT_ANALYZED`
- AND `error.message` is `Project must be analyzed before backlog generation`
- AND no provider call or persistence write occurs
