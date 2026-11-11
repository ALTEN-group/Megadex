# Changelog

## Unreleased

- Upgrade `@dwtechs/antity-pgsql` to 0.26.0 and use native restore for users and social networks. Add permission-controlled social restoration in Gatelin and the admin, with catalog cache invalidation. Restore uses the library's audited update even for already-active rows; passwords remain archived; an unexpired Gatelin refresh token works again after restoration.

- Fix user archive propagation for bare ids and Foxnox's `rows` payload; report incomplete authentication cleanup instead of silently ignoring Gatelin failures. Retrying the archive request completes remaining cleanup.
- Stop revoking Gatelin sessions from Megadex (`CONSUMER_URL` removed): Gatelin rejected these unauthenticated calls with `401`, which made every archive fail with `502`. Archived, deactivated or re-roled users keep access until their access token expires, since Gatelin refuses to refresh it.
- Fix Foxnox password cleanup on archive: filter `archived` with `matchMode: "is"` (Foxnox ignored `equals` on booleans) and treat a `404` empty search as no password to archive.
- Prevent users from archiving their own account, including in mixed batches.
- Register authenticated profile lookup in Gatelin.
- Add permission-controlled restoration of archived user profiles in the admin CRUD and API. Passwords remain archived.

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
