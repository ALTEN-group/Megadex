# Changelog

## Unreleased

- Prevent users from archiving their own account, including in mixed batches.
- Register authenticated profile lookup in Gatelin.
- Add permission-controlled restoration of archived user profiles in the admin CRUD and API. Passwords and previous sessions remain archived.

# 0.1.0-alpha.1 (Nov 9th 2026)

  - **User profile & reference-data service:** user profile management (`users` view with aggregated `roles` and `socialsJsonAgg`), social networks catalog (`social`), per-user table view preferences (`preference` with locked system templates), localized reference lookups (`country_trans`, `civility_trans`, `gender_trans`), database-level history triggers, and Angular admin UI
  - **Cross-service lifecycle sync (Foxnox & Gatelin):**
    - Provision user passwords in Foxnox (`POST /foxnox/pwd` via `PWD_CREATE_URL`) on `POST /megadex/users`, with compensating soft-archive rollback if Foxnox is unreachable
    - Archive active Foxnox password entries and revoke active Gatelin consumer sessions (`CONSUMER_URL`) on `POST /megadex/users/archive`
    - Revoke active Gatelin consumer sessions when users are deactivated (`active = false`) or have their `roles` modified on `PUT /megadex/users`
    - Default `filters.archived = false` on internal `/megadex/users/search` requests used by Gatelin and Foxnox
  - **Self-service profile API (`/me`):** expanded `GET /megadex/users/me` to return the full non-private user profile and added `PUT /megadex/users/me` for self-service profile updates (blocking privilege-escalation fields with `403`), with boolean `true` consent timestamping (`gdprConsentedAt`, `marketingConsentedAt`)
  - **Validation, normalization & error mapping:** lowercased `email`/`backupEmail`, enforced `backupEmail !== email`, added `http:`/`https:` URL and domain validators (`gender`, `civility`, `country`, `nationality`, `language`, `socialsJsonAgg`), mapped PostgreSQL unique/check constraint violations (`23505` → `409 Conflict`, `23514`/`22P02`/`P0001` → `400 Bad Request`), and mapped `rolesArrayAgg` → `roles` in user history snapshots
  - **Audit log & history parity:** added `POST /megadex/audit/search` over `log.audit` and aligned entity history, single-update archive triggers, and read-only audit date handling (`archivedAt`, `createdAt`, `updatedAt`) with `@dwtechs/antity-pgsql` and `@dwtechs/gatelin-express`
  - **PostgreSQL contract, performance & fuzzing suites:** added `scripts/test-db.sh` (`tests/db/megadex/*.sql`), k6 performance testing (`scripts/run-perf.sh`, `tests/perf/`), and RESTler API fuzzing (`scripts/run-restler.sh`, `docker/restler/`)
  - **Documentation, CI/CD & governance:** added VitePress documentation site (`website/`), GitHub Actions workflows (`test.yml`, `admin-e2e.yml`, `publish.yml`, `deploy-docs.yml`, `codeql.yml`, `audit.yml`, `audit-fix.yml`, `perf.yml`, `restler-pr.yml`, `restler-fuzz.yml`), APM agent toolchain (`apm.yml`, `apm.lock.yaml`), and repository governance documents (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `NOTICE.md`)
  - Distributed as `ghcr.io/alten-group/megadex` and `ghcr.io/alten-group/megadex-migration`
