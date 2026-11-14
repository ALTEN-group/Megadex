# Integration

Megadex does not sit on the public internet by itself. Getting it working means wiring up three connections: a **Backend for Frontend** in front of it, your **password service** beside it, and the **route and permission seeds** on the BFF.

The BFF authenticates callers, issues sessions, and proxies `/megadex/*`. The examples below use generic names (`bff`, `password-service`); any BFF or credential store that speaks the same HTTP contract works the same way.

## 1. Point the BFF and Password Service at Megadex

Both the BFF (on login) and the password service (on password recovery, account unlock, and 2FA recovery) resolve an email address to a numeric `userId` by calling `POST /megadex/users/search` on the internal Docker network:

```
USER_SEARCH_URL=http://my-project-megadex-local:3000/megadex/users/search
```

When `/megadex/users/search` is called on the internal network without `x-consumer-*` headers, Megadex automatically defaults `filters.archived` to `false` so archived accounts are never matched during login or recovery.

## 2. Point Megadex at the Password Service and the BFF

When an administrator creates or archives a user in Megadex, Megadex can synchronize the corresponding password record in the password service:

```
PWD_CREATE_URL=http://my-project-password-service-local:3000/pwd
```

| Endpoint | Triggered by | What it does |
|---|---|---|
| the password service's create endpoint (`PWD_CREATE_URL`) | `POST /megadex/users` | Generates and stores a password hash in the password service for each new user. If the password service is unreachable or rejects the request, Megadex soft-archives the newly inserted user row so no account is left active without credentials. |
| the password service's archive endpoint (derived from `PWD_CREATE_URL`) | `POST /megadex/users/archive` | Archives the user's password row in the password service so it stops matching logins. |

Megadex does not revoke BFF sessions after role changes, deactivation, or archival. Existing sessions remain usable until their access tokens expire.

## 3. Register Megadex with the BFF (seed data / route registration)

The BFF only forwards requests that match a registered route, so Megadex's endpoints have to exist as rows in the BFF's database. A Megadex checkout ships this BFF seed data under `db/liquibase/` (the BFF seed folder); mount that folder into the BFF's migration container.

```yaml
bff_migration:
  image: <bff-migration-image>
  volumes:
    - ./db/liquibase/<bff-seed-folder>/:/liquibase/data
```

The seed registers:

| Changeset | What it adds |
|---|---|
| `01-service.sql` | The `megadex` service with an empty pattern because Megadex mounts its routers under `/megadex/*` |
| `02-resource.sql` | Resources `megadex/users`, `megadex/preferences`, `megadex/socials`, `megadex/countries`, `megadex/civilities`, `megadex/genders`, `megadex/audit` |
| `03-route.sql` | The 27 protected JSON routes (route IDs `82`–`108`): user CRUD, `/megadex/users/me` (`GET` and `PUT`), user/social restore, preferences CRUD, socials CRUD, reference lookup searches and schemas, and audit search |
| `04-permission.sql` | Grants all Megadex routes to **Super admin** (role 1) and **Admin** (role 2), grants self-service `/megadex/users/me` (`GET` and `PUT`) to every non-archived role, and exposes restore routes to the administrator roles |
| `05-cors.sql` | Allowed browser origins (CORS whitelist) |

### Route summary (`03-route.sql`)

| Route ID | Resource | Pattern | Method | Operation |
|---|---|---|---|---|
| `82`–`87` | `megadex/users` | `/search`, `/:id/history`, ``, `/archive`, `/schema` | `POST`/`GET`/`PUT` | User CRUD, history & schema |
| `88`–`91` | `megadex/preferences` | `/:resource`, `/:resource/:id` | `GET`/`POST`/`PUT`/`DELETE` | Table view preferences CRUD |
| `92`–`97` | `megadex/socials` | `/search`, `/:id/history`, ``, `/archive`, `/schema` | `POST`/`GET`/`PUT` | Social networks catalog CRUD |
| `98`–`103` | `megadex/countries`, `civilities`, `genders` | `/search`, `/schema` | `POST`/`GET` | Localized reference lookups |
| `104` | `megadex/audit` | `/search` | `POST` | Global audit log search |
| `105`–`106` | `megadex/users` | `/me` | `PUT` / `GET` | Self-service profile read & update |
| `107`–`108` | `megadex/users`, `megadex/socials` | `/restore` | `POST` | Restore archived users and social networks |

### Consumer and ACL headers

For protected JSON routes, the BFF forwards the caller's identity and any resolved data restrictions:

| Header | Megadex enforcement |
|---|---|
| `x-consumer-user-id` | Required on all mutating routes, `/users/me`, and `/preferences/*`. Used for self-service scoping, super-admin ceiling checks, and audit attribution (`creatorId` / `updaterId`). |
| `x-consumer-name` | Required alongside `x-consumer-user-id`. Stamped into `creatorName`, `updaterName`, and `log.history.userName`. |
| `x-acl-fields` | Filters write rows before validation and projects read rows, history snapshots, and schema fields. Omitted is unrestricted; empty means only `id`. |
| `x-acl-conditions` | Forces search predicates with `AND`, constrains inserts, and checks update/archive/history IDs before access. |

Keep Megadex and the BFF on the same trusted internal network and give Megadex no public Traefik API router, host port, or external load-balancer target.

## Verifying the Integration

Work through these in order — each one depends on the last:

```bash
# 1. Megadex is up and can reach its database
docker exec my-project-megadex-local wget -qO- http://localhost:3000/megadex/health/ready

# 2. The BFF can reach Megadex (generic example)
docker exec my-project-bff-local nc -zv my-project-megadex-local 3000

# 3. Internal user search resolves a seeded user
docker exec my-project-bff-local wget -qO- \
  --header='Content-Type: application/json' \
  --post-data='{"filters":{"email":{"value":"admin@example.com","matchMode":"="}}}' \
  http://my-project-megadex-local:3000/megadex/users/search

# 4. Authenticated self-service profile works through the BFF
curl -i http://localhost:8100/api/megadex/users/me \
  -H "Authorization: Bearer <access_token>"
```
