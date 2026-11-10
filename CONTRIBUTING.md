# Contributing to Megadex

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js 24](https://nodejs.org/) (for running tests locally)

## First-time Setup

### 1. Generate the dev environment file

```sh
./scripts/setup-env.sh
```

This generates `docker/conf/.env.dev` from `docker/conf/.env.dev.example` and fills in random values for all database credentials and secrets (`LIQUIBASE_DB_PWD`, `POSTGRES_ROOT_PWD`, `MEGADEX_DB_*`, `GATELIN_DB_*`, `GATELIN_TOKEN_SECRET`, `FOXNOX_DB_*`, `FOXNOX_PWD_SECRET`).

Public npm and Alpine repositories work by default. `NPMRC` and `APK_REPOSITORY` are optional BuildKit secrets for contributors who use private mirrors; never commit registry credentials.

### 2. Start the stack

```sh
./scripts/start-dev.sh
```

Builds and starts all services via Docker Compose (`postgres`, `traefik`, `gatelin`, `foxnox`, `megadex`, `admin`, `swagger`, `adminer`, `mailpit`) using `docker/conf/.env.dev`.

Mock user passwords live in Foxnox's `pwd` table and are created at runtime rather than in Liquibase seed data. Whenever the database comes up empty, `start-dev.sh` finishes by running `setup-mocks.sh --if-missing`, which seeds passwords for the dev users in `db/liquibase/data/01-users.sql` and prints the plaintexts. **Save them — you need them to log in.** When passwords already exist the step is skipped and your existing credentials are left alone.

Local endpoints once the stack is up:

| Service | URL |
|---|---|
| Megadex Admin UI | `http://localhost:8100/megadex/` |
| Gatelin Admin UI (roles, permissions, CORS) | `http://localhost:8100/gatelin/` |
| Foxnox Admin UI (passwords, policies) | `http://localhost:8100/foxnox/` |
| Swagger UI | `http://localhost:8100/swagger/` |
| Adminer | `http://localhost:8100/adminer/` |
| Mailpit UI | `http://localhost:8025/` |

### 3. Rotate the mock passwords (optional)

```sh
./scripts/setup-mocks.sh
```

Waits for Foxnox to be healthy, clears any previous mock `pwd` rows, and calls Foxnox to generate a fresh password for each dev user (`MOCK_USER_IDS=(2 3)`). Plaintexts are:

- printed once to your terminal so you can save them for manual login;
- substituted into `swagger/src/megadex.openapi.json` (replacing `__EMAIL_<userId>__` and `__PWD_<userId>__` from `swagger/src/megadex.openapi.example.json`), then reloaded by restarting the `swagger` container;
- written to `docker/conf/.env.dev` as `E2E_EMAIL` and `E2E_PASSWORD` for the Playwright e2e suite.

> If login ever fails with a **404 on `POST /api/gatelin/sessions`**, Gatelin is relaying the 404 that Foxnox returns when a user has no `pwd` row. Run `./scripts/setup-mocks.sh`.

> A **404 "Route not found" on `GET /api/megadex/users/me`** means Gatelin's route registration is missing. `megadex-data-03` registers this protected endpoint and `megadex-data-04` grants it to every non-archived role. Both seeds were edited in place, so run `./scripts/reset-db.sh` to reapply them.

## Development

### Start / Restart

```sh
./scripts/start-dev.sh
```

Builds and starts all services via Docker Compose. Mock passwords persist in Postgres across restarts, so the seeding step is skipped and your credentials stay put.

### Stop

```sh
./scripts/stop-dev.sh
```

Stops and removes all containers and the postgres volume. Because the volume is removed, the next `start-dev.sh` comes up on an empty database and re-seeds fresh mock passwords.

```sh
./scripts/stop-dev.sh --rmi   # also remove Docker images
```

## Reset

### Reset the database only

Stops the application containers, removes the postgres and migration containers and the postgres data volume, then restarts the stack (migrations re-run from scratch, and `start-dev.sh` seeds fresh mock user passwords on the empty database).

```sh
./scripts/reset-db.sh
```

### Reset the Megadex service only

Removes only the Megadex container, image, and `node_modules` volume, leaving postgres and other services intact, then restarts the stack.

```sh
./scripts/reset-megadex.sh
```

### Reset the admin frontend only

Removes the admin container, image, and `node_modules` volume so it rebuilds from scratch on restart.

```sh
./scripts/reset-admin.sh
```

## Tests

Run from the project root (requires `npm install` first):

```sh
npm test                  # run all unit tests
npm run test:coverage     # with coverage report
npm run lint              # Biome lint & format check
```

### PostgreSQL contract tests

```sh
./scripts/test-db.sh
```

Starts an isolated PostgreSQL container, applies the Liquibase changelog, and runs every `tests/db/megadex/*.sql` file as the application database user. The stack and its data are removed after the run. This is a host Docker workflow, not an npm/Jest test — do not run it from the Megadex app container.

### Admin unit tests

```sh
cd admin
npm test                  # Vitest watch mode
npm run test:coverage     # CI / coverage
```

### Admin end-to-end tests (Playwright)

The e2e suite (`admin/e2e/`) drives the admin UI end-to-end through Traefik, logs in with the seeded dev credentials from `docker/conf/.env.dev` (`E2E_EMAIL` / `E2E_PASSWORD`), and exercises the same routing path a real browser hits (Traefik → admin → Gatelin → Megadex / Foxnox).

Both flows below require:

- `./scripts/start-dev.sh` running (which seeds `E2E_EMAIL` and `E2E_PASSWORD` via `setup-mocks.sh`).

#### In Docker (recommended, no local install)

```sh
./scripts/e2e.sh                            # full suite
./scripts/e2e.sh --grep "login"             # forward flags to `playwright test`
./scripts/e2e.sh --reporter=html            # writes admin/playwright-report/
./scripts/e2e.sh -- playwright show-report  # arbitrary command after `--`
```

Runs the tests in a dedicated `admin-e2e` container (`mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble`, built from `admin/e2e-dockerfile`). The container lives behind the `e2e` Compose profile, so `docker compose up` and `start-dev.sh` skip it — it spins up on demand, runs to completion, and is removed (`--rm`). It hits Traefik over the internal Docker network at `http://traefik/megadex/` (configurable via `ADMIN_E2E_BASE_URL` in `docker/conf/.env.dev`). Test artifacts land on the host at `admin/test-results/` and `admin/playwright-report/`.

Pin `PLAYWRIGHT_VERSION` in `.env.dev` to whatever `admin/package.json`'s `@playwright/test` resolves to.

#### On the host (fast iteration, UI mode)

```sh
cd admin
npm run e2e:install       # once per machine — downloads Chromium
npm run e2e               # runs against Traefik on localhost:8100
npm run e2e:ui            # Playwright's interactive UI mode
```

Prefer this when iterating on a specific test — the UI mode and Playwright inspector need a display, which the containerized flow doesn't provide.

## Performance Tests (k6)

[k6](https://k6.io) load-tests the API through Traefik with scenarios covering unauthenticated health checks, authentication, and authenticated user/resource operations.

Requires the development stack to be running (`./scripts/start-dev.sh`).

```sh
./scripts/run-perf.sh                      # health scenario (default)
./scripts/run-perf.sh login                # login/logout flow (auto-resets db on local)
./scripts/run-perf.sh all                  # runs all scenarios sequentially
./scripts/run-perf.sh all --no-reset       # skip automatic local database reset
K6_VUS=50 K6_DURATION=1m ./scripts/run-perf.sh all  # override load shape
```

All artifacts land on the host in `tests/perf/results/` (`<scenario>.report.html`, `<scenario>.summary.json`, and `benchmark.json`). In CI (`.github/workflows/perf.yml`), the suite runs nightly or on demand and tracks historical latency trends via `benchmark-action/github-action-benchmark`.

## API Fuzzing (RESTler)

[RESTler](https://github.com/microsoft/restler-fuzzer) compiles the Megadex OpenAPI spec (`swagger/src/megadex.openapi.json`) into a test grammar, authenticates as a seeded dev user, and exercises every endpoint through Traefik.

Requires the development stack to be running (`./scripts/start-dev.sh`).

```sh
./scripts/run-restler.sh            # test mode (smoketest, default)
./scripts/run-restler.sh fuzz-lean  # fuzz each endpoint once with default checkers
./scripts/run-restler.sh fuzz       # full fuzzing run ($RESTLER_TIME_BUDGET hours, default 1)
./scripts/run-restler.sh test --no-reset  # skip automatic local database reset
```

Results are written to `tests/restler/results/`. See `.github/workflows/restler-pr.yml` and `.github/workflows/restler-fuzz.yml` for the CI jobs.

## Production

### Images

Megadex ships two releasable images, published to the GitHub Container Registry (GHCR) on every GitHub Release:

| Image | Description |
|---|---|
| `ghcr.io/alten-group/megadex` | The Node.js user profile, preferences, and reference-data service, plus the bundled Angular admin UI (served on `ADMIN_PORT` under `ADMIN_BASE_PATH`, default `/megadex`). |
| `ghcr.io/alten-group/megadex-migration` | A one-shot Liquibase container. Applies the Megadex DB schema and core seed data, then exits. It also applies application-specific seed data when mounted to `/liquibase/data`. |

Documentation is published to GitHub Pages from `website/`; it is not a Docker image.

### Build production images

Requires `docker/conf/.env.prod` to exist. Create it from `docker/conf/.env.prod.example` (or `.env.dev.example`) and replace placeholder values with production secrets and versions.

```sh
./scripts/build-prod.sh                   # build API and migration
./scripts/build-prod.sh api               # Megadex API + bundled admin
./scripts/build-prod.sh migration         # migration only
./scripts/build-prod.sh api migration     # multiple targets
```

### Publish to GHCR

Images are published automatically via `.github/workflows/publish.yml` when a GitHub Release is created. Publishing is scoped to the `ALTEN-group` org — `GITHUB_TOKEN` is sufficient, no PAT is needed.

Each release produces the API (with bundled admin) and migration images with the following tag variants (for example, release `v0.1.0-alpha.1`):

| Tag | Example |
|---|---|
| Full semver | `0.1.0-alpha.1` |
| Major.minor | `0.1` |
| Major | `0` |
| Floating | `latest` |

Images include SBOM and provenance attestations (SLSA) by default.

### Maintainer weekly audit

The public weekly workflow (`.github/workflows/audit.yml`) always runs `npm audit`, Biome, outdated, and TODO scans and opens an audit issue.

Copilot CLI, APM (`apm.yml` / `apm.lock.yaml`), and `audit-fix.yml` stay in this repository so the ALTEN maintainer pipeline is versioned with the product. Those steps run only on `ALTEN-group/Megadex` when `COPILOT_GITHUB_TOKEN` is set; forks skip them. Configure that secret (and optional `COPILOT_AUDITS_MODEL`) on the canonical repo.

### Start production environment

Requires images to be built first (or pulled from the registry).

```sh
./scripts/start-prod.sh
```

Starts all services via `docker/docker-compose.prod.yml` using `docker/conf/.env.prod`.

### DB Migration

The `megadex_migration` container is controlled by environment variables:

| Variable | Values | Description |
|---|---|---|
| `UPDATE` | `1` / `0` | When `1`: creates the DB, applies all schema changesets, runs consumer data (if mounted), takes a snapshot, creates the Megadex DB users. This is the normal deploy mode. When `0` (and `ROLLBACK=0`): runs a diff between the live DB and the reference snapshot, generates a `.sql` diff changelog in `versions/generated/`, and syncs the changelog. Development tool only. |
| `ROLLBACK` | integer > `1` | Rolls back the given number of changesets and takes a new snapshot. |
| `LIQUIBASE_SNAPSHOT` | integer | Index of the snapshot file to use as baseline for diff operations. |
| `LIQUIBASE_COMMAND_CONTEXTS` | e.g. `v1` | Liquibase contexts to activate during update. |

When `UPDATE=1`, the container runs the following steps in order:
1. Creates the database if it does not exist
2. Applies all baked-in schema changesets (`db/liquibase/megadex/versions/`)
3. Applies consumer data from `/liquibase/data/changelog.xml` if the file exists
4. Takes a JSON snapshot of the current schema
5. Creates the Megadex DB application and job users with the correct grants

**Adding consumer app data:** Mount a folder containing a `changelog.xml` to `/liquibase/data` in the migration container. That changelog is applied after the core schema, in the same transaction scope.

```yaml
megadex_migration:
  image: ghcr.io/alten-group/megadex-migration:0.1.0-alpha.1
  volumes:
    - ./db/megadex/data:/liquibase/data
  environment:
    UPDATE: 1
    # ...
```
