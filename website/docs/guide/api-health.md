# Health Checks API

Megadex uses `@dwtechs/healix-express` to expose liveness and readiness endpoints under `/megadex/health`.

Health routes are registered first in `src/app.js` — before performance timers and resource routers — so health probes remain lightweight and isolated.

## Liveness Probe

Confirms that the Node.js HTTP server process is running and accepting connections without querying external dependencies.

```http
GET /megadex/health
```

**Response (`200 OK`):**

```json
{
  "status": "ok"
}
```

## Readiness Probe

Executes `SELECT 1` against the PostgreSQL pool (`@dwtechs/antity-pgsql`) to verify database connectivity before marking the instance ready to receive traffic.

```http
GET /megadex/health/ready
```

**Response (`200 OK` when PostgreSQL is reachable):**

```json
{
  "status": "ok",
  "checks": {
    "db": "ok"
  }
}
```

If the database connection fails, `/megadex/health/ready` returns `503 Service Unavailable`. Always use `/megadex/health/ready` in Docker and Kubernetes readiness checks.

## Bundled Admin Server Health Probe

When the bundled production Admin UI server is enabled (`ADMIN_PORT` set), it exposes its own liveness check on `ADMIN_PORT`:

```http
GET /healthz
```

**Response (`200 OK`):** `ok`
