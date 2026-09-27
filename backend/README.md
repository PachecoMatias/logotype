# Logotype Planning Backend

This backend stores configurator submissions and exposes the first project API. It requires Node.js 22 and MySQL 8.0.16 or newer.

> **Private network only:** this API has no authentication. Keep it on a controlled local or private network; it is not safe for public exposure.

## Quick setup

From `backend/`:

```sh
npm ci
cp .env.example .env
npm run db:migrate
npm run db:seed
npm start
```

Set the application and dedicated test database values in the untracked `.env`. Tests require a separate `MYSQL_TEST_DATABASE` ending in `_test`, different from `MYSQL_DATABASE`, with `TEST_DB_RESET_ALLOWED=true`.

## Commands

| Command                    | Purpose                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| `npm start`                | Validate configuration, ping MySQL, then start the API.                   |
| `npm run dev`              | Start with Node watch mode.                                               |
| `npm run db:migrate`       | Apply pending application migrations.                                     |
| `npm run db:rollback`      | Roll back only the latest application migration.                          |
| `npm run db:seed`          | Transactionally upsert the six canonical team aggregates.                 |
| `npm run db:migrate:test`  | Apply migrations only to the guarded test database.                       |
| `npm run db:rollback:test` | Roll back the latest guarded test migration.                              |
| `npm run db:seed:test`     | Seed only the guarded test database.                                      |
| `npm test`                 | Run serial real-MySQL tests with listener-free Supertest requests.        |
| `npm run lint`             | Run the non-mutating ESLint check.                                        |
| `npm run format`           | Apply formatting; this is the only formatting command that changes files. |
| `npm run format:check`     | Run the non-mutating Prettier check.                                      |

The seed is safe to repeat: it converges the six managed role/profile pairs to quantities totaling 12 and leaves unrelated valid rows untouched. Roll back migrations one command at a time in reverse order; rollback is destructive for that table.

## Migration safety

The runner uses an advisory lock so two runners do not change the schema together. It records whether each migration is `applying`, `applied`, or `rolling_back`; after an interruption it checks the recorded state and target table before safely finishing, resetting, or retrying work instead of blindly repeating DDL.

## API

| Method | Path                 | Result                                                                        |
| ------ | -------------------- | ----------------------------------------------------------------------------- |
| `POST` | `/api/proyectos`     | Persist a validated configurator payload with server-owned `estado: "nuevo"`. |
| `GET`  | `/api/proyectos`     | Return the project collection.                                                |
| `GET`  | `/api/proyectos/:id` | Return one project or `PROJECT_NOT_FOUND`.                                    |
| `POST` | `/api/proyectos/:id/backlog` | Generate or return a stored analyzed-project backlog.                  |

Successful responses use:

```json
{ "success": true, "data": {} }
```

Failures use:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed" }
}
```

## Final check

Run `npm run db:migrate:test`, `npm run db:seed:test`, `npm test`, `npm run lint`, and `npm run format:check`. Keep implementation changes under `backend/` and the approved OpenSpec artifact; this cycle intentionally contains no AI, dashboard, authentication, story endpoint, named-member, card-permission, or Fibonacci-to-days behavior.
