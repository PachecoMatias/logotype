# Apply Progress: Cycle 3 Gemini Backlog Generation

## Status

The Cycle 3 minimum functional block is closed with maintainer acceptance. Twelve of fourteen tasks are complete. Tasks 1.4 and 2.2 remain deferred as one accepted, non-blocking migration-005 rollback issue with exactly 10 cleanup-residue consequences; no independent failure was reported.

## Implemented Artifacts

| Area | Files | Outcome |
|------|-------|---------|
| Migration safety | `backend/migrations/005_enable_backlog_planning.{up,down}.sql`, `backend/scripts/migrate.js`, `backend/tests/integration/migrations.test.js` | Adds the exact status/role constraint evolution, recognized partial recovery, 004 descendant recognition, and rollback blockers. |
| Backlog flow | `backend/src/schemas/project-backlog.schema.js`, `backend/src/prompts/project-backlog.prompt.js`, `backend/src/repositories/historias.repository.js`, `backend/src/integrations/gemini.gateway.js`, `backend/src/services/proyectos.service.js`, `backend/src/controllers/proyectos.controller.js`, `backend/src/routes/proyectos.routes.js` | Extends Cycle 2 with strict structured output, persisted-input prompt isolation, atomic first-writer persistence, caching, and the backlog endpoint. |
| Focused coverage | `backend/tests/integration/proyectos.api.test.js`, `backend/tests/integration/migrations.test.js` | Adds the three controlled-provider API paths and narrow migration-005 coverage. |
| Documentation | `backend/README.md` | Adds one endpoint row only. |

## Accepted Known Issue: Migration 005 Rollback

The attempted bounded correction remains in place, but safe migration-005 rollback still fails in the full suite. The accepted known issue is limited to that rollback and exactly 10 resulting cleanup-residue consequences: duplicate column, duplicate check constraint, and stale applied-history expectations. These are one failure chain, not independent defects.

Migration 005 individual up and fixed partial-state recovery are green. Rollback-specific obligations remain deferred: the runner must eventually restore source/source deterministically, verify it, and remove only migration 005 history without rewriting incompatible business data.

The stale migration test now expects the actual migration-004 two-state constraint after its setup rolls migration 005 down: `estado IN ('nuevo', 'analizado')`. It no longer incorrectly expects the migration-001 singleton constraint.

## Maintainer Evidence

| Area | Result | Disposition |
|------|--------|-------------|
| Full test suite | All passing areas green; only migration-005 rollback and its 10 cleanup-residue consequences fail. | Accepted non-blocking known issue. |
| Backlog API | `proyectos.api.test.js` 12/12 passed. | Complete. |
| Seed | 3/3 passed. | Complete. |
| Migration 004, checksum drift, advisory lock, migration-005 up/recovery | Passed. | Complete except rollback obligations. |
| Lint | `npm run lint` exit 0. | Complete. |
| Format check | Exit 1 for the same 25 files from deferred Cycle 2 task 5.1. | Existing baseline; no Cycle 3 formatting regression. |

## Work Unit Evidence

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|-----------|---------------------------------------|---------------------------------------------------|-------------------|
| 1 — Migration safety | `npm test` — migration 004, checksum drift, advisory lock, migration-005 up/recovery, and all unrelated areas green; rollback plus exactly 10 cleanup-residue consequences remain. | N/A — guarded migration fixture; rollback is deferred/non-blocking. | Revert `backend/migrations/005_enable_backlog_planning.up.sql`, `backend/migrations/005_enable_backlog_planning.down.sql`, migration-005 branches in `backend/scripts/migrate.js`, and migration assertions. Do not modify migrations 001–004. |
| 2 — Backlog generation/API | `proyectos.api.test.js` — 12/12 passed. | Controlled-gateway analyzed-repeat, not-analyzed, and malformed-JSON scenarios passed; no live Gemini service. | Revert the backlog schema, prompt, gateway extension, historias repository, service/controller/route additions, focused API tests, and the one README row. Leave Cycle 2 analysis behavior and migration 005 intact. |

## Static Checks Performed

- `git diff --check` — exit 0; no whitespace errors. Git emitted LF-to-CRLF conversion warnings for existing tracked files.
- Changed-file scope review — no frontend files, live-provider harnesses, retries, authentication, new provider/configuration/error/state architecture, semantic scoring, story columns, or Fibonacci-to-days behavior were added.

## Delivery Readiness

The minimum functional block is closed. PR preparation may proceed under the authorized single `size:exception` PR. The following commands remain the verification handoff for the deferred rollback follow-up and any later PR validation:

```powershell
npm test -- tests/integration/migrations.test.js tests/integration/proyectos.api.test.js
npm test
npm run lint
npm run format:check
```

## Task State

- Complete: 1.1–1.3, 2.1, 2.3–2.4, 3.1–3.5, 4.1.
- Deferred/non-blocking known issue: 1.4 and 2.2, limited to migration-005 rollback and its 10 cleanup-residue consequences.
- Delivery: minimum functional block closed; authorized single PR `size:exception`; PR preparation may proceed. No commit, push, PR, merge, archive, or review actor was created.
