# Social Networks

The `socials` resource manages the catalog of supported social platforms (`social` table). Keys in a user's `socialsJsonAgg` object must match a non-archived `name` in this catalog.

Paths below use Megadex's internal `/megadex/…` mount. Gatelin typically exposes the same routes publicly under `/api/megadex/…`.

## Search Social Networks

```
POST /megadex/socials/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "pagination": true,
  "first": 0,
  "limit": 20,
  "sortField": "name",
  "sortOrder": "ASC",
  "filters": {
    "archived": { "value": false, "matchMode": "=" }
  }
}
```

**Response (200 OK):**

```json
{
  "rows": [
    {
      "id": 1,
      "name": "Facebook",
      "url": "https://www.facebook.com",
      "archived": false,
      "archivedAt": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "creatorName": "system",
      "updatedAt": null,
      "updaterName": null
    },
    {
      "id": 2,
      "name": "Instagram",
      "url": "https://www.instagram.com",
      "archived": false,
      "archivedAt": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "creatorName": "system",
      "updatedAt": null,
      "updaterName": null
    }
  ],
  "total": 2
}
```

## Create Social Networks

Adds one or more social platforms to the catalog. `name` is case-insensitively unique (`ux_social_name`).

```
POST /megadex/socials
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "name": "Bluesky",
      "url": "https://bsky.app"
    }
  ]
}
```

| Field | Type | Required on `POST` | Constraints |
|---|---|---|---|
| `name` | `string` | ✅ | `1..50` chars, unique on `lower(name)` |
| `url` | `string` | ⬜ | max `255` chars, empty or a valid `http(s)` URL |

## Update Social Networks

```
PUT /megadex/socials
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "id": 7,
      "name": "GitHub",
      "url": "https://github.com"
    }
  ]
}
```

## Get Social Network History

```
GET /megadex/socials/:id/history
Authorization: Bearer <access_token>
```

Returns the audit trail for one social platform row from `log.history`.

## Archive Social Networks

```
POST /megadex/socials/archive
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 12 }
  ]
}
```

**Response (200 OK, empty `rows`):** rows are soft-deleted (`archived = true`, `archivedAt = NOW()`). Once archived, a social network can no longer be assigned in `socialsJsonAgg`, and the nightly cleanup job deletes it after two months.

## Restore Social Networks

```
POST /megadex/socials/restore
```

Restores archived social networks.

## Get Entity Schema

```
GET /megadex/socials/schema
Authorization: Bearer <access_token>
```
