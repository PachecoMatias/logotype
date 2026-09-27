# Delta for API Reliability Contract

## MODIFIED Requirements

### Requirement: Uniform Success Envelope

Every successful project API response MUST use the JSON envelope `{ "success": true, "data": ... }`. The `data` member MUST contain the created project, project collection, requested project, or exact validated viability-analysis object as appropriate for the endpoint.

(Previously: The success envelope supported only project creation, collection retrieval, and detail retrieval.)

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

#### Scenario: Wrap a project analysis

- GIVEN an existing project is newly analyzed or has a valid cached analysis
- WHEN `POST /api/proyectos/:id/analizar` succeeds
- THEN the response has HTTP 200
- AND its body has `success` equal to `true`
- AND its `data` member is the exact validated or stored analysis object

### Requirement: Uniform Error Envelope

Every failed project API response MUST use the JSON envelope `{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }`. The `code` and `message` members MUST be present. The `details` member MAY be omitted when no safe, actionable detail exists. Validation failures MUST use code `VALIDATION_ERROR`, unknown projects MUST use code `PROJECT_NOT_FOUND`, unexpected server failures MUST use code `INTERNAL_ERROR`, and provider, empty-response, malformed-JSON, or schema-invalid analysis failures MUST use code `AI_ANALYSIS_FAILED` with HTTP 502. Error responses MUST NOT expose project payloads, prompts, API keys, authorization data, provider bodies or messages, stack traces, SQL text, environment dumps, SDK internals, or filesystem paths.

(Previously: The error contract defined validation, project-not-found, and internal errors but no normalized AI-analysis failure.)

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

#### Scenario: Preserve not-found behavior for analysis

- GIVEN no project exists for a syntactically accepted positive identifier
- WHEN `POST /api/proyectos/:id/analizar` is requested with that identifier
- THEN the response has HTTP 404
- AND its body uses the existing `PROJECT_NOT_FOUND` envelope
- AND no provider call occurs

#### Scenario: Return an internal error without leaking internals

- GIVEN an unexpected failure occurs while handling an API request
- WHEN the API sends the failure response
- THEN the response has HTTP 500
- AND its body has `success` equal to `false`
- AND `error.code` is `INTERNAL_ERROR`
- AND the response does not expose credentials, SQL text, stack traces, environment values, provider internals, or internal filesystem paths

#### Scenario: Return a sanitized analysis failure

- GIVEN an analysis attempt encounters a provider error, empty response text, malformed JSON, or schema-invalid JSON
- WHEN the API sends the failure response
- THEN the response has HTTP 502
- AND its body has `success` equal to `false`
- AND `error.code` is `AI_ANALYSIS_FAILED`
- AND its message and optional details contain no payload, prompt, key, authorization data, provider diagnostic, stack trace, SDK internal, or environment dump

### Requirement: Zod Boundary Validation

The API MUST use Zod to validate request data at the HTTP boundary before invoking project persistence or the analysis provider. Invalid request bodies or route parameters MUST NOT reach project persistence or provider operations. The analysis route identifier MUST be a positive integer.

(Previously: Boundary validation protected project persistence but did not define the analysis route or protect provider invocation.)

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

#### Scenario: Reject an invalid analysis identifier before side effects

- GIVEN an analysis route identifier is zero, negative, non-numeric, or not an integer
- WHEN `POST /api/proyectos/:id/analizar` receives the request
- THEN Zod validation rejects the parameter with the uniform HTTP 400 validation error
- AND no project lookup, provider call, or analysis persistence occurs

### Requirement: Centralized Error Handling

The Express application MUST route validation, not-found, persistence, AI-analysis, and unexpected errors through centralized error handling. The centralized behavior MUST preserve the status code and uniform envelope assigned to known errors, including HTTP 502 `AI_ANALYSIS_FAILED`, and MUST convert unrecognized errors to the safe internal-error contract. Handling any analysis failure MUST leave the server able to process subsequent requests.

(Previously: Centralized handling covered validation, not-found, persistence, and unexpected errors but had no AI-analysis category or explicit post-failure health guarantee.)

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

#### Scenario: Normalize an analysis failure and remain healthy

- GIVEN a provider or response-contract failure is represented as a known analysis error
- WHEN the error reaches centralized handling
- THEN the API responds with the sanitized HTTP 502 `AI_ANALYSIS_FAILED` envelope
- AND no analysis or `analizado` status is persisted for the failed attempt
- AND a subsequent unrelated valid request can be processed normally

### Requirement: Endpoint Regression Tests

The backend MUST provide automated endpoint-level tests that exercise the public HTTP behavior using controlled persistence and a fully mocked Gemini boundary. The automatic suite MUST make zero real Gemini calls and spend zero Gemini quota. It MUST preserve coverage for project creation, validation, collection retrieval, detail retrieval, unknown projects, and unexpected failures, and MUST additionally verify analysis success, missing-project short-circuiting, cached repeat behavior, and every normalized analysis-failure class.

(Previously: Endpoint tests covered the Cycle 1 project endpoints without Gemini mocking or analysis behavior.)

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

#### Scenario: Verify mocked analysis success

- GIVEN an existing `nuevo` project and a mocked provider returning a valid exact analysis object
- WHEN the endpoint test requests analysis
- THEN it asserts HTTP 200 and the uniform success envelope
- AND it asserts atomic persistence of the analysis and status `analizado`
- AND it verifies that no real provider network call occurs

#### Scenario: Verify missing-project short-circuiting

- GIVEN no project exists for the requested positive identifier
- WHEN the endpoint test requests analysis
- THEN it asserts HTTP 404 and the `PROJECT_NOT_FOUND` envelope
- AND it asserts zero mocked or real provider calls and zero persistence writes

#### Scenario: Verify cached repeat behavior

- GIVEN an analyzed project has a valid stored analysis
- WHEN the endpoint test requests analysis again
- THEN it asserts HTTP 200 with the stored analysis
- AND it asserts zero provider calls and zero persistence writes

#### Scenario: Verify provider-error normalization

- GIVEN an existing unanalyzed project and a mocked provider that throws
- WHEN the endpoint test requests analysis
- THEN it asserts the sanitized HTTP 502 `AI_ANALYSIS_FAILED` envelope
- AND it asserts no analysis or status transition was persisted

#### Scenario: Verify empty-response normalization

- GIVEN an existing unanalyzed project and a mocked provider returning absent or empty text
- WHEN the endpoint test requests analysis
- THEN it asserts the sanitized HTTP 502 `AI_ANALYSIS_FAILED` envelope
- AND it asserts no analysis or status transition was persisted

#### Scenario: Verify malformed-JSON normalization

- GIVEN an existing unanalyzed project and a mocked provider returning malformed JSON text
- WHEN the endpoint test requests analysis
- THEN it asserts the sanitized HTTP 502 `AI_ANALYSIS_FAILED` envelope
- AND it asserts no analysis or status transition was persisted

#### Scenario: Verify schema-invalid JSON normalization

- GIVEN an existing unanalyzed project and a mocked provider returning JSON that violates the exact analysis contract
- WHEN the endpoint test requests analysis
- THEN it asserts the sanitized HTTP 502 `AI_ANALYSIS_FAILED` envelope
- AND it asserts no analysis or status transition was persisted
- AND it verifies that a subsequent valid endpoint request succeeds
