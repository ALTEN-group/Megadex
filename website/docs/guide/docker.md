# Docker Compose

Megadex is distributed as two container images on GitHub Container Registry:

- **`ghcr.io/alten-group/megadex`** — Express JSON API and bundled Angular Admin UI
- **`ghcr.io/alten-group/megadex-migration`** — Liquibase migration runner with full schema, views, triggers, and reference seed data

## Network Topology

Megadex is an **internal microservice**. Its API port (`3000`) is attached only to the `internal` Docker network and has no public Traefik router. All client and browser API calls go through the BFF (such as [Gatelin](https://gatelin.fr)), while Traefik routes `/megadex` to the Admin UI port (`ADMIN_PORT=8080`).

```
Browser / Client
      |
      v
  Traefik (:80)
      |
      +-- /megadex/*     --> Megadex Admin UI (:8080)
      +-- /api/*         --> BFF (Gatelin :3000)
                                 |
                                 +-- /megadex/*  --> Megadex JSON API (:3000)
```

## `docker-compose.yml` Template

The example below runs PostgreSQL, Traefik, Megadex migrations, Megadex (API + bundled Admin UI), Foxnox, and Gatelin:

```yaml
name: my-project

services:
  postgres:
    image: postgres:16-alpine
    container_name: my-project-postgres
    hostname: my-project-postgres
    environment:
      TZ: Europe/Paris
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root_pwd_change_me
    networks:
      - internal
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root -d postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  traefik:
    image: traefik:3.6.4
    container_name: my-project-traefik
    hostname: my-project-traefik
    command:
      - --providers.docker=true
      - --providers.docker.network=my-project-internal
      - --providers.docker.exposedByDefault=false
      - --entryPoints.web.address=:80
    ports:
      - "8100:80"
    networks:
      - internal
      - external
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  megadex_migration:
    image: ghcr.io/alten-group/megadex-migration:0.1.0-alpha.1
    container_name: my-project-megadex-migration
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      TZ: Europe/Paris
      LIQUIBASE_COMMAND_USERNAME: root
      LIQUIBASE_COMMAND_PASSWORD: root_pwd_change_me
      DB_HOST: my-project-postgres
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
    container_name: my-project-megadex
    hostname: my-project-megadex
    depends_on:
      postgres:
        condition: service_healthy
      megadex_migration:
        condition: service_completed_successfully
    environment:
      PORT: 3000
      TZ: Europe/Paris
      DB_HOST: my-project-postgres
      DB_PORT: 5432
      DB_NAME: megadex
      DB_USER: megadex
      DB_PWD: megadex_pwd_change_me
      DB_JOB_USER: megadex_job
      DB_JOB_PWD: megadex_job_pwd_change_me
      ADMIN_PORT: 8080
      ADMIN_BASE_PATH: /megadex
      ADMIN_SSO_TOKEN_KEY: sso_access_token
      ADMIN_ROLES_SEARCH_URL: /api/gatelin/roles/search
    networks:
      - internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.megadex-admin.rule=PathPrefix(`/megadex`)"
      - "traefik.http.routers.megadex-admin.entrypoints=web"
      - "traefik.http.routers.megadex-admin.service=megadex-admin"
      - "traefik.http.services.megadex-admin.loadBalancer.server.port=8080"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/megadex/health/ready"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  internal:
    name: my-project-internal
    driver: bridge
  external:
    name: my-project-external
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

## Development vs. Production Compose Files

In the Megadex repository, `docker/` contains two Compose files:

- **`docker/docker-compose.yml` (Development)** — Mounts local source folders (`src/`, `admin/`, `website/`, `db/liquibase/data`), seeds development users via `/liquibase/data`, and runs VitePress and Swagger UI containers.
- **`docker/docker-compose.prod.yml` (Production)** — Uses `dockerfile.prod` multi-stage builds, bundles the compiled Angular Admin UI inside the `megadex` container on `ADMIN_PORT=8080`, and omits dev seed mounts and documentation containers.
