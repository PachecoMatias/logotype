# Delta for API Reliability Contract

## ADDED Requirements

### Requirement: Backlog Success and Error Envelopes

The backlog endpoint MUST use the existing uniform API envelopes. A successful first or cached response MUST use HTTP 200 with `{ "success": true, "data": [...] }`. A project with no stored backlog whose state is not `analizado` MUST use HTTP 409 with `{ "success": false, "error": { "code": "PROJECT_NOT_ANALYZED", "message": "Project must be analyzed before backlog generation" } }`. Every provider exception, absent or blank response, malformed JSON response, or strict-schema failure MUST use HTTP 502 with the existing sanitized `{ "success": false, "error": { "code": "AI_ANALYSIS_FAILED", "message": "AI analysis failed" } }` response.

#### Scenario: Return a successful backlog envelope

- GIVEN a backlog has been committed or was already stored
- WHEN `POST /api/proyectos/:id/backlog` succeeds
- THEN the API responds with HTTP 200
- AND the response has `success` equal to `true`
- AND `data` is the complete stored story array in stable order

#### Scenario: Return the not-analyzed conflict envelope

- GIVEN an existing project has no stored backlog and is not `analizado`
- WHEN `POST /api/proyectos/:id/backlog` is requested
- THEN the API responds with HTTP 409
- AND the response uses the exact `PROJECT_NOT_ANALYZED` error contract
- AND no provider call or persistence write occurs

#### Scenario: Return the sanitized provider-failure envelope

- GIVEN an existing analyzed project has no stored backlog
- AND the provider fails or returns blank, malformed, or schema-invalid output
- WHEN `POST /api/proyectos/:id/backlog` is requested
- THEN the API responds with HTTP 502
- AND the response uses the exact `AI_ANALYSIS_FAILED` error contract
- AND the response exposes no provider diagnostics, credentials, stack traces, SQL text, or filesystem paths
- AND no story or project-state write occurs

### Requirement: Focused Backlog Endpoint Regression Coverage

Automated endpoint coverage MUST verify only the narrow core backlog semantics: successful strict backlog persistence with cached repeat behavior, not-analyzed rejection, and invalid provider JSON handling. These tests MUST use a controlled provider double and MUST NOT call a live Gemini service. Exhaustive output, migration-corruption, partial-state, concurrency, retry, authentication, semantic-quality, and public-exposure matrices MAY remain outside this change.

#### Scenario: Verify success, persistence, and repeat caching

- GIVEN the endpoint test environment contains an `analizado` project without stories
- AND the controlled provider returns 12 valid strict stories
- WHEN the test requests the backlog twice
- THEN both responses contain the same 12 stored stories in stable order
- AND the project is `planificado`
- AND the provider was called exactly once
- AND exactly 12 stories were written once

#### Scenario: Verify not-analyzed rejection

- GIVEN the endpoint test environment contains a project without stories whose state is not `analizado`
- WHEN the test requests the backlog
- THEN it asserts HTTP 409 and the `PROJECT_NOT_ANALYZED` envelope
- AND it verifies zero provider calls and zero writes

#### Scenario: Verify invalid provider JSON

- GIVEN the endpoint test environment contains an `analizado` project without stories
- AND the controlled provider returns malformed JSON
- WHEN the test requests the backlog
- THEN it asserts the sanitized HTTP 502 `AI_ANALYSIS_FAILED` envelope
- AND it verifies that no story is written and the project remains `analizado`
