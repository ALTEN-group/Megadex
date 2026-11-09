# Core Concepts

Megadex keeps its HTTP API flat and ergonomic while storing normalized relational data in PostgreSQL. Three database patterns do most of the heavy lifting: **writable views**, **per-user preferences with locked templates**, and **trigger-driven audit logs**.

## The `users` Writable View

In PostgreSQL, user data is normalized across three tables:

1. `"user"` — Core profile columns (`firstName`, `lastName`, `nickname`, `email`, `language`, `active`, `archived`, etc.)
2. `user_role` — Many-to-many join (`userId`, `roleId`) linking a user to Gatelin role IDs
3. `user_social` — Many-to-many join (`userId`, `socialId`, `handle`) linking a user to entries in the `social` catalog

Rather than forcing API clients to orchestrate three separate endpoints on every user create or update, Megadex exposes the **`users` SQL view** with an `INSTEAD OF INSERT OR UPDATE` trigger (`iud_user`):

- **Reads (`POST /megadex/users/search`, `GET /megadex/users/me`)** query the `users` view, which aggregates `user_role.roleId` into an integer array (mapped to `roles` by the API layer) and `user_social` into a JSON object `socialsJsonAgg` keyed by social network name (for example `{ "GitHub": "octocat", "LinkedIn": "octo" }`).
- **Writes (`POST /megadex/users`, `PUT /megadex/users`)** accept `roles` and `socialsJsonAgg` directly in the user payload. The `iud_user` trigger updates the base `"user"` row, reconciles `user_role` rows, and calls `set_user_socials()` to resolve social network names against `social` and upsert/delete `user_social` rows in a single transaction.

## Social Networks Catalog (`social`)

User social handles are validated against the `social` table rather than stored as arbitrary unvalidated keys. Adding support for a new social platform requires only inserting a row into `social` (via `POST /megadex/socials` or the Admin UI) — no schema migration is needed.

When a social network is archived (`POST /megadex/socials/archive`), it is soft-deleted (`archived = true`, `archivedAt = NOW()`). If a user payload references an unknown or archived social network name in `socialsJsonAgg`, the database trigger raises an error.

## Table View Preferences (`preferences`)

The Admin UI allows operators to customize table columns, widths, filters, and sort orders for the `users` and `socials` tables.

Preferences are stored in two tables behind the writable **`preferences` view**:

- `preference` — Stores the JSON configuration (`conf`) for a given `resourceName` (`users` or `socials`). When `userId IS NULL`, the row is a **locked system template** (`locked = true`) shared with all users. When `userId IS NOT NULL`, the row belongs to that specific user (`locked = false`).
- `preference_selection` — Tracks which preference (`preferenceId`) a given `userId` currently has active for a given `resourceName`.

When a user calls `GET /megadex/preferences/:resource`, Megadex returns both all locked templates for `:resource` and that user's personal preferences, computing `isActive` from `preference_selection` (falling back to the `"Default"` template when the user has not made an explicit selection).

Writing to `PUT /megadex/preferences/:resource` uses an `INSTEAD OF` trigger (`iud_preference`) with copy-on-write semantics:

- Selecting a template (`isActive: true` without changing `name` or `conf`) simply updates `preference_selection` for the caller.
- Editing a template's `name` or `conf` leaves the system template untouched and automatically forks a new personal preference row for the caller.
- Each user can store up to **5** personal preferences per resource (`check_preference_limit`).

## Soft Archiving & Nightly Cleanup

Users and social networks are never hard-deleted through the HTTP API. Calling `POST /megadex/users/archive` or `POST /megadex/socials/archive` sets `archived = true` and stamps `archivedAt`.

Two background jobs run daily at UTC:

1. **02:00 UTC (`delete-archived-entities`)** — Permanently deletes `"user"` and `social` rows that have been archived for more than **2 months**, executing as the privileged `DB_JOB_USER` role via `public.delete()`.
2. **03:00 UTC (`delete-old-history`)** — Purges `log.history` rows older than **6 months**.

## Unified Audit Trail (`log.history` & `log.audit`)

Every `INSERT`, `UPDATE`, and `DELETE` on `"user"`, `user_role`, `user_social`, and `social` is recorded in `log.history` along with the acting `userId`, `userName`, operation, timestamp, and full JSONB `record` snapshot.

Two endpoints expose this history:

- **Per-record history (`GET /megadex/users/:id/history`, `GET /megadex/socials/:id/history`)** — For a user, Megadex merges history across `"user"`, `user_role`, and `user_social` so role and social handle changes appear in the user's timeline.
- **Global audit log (`POST /megadex/audit/search`)** — Queries the `log.audit` view, which pairs each history entry with its previous snapshot, computes `action` (`INSERT`, `UPDATE`, `DELETE`, `ARCHIVE`, `RESTORE`), classifies `kind` (`change` vs `routine`), and returns structured `{ field: { from, to } }` diffs.
