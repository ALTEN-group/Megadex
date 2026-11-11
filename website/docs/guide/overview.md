# Overview

Megadex is the user-profile, preference, and reference-data service for a microservices architecture. It owns everything that describes **who a user is**, so that authentication and business services can refer to users by a numeric `userId`:

- 👤 **User profiles** — Identity, contact details, language, portrait, and GDPR/marketing consent timestamps
- 🎭 **Role assignments** — Role IDs stored in `user_role` and exposed directly on user payloads as `roles`
- 🔗 **Social network links** — User handles stored in `user_social` and exposed directly on user payloads as `socialsJsonAgg`
- 🌐 **Social networks catalog** — Supported social platforms (`social`) managed as data without schema migrations
- 🗂️ **Table view preferences** — Per-user saved grid configurations (`preferences`) merged with locked system templates
- 🌍 **Reference lookups** — Localized read-only catalogs for `countries`, `civilities`, and `genders` in English and French
- 📜 **History & audit logs** — Trigger-backed change history (`log.history`) and structured field-level diffs (`log.audit`)
- 🎛️ **Front-end admin** — Manage users, roles, social network catalogs, and audit logs through an Angular web interface
- 🛡️ **BFF ACL enforcement** — Enforce field allow-lists (`x-acl-fields`), row conditions (`x-acl-conditions`), and consumer attribution forwarded by the BFF

## What Megadex Is Not

Megadex deliberately stops at user profiles, preferences, and reference catalogs. **Password hashes, 2FA secrets, recovery tokens, and trusted devices** belong to your password service (such as [Foxnox](https://foxnox.fr)). When configured with [`PWD_CREATE_URL`](./configuration), Megadex automatically provisions or archives the corresponding password entry in Foxnox when a user is created or archived.

Megadex also does not issue sessions or verify JWTs. A **Backend for Frontend** sits in front of it, resolves emails to user IDs via `/megadex/users/search` during login, issues JWT sessions, and forwards authenticated requests with ACL and consumer headers. [Gatelin](https://gatelin.fr) is the reference BFF used in these docs and in the Compose examples; any BFF that speaks the same HTTP contract works.

## Key Concepts

### The `users` writable view

User data is normalized across three PostgreSQL tables — `"user"`, `user_role`, and `user_social` — and exposed through a single writable **`users` view** backed by an `INSTEAD OF INSERT OR UPDATE` trigger (`iud_user`):

- `roles` — integer array of assigned role IDs (mapped to `"rolesArrayAgg"` in SQL)
- `socialsJsonAgg` — JSON object of `{ "<NetworkName>": "<handle>" }` pairs validated against the active `social` catalog

Because a single row carries the profile, role IDs, and social handles together, the BFF only needs one call to `/megadex/users/search` at sign-in to resolve an email address and load the user's roles. And administrative or self-service updates can modify profile fields, roles, and social links in a single `POST` or `PUT`. See [Users](./api-users).

### Lifecycle synchronization

When a user is created, deactivated, role-updated, or archived, Megadex keeps upstream authentication services in sync when their internal URLs are configured:

- **User creation (`POST /megadex/users`)** — Calls `PWD_CREATE_URL` to provision a password record in Foxnox. If provisioning fails, the newly inserted user is automatically soft-archived so an unprovisioned account is never left active.
- **Role change or deactivation (`PUT /megadex/users`)** — Calls `CONSUMER_URL` to revoke the user's active Gatelin sessions immediately when `active` becomes `false` or `roles` changes.
- **User archival (`POST /megadex/users/archive`)** — Archives the user's Foxnox password record and revokes their active Gatelin sessions in parallel.

### Super-admin role ceiling

Role `1` is reserved for the **Super admin** role. Megadex enforces a strict privilege ceiling (`assertSuperAdminCeiling`) on user creation, update, and archival:

- Only a caller who currently holds role `1` may assign role `1` to a user.
- Only a caller who currently holds role `1` may modify or archive an existing user who holds role `1`.

### Social networks catalog

Supported social networks live in the `social` table rather than in application code or enum types. Adding a new platform via `POST /megadex/socials` immediately makes it available on user profiles and in the Admin UI user form. Archiving a platform prevents new handles from being assigned to it while preserving historical records. See [Social Networks](./api-socials).

### Table view preferences

Administrators can customize column order, column widths, active filters, and sort order on the Admin UI tables. Preferences are stored in `preference` and `preference_selection` behind the writable **`preferences` view**:

- Rows with `userId IS NULL` are **locked system templates** (`Default`, `Identity`, `Contact`, `Location`, `Professional`, `Consent & Status`).
- Editing a locked template automatically forks a personal preference row for the caller (copy-on-write), up to 5 personal views per user and per table. See [Preferences](./api-preferences).

### Reference lookups

Countries (with nationalities), civilities, and genders are stored as ISO/standard codes with localized labels in `country_trans`, `civility_trans`, and `gender_trans` (seeded in English and French). Frontends query them through `/megadex/countries/search`, `/megadex/civilities/search`, and `/megadex/genders/search` filtered by `lang`. See [Reference Lookups](./api-lookups).
