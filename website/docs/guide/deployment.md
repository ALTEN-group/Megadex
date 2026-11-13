# Deployment

Megadex is distributed as Docker images on GitHub Container Registry:

- **`ghcr.io/alten-group/megadex`** — the user-profile API and Angular admin UI
- **`ghcr.io/alten-group/megadex-migration`** — the Liquibase migration container, with the full schema, views, triggers, and reference seed data baked in

In production the admin UI is built into the Megadex image and enabled by setting `ADMIN_PORT`; Traefik routes `ADMIN_BASE_PATH` (default `/megadex`) to that internal port. Development keeps the admin in its own container for live reloading. The documentation site is published to GitHub Pages from `website/`.

See the [Integration](./integration) page for BFF wiring (Gatelin and Foxnox are the worked examples) and [Environment Variables](./configuration) for the full variable reference.

Use immutable release tags in production. The examples below use `0.1.0-alpha.1`; upgrade the API and migration images together when adopting a newer release.

## Architecture

Megadex is an **internal service**. It has no public Traefik router for the JSON API: browsers and API clients reach it through a BFF, which typically strips a public `/api` prefix and forwards to Megadex on the internal network. The Compose template below uses [Gatelin](https://gatelin.fr) and [Foxnox](https://foxnox.fr); another BFF that issues sessions and proxies `/megadex/*` works the same way.

```
Browser / Client
      |
      v
  Traefik  (:80)   ← edge gateway
      |
      +-- /megadex/* --> Megadex Admin UI (:8080)
      |
      +-- /api/*     --> BFF (e.g. Gatelin)  (sessions, routing, ACL)
                            |
                            +-- /megadex/*   --> Megadex JSON API (:3000)
```

This boundary matters because Megadex trusts the BFF to authenticate callers and construct the `x-consumer-*` and `x-acl-*` headers. Exposing port `3000` publicly would allow clients to spoof consumer identities or omit ACL restrictions.

## docker-compose.yml template

Drop this file into your project and replace the placeholder values. No Megadex source code required — all images are pulled from GHCR.

```yaml
name: my-project

services:
  postgres:
    image: postgres:16-alpine
    container_name: my-project-postgres-local
    hostname: my-project-postgres-local
    environment:
      TZ: Europe/Paris
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root_pwd_change_me
    networks:
      - internal
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "root", "-d", "megadex"]
      interval: 10s
      timeout: 5s
      retries: 3

  traefik:
    image: traefik:3.6.4
    container_name: my-project-traefik-local
    hostname: my-project-traefik-local
    command:
      - --providers.docker=true
      - --providers.docker.network=my-project-internal-local
      - --providers.docker.constraints=Label(`stack.name`,`my-project-local`)
      - --entryPoints.web.address=:80
      - --providers.docker.exposedByDefault=false
      - --api.insecure=true
      - --log.level=INFO
      - --accesslog=true
    ports:
      - "8100:80"
      - "8083:8080"
    networks:
      - internal
      - external
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  megadex_migration:
    image: ghcr.io/alten-group/megadex-migration:0.1.0-alpha.1
    container_name: my-project-megadex-migration-local
    hostname: my-project-megadex-migration-local
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      TZ: Europe/Paris
      LIQUIBASE_COMMAND_USERNAME: root
      LIQUIBASE_COMMAND_PASSWORD: root_pwd_change_me
      DB_HOST: my-project-postgres-local
      DB_PORT: 5432
      DB_NAME: megadex
      DB_USER: megadex
      DB_PWD: megadex_pwd_change_me
      DB_JOB_USER: megadex_job
      DB_JOB_PWD: megadex_job_pwd_change_me
      UPDATE: 1
      ROLLBACK: 0
      SNAPSHOT: snapshot/snapshot1
      LIQUIBASE_LOG_LEVEL: INFO
    networks:
      - internal

  megadex:
    image: ghcr.io/alten-group/megadex:0.1.0-alpha.1
    container_name: my-project-megadex-local
    hostname: my-project-megadex-local
    depends_on:
      postgres:
        condition: service_healthy
      megadex_migration:
        condition: service_completed_successfully
    environment:
      PORT: 3000
      TZ: Europe/Paris
      DB_HOST: my-project-postgres-local
      DB_PORT: 5432
      DB_NAME: megadex
      DB_USER: megadex
      DB_PWD: megadex_pwd_change_me
      DB_JOB_USER: megadex_job
      DB_JOB_PWD: megadex_job_pwd_change_me
      APP_NAME: my-project
      ENV_NAME: local
      SERVICE_NAME: my-project-megadex-local
      # Optional password lifecycle hook into Foxnox
      PWD_CREATE_URL: http://my-project-foxnox-local:3000/foxnox/pwd
      # Bundled Admin UI
      ADMIN_PORT: 8080
      ADMIN_BASE_PATH: /megadex
      ADMIN_SSO_TOKEN_KEY: sso_access_token
      ADMIN_ROLES_SEARCH_URL: /api/gatelin/roles/search
    networks:
      - internal
    # Only the Admin UI port (8080) is routed through Traefik; the JSON API (3000)
    # stays private on the internal network behind the BFF.
    labels:
      - "traefik.enable=true"
      - "stack.name=my-project-local"
      - "traefik.http.routers.megadex-admin.rule=PathPrefix(`/megadex`)"
      - "traefik.http.routers.megadex-admin.entrypoints=web"
      - "traefik.http.routers.megadex-admin.service=megadex-admin"
      - "traefik.http.services.megadex-admin.loadBalancer.server.port=8080"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/megadex/health/ready"]
      interval: 10s
      timeout: 5s
      retries: 5

  gatelin:
    image: ghcr.io/alten-group/gatelin:latest
    container_name: my-project-gatelin-local
    hostname: my-project-gatelin-local
    depends_on:
      megadex:
        condition: service_healthy
    environment:
      TZ: Europe/Paris
      USER_SEARCH_URL: http://my-project-megadex-local:3000/megadex/users/search
      PWD_CHECK_URL: http://my-project-foxnox-local:3000/foxnox/pwd/compare
      PWD_CHALLENGES_URL: http://my-project-foxnox-local:3000/foxnox/challenges
      PWD_TRUSTED_DEVICES_URL: http://my-project-foxnox-local:3000/foxnox/devices/verify
      PWD_LOGIN_TICKET_URL: http://my-project-foxnox-local:3000/foxnox/login-tickets/redeem
      DB_HOST: my-project-postgres-local
      DB_NAME: gatelin
      DB_USER: gatelin
      DB_PWD: gatelin_pwd_change_me
      TOKEN_SECRET: change_me_with_a_long_random_secret
      APP_NAME: my-project
      ENV_NAME: local
      SERVICE_NAME: my-project-gatelin-local
    networks:
      - internal
    labels:
      - "traefik.enable=true"
      - "stack.name=my-project-local"
      - "traefik.http.routers.gatelin.rule=PathPrefix(`/api`)"
      - "traefik.http.routers.gatelin.entrypoints=web"
      - "traefik.http.routers.gatelin.service=gatelin"
      - "traefik.http.routers.gatelin.middlewares=strip-prefix"
      - "traefik.http.middlewares.strip-prefix.stripprefix.prefixes=/api"
      - "traefik.http.middlewares.strip-prefix.stripprefix.forceSlash=false"
      - "traefik.http.services.gatelin.loadBalancer.server.port=3000"

networks:
  internal:
    name: my-project-internal-local
    driver: bridge
  external:
    name: my-project-external-local
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

## Startup Order

1. **postgres** must be healthy before migrations or the API connect.
2. **megadex_migration** must complete successfully so the schema, writable views (`users`, `preferences`), audit triggers, reference translations (`countries`, `civilities`, `genders`), and database roles (`DB_USER`, `DB_JOB_USER`) exist before the first request.
3. **megadex** should be healthy before the BFF starts serving logins, because the BFF resolves email addresses via `USER_SEARCH_URL` (`POST /megadex/users/search`).

## Health Check

Megadex exposes both a liveness and a readiness endpoint:

```
GET /megadex/health
GET /megadex/health/ready
```

`/megadex/health` is dependency-free and only proves the process is up. `/megadex/health/ready` additionally runs a `SELECT 1` against Postgres, so an instance that lost its database drops out of rotation instead of failing requests. Use the readiness endpoint in your container health check.

When the bundled Admin UI server is enabled (`ADMIN_PORT` set), it also exposes `GET /healthz` on `ADMIN_PORT`.

From inside the network:

```bash
curl http://my-project-megadex-local:3000/megadex/health/ready
```

## Database Migration

The `megadex_migration` container is controlled by environment variables:

| Variable | Values | Description |
|---|---|---|
| `UPDATE` | `1` / `0` | When `1`: creates the database, applies all schema changesets and reference seed data, takes a snapshot when `LIQUIBASE_ENABLE_SNAPSHOT=1`, and provisions `DB_USER` and `DB_JOB_USER`. This is the normal deploy mode. When `0` (and `ROLLBACK=0`): diffs the live database against the reference snapshot and generates a changelog. Development tool only. |
| `ROLLBACK` | integer > `1` | Rolls back the given number of changesets and takes a new snapshot when `LIQUIBASE_ENABLE_SNAPSHOT=1`. The current entrypoint does not enter rollback mode for `1`. |
| `SNAPSHOT` | path | Reference snapshot path without the `.json` suffix, for example `snapshot/snapshot1`. |

**Adding your own seed data:** mount a folder containing a `changelog.xml` at `/liquibase/data`. It is applied after the core schema and reference catalogs, so you can seed initial users or custom social platforms without rebuilding the image.

```yaml
megadex_migration:
  image: ghcr.io/alten-group/megadex-migration:0.1.0-alpha.1
  volumes:
    - ./db/megadex/data:/liquibase/data
  environment:
    UPDATE: 1
    # ...
```
