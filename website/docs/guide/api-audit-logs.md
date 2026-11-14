# Audit Logs

The `audit` resource exposes a read-only search endpoint over the `log.audit` view (`POST /megadex/audit/search`), powering the Admin UI audit log screen and security compliance queries.

Paths below use Megadex's internal `/megadex/…` mount. A BFF typically exposes the same route publicly under `/api/megadex/audit/search`.

## Search Audit Logs

```
POST /megadex/audit/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "pagination": true,
  "first": 0,
  "limit": 25,
  "sortField": "tstamp",
  "sortOrder": "DESC",
  "filters": {
    "kind": { "value": "change", "matchMode": "=" },
    "tableName": { "value": "user", "matchMode": "=" }
  }
}
```

**Response (200 OK):**

```json
{
  "rows": [
    {
      "id": 42,
      "tstamp": "2026-06-15T14:22:10.123Z",
      "tableName": "user",
      "operation": "UPDATE",
      "action": "UPDATE",
      "userId": 2,
      "userName": "admin",
      "recordId": 5,
      "kind": "change",
      "changes": "job: Engineer → Staff Engineer"
    },
    {
      "id": 41,
      "tstamp": "2026-06-15T14:20:00.000Z",
      "tableName": "social",
      "operation": "UPDATE",
      "action": "ARCHIVE",
      "userId": 2,
      "userName": "admin",
      "recordId": 12,
      "kind": "change",
      "changes": "archived: false → true\narchivedAt: null → 2026-06-15T14:20:00.000Z"
    }
  ],
  "total": 2
}
```

## Response Fields

| Field | Type | Filterable | Description |
|---|---|---|---|
| `id` | `integer` | ✅ | Primary key of the underlying `log.history` entry |
| `tstamp` | `date` | ✅ | Timestamp when the database mutation occurred |
| `tableName` | `string` | ✅ | Audited table (`user`, `user_role`, `user_social`, `social`, `preference`) |
| `operation` | `string` | ✅ | Raw SQL operation: `INSERT`, `UPDATE`, or `DELETE` |
| `action` | `string` | ✅ | High-level action: `INSERT`, `UPDATE`, `DELETE`, `ARCHIVE` (when `archived` changed to `true`), or `RESTORE` (when `archived` changed to `false`) |
| `userId` | `integer` | ✅ | ID of the user who triggered the change (`-1` for system writes) |
| `userName` | `string` | ✅ | Nickname of the user who triggered the change (`"system"` by default) |
| `recordId` | `integer` | ✅ | Primary key (`id`) of the affected row |
| `kind` | `string` | ✅ | `"change"` for meaningful data edits, or `"routine"` for updates that only touch bookkeeping columns |
| `changes` | `string` | ⬜ | One line per field, joined by newlines: `key: previous → new` on updates, `key: value` on inserts and deletes. Values are truncated to 80 characters. Computed by `src/middlewares/mappers/audit-changes.js` |

## Redaction & Privacy

Raw `record`, `previous`, and `changedKeys` columns from `log.audit` are marked `privateField: true` on the `audit` entity. The `buildChanges` middleware (`src/middlewares/mappers/audit-changes.js`) prints sensitive keys as `[redacted]`, skips `id`, `createdAt`, `creatorId`, `creatorName` and null values on inserts and deletes, and removes `record`, `previous`, and `changedKeys` before the response leaves the service.
