# Environment Variables

Variables for the `megadex` container.

## Required

`src/conf/env.js` validates required variables at startup and fails fast with a consolidated error report if any are missing or invalid.

| Variable | Description |
|---|---|
| `DB_HOST` | Hostname of the PostgreSQL container |
| `DB_NAME` | Database name (default: `megadex`) |
| `DB_USER` | Database user for Megadex HTTP request handling |
| `DB_PWD` | Database password for `DB_USER` |
| `DB_JOB_USER` | Database user for archive/history cron jobs (may execute `public.delete()` and `DELETE` from `log.history`) |
| `DB_JOB_PWD` | Password for the cron database user |

## Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port Megadex listens on |
| `DB_PORT` | `5432` | Port of the PostgreSQL container |
| `DB_MAX_CONNECTIONS` | `10` | Maximum connections in the main `@dwtechs/antity-pgsql` pool |
| `APP_NAME` | — | Compose stack naming input |
| `ENV_NAME` | — | Compose environment/network naming input, e.g. `local`, `staging`, `prod` |
| `SERVICE_NAME` | — | Service identity consumed by structured logging |
| `TZ` | — | Container timezone |

## Upstream Lifecycle Hooks

When paired with a password service ([Foxnox](https://foxnox.fr)) and a BFF ([Gatelin](https://gatelin.fr)), Megadex can propagate user lifecycle events over the internal network:

| Variable | Default | Description |
|---|---|---|
| `PWD_CREATE_URL` | — | Credential-provisioning endpoint on your password service (e.g. `http://<foxnox-host>:3000/foxnox/pwd`). When set, `POST /megadex/users` provisions a password row for each created user (and soft-archives the new user if provisioning fails), and `POST /megadex/users/archive` archives the user's password row. |
| `UPSTREAM_TIMEOUT_MS` | `30000` | Timeout in milliseconds for outbound HTTP calls to `PWD_CREATE_URL`. |

## Admin UI

| Variable | Default | Description |
|---|---|---|
| `ADMIN_PORT` | — | Dedicated internal port used by the bundled admin server (`src/admin-server.js`). Unset disables that server. When set it must be an integer between 1024 and 65535, checked at startup in production. Compose commonly supplies `8080`. |
| `ADMIN_BASE_PATH` | `/megadex` | Public path routed by Traefik to the bundled admin server. |
| `ADMIN_SSO_TOKEN_KEY` | `sso_access_token` | `localStorage` key the admin UI stores the access token under. Injected at runtime (dev entrypoint + production `src/admin-server.js`), no rebuild required. Shared across Gatelin, Foxnox, and Megadex admin apps for seamless session reuse when switching between panels. |
| `ADMIN_ROLES_SEARCH_URL` | `/api/gatelin/roles/search` | Gatelin "search roles" route the admin UI calls (with the operator's token) to populate the roles multiselect on the user form. Injected at runtime like `ADMIN_SSO_TOKEN_KEY`. |

## Database migration service

These apply to the `megadex-migration` container (for example, `ghcr.io/alten-group/megadex-migration:0.1.0-alpha.1`):

| Variable | Required | Description |
|---|---|---|
| `LIQUIBASE_COMMAND_USERNAME` | ✅ | PostgreSQL superuser used by Liquibase |
| `LIQUIBASE_COMMAND_PASSWORD` | ✅ | Password for the Liquibase superuser |
| `DB_HOST` | ✅ | Hostname of the PostgreSQL container |
| `DB_PORT` | ⬜ | Port of the PostgreSQL container (default: `5432`) |
| `DB_NAME` | ✅ | Database name to create and migrate |
| `DB_USER` | ✅ | Application database user to create |
| `DB_PWD` | ✅ | Password for the application database user |
| `DB_JOB_USER` | ✅ | Cron database user (may `DELETE` archived rows and old history) |
| `DB_JOB_PWD` | ✅ | Password for the cron database user |
| `UPDATE` | ✅ | Set to `1` to run the full migration |
| `ROLLBACK` | ⬜ | Number of changesets to roll back (used instead of `UPDATE`) |
| `SNAPSHOT` | ⬜ | Path to the reference snapshot file |
| `LIQUIBASE_LOG_LEVEL` | ⬜ | Liquibase log verbosity, e.g. `INFO`, `DEBUG` |
| `TZ` | ⬜ | Timezone |

## BFF & Password Service Variables (Gatelin & Foxnox example)

These are set on the **BFF** and **password service**, not on Megadex. See [Integration](./integration).

| Service | Variable | Description |
|---|---|---|
| **Gatelin** | `USER_SEARCH_URL` | Must point at `http://<megadex-host>:<port>/megadex/users/search` so Gatelin can resolve an email address to a `userId` and `roles` list during login. |
| **Foxnox** | `USER_SEARCH_URL` | Must point at `http://<megadex-host>:<port>/megadex/users/search` so Foxnox email workflows (password recovery, unlock, 2FA recovery) can resolve an email address to a `userId`. |

## Optional build mirrors

Development Dockerfiles use public Alpine and npm registries when no BuildKit secret is supplied. Private infrastructure may provide:

| Secret | Purpose |
|---|---|
| `apk_repository` | Replacement `/etc/apk/repositories` content |
| `npmrc` | npm registry configuration mounted at `/home/user/.npmrc` |

These are build inputs, not runtime Megadex variables. Keep credentials outside the repository; contributors using public registries do not need either secret.

## Maintenance Jobs

Megadex starts two daily UTC cron jobs with the process:

| Job | Schedule | Retention |
|---|---|---|
| Delete archived entities | 02:00 UTC | Rows archived for more than **2 months**, across `"user"` and `social` |
| Delete old history | 03:00 UTC | Rows in `log.history` older than **6 months** |
