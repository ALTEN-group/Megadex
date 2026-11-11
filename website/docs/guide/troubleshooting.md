# Troubleshooting

## Container Won't Start

```bash
docker compose logs megadex
```

Megadex validates its environment and connects to Postgres at boot, so the usual causes are a missing `DB_HOST` / `DB_PWD` / `DB_JOB_USER` / `DB_JOB_PWD`, or the migration container not having finished. Check that `megadex_migration` exited successfully before the service tried to start.

## Megadex Is Reachable Directly

Treat this as a deployment error. Megadex relies on a BFF for authentication and ACL headers (`x-consumer-*`, `x-acl-*`) and must not have a public Traefik API router, published host port, or public load-balancer target on port `3000`. Only the bundled Admin UI port (`ADMIN_PORT`, e.g. `8080`) should be routed by Traefik.

## Database Connection Issues

```bash
# Check if PostgreSQL is running
docker exec my-project-postgres-local pg_isready -U root -d megadex

# Test connection from the Megadex container
docker exec my-project-megadex-local nc -zv my-project-postgres-local 5432

# Readiness endpoint proves the app itself can query
docker exec my-project-megadex-local wget -qO- http://localhost:3000/megadex/health/ready
```

If `/megadex/health` answers but `/megadex/health/ready` fails with **503**, the process is alive but has lost the database — the readiness probe is taking the instance out of rotation.

## Migration Failures

```bash
# View migration logs
docker logs my-project-megadex-migration-local

# Roll back the last two changesets
docker compose run --rm -e UPDATE=0 -e ROLLBACK=2 megadex_migration
```

The migration entrypoint enters rollback mode only when `ROLLBACK` is greater than `1`; `ROLLBACK=1` falls through to diff mode.

## User Creation Fails and Archives the New Row

When `PWD_CREATE_URL` is set, `POST /megadex/users` calls Foxnox (`POST /foxnox/pwd`) right after inserting the user row. If Foxnox is unreachable or returns an error, Megadex soft-archives (`active = false, archived = true`) the newly created user so an account without credentials cannot be left active.

Check that Foxnox is healthy on the internal network and that `PWD_CREATE_URL` points to `http://<foxnox-host>:3000/foxnox/pwd`.

## 403 When Creating, Updating, or Archiving a User

Two guards can reject user mutations with **403 Forbidden**:

1. **Super-admin role ceiling (`assertSuperAdminCeiling`)** — Only a caller who holds role `1` (**Super admin**) in `user_role` can assign role `1` to a user or modify/archive an existing user who holds role `1`. Standard administrators (role `2`) receive `403 Cannot assign super admin role` or `403 Cannot modify or archive a super admin user`.
2. **ACL field or condition restrictions (`x-acl-fields`, `x-acl-conditions`)** — If the caller's BFF permission restricts writable fields or row conditions, attempting to write a disallowed field or target a row outside the partition returns `403`.

## 403 on `PUT /megadex/users/me`

The self-service endpoint `PUT /megadex/users/me` intentionally blocks privilege-escalation and identity-anchor fields:

- `roles` / `rolesArrayAgg`
- `active`
- `archived`
- `email`

Including any of these keys in a `PUT /megadex/users/me` payload returns `403 Field "<field>" cannot be modified via /me`. Omit them from self-service profile forms and use the administrative `PUT /megadex/users` route for role, status, or email changes.

## Unknown or Archived Social Network Error

When `socialsJsonAgg` is sent on `POST /megadex/users`, `PUT /megadex/users`, or `PUT /megadex/users/me`, the PostgreSQL function `set_user_socials()` resolves each key against non-archived rows in the `social` table. If a key does not match an active social network `name`, the database raises an exception.

Check the active catalog with `POST /megadex/socials/search` (filtering `archived = false`) or add the missing platform via `POST /megadex/socials`.

## Role Changes Do Not Take Effect Immediately

When an administrator updates a user's `roles` or sets `active: false` via `PUT /megadex/users`, Megadex revokes the user's cached BFF sessions only if `CONSUMER_URL` is configured (`http://<gatelin-host>:3000/gatelin/consumers`). If `CONSUMER_URL` is unset, the user's existing JWT session in Gatelin remains cached until their access token expires.
