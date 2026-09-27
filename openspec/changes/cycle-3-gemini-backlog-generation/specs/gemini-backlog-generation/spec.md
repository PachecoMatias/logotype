# Gemini Backlog Generation Specification

## Purpose

Define the bounded, strictly validated Gemini backlog generated from persisted project data for an analyzed project.

## Requirements

### Requirement: Strict Generated Backlog Contract

The generated backlog MUST be a JSON array containing at least 12 and at most 25 stories. Every story MUST be a strict object containing exactly the following fields and MUST NOT contain additional fields:

| Field | Required contract |
|-------|-------------------|
| `fase` | One of `Análisis`, `Diseño`, `Desarrollo Frontend`, `Desarrollo Backend`, `Testing`, or `Despliegue` |
| `prioridad` | One of `Alta`, `Media`, or `Baja` |
| `historia_usuario` | Non-empty string |
| `descripcion` | Non-empty string |
| `criterios_aceptacion` | Non-empty array of non-empty strings |
| `alcance_tecnico` | Non-empty string |
| `estimacion_fibonacci` | One of the integers `1`, `2`, `3`, `5`, `8`, `13`, or `21` |
| `rol_sugerido` | One of `Frontend`, `Backend`, `QA`, `Ciberseguridad`, `Analista de requerimientos`, or `Project Manager` |

#### Scenario: Accept a bounded strict backlog

- GIVEN Gemini returns a JSON array containing 12 to 25 stories
- AND every story contains exactly the required fields with allowed values and types
- WHEN the provider response is validated
- THEN the system accepts the complete backlog for persistence

#### Scenario: Reject a backlog outside the story-count bounds

- GIVEN Gemini returns a valid JSON array containing fewer than 12 or more than 25 stories
- WHEN the provider response is validated
- THEN the system rejects the complete provider response
- AND no story from that response is eligible for persistence

#### Scenario: Reject a story with an invalid shape

- GIVEN Gemini returns a JSON array within the allowed story-count bounds
- AND at least one story has a missing field, an additional field, an empty required value, or a value outside an allowed enum
- WHEN the provider response is validated
- THEN the system rejects the complete provider response
- AND no story from that response is eligible for persistence

### Requirement: Persisted-Input Prompt Boundary

The system MUST build backlog-generation input only from the persisted project payload and persisted project analysis. Both persisted values MUST be treated as untrusted data and MUST be isolated from the system's generation instructions. Request-body content and other client-supplied generation instructions MUST NOT influence the prompt.

#### Scenario: Generate from persisted project context

- GIVEN an analyzed project has a persisted payload and persisted analysis
- WHEN backlog generation is requested
- THEN the generation input contains the persisted payload and persisted analysis
- AND it does not require the client to resubmit either value

#### Scenario: Isolate instructions embedded in persisted data

- GIVEN the persisted payload or analysis contains text that resembles instructions to the provider
- WHEN the generation input is built
- THEN that text remains delimited as untrusted project data
- AND it does not replace or extend the system's backlog-generation instructions

#### Scenario: Ignore request-body generation content

- GIVEN a backlog request contains a body with replacement project data or provider instructions
- WHEN backlog generation is requested
- THEN the system uses only the persisted project payload and analysis as project context
- AND the request-body content does not influence the generated backlog

### Requirement: Existing Gemini Integration Contract

Backlog generation MUST extend the existing Gemini integration and MUST preserve its lazy provider configuration, structured JSON response constraint, runtime validation boundary, project-state handling, and sanitized provider-failure behavior. The system MUST NOT require a second provider client, a separate configuration contract, or a separate error-handling path for backlog generation.

#### Scenario: Generate through the configured Gemini integration

- GIVEN an analyzed project has no stored backlog
- AND the existing Gemini configuration is valid
- WHEN backlog generation reaches the provider step
- THEN the system requests structured JSON through the existing Gemini integration contract
- AND validates the returned text against the strict backlog contract before persistence

#### Scenario: Preserve lazy configuration behavior

- GIVEN a request can be satisfied from a stored backlog
- WHEN the request is processed
- THEN no Gemini configuration is required
- AND no provider client is created or called

### Requirement: Provider Output Failure Normalization

Provider exceptions, absent text, blank text, malformed JSON, and JSON that fails the strict backlog schema MUST all produce the existing sanitized HTTP 502 AI failure contract. A rejected provider result MUST NOT persist stories or change the project state.

#### Scenario: Normalize unusable provider output

- GIVEN an analyzed project has no stored backlog
- AND Gemini throws an exception or returns absent, blank, malformed, or schema-invalid output
- WHEN the backlog request is processed
- THEN the API responds with HTTP 502
- AND the response error is `AI_ANALYSIS_FAILED` with message `AI analysis failed`
- AND no story is persisted
- AND the project remains `analizado`

#### Scenario: Do not expose provider diagnostics

- GIVEN a provider failure contains credentials, diagnostics, stack information, or filesystem paths
- WHEN the sanitized HTTP 502 response is returned
- THEN the response contains none of those provider or implementation details
