# Database & Migrations

Megadex uses **PostgreSQL 16** and manages schema changes, functions, views, triggers, and reference data through **Liquibase**.

## Entity Relationship Diagram

```mermaid
erDiagram

  user ||--o{ user_role : "userId"
  user ||--o{ user_social : "userId"
  social ||--o{ user_social : "socialId"
  preference ||--o{ preference_selection : "preferenceId"
  history ||--|| audit : "log.audit view"

  user {
    int id PK
    gender gender
    civility civility
    string firstName
    string middleName
    string lastName
    string nickname UK
    string email UK
    string backupEmail
    string address
    string zipCode
    string city
    country country
    country nationality
    string phone
    date birthdate
    string portrait
    language language
    string job
    string company
    string website
    timestamptz gdprConsentedAt
    timestamptz marketingConsentedAt
    boolean active
    boolean archived
    timestamptz archivedAt
    timestamptz createdAt
    int creatorId
    string creatorName
    timestamptz updatedAt
    int updaterId
    string updaterName
  }

  user_role {
    int userId PK, FK
    int roleId PK "Gatelin role id, no FK"
  }

  user_social {
    int userId PK, FK
    int socialId PK, FK
    string handle
  }

  social {
    int id PK
    string name UK
    string url
    boolean archived
    timestamptz archivedAt
    timestamptz createdAt
    int creatorId
    string creatorName
    timestamptz updatedAt
    int updaterId
    string updaterName
  }

  preference {
    int id PK
    int userId "NULL = locked template"
    string resourceName UK
    string name UK
    jsonb conf
    timestamptz createdAt
    int creatorId
    string creatorName
    timestamptz updatedAt
    int updaterId
    string updaterName
  }

  preference_selection {
    int userId PK
    string resourceName PK
    int preferenceId FK
  }

  country_trans {
    country code PK
    language lang PK
    string trans
    string nationality
  }

  civility_trans {
    civility code PK
    language lang PK
    string trans
    string abbr
  }

  gender_trans {
    gender code PK
    language lang PK
    string trans
    string abbr
  }

  history {
    int id PK
    timestamp tstamp
    string schemaName
    string tableName
    string operation
    string dbUser
    int userId
    string userName
    jsonb record
  }

  audit["log.audit VIEW"] {
    int id
    timestamp tstamp
    string tableName
    string operation
    string action
    int userId
    string userName
    int recordId
    string[] changedKeys
    string kind
    jsonb record
    jsonb previous
  }
```

## Database Views

Megadex exposes three primary SQL views:

| View | Schema | Type | Purpose |
|---|---|---|---|
| `users` | `public` | Writable (`INSTEAD OF INSERT OR UPDATE`) | Joins `"user"` with aggregated `rolesArrayAgg` (`user_role`) and `socialsJsonAgg` (`user_social` + `social`). |
| `preferences` | `public` | Writable (`INSTEAD OF INSERT OR UPDATE OR DELETE`) | Merges locked templates (`userId IS NULL`) and personal preferences with `isActive` from `preference_selection`. |
| `audit` | `log` | Read-only | Enriches `log.history` with the previous snapshot (`LATERAL` lookup), changed keys, `action` (`ARCHIVE`/`RESTORE`), and `kind` (`change`/`routine`). |

## Least-Privilege Database Roles

The Liquibase entrypoint (`db/liquibase/entrypoint.sh`) provisions two distinct PostgreSQL roles with least-privilege grants:

1. **`DB_USER` (Application role)**:
   - `SELECT, INSERT, UPDATE` on `"user"`, `social`, `users`
   - `SELECT, INSERT, UPDATE, DELETE` on `user_role`, `user_social`, `preference`, `preference_selection`, `preferences`
   - `SELECT` on `country_trans`, `civility_trans`, `gender_trans`, `log.history`, `log.audit`
   - `INSERT` on `log.history`
   - `EXECUTE` on `public.set_archived(text, integer, text, integer[])` (cannot hard-delete `"user"` or `social` rows)
2. **`DB_JOB_USER` (Cron maintenance role)**:
   - `EXECUTE` on `public.delete(text, timestamptz)` (`SECURITY DEFINER` function that hard-deletes rows where `archived = TRUE AND archivedAt < cutoff`)
   - `DELETE, SELECT` on `log.history`

## Custom Seed Data

In development or custom deployments, mount a directory containing a Liquibase `changelog.xml` at `/liquibase/data` on the `megadex-migration` container. The entrypoint automatically runs `/liquibase/data/changelog.xml` after the core schema and reference catalogs have been applied.
