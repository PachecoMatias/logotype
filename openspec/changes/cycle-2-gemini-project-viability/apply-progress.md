# Apply Progress: Cycle 2 Gemini Project Viability

**Mode**: Standard; RED coverage is preserved and migration GREEN tasks 1.6–1.7 are verified by maintainer evidence.

**Delivery**: Single PR with maintainer-authorized `size:exception`; Unit 1 is ready for its migration work-unit commit.

## Completed RED Tasks

- [x] 1.1–1.5 Migration target, recovery, ambiguity, rollback, and child-process boundary coverage.
- [x] 2.1–2.3 Schema parity, untrusted-payload prompt, and lazy configuration/gateway coverage.
- [x] 3.1–3.6 Repository mapping, orchestration, route validation, failure isolation, cache/health, and concurrent-winner coverage.
- [x] 4.1 Normal-discovery and live-guard preparation coverage.
- [x] 1.6 Additive migration SQL.
- [x] 1.7 Migration runner recovery, classification, safe repair, and rollback preflight.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npm test -- tests/unit/project-analysis.test.js tests/unit/bootstrap.test.js` (from `backend/`): exit 1; 11 tests, 2 passed, 9 RED failures. Every failure is an assertion for missing Cycle 2 behavior: live command/configuration placeholders, strict schema, prompt builder, lazy Gemini configuration/gateway, or service factory. No syntax, uncaught import, fixture, or live-provider failure occurred. |
| Runtime harness command | `npm test -- tests/integration/migrations.test.js tests/integration/proyectos.api.test.js` (from `backend/`): exit 1; 49 tests, 22 passed, 27 RED failures. Guarded MySQL was available. Failures identify absent migration 004/recovery/refusal behavior, analysis repository mapping, Gemini gateway, and analysis route/envelopes; no real Gemini call occurred. |
| Live-provider command | N/A — deliberately not run. This RED-only batch must not invoke the live harness or a real Gemini provider. |
| Rollback boundary | Revert only `backend/tests/helpers/test-database.js`, `backend/tests/integration/migrations.test.js`, `backend/tests/integration/proyectos.api.test.js`, `backend/tests/unit/bootstrap.test.js`, `backend/tests/unit/project-analysis.test.js`, and `backend/tests/live/gemini-analysis.live.js`. No production behavior changes were made. |

## Remaining RED Work

- [ ] 4.2 Complete live-evidence RED assertions remains unchecked because its opt-in live command was intentionally not executed.

## Remaining GREEN Work

- [ ] 1.6–1.7, 2.4–2.5, 3.7–3.9, 4.3–4.5, and 5.1–5.5.

## Completed GREEN Work Unit: 1.6–1.7

- [x] 1.6 Additive migration SQL provides the required atomic up and down ALTER statements.
- [x] 1.7 Migration 004 registration, schema inventory/classification, fixed-clause recovery, ambiguity refusal, rollback data preflight, and post-DDL source/target verification are complete.

The maintainer supplied observed GREEN results after the MySQL 9.1 singleton-CHECK correction. No database reset was required.

## Migration GREEN Correction and Verification

The maintainer observed that the focused migration suite failed with 36 tests total, 5 passing, and 31 failing (exit 1); `npm run db:migrate:test` and `npm run db:rollback:test` also exited 1. Each failure reported `Migration 004 cannot recover: Project analysis schema is ambiguous or incompatible`.

Read-only metadata inspection of guarded `logotype_test` on MySQL 9.1.0 confirmed the valid Cycle 1 source state: `estado` is `varchar(32)`/NOT NULL/default `nuevo`; `analisis_ia` is absent; `chk_proyectos_estado` is canonicalized by MySQL as `(estado = 'nuevo')`; and `chk_proyectos_payload_objeto` is `(json_type(payload) = 'OBJECT')`.

The root cause was a narrow semantic-normalization gap: migration 001 declares singleton source status as `estado IN ('nuevo')`, while MySQL 9.1 reports the exact equivalent singleton equality form. Migration 004 classified the equality as incompatible.

The correction in `backend/scripts/migrate.js` accepts only the canonicalized exact source forms `estado IN ('nuevo')` and `estado = 'nuevo'`; quoted values remain case-sensitive and no broader SQL equivalence is introduced. `backend/tests/integration/migrations.test.js` now covers the MySQL singleton-equality source path, rejects `Nuevo` and `other` singleton drift, and updates stale complete-up/complete-down expectations for migration 004.

Tasks 1.6 and 1.7 are checked complete after maintainer GREEN evidence.

## Completed Migration Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | Maintainer ran `npm test -- tests/integration/migrations.test.js` from `backend/`: 38/38 pass, 0 fail, exit 0. |
| Runtime harness command | Maintainer ran `npm run db:migrate:test`: no errors, exit 0; then `npm run db:rollback:test`: no errors, exit 0. No database reset was required. |
| Rollback boundary | Revert `backend/migrations/004_add_project_ai_analysis.up.sql`, `backend/migrations/004_add_project_ai_analysis.down.sql`, migration-004-specific logic in `backend/scripts/migrate.js`, and the paired migration helper/integration coverage in `backend/tests/helpers/test-database.js` and `backend/tests/integration/migrations.test.js` together. Existing migrations 001–003 remain untouched. |

## Notes

- The focused unit and integration tests use controlled assertion failures for absent Cycle 2 modules/behavior, rather than failing at module import, syntax, fixtures, or harness setup.
- MySQL check-clause inspection normalizes MySQL-added quoting, character-set introducers, escapes, parentheses, and spaces before comparing the exact expected clauses.
- `git diff --check -- backend/scripts/migrate.js backend/tests/integration/migrations.test.js openspec/changes/cycle-2-gemini-project-viability/apply-progress.md` completed with exit code 0 and no output after this correction.
