# Social Networks API

The `socials` resource manages the catalog of supported social platforms (`social` table). Keys in a user's `socialsJsonAgg` object must match a non-archived `name` in this catalog.

All endpoints are mounted under `/megadex/socials`.

## Search Social Networks

```http
POST /megadex/socials/search
Content-Type: application/json

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

**Response (`200 OK`):**

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
      "name": "GitHub",
      "url": "https://www.github.com",
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

```http
POST /megadex/socials
Content-Type: application/json
x-consumer-user-id: 2
x-consumer-name: admin

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
| `url` | `string` | ⬜ | max `255` chars |

## Update Social Networks

```http
PUT /megadex/socials
Content-Type: application/json
x-consumer-user-id: 2
x-consumer-name: admin

{
  "rows": [
    {
      "id": 2,
      "name": "GitHub",
      "url": "https://github.com"
    }
  ]
}
```

## Archive Social Networks

Soft-deletes one or more social platforms (`archived = true`, `archivedAt = NOW()`). Once archived, a social network can no longer be assigned in `socialsJsonAgg`.

```http
POST /megadex/socials/archive
Content-Type: application/json
x-consumer-user-id: 2
x-consumer-name: admin

{
  "rows": [
    { "id": 12 }
  ]
}
```

**Response:** `204 No Content`

## Get Social Network History & Schema

```http
GET /megadex/socials/:id/history
GET /megadex/socials/schema
```
