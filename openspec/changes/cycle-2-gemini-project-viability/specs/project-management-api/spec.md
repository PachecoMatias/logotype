# Delta for Project Management API

## ADDED Requirements

### Requirement: Project Viability Analysis Operation

`POST /api/proyectos/:id/analizar` MUST accept only a valid positive project identifier, MUST load the identified persisted project before any provider invocation, and MUST respond with HTTP 200 through the uniform success envelope when analysis succeeds. The success envelope's `data` member MUST be the validated analysis object containing exactly `viable`, `completitud`, `campos_faltantes`, `observaciones`, and `mensaje_para_cliente`. When the project is already `analizado` and has a valid stored analysis, the endpoint MUST return that stored analysis and MUST perform no provider call and no persistence write.

#### Scenario: Analyze an existing project

- GIVEN a persisted project with a positive identifier, status `nuevo`, and no stored analysis
- AND the provider returns a valid analysis
- WHEN the client sends `POST /api/proyectos/:id/analizar` using that identifier
- THEN the API responds with HTTP 200
- AND the response body has `success` equal to `true`
- AND its `data` member is the validated analysis object with exactly the five required fields

#### Scenario: Preserve the existing not-found behavior

- GIVEN no project exists for a syntactically valid positive identifier
- WHEN the client sends `POST /api/proyectos/:id/analizar` using that identifier
- THEN the API responds with HTTP 404
- AND the response uses the existing uniform `PROJECT_NOT_FOUND` error contract
- AND no provider call or analysis persistence is attempted

#### Scenario: Return a stored analysis without repeat billing

- GIVEN a project has status `analizado`
- AND it has a valid stored analysis
- WHEN the client sends `POST /api/proyectos/:id/analizar` using that project's identifier
- THEN the API responds with HTTP 200 and the uniform success envelope
- AND `data` equals the stored analysis
- AND no provider call and no persistence write occurs

#### Scenario: Reject a non-positive project identifier

- GIVEN the route identifier is zero, negative, non-numeric, or not an integer
- WHEN the client sends `POST /api/proyectos/:id/analizar`
- THEN the API responds with the existing uniform HTTP 400 validation error
- AND no project lookup, provider call, or analysis persistence is attempted

## MODIFIED Requirements

### Requirement: Read-Only Cycle 1 Project Surface

The project API MUST preserve project creation, project collection retrieval, and project detail retrieval, and it MUST add only the explicit `POST /api/proyectos/:id/analizar` state transition authorized for viability analysis. It MUST NOT expose general project update or deletion behavior, and it MUST NOT expose `historias` endpoints or business logic.

(Previously: The project surface exposed only creation and read-only retrieval and prohibited every project state-changing operation.)

#### Scenario: Verify the project routes

- GIVEN the backend route surface after the viability-analysis change
- WHEN the public API routes are inspected
- THEN `POST /api/proyectos`, `GET /api/proyectos`, `GET /api/proyectos/:id`, and `POST /api/proyectos/:id/analizar` are available
- AND no general project update, project deletion, or `historias` route is provided

#### Scenario: Avoid interpreting configurator feature choices as backend scope

- GIVEN a valid project request whose selected features include `Login y autenticación` or `Dashboard`
- WHEN the project is created or analyzed
- THEN those values are treated as client requirements data only
- AND the backend does not enable authentication, login, or dashboard functionality as a side effect
