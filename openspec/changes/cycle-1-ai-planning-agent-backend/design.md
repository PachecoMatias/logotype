# Design: Cycle 1 AI Planning Agent Backend

## Technical Approach

Create an independent Node.js 22 LTS / Express 5 backend under `backend/`, using ECMAScript modules and a small route → controller → service → repository flow. The HTTP boundary validates the existing configurator contract with Zod, the repository persists the complete accepted submission in one MySQL `JSON` column, and centralized middleware converts all failures to the approved API envelope.

The design intentionally establishes only the Cycle 1 foundation: three project endpoints, project persistence, the `historias` schema, and the aggregate `equipo` seed. It does not add AI calls, story behavior, a dashboard or Kanban frontend, authentication, named team members, card permissions, or Fibonacci-to-days conversion.

### Scope guardrails

- Existing frontend files are read-only compatibility inputs. All Cycle 1 implementation files are confined to `backend/`.
- Runtime writes are limited to `proyectos`; the explicit seed writes the six approved aggregate `equipo` rows.
- `historias` is schema-only in Cycle 1: no route, controller, service, repository, automatic insert, or date calculation is created for it.
- The API is unauthenticated and MUST remain behind a controlled local/private network boundary. Network restriction is an interim limitation, not a replacement for future authentication and authorization.

## Architecture Decisions

### Decision: Store the complete project submission as JSON

**Choice**: `proyectos` stores the complete accepted configurator submission in one non-null MySQL `JSON` column named `payload`. Only stable server-owned metadata (`id`, `estado`, `creado_en`, and `actualizado_en`) uses separate columns. The Zod 4 request schema uses `z.looseObject(...)`—the non-deprecated equivalent of object `.passthrough()`—for the root request and for each of the six nested objects. The API representation keeps the client and server namespaces explicit: `{ id, estado, payload, creadoEn, actualizadoEn }`.

**Alternatives considered**: One column per current form field; a hybrid with selected searchable fields duplicated beside JSON; separate tables for each configurator step.

**Rationale**: This is the authoritative user decision and fits an evolving configurator. New or changed frontend fields can be retained without a database migration, while server-owned identity, state, and timestamps remain constrained and queryable. Loose behavior at every object boundary prevents both root-level and nested additions from being stripped after validation. Root-level unknown fields—including an untrusted client `estado`—remain only inside `payload`; repository SQL always writes the separate `proyectos.estado` column from the service-owned literal `nuevo`. A known-field contract still changes when validation semantics change, but that application change does not require form-field schema migrations.

Normalization was rejected for Cycle 1 because it couples every form evolution to SQL migrations, spreads one submission across many columns/tables, and adds mapping work without an approved query requirement. The tradeoff is weaker SQL-level validation and indexing inside the submission: application validation is authoritative, ad hoc field queries are less convenient, and future search requirements may justify generated/indexed columns or a deliberate read model. No duplicate searchable columns are added before that requirement exists.

### Decision: Use a readable layered Express application without a framework

**Choice**: Use route, controller, service, and repository modules, plus focused configuration, schema, error, and middleware modules. `src/app.js` assembles and exports the Express application; `src/server.js` validates startup dependencies and owns `listen()` and graceful shutdown.

**Alternatives considered**: A single-file Express server; an ORM-centric architecture; a dependency-injection container; generic repository/provider frameworks.

**Rationale**: The selected layers make the request path visible to classmates without hiding behavior behind infrastructure. A single file would mix HTTP and persistence concerns, while an ORM, container, or generic framework would add concepts not justified by three endpoints. Express 5 is used so rejected async handlers flow to the final four-argument error middleware without repetitive wrappers.

### Decision: Use ESM on Node.js 22 LTS

**Choice**: `backend/package.json` declares `"type": "module"` and `engines.node` as `>=22 <23`. Development uses Node's built-in `--watch`; tests use the built-in `node:test` runner.

**Alternatives considered**: CommonJS; Babel/transpilation; nodemon; Jest or Vitest.

**Rationale**: ESM matches the existing frontend's module mode and current Node behavior. Node 22 supplies stable ESM, watch mode, and a non-interactive test runner, avoiding transpilation and two unnecessary development dependencies.

### Decision: Use `mysql2` directly with prepared statements

**Choice**: Use `mysql2/promise` with a shared connection pool, parameterized `execute()` calls, UTC connection handling, and explicit transaction helpers only where multiple writes must be atomic.

**Alternatives considered**: Sequelize, Prisma, Knex as a query builder, or handwritten single-use connections.

**Rationale**: Direct SQL keeps the approved MySQL schema and constraints reviewable, preserves native JSON behavior, and avoids an ORM model layer that would duplicate a very small persistence surface. Pooling is suitable for Express request concurrency, and prepared statements prevent values from being composed into SQL text.

### Decision: Use ordered SQL migrations with a small Node runner

**Choice**: Keep paired `.up.sql` and `.down.sql` files in lexical order, with exactly one atomic `CREATE TABLE` or `DROP TABLE` statement per file. `scripts/migrate.js` serializes cooperating runners with one database-scoped MySQL advisory lock and records each migration's pair checksum and state (`applying`, `applied`, or `rolling_back`) in `schema_migrations`. Every invocation reconciles an interrupted state against the migration's single target table before performing the requested up or down operation. It rejects checksum drift in every state and rolls back only the most recently applied migration.

**Alternatives considered**: Manual SQL copied from the README; ORM migrations; a larger migration framework.

**Rationale**: Versioned SQL exposes the exact MySQL 8 contract and is easy to teach. MySQL 8 atomic DDL guarantees each individual table create/drop is all-or-nothing, but DDL implicitly commits and therefore cannot be atomic with a later history-row mutation. Persisting intent before DDL and reconciling table existence after a crash closes that gap without introducing a generic migration framework. The connection-scoped advisory lock prevents two cooperating runners from racing while intent, DDL, and final history state are separate commits.

### Decision: Seed aggregate team data with idempotent upserts

**Choice**: A version-controlled JavaScript seed executes six parameterized `INSERT ... ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)` statements inside one transaction, using exactly the canonical Spanish role/profile strings declared in the DDL. The exact case- and accent-sensitive unique key `(rol, perfil)` identifies managed aggregates; only `cantidad` is updated when both canonical values match exactly.

**Alternatives considered**: Delete-all-and-reinsert; additive quantity updates; individual team-member rows.

**Rationale**: Repeated execution converges each approved canonical role/profile pair to its exact quantity, does not increase totals, and leaves unrelated valid rows untouched. Case or accent variants are not aliases for a managed seed identity and are rejected by the canonical CHECK constraints. A transaction prevents a partial six-row roster. Delete/reinsert could destroy unrelated data, additive updates are not idempotent, and individual names are explicitly out of scope.

### Decision: Validate at the HTTP boundary with Zod

**Choice**: Route middleware validates `req.body` and `req.params` before controllers run. The configurator schema validates every approved option and conditional field with `superRefine`; the root request schema and all six nested object schemas use Zod 4 `z.looseObject(...)` so unknown keys survive parsing. Validation details contain only field paths and safe messages.

**Alternatives considered**: Controller-local checks; database-only validation; strict schemas that discard unknown form fields.

**Rationale**: Boundary validation prevents invalid persistence calls and centralizes the approved contract. Root and nested loose-object behavior is necessary to honor complete-submission JSON storage and avoid silently losing future fields. The service and repository never destructure or spread unknown root keys into metadata. Consequently, client-supplied `estado` can round-trip only as untrusted `payload.estado`; the separately returned and persisted project `estado` always comes from the server-owned column.

### Decision: Use a dedicated real MySQL test database

**Choice**: Endpoint, migration, constraint, and seed tests use a separately configured MySQL 8 database. Supertest invokes the exported Express app directly without opening a network listener. Test execution is serial.

**Alternatives considered**: Repository mocks for all endpoint tests; SQLite/in-memory substitutes; transaction-per-test rollback.

**Rationale**: Only real MySQL verifies JSON storage, enforced CHECK constraints, foreign keys, ordered migrations, upserts, and seed idempotency. An in-memory substitute would test different SQL semantics. Transaction-per-test rollback is not reliable here because Supertest requests borrow independent pool connections; deterministic table cleanup is clearer. A narrow method stub is permitted only for the required unexpected-failure envelope test, not as a substitute for persistence coverage.

### Decision: Keep ESLint and Prettier responsibilities separate

**Choice**: ESLint 9 flat configuration checks JavaScript behavior and common errors; Prettier formats supported backend files. `eslint-config-prettier` is applied last to disable conflicting stylistic rules.

**Alternatives considered**: Running Prettier as an ESLint rule; a combined custom style tool; no formatter.

**Rationale**: Separate commands make mutating and non-mutating behavior obvious. Lint and format checks can fail independently without duplicate or conflicting style diagnostics.

## Data Model

The three domain tables use `ENGINE=InnoDB`, `utf8mb4`, and the reasonable free-text default `utf8mb4_0900_ai_ci`. Every string column whose values form a canonical constrained domain overrides that default with `utf8mb4_0900_as_cs`, so CHECK and UNIQUE comparisons are case- and accent-sensitive. The minimum supported database is MySQL 8.0.16 because CHECK constraints must be enforced, not merely parsed. Identifiers use `INT UNSIGNED`, which remains within JavaScript's safe integer range. API timestamps are serialized as RFC 3339 UTC strings.

### `proyectos`

```sql
CREATE TABLE proyectos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  payload JSON NOT NULL,
  estado VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs
    NOT NULL DEFAULT 'nuevo',
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_proyectos PRIMARY KEY (id),
  CONSTRAINT chk_proyectos_payload_objeto
    CHECK (JSON_TYPE(payload) = 'OBJECT'),
  CONSTRAINT chk_proyectos_estado
    CHECK (estado IN ('nuevo'))
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

| Concern | Final design |
|---|---|
| Payload | The complete accepted configurator submission is stored only in `payload`; no form-field columns are created. |
| Status | `estado` is server-owned, defaults to `nuevo`, and Cycle 1 permits only `nuevo`. A later approved workflow must migrate the CHECK before introducing another state. |
| Indexes | `pk_proyectos (id)` only. Collection retrieval uses `ORDER BY id ASC`; no unapproved search/filter index is invented. |
| Nullability/defaults | Exactly as shown; `id` is generated, `payload` is required, and metadata timestamps are database-generated. |

### `historias`

```sql
CREATE TABLE historias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  proyecto_id INT UNSIGNED NOT NULL,
  prioridad VARCHAR(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  historia_usuario TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  criterios_aceptacion JSON NOT NULL,
  alcance_tecnico TEXT NOT NULL,
  estimacion_fibonacci TINYINT UNSIGNED NOT NULL,
  rol_sugerido VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  fase VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  columna_tablero VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs
    NOT NULL DEFAULT 'Backlog',
  fecha_inicio_estimada DATE NULL,
  fecha_fin_estimada DATE NULL,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_historias PRIMARY KEY (id),
  CONSTRAINT fk_historias_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_historias_prioridad
    CHECK (prioridad IN ('Alta', 'Media', 'Baja')),
  CONSTRAINT chk_historias_historia_usuario
    CHECK (CHAR_LENGTH(TRIM(historia_usuario)) > 0),
  CONSTRAINT chk_historias_descripcion
    CHECK (CHAR_LENGTH(TRIM(descripcion)) > 0),
  CONSTRAINT chk_historias_criterios
    CHECK (
      JSON_TYPE(criterios_aceptacion) = 'ARRAY'
      AND JSON_LENGTH(criterios_aceptacion) > 0
    ),
  CONSTRAINT chk_historias_alcance_tecnico
    CHECK (CHAR_LENGTH(TRIM(alcance_tecnico)) > 0),
  CONSTRAINT chk_historias_estimacion
    CHECK (estimacion_fibonacci IN (1, 2, 3, 5, 8, 13, 21)),
  CONSTRAINT chk_historias_rol
    CHECK (
      rol_sugerido IN (
        'Desarrollador Frontend',
        'Desarrollador Backend',
        'Analista QA',
        'Analista de Ciberseguridad',
        'Analista de requerimientos',
        'Project Manager'
      )
    ),
  CONSTRAINT chk_historias_fase
    CHECK (
      fase IN (
        'Análisis',
        'Diseño',
        'Desarrollo Frontend',
        'Desarrollo Backend',
        'Testing',
        'Despliegue'
      )
    ),
  CONSTRAINT chk_historias_columna
    CHECK (
      columna_tablero IN (
        'Backlog',
        'To Do',
        'In Progress',
        'In Code Review',
        'In QA',
        'Done'
      )
    ),
  CONSTRAINT chk_historias_fechas
    CHECK (
      (fecha_inicio_estimada IS NULL AND fecha_fin_estimada IS NULL)
      OR (
        fecha_inicio_estimada IS NOT NULL
        AND fecha_fin_estimada IS NOT NULL
        AND fecha_fin_estimada >= fecha_inicio_estimada
      )
    ),
  INDEX ix_historias_proyecto_columna (proyecto_id, columna_tablero)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

| Concern | Final design |
|---|---|
| Project relation | Every story belongs to one `proyectos.id`. `RESTRICT` prevents accidental project deletion while stories exist; Cycle 1 exposes no delete endpoint. |
| Acceptance criteria | `criterios_aceptacion` is a non-empty JSON array. Future story validation must require each array element to be a non-empty string before insertion. |
| Estimated dates | Two nullable `DATE` columns represent an estimated inclusive interval. They are either both null or both present, and end cannot precede start. Cycle 1 leaves both null and defines no calculation. |
| Allowed values | Priorities, Fibonacci points, suggested roles, phases, and board columns exactly preserve the report-approved domains. Every constrained string comparison is case- and accent-sensitive through its explicit column collation. |
| Indexes | The primary key and `ix_historias_proyecto_columna`; the latter supports the foreign key and future project-board reads without speculative additional indexes. |

### `equipo`

```sql
CREATE TABLE equipo (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rol VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  perfil VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  cantidad TINYINT UNSIGNED NOT NULL,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_equipo PRIMARY KEY (id),
  CONSTRAINT uq_equipo_rol_perfil UNIQUE (rol, perfil),
  CONSTRAINT chk_equipo_rol
    CHECK (
      rol IN (
        'Desarrollador Frontend',
        'Desarrollador Backend',
        'Analista QA',
        'Analista de Ciberseguridad',
        'Analista de requerimientos',
        'Project Manager'
      )
    ),
  CONSTRAINT chk_equipo_perfil
    CHECK (perfil IN ('Alto rendimiento', 'Administrativo')),
  CONSTRAINT chk_equipo_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

| Concern | Final design |
|---|---|
| Aggregate model | One row represents a role/profile aggregate; there is no person name or assignment column. |
| Seed identity | `uq_equipo_rol_perfil` compares both columns with `utf8mb4_0900_as_cs`, making only an exact canonical role/profile pair the stable upsert key. It also allows unrelated, valid canonical role/profile combinations without letting the seed delete or update them. |
| Seed values | Frontend Developer/high performance 3; Backend Developer/high performance 3; QA Analyst/high performance 2; Cybersecurity Analyst/high performance 1; Requirements Analyst/administrative 2; Project Manager/administrative 1, persisted with the exact Spanish values shown in the DDL. Total: 12. |
| Indexes | Primary key plus the unique `(rol, perfil)` index; no duplicate secondary index is needed. |

## Data Flow

### Create a project

```text
POST /api/proyectos
  → express.json({ limit: '256kb' })
  → validate(projectBodySchema; root + six nested loose objects)
  → proyectosController.create
  → proyectosService.create(validatedPayload)
  → proyectosRepository.insert (prepared INSERT of payload + literal estado='nuevo')
  → proyectosRepository.findById(insertId)
  → HTTP 201 { success: true, data: project }
```

Validation failure stops before the controller and repository. The insert is one atomic statement, so no transaction is required and a failed insert leaves no partial project. The repository serializes the complete validated object once into `payload`; it never derives form-field columns or reads `payload.estado` as metadata. Its prepared statement supplies the separate `estado` column from the fixed server literal `nuevo`. A persistence error is logged server-side and reaches centralized error middleware as a safe `INTERNAL_ERROR` response.

### List projects

```text
GET /api/proyectos
  → proyectosController.list
  → proyectosService.list
  → proyectosRepository.findAll (ORDER BY id ASC)
  → map rows to API projects
  → HTTP 200 { success: true, data: [] | projects }
```

Cycle 1 deliberately has no filtering or pagination requirement. An empty table returns an empty array.

### Retrieve one project

```text
GET /api/proyectos/:id
  → validate(projectIdParamsSchema)
  → proyectosController.getById
  → proyectosService.getById
  → proyectosRepository.findById
       ├─ row → HTTP 200 success envelope
       └─ null → AppError(404, PROJECT_NOT_FOUND) → error middleware
```

The parameter schema accepts a positive unsigned integer no greater than `4294967295`. Invalid syntax returns `VALIDATION_ERROR` without querying MySQL.

## Interfaces / Contracts

### Accepted request body

The Zod contract implements the approved specification exactly:

```js
{
  empresa: {
    nombreEmpresa,
    contacto,
    email,
    telefono,
    rubro,
    rubroOtro?
  },
  proyecto: { tipoProyecto },
  problema: {
    problemaActual,
    procesoActual,
    objetivos,
    objetivosOtro?
  },
  funcionalidades: { seleccionadas, otra? },
  alcance: {
    plataformas,
    cantidadUsuarios,
    necesitaTiposUsuario,
    tiposUsuario?,
    tiposUsuarioOtro?
  },
  presupuesto: { presupuesto, plazo, infoAdicional? }
}
```

The implementation constructs every object boundary as loose, not merely the nested portions:

```js
const empresaSchema = z.looseObject({ /* approved empresa fields */ })
const proyectoSchema = z.looseObject({ /* approved proyecto fields */ })
const problemaSchema = z.looseObject({ /* approved problema fields */ })
const funcionalidadesSchema = z.looseObject({ /* approved funcionalidades fields */ })
const alcanceSchema = z.looseObject({ /* approved alcance fields */ })
const presupuestoSchema = z.looseObject({ /* approved presupuesto fields */ })

const projectBodySchema = z.looseObject({
  empresa: empresaSchema,
  proyecto: proyectoSchema,
  problema: problemaSchema,
  funcionalidades: funcionalidadesSchema,
  alcance: alcanceSchema,
  presupuesto: presupuestoSchema,
})
```

Known option values are copied unchanged from the approved `project-management-api` specification. `superRefine` enforces `rubroOtro`, `objetivosOtro`, `otra`, `tiposUsuario`, and `tiposUsuarioOtro` only under their specified conditions. Required-string checks evaluate trimmed content without transforming the submitted value, so the complete accepted payload round-trips unchanged; optional `infoAdicional` may be absent or empty. Unknown root and nested configurator fields are preserved, not used as server metadata, and do not bypass validation of known fields. In particular, `{ estado: 'client-value', ... }` validates as payload data and is stored only at `payload.estado`; it cannot replace the server-owned `proyectos.estado = 'nuevo'`.

### Project representation

```json
{
  "id": 1,
  "estado": "nuevo",
  "payload": {
    "empresa": {},
    "proyecto": {},
    "problema": {},
    "funcionalidades": {},
    "alcance": {},
    "presupuesto": {}
  },
  "creadoEn": "2026-09-24T12:00:00.000Z",
  "actualizadoEn": "2026-09-24T12:00:00.000Z"
}
```

The repository maps snake_case database names to the camelCase API metadata. `payload` retains root and nested configurator keys exactly as returned by Zod parsing. The top-level project `estado` always comes from the server-owned column, even when a distinct untrusted `payload.estado` is present.

### Response envelopes

```json
{ "success": true, "data": {} }
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "empresa.email", "message": "Invalid email" }]
  }
}
```

| Condition | HTTP | Code | Detail policy |
|---|---:|---|---|
| Invalid body, parameter, malformed JSON, or oversized body | 400 | `VALIDATION_ERROR` | Safe field/path details when available; never echo secrets or full payloads. |
| Valid unknown project ID | 404 | `PROJECT_NOT_FOUND` | Details omitted. |
| Unknown API route | 404 | `ROUTE_NOT_FOUND` | Details omitted. |
| Unexpected database or application failure | 500 | `INTERNAL_ERROR` | Details omitted; SQL, credentials, stack traces, and filesystem paths never enter the response. |

Controllers send only success responses. Known failures use an `AppError` carrying `status`, `code`, `message`, and optional safe `details`; the final four-argument middleware is the sole error-envelope writer.

## Runtime and Environment Contract

### Packages

| Kind | Packages | Purpose |
|---|---|---|
| Runtime | `express@5`, `mysql2@3`, `zod@4`, `dotenv` | HTTP API, promise-based MySQL access, boundary validation, and local environment loading. |
| Development/test | `supertest`, `eslint@9`, `@eslint/js`, `globals`, `eslint-config-prettier`, `prettier`, `cross-env` | Listener-free endpoint tests, flat lint configuration, formatter compatibility, formatting, and cross-platform test environment selection. |

`node:test`, `node:assert/strict`, `node:crypto`, and `node:fs/promises` are built into Node and need no package.

### Environment variables

| Variable | Required/default | Use |
|---|---|---|
| `NODE_ENV` | Default `development`; allowed `development`, `test`, `production` | Selects runtime behavior and database namespace. |
| `HOST` | Default `127.0.0.1` | Listener interface; the safe default avoids accidental public exposure. |
| `PORT` | Default `3000` | HTTP listener port. |
| `MYSQL_HOST` | Required outside tests | Application database host. |
| `MYSQL_PORT` | Default `3306` | Application database port. |
| `MYSQL_USER` | Required outside tests | Application database user. |
| `MYSQL_PASSWORD` | Required outside tests; may be empty only when explicitly configured | Application database password. |
| `MYSQL_DATABASE` | Required outside tests | Application database name. |
| `MYSQL_CONNECTION_LIMIT` | Default `10`, positive integer | Pool limit. |
| `MYSQL_TEST_HOST` | Required for tests | Dedicated test database host. |
| `MYSQL_TEST_PORT` | Default `3306` | Dedicated test database port. |
| `MYSQL_TEST_USER` | Required for tests | Dedicated test database user. |
| `MYSQL_TEST_PASSWORD` | Required for tests | Dedicated test database password. |
| `MYSQL_TEST_DATABASE` | Required for tests; must end in `_test` | Dedicated test database name. |
| `TEST_DB_RESET_ALLOWED` | Must equal `true` for tests | Explicit destructive-cleanup guard. |

When `NODE_ENV=test`, application database variables are never used as fallbacks for missing test variables. Startup validates the entire selected environment with Zod before creating a pool. Test setup aborts unless `MYSQL_TEST_DATABASE` ends with `_test`, differs from `MYSQL_DATABASE`, and `TEST_DB_RESET_ALLOWED=true`.

## npm Command Contract

The README documents commands from `backend/` exactly as follows:

| Command | `package.json` script/behavior |
|---|---|
| `npm ci` | Install the lockfile exactly; preferred clean-checkout installation. |
| `npm start` | `node src/server.js`; validate config, ping MySQL, then bind the listener. |
| `npm run dev` | `node --watch src/server.js`; restart on backend source changes. |
| `npm run db:migrate` | `node scripts/migrate.js up`; apply pending application-database migrations in lexical order. |
| `npm run db:rollback` | `node scripts/migrate.js down`; reverse exactly the latest applied application-database migration. |
| `npm run db:migrate:test` | `cross-env NODE_ENV=test node scripts/migrate.js up`; apply migrations only after test guards pass. |
| `npm run db:rollback:test` | `cross-env NODE_ENV=test node scripts/migrate.js down`; reverse the latest test migration only after guards pass. |
| `npm run db:seed` | `node scripts/seed.js`; transactionally upsert the six application-database roster rows. |
| `npm run db:seed:test` | `cross-env NODE_ENV=test node scripts/seed.js`; seed only the guarded test database. |
| `npm test` | `cross-env NODE_ENV=test node --test --test-concurrency=1`; run all discovered tests once, serially, without watch mode. |
| `npm run lint` | `eslint . --max-warnings=0`; non-mutating and non-zero on errors or warnings. |
| `npm run format` | `prettier --write .`; explicitly mutate supported files to configured formatting. |
| `npm run format:check` | `prettier --check .`; non-mutating and non-zero on unformatted files. |

All scripts execute fixed local package binaries or checked-in Node entry points. They do not accept or interpolate request data, filenames, SQL, repository selectors, or shell fragments. Failures propagate a non-zero exit code.

## Folder and File Structure

```text
backend/
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── README.md
├── eslint.config.js
├── package.json
├── package-lock.json
├── migrations/
│   ├── 001_create_proyectos.up.sql
│   ├── 001_create_proyectos.down.sql
│   ├── 002_create_historias.up.sql
│   ├── 002_create_historias.down.sql
│   ├── 003_create_equipo.up.sql
│   └── 003_create_equipo.down.sql
├── scripts/
│   ├── migrate.js
│   └── seed.js
├── seeds/
│   └── equipo.seed.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── database.js
│   │   └── env.js
│   ├── controllers/
│   │   └── proyectos.controller.js
│   ├── errors/
│   │   └── app-error.js
│   ├── middleware/
│   │   ├── error-handler.js
│   │   ├── not-found.js
│   │   └── validate.js
│   ├── repositories/
│   │   └── proyectos.repository.js
│   ├── routes/
│   │   └── proyectos.routes.js
│   ├── schemas/
│   │   └── proyectos.schemas.js
│   └── services/
│       └── proyectos.service.js
└── tests/
    ├── fixtures/
    │   └── proyecto-payload.js
    ├── helpers/
    │   └── test-database.js
    └── integration/
        ├── migrations.test.js
        ├── equipo-seed.test.js
        └── proyectos.api.test.js
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/package.json` | Create | ESM package, Node engine, exact scripts, runtime and development dependencies. |
| `backend/package-lock.json` | Create | Reproducible npm dependency resolution. |
| `backend/.env.example` | Create | Non-secret application and dedicated test database variables. |
| `backend/.gitignore` | Create | Ignore `.env`, logs, coverage, and `node_modules`; keep `.env.example`. |
| `backend/eslint.config.js` | Create | ESLint 9 flat config for Node source, scripts, seeds, and tests. |
| `backend/.prettierrc.json` | Create | Small project formatting policy. |
| `backend/.prettierignore` | Create | Exclude dependencies, coverage, logs, and generated artifacts. |
| `backend/README.md` | Create | Prerequisites, controlled-environment warning, environment setup, exact commands, endpoints, and envelopes. |
| `backend/migrations/001_create_proyectos.{up,down}.sql` | Create | Create/drop `proyectos`. |
| `backend/migrations/002_create_historias.{up,down}.sql` | Create | Create/drop `historias` after/before its parent as appropriate. |
| `backend/migrations/003_create_equipo.{up,down}.sql` | Create | Create/drop `equipo`. |
| `backend/scripts/migrate.js` | Create | Ordered migration/rollback runner, advisory locking, three-state `schema_migrations` bookkeeping, checksum refusal, and interrupted-state reconciliation. |
| `backend/scripts/seed.js` | Create | Environment-safe seed entry point and exit-code handling. |
| `backend/seeds/equipo.seed.js` | Create | Exact six-row roster and transactional idempotent upsert. |
| `backend/src/app.js` | Create | Express construction, JSON parser, routes, 404, and final error middleware; no listener. |
| `backend/src/server.js` | Create | Startup validation, database ping, listener, signal handling, and pool shutdown. |
| `backend/src/config/env.js` | Create | Zod environment parsing and strict test namespace selection. |
| `backend/src/config/database.js` | Create | `mysql2/promise` pool creation, UTC configuration, ping, transaction helper, and close. |
| `backend/src/controllers/proyectos.controller.js` | Create | Translate validated HTTP input to service calls and success envelopes. |
| `backend/src/errors/app-error.js` | Create | Known error type used by validation, not-found, and middleware. |
| `backend/src/middleware/*.js` | Create | Request validation, unknown-route normalization, and centralized safe errors. |
| `backend/src/repositories/proyectos.repository.js` | Create | Prepared insert/select queries and database-to-API mapping. |
| `backend/src/routes/proyectos.routes.js` | Create | Only the three approved project routes. |
| `backend/src/schemas/proyectos.schemas.js` | Create | Body/parameter schemas, approved enums, and conditional validation. |
| `backend/src/services/proyectos.service.js` | Create | Force initial state, orchestrate reads, and raise project-not-found. |
| `backend/tests/fixtures/proyecto-payload.js` | Create | Valid current configurator fixture and safe variants. |
| `backend/tests/helpers/test-database.js` | Create | Guards, migrations, ordered cleanup, and pool teardown. |
| `backend/tests/integration/*.test.js` | Create | Real-MySQL migration, schema, seed, and endpoint coverage. |
| Existing frontend application files | No change | Read-only compatibility source; `backend/` is the sole implementation boundary for this cycle. |

## Migration and Rollback

### Deliberately bounded migration inventory

The runner owns only these three definitions; it does not provide a generic plugin or arbitrary-SQL interface:

| Migration | Target table | Up statement | Down statement |
|---|---|---|---|
| `001_create_proyectos` | `proyectos` | One `CREATE TABLE proyectos` | One `DROP TABLE proyectos` |
| `002_create_historias` | `historias` | One `CREATE TABLE historias` | One `DROP TABLE historias` |
| `003_create_equipo` | `equipo` | One `CREATE TABLE equipo` | One `DROP TABLE equipo` |

The forward order is `proyectos` → `historias` → `equipo`; reverse order is `equipo` → `historias` → `proyectos`, so the story foreign key is dropped before its parent. The SQL files intentionally omit `IF EXISTS`/`IF NOT EXISTS`: the runner's state reconciliation owns existence decisions, and an untracked table must be reported rather than silently accepted.

### Migration history contract

The runner creates this technical table while holding the migration lock and verifies that an existing table exposes the same required columns, primary key, and state/timestamp checks before continuing:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_name VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  checksum BINARY(32) NOT NULL,
  state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  applied_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_schema_migrations PRIMARY KEY (migration_name),
  CONSTRAINT chk_schema_migrations_state
    CHECK (state IN ('applying', 'applied', 'rolling_back')),
  CONSTRAINT chk_schema_migrations_applied_at
    CHECK (
      (state = 'applying' AND applied_at IS NULL)
      OR (state IN ('applied', 'rolling_back') AND applied_at IS NOT NULL)
    )
) ENGINE=InnoDB
  DEFAULT CHARACTER SET ascii
  COLLATE ascii_bin;
```

`migration_name` is the basename shown in the inventory. `checksum` is the raw 32-byte SHA-256 digest of the ordered, unambiguously length-prefixed UTF-8 bytes of both the up and down files (`uint64be(upLength) || upBytes || uint64be(downLength) || downBytes`). Any checksum difference for a row in **any** state is drift: the command exits non-zero before reconciliation or DDL. Applied migration files are immutable; a later schema change requires a new approved migration.

### Locking and startup protocol

1. Validate the selected application/test database and all test safety guards before connecting for destructive work.
2. Borrow one dedicated `mysql2` connection for the full command. Compute a lock name no longer than 64 characters as `logotype:` plus the first 48 hexadecimal characters of `SHA2(DATABASE(), 256)`, then call `GET_LOCK(lockName, 10)`.
3. If `GET_LOCK` returns `0`, `NULL`, or an unexpected value, exit non-zero without creating or mutating migration history. Advisory locks are connection-scoped and survive DDL implicit commits; the same connection performs history transitions and DDL.
4. Create or verify `schema_migrations`, load the fixed three-definition inventory, calculate pair checksums, and reject unknown history names or checksum drift.
5. Query each target using `INFORMATION_SCHEMA.TABLES` with `TABLE_SCHEMA = DATABASE()`, exact `TABLE_NAME`, and `TABLE_TYPE = 'BASE TABLE'`; views do not count as the expected table.
6. Reconcile every nonterminal row using the matrix below, commit that history mutation, then execute the requested command. Contradictory terminal state—`applied` with no target table—or an untracked target table with no history row is an integrity error and exits non-zero without guessing ownership.
7. In `finally`, call `RELEASE_LOCK(lockName)` and release the dedicated connection. Closing a failed connection also releases its advisory lock. No later migration or seed runs after a migration command reports failure.

The lock coordinates this checked-in runner; it cannot prevent a privileged external session from manually changing the same tables. Such manual changes are unsupported and are surfaced by the terminal-state and schema integration checks rather than silently repaired.

### Interrupted-state reconciliation

| Recorded state | Target table | Deterministic recovery | Behavior after recovery |
|---|---|---|---|
| `applying` | Exists | Update to `applied` and set `applied_at = CURRENT_TIMESTAMP(6)`. The atomic create completed; only final bookkeeping was interrupted. | `up` treats it as applied. `down` may select it normally. |
| `applying` | Absent | Delete the intent row. The atomic create did not complete. | `up` retries it through the normal apply protocol; `down` continues from the latest genuinely applied migration. |
| `rolling_back` | Absent | Delete the history row. The atomic drop completed; only history removal was interrupted. | Both commands treat it as removed. |
| `rolling_back` | Exists | Restore `state = 'applied'` while preserving `applied_at`. The atomic drop did not complete. | `down` retries the same latest migration through the normal rollback protocol; `up` treats it as applied. |

Reconciliation never executes DDL itself and never changes a checksum. A reconciliation DML failure exits non-zero and leaves the persisted evidence for the next locked invocation.

### Apply protocol

For each pending migration in forward order:

1. Require both the migration and all predecessors to have consistent table/history state.
2. Insert `(migration_name, checksum, 'applying', NULL)` and commit that intent **before** DDL.
3. Execute the one atomic `CREATE TABLE` statement. MySQL's implicit commit is expected; no transaction claims to include both DDL and history.
4. Update the row to `state = 'applied', applied_at = CURRENT_TIMESTAMP(6)` and commit.

If the process crashes or loses the connection after steps 2 or 3, the next invocation resolves the evidence with the matrix. If DDL or final bookkeeping returns an error, the runner exits non-zero immediately and leaves the state for that same deterministic reconciliation; it does not continue or report the migration as successfully applied.

### Rollback protocol

`npm run db:rollback` reverses exactly the latest consistently applied migration:

1. Update its row to `state = 'rolling_back'` and commit before DDL; `applied_at` remains populated.
2. Execute the one atomic `DROP TABLE` statement.
3. Delete the history row and commit.

If the process crashes or loses the connection between those steps, the next invocation reconciles table existence as specified above. A full local rollback therefore runs the command three times. Down migrations are intentionally destructive and must not run against shared data without backup/approval. The seed has no independent delete command because it cannot prove whether an existing matching aggregate predated the seed; normal full rollback removes it with the `equipo` table. Unrelated roster rows are never deleted by seeding.

## Testing Strategy

### Database isolation and lifecycle

1. A developer creates a dedicated empty database such as `logotype_test` and credentials limited to that database.
2. `npm test` sets `NODE_ENV=test`; environment loading uses only `MYSQL_TEST_*` variables.
3. Before destructive setup, guards require the `_test` suffix, inequality with `MYSQL_DATABASE`, and `TEST_DB_RESET_ALLOWED=true`. Any failed guard aborts before SQL runs.
4. Test helpers apply pending migrations programmatically through the same migration runner and lock protocol. Migration recovery tests may deliberately create one documented history/table combination at a time, but only after all destructive guards pass.
5. Endpoint tests run serially. Before each endpoint test, helpers delete child rows from `historias`, then parent rows from `proyectos`; they do not disable foreign keys globally. Seed tests clean only rows they create and verify unrelated valid aggregates survive reseeding.
6. After each suite, acquired connections are released; after the run, the pool is closed. Failed tests still execute cleanup through test hooks.

The test database must never share a schema name or credentials with development/production. Tests do not create or drop the database itself, so a database user cannot accidentally target another server-wide schema. Cleanup is deterministic rather than transaction-per-test because HTTP requests may use different pooled connections.

### Coverage plan

| Layer | What to test | Approach |
|---|---|---|
| Validation/unit boundary | Approved values, every conditional field, invalid email, invalid route ID, and passthrough at every object boundary | Call Zod schemas directly with `node:test`. One fixture contains an unknown root field and a distinct unknown field inside each of `empresa`, `proyecto`, `problema`, `funcionalidades`, `alcance`, and `presupuesto`; assert all seven additions survive parsing while known-field validation still applies. |
| Migration integration | Up/down order; exact `schema_migrations` columns and checks; advisory-lock exclusion; all domain columns/types/defaults; JSON object constraint; story FK; exact string collations; interrupted-state recovery; checksum drift refusal in every state | Run the real runner against the guarded MySQL test database and inspect `INFORMATION_SCHEMA`. Establish each `applying`/`rolling_back` × table-present/table-absent case, invoke `up` and `down` as appropriate, and assert the reconciliation matrix and final history/table state. Hold the advisory lock from a second connection to prove timeout exits non-zero without mutation. Leave all domain migrations applied at test end. |
| Canonical string constraints | Exact case- and accent-sensitive behavior for `proyectos.estado`, all four constrained `historias` strings, and both constrained `equipo` strings | Assert every listed column reports `utf8mb4_0900_as_cs`; insert canonical values successfully, then assert representative case and accent variants fail their named CHECK constraints. With a canonical seed row already present, attempt case/accent variants and assert CHECK failure rather than duplicate-key collision, proving the exact unique identity while leaving the canonical row unchanged. |
| Seed integration | Exact six Spanish pairs, total 12, repeat run unchanged, correction of a managed quantity, exact-pair identity, unrelated valid pair preserved, transaction rollback on induced failure | Execute the real seed function against MySQL. Preinsert an allowed non-seed combination such as `Project Manager`/`Alto rendimiento`, run the seed, and assert its quantity is untouched. Assert the upsert modifies only `cantidad` for an exact canonical pair. |
| API integration | Successful creation and exact JSON round trip; unknown root and nested field preservation; status override isolation; missing required data with no insert; collection empty/non-empty; existing detail; invalid ID; unknown ID | Use `supertest(app)` against the exported app and real test pool. The creation fixture carries extras at the root and in all six nested objects plus root `estado: 'client-value'`; assert every extra round-trips in `payload`, `payload.estado` remains untrusted client data, and both the response metadata and `proyectos.estado` are exactly `nuevo`. Supertest calls the Express request handler directly and does not bind a port. |
| Error integration | Safe `INTERNAL_ERROR` envelope without SQL, credentials, paths, or stack | Temporarily stub one repository method with `node:test` mocking so it throws a controlled error; restore it in `finally`. All normal persistence tests remain real-MySQL tests. |
| Quality verification | Non-mutating tests, lint, and format check; mutating format command remains explicit | Run `npm test`, `npm run lint`, and `npm run format:check`; each must return non-zero on failure. |

## Process and Error Behavior

- `src/server.js` does not call `listen()` until environment validation and a database ping succeed. Startup failure logs a concise cause and exits non-zero.
- `SIGINT` and `SIGTERM` stop accepting new requests, close the HTTP server, then `await pool.end()`. A bounded shutdown timeout exits non-zero if resources cannot close.
- A migration command holds the database-scoped advisory lock on one dedicated connection, persists intent before DDL, and finalizes history after DDL. Any lock, DDL, reconciliation, checksum, or bookkeeping failure logs the migration/state without credentials and exits non-zero; the next locked invocation reconciles table existence before new work.
- MySQL atomic DDL covers only the individual create/drop statement. The runner never claims that DDL and `schema_migrations` DML share a transaction, never silently reruns an uncertain statement, and never reports a nonterminal state as success.
- The team seed holds one connection for its transaction and always releases it in `finally`.
- Express 5 forwards rejected async route/controller promises to the final error middleware.
- Application logs may include an internal stack in development/test, but HTTP responses never do. Production logs must not print configuration objects or payloads.

## Threat Matrix

The design adds three fixed Express routes and fixed npm process entry points for migration, seed, tests, linting, and formatting, so the applicability matrix was reviewed. None of the reference matrix's five executable-path, VCS, or PR-automation boundaries is introduced; no irrelevant RED tests are created for those N/A rows.

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, `CMakeLists.txt`, executable Markdown/MDX, `README.sh` | N/A: scripts execute fixed Node/package entry points and never classify arbitrary files as executable commands. | Lint/format use fixed checked-in globs; documentation is data, not an execution source. | N/A; command exit behavior is covered by quality verification, not executable-file classification. |
| Git repository selection | `git -C`, relative paths, absolute paths | N/A: no script invokes Git or chooses a repository. | Commands operate from `backend/` and use module-relative checked-in paths. | N/A. |
| Commit state | staged, `commit -a`, empty index | N/A: no commit automation exists. | No VCS mutation. | N/A. |
| Push state | tracking branch, first push, explicit refspec | N/A: no push automation exists. | No remote operation. | N/A. |
| PR commands | explicit `--head`, environment prefix, composed commands | N/A: no PR or composed shell command exists. | npm scripts contain fixed commands and accept no shell fragments. | N/A. |

Process safety that does apply is handled outside these N/A VCS rows: database targets come only from validated environment variables, test-destructive operations require three independent guards, SQL values use parameters, the runner accepts only the fixed three-migration inventory, a database-scoped advisory lock serializes cooperating runners, interrupted DDL/history gaps are reconciled from persisted state plus atomic table existence, and every failed command exits non-zero.

## Migration / Rollout

This is a new backend, so no existing application data transformation is required.

1. Provision a MySQL 8.0.16+ database and least-privilege application user.
2. Copy `.env.example` to untracked `.env` and provide application/test values.
3. Run `npm ci`, `npm run db:migrate`, then `npm run db:seed`. A prior interrupted migration is reconciled under the advisory lock before pending migrations continue; any inconsistent terminal state requires operator investigation and a non-zero exit rather than automatic repair.
4. Run `npm test`, `npm run lint`, and `npm run format:check` before startup.
5. Start on the default loopback host and keep the service inaccessible from public networks until a later authentication/authorization change is approved.

Rollback follows the reverse migration order above. No frontend rollout or migration is involved.

## Open Questions

None. Remaining product questions from the report—card movement permissions and Fibonacci-to-days conversion—are explicitly deferred and do not block this design.
