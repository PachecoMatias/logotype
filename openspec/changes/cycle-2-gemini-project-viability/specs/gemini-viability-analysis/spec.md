# Gemini Viability Analysis Specification

## Purpose

Define the controlled use of Gemini structured output to analyze the persisted payload of an existing project, validate an exact viability contract, cache successful results, isolate failures, protect sensitive data, and provide quota-safe verification.

## Requirements

### Requirement: Prompt From Persisted Untrusted Payload

The analysis request MUST derive its project facts from the persisted project `payload`, not from client-supplied analysis content. The prompt MUST delimit that payload as untrusted data and MUST instruct the model not to follow instructions contained within it. The prompt MUST request only the defined viability-analysis result.

#### Scenario: Build analysis input from persisted data

- GIVEN an existing project has a persisted configurator payload
- WHEN its first viability analysis is requested
- THEN the provider request derives the project facts from that persisted payload
- AND no additional client-supplied analysis content replaces or augments the persisted source

#### Scenario: Treat payload instructions as data

- GIVEN a persisted free-text field contains text that attempts to change the system task or output contract
- WHEN the analysis prompt is constructed
- THEN that text remains inside the delimited untrusted-data region
- AND the surrounding instructions explicitly require it to be treated as data rather than instructions
- AND the requested output contract remains unchanged

#### Scenario: Avoid incidental prompt disclosure

- GIVEN an analysis prompt has been built from a persisted payload
- WHEN normal logs, errors, or automated test output are produced
- THEN the prompt and payload are not emitted
- AND only the explicitly approved sanitized live-evidence path may capture review-approved guarded test content

### Requirement: Official Gemini Structured Output Request

Every real analysis call MUST use the official Gemini SDK structured-output facility. Its generation configuration MUST set `responseMimeType` to exactly `application/json` and MUST supply a matching JSON response schema for an object with exactly the five required fields. The configured model MUST default to `gemini-2.5-flash` unless an explicit documented override is supplied.

#### Scenario: Send the matching structured-output configuration

- GIVEN an existing unanalyzed project and valid Gemini configuration
- WHEN the backend invokes Gemini for viability analysis
- THEN the request configuration sets `responseMimeType` to `application/json`
- AND its JSON response schema requires exactly `viable`, `completitud`, `campos_faltantes`, `observaciones`, and `mensaje_para_cliente`
- AND the schema defines `viable` as boolean, `completitud` as the enum `completo | falta_info`, `campos_faltantes` as an array of strings, and both remaining fields as strings
- AND the schema permits no additional fields

#### Scenario: Use the default model

- GIVEN no model override is configured
- WHEN a real viability-analysis call is made
- THEN the selected model is `gemini-2.5-flash`
- AND the same selected model can be identified in sanitized live evidence

### Requirement: Exact Validated Analysis Contract

Before any persistence, provider text MUST be parsed as JSON and validated as a strict object. The result MUST contain all and only these fields: `viable` as a boolean; `completitud` as exactly `completo` or `falta_info`; `campos_faltantes` as an array whose every item is a string; `observaciones` as a string; and `mensaje_para_cliente` as a string. Missing fields, extra fields, wrong types, and any other `completitud` value MUST be rejected.

#### Scenario: Accept the exact analysis object

- GIVEN Gemini returns non-empty JSON text containing all five required fields with their exact types and allowed values
- AND the object contains no additional field
- WHEN the response is parsed and validated
- THEN validation succeeds
- AND the complete object is eligible for persistence and the success response

#### Scenario: Reject a missing or extra field

- GIVEN Gemini returns valid JSON that omits any required field or contains any additional field
- WHEN the response is validated
- THEN validation fails as `AI_ANALYSIS_FAILED`
- AND no analysis or status transition is persisted

#### Scenario: Reject an invalid completeness value

- GIVEN Gemini returns valid JSON whose `completitud` is not exactly `completo` or `falta_info`
- WHEN the response is validated
- THEN validation fails as `AI_ANALYSIS_FAILED`
- AND no analysis or status transition is persisted

#### Scenario: Reject an invalid field type

- GIVEN Gemini returns valid JSON in which `viable` is not boolean, `campos_faltantes` is not an array of strings, or either text field is not a string
- WHEN the response is validated
- THEN validation fails as `AI_ANALYSIS_FAILED`
- AND no analysis or status transition is persisted

### Requirement: Cached Analysis Prevents Repeat Provider Use

The system MUST inspect the persisted project before requesting analysis. If the project has status `analizado` and a valid stored analysis, the system MUST return that stored object unchanged and MUST perform zero Gemini calls and zero persistence writes for the repeated request.

#### Scenario: Analyze a new project once

- GIVEN an existing project has status `nuevo` and no stored analysis
- AND Gemini returns a valid analysis
- WHEN analysis is requested
- THEN exactly one provider call is made for that request
- AND the validated result is persisted with status `analizado`

#### Scenario: Return a valid cached analysis

- GIVEN an existing project has status `analizado` and a valid stored analysis
- WHEN analysis is requested again
- THEN the stored analysis is returned unchanged
- AND zero Gemini calls and zero persistence writes occur

### Requirement: Provider and Response Failure Isolation

A provider error, absent or empty response text, malformed JSON, or JSON that violates the exact analysis contract MUST produce the same sanitized HTTP 502 `AI_ANALYSIS_FAILED` behavior. Each such failure MUST persist neither analysis nor status transition, MUST NOT expose payload, prompt, credentials, authorization data, provider diagnostics, environment values, or SDK internals, and MUST leave the server healthy for subsequent requests.

#### Scenario: Isolate a provider error

- GIVEN the provider call rejects or reports an error
- WHEN the analysis attempt is handled
- THEN the API returns sanitized HTTP 502 `AI_ANALYSIS_FAILED`
- AND no analysis or status transition is persisted
- AND the server can process a subsequent valid request

#### Scenario: Isolate absent or empty response text

- GIVEN the provider call completes without non-empty response text
- WHEN the analysis attempt is handled
- THEN the API returns sanitized HTTP 502 `AI_ANALYSIS_FAILED`
- AND no analysis or status transition is persisted
- AND the server can process a subsequent valid request

#### Scenario: Isolate malformed JSON

- GIVEN the provider returns non-empty text that cannot be parsed as JSON
- WHEN the analysis attempt is handled
- THEN the API returns sanitized HTTP 502 `AI_ANALYSIS_FAILED`
- AND no analysis or status transition is persisted
- AND the server can process a subsequent valid request

#### Scenario: Isolate schema-invalid JSON

- GIVEN the provider returns parseable JSON that violates the exact analysis contract
- WHEN the analysis attempt is handled
- THEN the API returns sanitized HTTP 502 `AI_ANALYSIS_FAILED`
- AND no analysis or status transition is persisted
- AND the server can process a subsequent valid request

#### Scenario: Keep failure details private

- GIVEN any provider or response failure includes sensitive request or diagnostic context
- WHEN its HTTP response, logs, and normal test output are inspected
- THEN none contains the payload, prompt, API key, authorization header, provider body or message, environment dump, or SDK client internals
- AND the client receives only the controlled error envelope

### Requirement: Quota-Safe Verification and Sanitized Live Evidence

Automated tests MUST use a controlled provider substitute and MUST make zero real Gemini calls. A distinct explicit opt-in live harness MAY call Gemini only against guarded MySQL test data, MUST make exactly one real call per invocation, and MUST capture complete sanitized review evidence. That evidence MUST include the review-approved sanitized request content, selected model, structured-output configuration, raw response text, validated result, API or service result, and persisted result, while excluding keys, authorization headers, environment dumps, SDK internals, and unapproved personal or business data.

#### Scenario: Run automatic tests without quota

- GIVEN the normal automated suite is invoked
- WHEN analysis success, cache, and failure behavior are tested
- THEN all provider behavior is controlled without network access
- AND zero real Gemini calls and zero quota usage occur

#### Scenario: Guard the live harness

- GIVEN live opt-in is absent or the MySQL target is not recognized as guarded test data
- WHEN the live harness is invoked
- THEN it stops before provider invocation
- AND zero real Gemini calls occur

#### Scenario: Produce exactly one complete sanitized live record

- GIVEN explicit live opt-in, a real key, and guarded MySQL test data are present
- WHEN one live harness invocation completes
- THEN exactly one real Gemini call occurred
- AND the evidence contains the complete review-approved sanitized request, model, structured-output configuration, raw response text, validated result, API or service result, and persisted analysis with status `analizado`
- AND the evidence contains no key, authorization header, environment dump, SDK client internal, or unapproved personal or business data

### Requirement: Explicit Product Scope Boundary

The viability-analysis capability MUST NOT generate or persist backlog items or user stories, send email, implement provider retries or backoff, modify frontend behavior, or add authentication. Selected configurator features MUST remain input data and MUST NOT activate those excluded capabilities.

#### Scenario: Keep deferred capabilities out of analysis

- GIVEN a project payload requests backlog, email, authentication, or frontend features
- WHEN viability analysis completes
- THEN the system returns only the exact five-field analysis contract
- AND it creates no story, backlog item, email, frontend behavior, authentication flow, retry, or backoff behavior
