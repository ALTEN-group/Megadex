# Production Guide

Checklist and operational guidance for running Megadex in production.

## Pre-Flight Checklist

1. **Pin immutable image tags** — Use explicit release tags (for example `ghcr.io/alten-group/megadex:0.1.0-alpha.1` and `ghcr.io/alten-group/megadex-migration:0.1.0-alpha.1`) rather than `latest`, and upgrade the API and migration images together.
2. **Isolate the API port on an internal network** — Never publish port `3000` to the host or attach a public Traefik router directly to the Megadex API. Megadex trusts the `x-consumer-*` and `x-acl-*` headers injected by your BFF.
3. **Separate `DB_USER` and `DB_JOB_USER` credentials** — Use strong, distinct passwords for the request-handling role (`DB_USER`), the nightly cleanup role (`DB_JOB_USER`), and the Liquibase superuser (`LIQUIBASE_COMMAND_USERNAME`).
4. **Do not mount development seed data** — Ensure `/liquibase/data` is not mounted with development test users in production (`docker/docker-compose.prod.yml` omits this volume).
5. **Configure readiness probes** — Point container orchestrator health checks at `GET /megadex/health/ready` (which verifies PostgreSQL connectivity via `SELECT 1`), not just `/megadex/health`.

## Bundled Admin UI Hosting

In production (`dockerfile.prod`), the Angular Admin UI is compiled at image build time into `/home/user/app/admin-dist` and served by `src/admin-server.js` when `ADMIN_PORT` is set:

- Set `ADMIN_PORT=8080` (or any unprivileged port `1024..65535`).
- Set `ADMIN_BASE_PATH=/megadex` (or your chosen public prefix).
- Configure your reverse proxy (e.g. Traefik) to forward `PathPrefix(/megadex)` to port `8080` on the `megadex` container.
- The admin server exposes `GET /healthz` on `ADMIN_PORT` and serves `index.html` with `<base href>` and `window.__MEGADEX_ADMIN__` rewritten at process startup from `ADMIN_BASE_PATH`, `ADMIN_SSO_TOKEN_KEY`, and `ADMIN_ROLES_SEARCH_URL`.

## BFF Route Registration (Gatelin)

When using [Gatelin](https://gatelin.fr) as your BFF, register the Megadex service (`http://<megadex-host>:3000`) and its resources (`megadex/users`, `megadex/socials`, `megadex/preferences`, `megadex/countries`, `megadex/civilities`, `megadex/genders`, `megadex/audit`). The reference Liquibase changelogs in `db/liquibase/gatelin-data/` show the exact routes, fields, conditions, and role permissions expected by the Megadex Admin UI:

| Route ID | Resource | Pattern | Method | Operation |
|---|---|---|---|---|
| `82` | `megadex/users` | `/megadex/users/search` | `POST` | `list` |
| `83` | `megadex/users` | `/megadex/users/:id/history` | `GET` | `list` |
| `84` | `megadex/users` | `/megadex/users` | `POST` | `bulk create` |
| `85` | `megadex/users` | `/megadex/users` | `PUT` | `bulk update` |
| `86` | `megadex/users` | `/megadex/users/archive` | `POST` | `bulk archive` |
| `87` | `megadex/users` | `/megadex/users/schema` | `GET` | `list` |
| `88`–`91` | `megadex/preferences` | `/megadex/preferences/*` | `GET`/`POST`/`PUT`/`DELETE` | `list`/`create`/`update`/`delete` |
| `92`–`97` | `megadex/socials` | `/megadex/socials/*` | `POST`/`PUT`/`GET` | CRUD + schema + history |
| `98`–`103` | `megadex/countries`, `civilities`, `genders` | `/megadex/*/search`, `/schema` | `POST`/`GET` | `list` |
| `104` | `megadex/audit` | `/megadex/audit/search` | `POST` | `list` |
| `105` | `megadex/users` | `/megadex/users/me` | `PUT` | `bulk update` |

## Nightly Maintenance & Retention

Megadex runs two scheduled jobs inside the Node.js process:

- **Archived row hard-deletion (`02:00 UTC`)**: Deletes `"user"` and `social` rows archived for more than **2 months**.
- **History retention (`03:00 UTC`)**: Deletes `log.history` rows older than **6 months**.

Both jobs log their execution counts via `@dwtechs/winstan` and execute on a dedicated single-connection pool (`DB_JOB_USER`) so maintenance queries never contend with request-handling connections.
