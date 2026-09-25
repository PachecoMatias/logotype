# Project Management API Specification

## Purpose

Define the Cycle 1 HTTP contract for accepting the existing project configurator submission and retrieving persisted projects. This capability covers project creation and read-only retrieval only.

## Requirements

### Requirement: Configurator Project Payload

`POST /api/proyectos` MUST accept the smallest payload already evidenced by the existing configurator. The request body MUST use the following nested contract, and the API MUST NOT require any client-provided field beyond this contract:

| Object | Required fields | Conditional or optional fields |
|--------|-----------------|--------------------------------|
| `empresa` | Non-empty `nombreEmpresa`, `contacto`, `email`, `telefono`, and `rubro` strings; `email` MUST be valid | Non-empty `rubroOtro` when `rubro` is `Otro` |
| `proyecto` | `tipoProyecto` | None |
| `problema` | Non-empty `problemaActual` and `procesoActual` strings; non-empty `objetivos` array | Non-empty `objetivosOtro` when `objetivos` contains `Otro` |
| `funcionalidades` | Non-empty `seleccionadas` array | Non-empty `otra` when `seleccionadas` contains `Otra` |
| `alcance` | Non-empty `plataformas` array, `cantidadUsuarios`, and `necesitaTiposUsuario` | Non-empty `tiposUsuario` when `necesitaTiposUsuario` is `Sí`; non-empty `tiposUsuarioOtro` when `tiposUsuario` contains `Otro` |
| `presupuesto` | `presupuesto` and `plazo` | `infoAdicional` MAY be omitted or empty |

The API MUST accept the configurator's current option values:

- `tipoProyecto`: `web`, `movil`, `gestion`, `ecommerce`, `api`, or `personalizada`.
- `rubro`: `Comercio`, `Industria`, `Servicios`, `Salud`, `Educación`, `Finanzas`, `Tecnología`, or `Otro`.
- `objetivos`: `Reducir tiempos`, `Automatizar tareas`, `Centralizar información`, `Mejorar la atención al cliente`, `Obtener estadísticas`, `Reducir errores`, `Mejorar la seguridad`, `Aumentar las ventas`, or `Otro`.
- `seleccionadas`: `Gestión de usuarios`, `Login y autenticación`, `Roles y permisos`, `Gestión de clientes`, `Gestión de productos`, `Gestión de proveedores`, `Gestión de ventas`, `Gestión de compras`, `Facturación`, `Gestión de stock`, `Gestión de turnos`, `Gestión de pedidos`, `Reportes y estadísticas`, `Dashboard`, `Notificaciones`, `Integración con otras plataformas`, `API`, `Base de datos`, `Carga de archivos`, `Sistema de tickets`, or `Otra`.
- `plataformas`: `Web`, `Android`, `iOS`, or `Windows / Desktop`.
- `cantidadUsuarios`: `1 - 10`, `10 - 50`, `50 - 100`, `100 - 500`, or `Más de 500`.
- `necesitaTiposUsuario`: `Sí`, `No`, or `No estoy seguro`.
- `tiposUsuario`: `Administrador`, `Empleado`, `Cliente`, `Supervisor`, or `Otro`.
- `presupuesto`: `Menos de USD 1.000`, `USD 1.000 - 5.000`, `USD 5.000 - 10.000`, `Más de USD 10.000`, or `Todavía no lo definimos`.
- `plazo`: `Lo antes posible`, `1 - 3 meses`, `3 - 6 meses`, `Más de 6 meses`, or `No tenemos una fecha definida`.

#### Scenario: Accept the existing configurator payload

- GIVEN a request body containing every required object and field with values produced by the existing configurator
- AND every conditional field required by a selected `Otro`, `Otra`, or `Sí` value is non-empty
- WHEN the client sends `POST /api/proyectos`
- THEN the API accepts the payload for project creation
- AND it does not require any field that the existing configurator does not collect

#### Scenario: Accept an omitted optional note

- GIVEN an otherwise valid configurator payload without `presupuesto.infoAdicional`
- WHEN the client sends `POST /api/proyectos`
- THEN the API accepts the payload for project creation

#### Scenario: Reject a missing required field

- GIVEN a configurator payload with an empty `empresa.nombreEmpresa`
- WHEN the client sends `POST /api/proyectos`
- THEN the API rejects the request with HTTP 400
- AND no project is persisted

#### Scenario: Reject a missing conditional field

- GIVEN a payload whose `funcionalidades.seleccionadas` contains `Otra`
- AND `funcionalidades.otra` is empty or absent
- WHEN the client sends `POST /api/proyectos`
- THEN the API rejects the request with HTTP 400
- AND no project is persisted

#### Scenario: Reject an invalid configurator option

- GIVEN an otherwise valid payload whose `proyecto.tipoProyecto` is not one of the supported configurator values
- WHEN the client sends `POST /api/proyectos`
- THEN the API rejects the request with HTTP 400
- AND no project is persisted

### Requirement: Project Creation

For every valid request, `POST /api/proyectos` MUST create exactly one project, MUST assign a stable server-generated identifier, MUST force the initial status to `nuevo`, and MUST return the created project through the uniform success envelope. A client-supplied status MUST NOT cause a project to be persisted with any initial status other than `nuevo`.

#### Scenario: Create a project successfully

- GIVEN a valid configurator payload
- WHEN the client sends `POST /api/proyectos`
- THEN the API responds with HTTP 201
- AND the response success envelope contains the created project
- AND the project contains its generated identifier and status `nuevo`
- AND the accepted configurator data is persisted for later retrieval

#### Scenario: Prevent initial status override

- GIVEN a valid configurator payload accompanied by a client attempt to select a different initial status
- WHEN the request is processed
- THEN no project is persisted with the client-selected status
- AND any project created from the request has status `nuevo`

#### Scenario: Do not persist after creation failure

- GIVEN a valid configurator payload
- AND persistence cannot complete the project creation
- WHEN the client sends `POST /api/proyectos`
- THEN the API returns the uniform server-error response
- AND the failed request does not leave a partially created project

### Requirement: Project Collection Retrieval

`GET /api/proyectos` MUST return all persisted projects as a collection through the uniform success envelope. The endpoint MUST return an empty collection, rather than a not-found error, when no projects exist.

#### Scenario: Retrieve persisted projects

- GIVEN two projects have been persisted
- WHEN the client sends `GET /api/proyectos`
- THEN the API responds with HTTP 200
- AND the success envelope contains both projects as a collection

#### Scenario: Retrieve an empty collection

- GIVEN no projects have been persisted
- WHEN the client sends `GET /api/proyectos`
- THEN the API responds with HTTP 200
- AND the success envelope contains an empty collection

### Requirement: Project Detail Retrieval

`GET /api/proyectos/:id` MUST return the project identified by `id` through the uniform success envelope. A syntactically accepted identifier that does not identify a persisted project MUST return the uniform project-not-found response.

#### Scenario: Retrieve an existing project

- GIVEN a project has been persisted with a known identifier
- WHEN the client sends `GET /api/proyectos/:id` using that identifier
- THEN the API responds with HTTP 200
- AND the success envelope contains that project

#### Scenario: Retrieve an unknown project identifier

- GIVEN no project exists for a syntactically accepted identifier
- WHEN the client sends `GET /api/proyectos/:id` using that identifier
- THEN the API responds with HTTP 404
- AND the response uses the uniform `PROJECT_NOT_FOUND` error contract

### Requirement: Read-Only Cycle 1 Project Surface

Cycle 1 MUST expose only project creation, project collection retrieval, and project detail retrieval. It MUST NOT expose project update or deletion behavior, and it MUST NOT expose `historias` endpoints or business logic.

#### Scenario: Verify the Cycle 1 project routes

- GIVEN the Cycle 1 backend route surface
- WHEN the public API routes are inspected
- THEN `POST /api/proyectos`, `GET /api/proyectos`, and `GET /api/proyectos/:id` are available
- AND no project update, project deletion, or `historias` route is provided

#### Scenario: Avoid interpreting configurator feature choices as backend scope

- GIVEN a valid project request whose selected features include `Login y autenticación` or `Dashboard`
- WHEN the project is created
- THEN those values are stored as client requirements only
- AND the backend does not enable authentication, login, or dashboard functionality as a side effect
