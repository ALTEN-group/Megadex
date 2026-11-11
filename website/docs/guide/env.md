# Environment Variables

Configuration reference for the `megadex` API container and the `megadex-migration` Liquibase container.

## Required (`megadex` API)

`src/conf/env.js` validates required variables at startup and fails fast with a consolidated error report if any are missing or invalid.

| Variable | Description |
|---|---|
| `DB_HOST` | Hostname of the PostgreSQL server |
| `DB_NAME` | PostgreSQL database name (default: `megadex`) |
| `DB_USER` | PostgreSQL role used for standard HTTP request handling |
| `DB_PWD` | Password for `DB_USER` |
| `DB_JOB_USER` | PostgreSQL role used by nightly cron jobs (`delete-archived-entities` and `delete-old-history`). Must have `EXECUTE` permission on `public.delete()` and `DELETE` permission on `log.history`. |
| `DB_JOB_PWD` | Password for `DB_JOB_USER` |

## Optional (`megadex` API)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port the Express API listens on |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_MAX_CONNECTIONS` | `10` | Maximum connections in the main `@dwtechs/antity-pgsql` pool |
| `TZ` | `Europe/Paris` | Container timezone |
| `APP_NAME` | — | Compose stack naming input |
| `ENV_NAME` | — | Environment name (`local`, `staging`, `prod`) |
| `SERVICE_NAME` | — | Service identifier used in structured logs |
| `PWD_CREATE_URL` | — | Optional Foxnox credential-provisioning endpoint (`http://<foxnox-host>:3000/foxnox/pwd`). When set, `POST /megadex/users` provisions a password entry in Foxnox for each created user, and `POST /megadex/users/archive` archives their Foxnox password entry. |
| `UPSTREAM_TIMEOUT_MS` | `30000` | Timeout in milliseconds for outbound HTTP requests to `PWD_CREATE_URL` |

## Bundled Admin UI (`megadex` API & Admin container)

| Variable | Default | Description |
|---|---|---|
| `ADMIN_PORT` | — | Internal port for the production bundled Admin UI Express server (`src/admin-server.js`). When unset, the bundled admin server is not started. When set, must be an integer in `1024..65535`. |
| `ADMIN_BASE_PATH` | `/megadex` | Public URL path where the Admin UI is mounted (must start with `/` and not contain `//`). |
| `ADMIN_SSO_TOKEN_KEY` | `sso_access_token` | `localStorage` key used by the Admin UI to store the JWT access token. Keep identical across Gatelin, Foxnox, and Megadex admin interfaces to share sessions. |
| `ADMIN_ROLES_SEARCH_URL` | `/api/gatelin/roles/search` | URL called by the Admin UI to load available roles when editing a user. |

## Database Migration Container (`megadex-migration`)

Variables consumed by `db/liquibase/entrypoint.sh`:

| Variable | Required | Description |
|---|---|---|
| `LIQUIBASE_COMMAND_USERNAME` | ✅ | PostgreSQL superuser (e.g. `root`) used by Liquibase to create roles, schemas, and tables |
| `LIQUIBASE_COMMAND_PASSWORD` | ✅ | Password for `LIQUIBASE_COMMAND_USERNAME` |
| `DB_HOST` | ✅ | PostgreSQL hostname |
| `DB_PORT` | ⬜ | PostgreSQL port (default: `5432`) |
| `DB_NAME` | ✅ | Database name to create and migrate (`megadex`) |
| `DB_USER` | ✅ | Application database role created and granted table/view privileges |
| `DB_PWD` | ✅ | Password for `DB_USER` |
| `DB_JOB_USER` | ✅ | Cron job database role created and granted archive/history cleanup privileges |
| `DB_JOB_PWD` | ✅ | Password for `DB_JOB_USER` |
| `UPDATE` | ✅ | Set to `1` to apply migrations, take a snapshot, and provision DB roles |
| `ROLLBACK` | ⬜ | Integer `> 1` to roll back changesets instead of updating |
| `SNAPSHOT` | ⬜ | Snapshot path prefix without `.json` (e.g. `snapshot/snapshot1`) |
| `LIQUIBASE_LOG_LEVEL` | ⬜ | Liquibase log verbosity (`INFO`, `DEBUG`, `FINE`) |

## BFF Integration Variables (Gatelin & Foxnox)

When pairing Megadex with [Gatelin](https://gatelin.fr) and [Foxnox](https://foxnox.io), point their user lookup variable at Megadex's internal search route:

| Service | Variable | Value |
|---|---|---|
| **Gatelin** | `USER_SEARCH_URL` | `http://<megadex-host>:3000/megadex/users/search` |
| **Foxnox** | `USER_SEARCH_URL` | `http://<megadex-host>:3000/megadex/users/search` |
| **Megadex** | `PWD_CREATE_URL` | `http://<foxnox-host>:3000/foxnox/pwd` |
