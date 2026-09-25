# API Reliability Contract Specification

## Purpose

Define predictable API envelopes, validation, centralized failure behavior, and endpoint-level regression coverage for the Cycle 1 project API.

## Requirements

### Requirement: Uniform Success Envelope

Every successful Cycle 1 API response MUST use the JSON envelope `{ "success": true, "data": ... }`. The `data` member MUST contain the created project, the project collection, or the requested project as appropriate for the endpoint.

#### Scenario: Wrap a created project

- GIVEN a valid project creation request
- WHEN `POST /api/proyectos` succeeds
- THEN the response has HTTP 201
- AND its body has `success` equal to `true`
- AND its `data` member is the created project

#### Scenario: Wrap an empty collection

- GIVEN no projects exist
- WHEN `GET /api/proyectos` succeeds
- THEN the response has HTTP 200
- AND its body has `success` equal to `true`
- AND its `data` member is an empty array

### Requirement: Uniform Error Envelope

Every failed Cycle 1 API response MUST use the JSON envelope `{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }`. The `code` and `message` members MUST be present. The `details` member MAY be omitted when no safe, actionable detail exists. Validation failures MUST use code `VALIDATION_ERROR`, unknown projects MUST use code `PROJECT_NOT_FOUND`, and unexpected server failures MUST use code `INTERNAL_ERROR`.

#### Scenario: Return a validation error

- GIVEN a project creation request is missing required data
- WHEN `POST /api/proyectos` validates the request
- THEN the response has HTTP 400
- AND its body has `success` equal to `false`
- AND `error.code` is `VALIDATION_ERROR`
- AND `error.details` identifies the invalid request field or fields

#### Scenario: Return a project-not-found error

- GIVEN no project exists for a syntactically accepted identifier
- WHEN `GET /api/proyectos/:id` is requested with that identifier
- THEN the response has HTTP 404
- AND its body has `success` equal to `false`
- AND `error.code` is `PROJECT_NOT_FOUND`

#### Scenario: Return an internal error without leaking internals

- GIVEN an unexpected failure occurs while handling an API request
- WHEN the API sends the failure response
- THEN the response has HTTP 500
- AND its body has `success` equal to `false`
- AND `error.code` is `INTERNAL_ERROR`
- AND the response does not expose credentials, SQL text, stack traces, or internal filesystem paths

### Requirement: Zod Boundary Validation

The API MUST use Zod to validate request data at the HTTP boundary before invoking project persistence. Invalid request bodies or route parameters MUST NOT reach the project persistence operation.

#### Scenario: Stop an invalid body at the boundary

- GIVEN a project creation request with an invalid email and a missing required nested field
- WHEN `POST /api/proyectos` receives the request
- THEN Zod validation rejects the request
- AND the API returns the uniform HTTP 400 validation error
- AND no project persistence operation is attempted

#### Scenario: Accept a valid body at the boundary

- GIVEN a project creation request that satisfies the configurator payload contract
- WHEN `POST /api/proyectos` receives the request
- THEN Zod validation succeeds
- AND the validated data may proceed to project creation

#### Scenario: Reject an invalid route identifier

- GIVEN a route identifier does not satisfy the API's documented identifier shape
- WHEN `GET /api/proyectos/:id` receives the request
- THEN Zod validation rejects the parameter
- AND the API returns the uniform HTTP 400 validation error rather than querying for a project

### Requirement: Centralized Error Handling

The Express application MUST route validation, not-found, persistence, and unexpected errors through centralized error handling. The centralized behavior MUST preserve the status code and uniform envelope assigned to known errors and MUST convert unrecognized errors to the safe internal-error contract.

#### Scenario: Normalize a known not-found error

- GIVEN project retrieval determines that a requested project does not exist
- WHEN the error reaches centralized handling
- THEN the API responds with HTTP 404
- AND it uses the `PROJECT_NOT_FOUND` error envelope

#### Scenario: Normalize an unexpected persistence failure

- GIVEN project persistence fails unexpectedly
- WHEN the failure reaches centralized handling
- THEN the API responds with HTTP 500
- AND it uses the safe `INTERNAL_ERROR` envelope
- AND the process does not return a success response for that operation

### Requirement: Endpoint Regression Tests

The backend MUST provide automated endpoint-level tests that exercise the public HTTP behavior using controlled persistence. At minimum, the suite MUST verify successful project creation, rejection of missing required data, project collection retrieval, existing project detail retrieval, unknown project detail retrieval, and uniform handling of an unexpected failure. Test-database lifecycle and isolation mechanics remain Design decisions.

#### Scenario: Verify successful creation

- GIVEN the endpoint test environment is prepared
- WHEN the successful-creation test sends a valid configurator payload
- THEN it asserts HTTP 201
- AND it asserts the uniform success envelope, generated project identifier, and status `nuevo`

#### Scenario: Verify missing required data

- GIVEN the endpoint test environment is prepared
- WHEN the validation test sends a payload missing a required field
- THEN it asserts HTTP 400
- AND it asserts the `VALIDATION_ERROR` envelope
- AND it verifies that no project was created

#### Scenario: Verify project retrieval

- GIVEN the endpoint test environment contains a persisted project
- WHEN the collection and detail tests request projects
- THEN they assert HTTP 200 success envelopes
- AND they assert that the persisted project is returned

#### Scenario: Verify an unknown project

- GIVEN the endpoint test environment contains no project for a syntactically accepted identifier
- WHEN the unknown-project test requests that identifier
- THEN it asserts HTTP 404
- AND it asserts the `PROJECT_NOT_FOUND` envelope

#### Scenario: Verify unexpected failure handling

- GIVEN the endpoint test environment can induce a controlled persistence failure
- WHEN an endpoint encounters that failure
- THEN the test asserts HTTP 500
- AND it asserts the `INTERNAL_ERROR` envelope
- AND it asserts that sensitive implementation details are absent

### Requirement: Deterministic Test Command

The backend MUST expose and document a non-interactive npm test command that runs the endpoint regression suite and returns a non-zero process exit code when any required test fails.

#### Scenario: Run the endpoint suite successfully

- GIVEN all required endpoint behaviors are implemented correctly
- WHEN a developer runs the documented npm test command
- THEN the command executes the endpoint regression suite without interactive input
- AND it exits successfully

#### Scenario: Signal a regression

- GIVEN one required endpoint assertion fails
- WHEN the documented npm test command runs
- THEN the command exits with a non-zero status
- AND the failing behavior is identifiable from the test output
