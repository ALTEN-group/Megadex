# Security & ACLs

Megadex relies on a **defense-in-depth** model combining network isolation, BFF-forwarded Access Control Lists (ACLs), consumer attribution headers, and least-privilege PostgreSQL roles.

## Network Trust Boundary

Megadex does not verify JWT signatures directly. Instead, your Backend for Frontend (such as [Gatelin](https://gatelin.fr)) authenticates the caller, evaluates route permissions, and forwards the request over an isolated internal network with trusted HTTP headers:

| Header | Purpose |
|---|---|
| `x-consumer-user-id` | Numeric user ID of the authenticated caller (positive integer) |
| `x-consumer-name` | Nickname/identifier of the authenticated caller (`1..100` chars) |
| `x-acl-fields` | Comma-separated list of fields the caller's role is allowed to read or write |
| `x-acl-conditions` | JSON array of row-level partition rules `[{ "field": "...", "op": "=", "value": "..." }]` |

Because Megadex trusts these headers, **never expose port `3000` publicly**. Only the BFF and internal services (such as Foxnox calling `USER_SEARCH_URL`) should be able to reach the Megadex API container.

## Fail-Closed Consumer & ACL Enforcement (`src/middlewares/acl.js`)

Megadex validates all incoming consumer and ACL headers strictly and fails closed with `401` or `403` on any anomaly:

1. **Consumer identity (`requireConsumer`)**:
   - Every mutating endpoint (`POST`, `PUT`, `DELETE`, `/archive`) and personal endpoint (`/users/me`, `/preferences/:resource`) requires a valid `x-consumer-user-id` (positive integer) and `x-consumer-name` (non-empty string up to 100 characters).
   - Missing consumer headers return `401 Unauthorized`; malformed consumer headers return `403 Forbidden`.
   - `res.locals.consumer` is passed to `@dwtechs/antity-pgsql` so `creatorId`, `creatorName`, `updaterId`, `updaterName`, and `log.history` (`userId`, `userName`) are stamped automatically on every database write.
2. **Field allow-list (`x-acl-fields`)**:
   - When `x-acl-fields` is omitted, all public entity fields are allowed.
   - When `x-acl-fields` is present, every field name must exist on the target `SQLEntity`, must not be marked `privateField: true`, and must not be `"rolesArrayAgg"` (callers must use the public `"roles"` alias). Unknown or private field names are rejected with `403 Forbidden`.
   - On writes (`insert` / `existing`), incoming payload keys are stripped to the allowed field set before entity validation.
   - On reads (`search`, `output`, `history`), outgoing rows, schema definitions, and history `record` snapshots are projected to the allowed field set (`id` is always retained).
3. **Row-level conditions (`x-acl-conditions`)**:
   - Supports operators `=`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `contains`, `startsWith`, `endsWith`, `isNull`, and `isNotNull` on filterable entity properties.
   - On **searches**, conditions are injected into the query's `WHERE` clause with `AND`.
   - On **inserts**, every incoming row must satisfy all conditions (missing equality fields are automatically populated with the condition value).
   - On **updates, archives, and history lookups**, Megadex runs a pre-flight `SELECT id` verifying that every targeted row ID belongs to the caller's partition (`403` if any row is outside the partition) and rejects updates that would move a row out of its partition.

## Preference Ownership Isolation

Table preferences (`src/routes/preference.js`) enforce strict per-user isolation:

- `POST /preferences/:resource` overwrites `userId` on every incoming row with the authenticated `res.locals.consumer.userId`.
- `PUT /preferences/:resource` runs `assertRowsOwnedOrTemplate`, rejecting with `404` any batch that references a row ID not belonging to `:resource` or owned by another user.
- `DELETE /preferences/:resource/:id` filters by `(id, userId, resourceName)` and database trigger `check_preference_template_delete` blocks deleting system templates (`userId IS NULL`).

## Database Privilege Separation

Even if an application route had a bug, the `DB_USER` PostgreSQL role used by the HTTP server **has no `DELETE` privilege** on `"user"`, `social`, or `log.history`. Hard deletion of expired archived rows and old history records is restricted to `DB_JOB_USER` running scheduled maintenance jobs.
