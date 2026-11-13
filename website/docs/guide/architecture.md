# Request Flow & Architecture

## Request Pipeline

```
Client / BFF Request
    ↓
[express.json] - JSON body parsing, 100kb limit
    ↓
[/megadex/health] - Liveness + DB readiness (registered first, bypasses everything else)
    ↓
[startTimer] - Performance measurement
    ↓
[JSON routers]
    ├── /megadex/audit        → enforceAcl(auditEnt, "search") → auditEnt.get → buildChanges → send(auditEnt)
    ├── /megadex/users        → search / me / create / update / archive / schema / history     → send(userEnt)
    ├── /megadex/preferences  → requireConsumer → mapConsumer → preference CRUD                → send(preferenceEnt)
    ├── /megadex/socials      → social catalog CRUD                                            → send(socialEnt)
    ├── /megadex/countries    → enforceAcl(country, "search") → country.get                    → send(country)
    ├── /megadex/civilities   → enforceAcl(civility, "search") → civility.get                  → send(civility)
    └── /megadex/genders      → enforceAcl(gender, "search") → gender.get                      → send(gender)
    ↓
[errorHandler]
```

**Health is registered before the timer and every router**, so a liveness probe never depends on anything else working. `/megadex/health` is dependency-free; `/megadex/health/ready` additionally runs `SELECT 1` against Postgres so an instance that lost its database leaves rotation instead of failing requests.

## Response & Mapping Middlewares

Every JSON router ends in the terminal `send(entity)` middleware (`src/middlewares/res/send.js`), which enforces privacy and field projection at the boundary:

| Middleware | Used by | Role |
|---|---|---|
| `rolesToDatabase` / `rolesToApi` / `rolesToSchema` | `users` | Maps public `roles` (`int[]`) to/from the private database column `rolesArrayAgg` on the `users` view, and exposes `roles` in `/megadex/users/schema`. |
| `buildChanges` | `audit` | Builds the `changes` text (`key: previous → new`, one line per field) from `log.audit` snapshots and redacts sensitive keys. |
| `send(userEnt)` | `users` | Strips `rolesArrayAgg` (`privateField: true`) and projects `x-acl-fields`. |
| `send(preferenceEnt)` | `preferences` | Strips `userId` (`privateField: true`) and projects `x-acl-fields`. |
| `send(auditEnt)` | `audit` | Strips raw `record`, `previous`, and `changedKeys` (`privateField: true`) so only computed `changes` leave the service. |

## ACL, Consumer & Privilege Boundaries

Megadex carries no JWT or session logic of its own. Authentication and route permission checks happen in the BFF. Megadex then enforces the consumer identity, field allow-lists, row conditions, and role hierarchy at its own data boundary:

- `x-consumer-user-id` and `x-consumer-name` are validated by `requireConsumer` and mapped to `res.locals.consumer`, allowing `@dwtechs/antity-pgsql` and database triggers to stamp `creatorId`, `creatorName`, `updaterId`, `updaterName`, and `log.history` on every write.
- `x-acl-fields` filters incoming write rows before entity validation and projects outgoing rows, schema descriptors, and history `record` snapshots. `id` is always retained. An omitted header is unrestricted; an empty header allows only `id`.
- `x-acl-conditions` is a JSON array of `{ field, op, value }`. Search predicates are forced into the query with `AND`. Inserts must satisfy the partition (an absent equality field is injected), and update/archive/history target IDs are checked before the operation. Updates cannot move a row outside its partition.
- `assertSuperAdminCeiling` queries `user_role` on `POST /megadex/users`, `PUT /megadex/users`, and `POST /megadex/users/archive` to guarantee that only a caller holding role `1` (**Super admin**) can assign role `1` or modify/archive an existing user who holds role `1`.

Malformed ACL or consumer headers, unknown/non-filterable fields, and unsupported operators fail closed with **403**.

## Where Megadex Sits

```
┌─────────────────────────────────────────────────┐
│                  Reverse Proxy                   │
│                    (Traefik)                     │
│              http://your-domain.com              │
└────────────┬─────────────────────┬───────────────┘
             │                     │
   ┌─────────▼─────────┐  ┌────────▼──────────┐
   │   Admin Panel     │  │   BFF (Gatelin)   │
   │   /megadex/*      │  │   /api/*          │
   │   (Angular)       │  │   (Node.js)       │
   └───────────────────┘  └────────┬──────────┘
                                   │  internal network only
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
   ┌────────▼──────────┐           │             ┌────────▼──────────┐
   │      Megadex      │◄──────────┴─────────────┤      Foxnox       │
   │     /megadex      │     USER_SEARCH_URL     │  /foxnox  /web    │
   │     (Node.js)     ├────────────────────────►│     (Node.js)     │
   └────────┬──────────┘     PWD_CREATE_URL      └───────────────────┘
            │
   ┌────────▼──────────┐
   │   PostgreSQL 16   │
   │   (megadex DB)    │
   └───────────────────┘
```

Megadex has **no public API route**. Every external request reaches it through a BFF, while internal services (Gatelin and Foxnox) call `/megadex/users/search` directly on the internal network to resolve email addresses to user IDs.

## User Lifecycle, End to End

Creating, updating, or archiving a user involves Megadex, Foxnox, and Gatelin over the internal network:

```mermaid
sequenceDiagram
    participant A as Admin Browser
    participant G as BFF (Gatelin)
    participant M as Megadex
    participant F as Foxnox

    A->>G: POST /api/megadex/users { rows: [{ email, firstName, lastName, nickname, roles }] }
    G->>M: POST /megadex/users (+ x-consumer-*, x-acl-*)
    M->>M: assertSuperAdminCeiling + INSERT INTO users view (user + user_role + user_social)
    M->>F: POST /foxnox/pwd { rows: [{ userId }] } (PWD_CREATE_URL)
    alt Foxnox succeeds
        F-->>M: 200 OK
        M-->>G: 200 { rows: [created user] }
        G-->>A: 200 { rows: [created user] }
    else Foxnox fails
        F-->>M: error
        M->>M: UPDATE users SET active = false, archived = true
        M-->>G: 5xx / 4xx error
    end
```

When an administrator later deactivates that user (`active: false`), changes their `roles`, or archives them (`POST /megadex/users/archive`), Megadex does not revoke the user's cached Gatelin session. Archived or inactive users cannot refresh their sessions, which remain usable until the current access token expires.

## Background Jobs

Started with the process, before the HTTP listener, using a dedicated pool (`DB_JOB_USER`):

- **Delete archived entities** — daily 02:00 UTC; hard-deletes `"user"` and `social` rows archived for more than 2 months via `public.delete()`
- **Delete old history** — daily 03:00 UTC; removes `log.history` rows older than 6 months

## Technology

| Layer | Choice |
|---|---|
| Runtime | Node.js 24, ES modules |
| HTTP | Express 5, `@dwtechs/servpico-express` |
| Database | PostgreSQL 16, via `@dwtechs/antity-pgsql` |
| Migrations | Liquibase |
| Validation | `@dwtechs/checkard` |
| Logging | `@dwtechs/winstan` |
| Admin UI | Angular 22 with OpenNG Optimus UI and `@dwtechs/ngx-crud-builder` |
