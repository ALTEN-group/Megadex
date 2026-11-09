# Tests

Run from the project root:

```sh
npm test                  # all suites
npm run test:watch        # watch mode
npm run test:coverage     # coverage under tests/coverage/
./scripts/test-db.sh      # PostgreSQL contracts (host Docker, not Jest)
```

## Suites

### JSON API routes & middlewares

| File | What it covers |
|------|----------------|
| `app.test.js` | End-to-end Express app routes (`/megadex` and `/users` mounts, `/me`, roles mapping, history, preferences) |
| `routes/crud-resources.test.js` | Parameterized wiring for `users` and `socials` (search, history, add, update, archive, schema + ACL header wiring) |
| `routes/audit.test.js` | `POST /megadex/audit/search` wiring, read-only surface, private fields never reach the response |
| `routes/health.test.js` | Real `app.js`: `/megadex/health` liveness + `/ready` db probe (mocked pg-pool); proves healix is mounted before `startTimer` |
| `middlewares/acl.test.js` | Unit: Gatelin `x-acl-conditions`, `x-acl-fields`, and `x-consumer-*` enforcement across search/insert/existing modes |
| `middlewares/res/send.test.js` | Unit: `isPrivate` stripping, nested history `record`, `x-acl-fields` projection |
| `middlewares/mappers/audit-changes.test.js` | Unit: `changes` text per operation, secret/private field redaction, truncation |
| `middlewares/mappers/preference/*.test.js` | Unit: preference ownership preflight (`assertRowsOwnedOrTemplate`), view list (`getPreferences`), and ownership stamping (`injectUserIdAndResourceName`) |
| `middlewares/filters/byIdAndUserIdAndResource.test.js` | Unit: preference delete filter construction |

### Entities, jobs & configuration

| File | What it covers |
|------|----------------|
| `entities.test.js` | Unit: `property` normalizers and `rolesToSchema` |
| `entities/preference.test.js` | Unit: `preference` entity `conf` JSON normalization and validation |
| `entities/audit-readonly.test.js` | Unit: `readOnly` enforcement on `audit` and audit timestamp fields (`archivedAt`, `createdAt`, `updatedAt`) |
| `jobs/scheduler.test.js` | Unit: daily UTC scheduling, overlap protection, error recovery |
| `jobs/delete-archived-entities.test.js` | Unit: archived entities cleanup job |
| `jobs/delete-old-history.test.js` | Unit: old history cleanup job |
| `conf/env.test.js` | Unit: startup environment validation (`DB_JOB_USER`, `DB_JOB_PWD`, `ADMIN_PORT`, `ADMIN_BASE_PATH`) |
| `admin-server.test.js` | Unit: bundled admin UI base path normalization and runtime config injection |
| `contracts/errandler-express-error-shape.test.js` | Contract: `@dwtechs/errandler-express` `{ statusCode, message }` error shape |

### PostgreSQL contracts

SQL files under `tests/db/` run against a disposable migrated database via `./scripts/test-db.sh`.
