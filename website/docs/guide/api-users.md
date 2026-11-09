# Users API

The `users` resource manages user profiles, aggregated role assignments (`roles`), and social network handles (`socialsJsonAgg`) through the writable `users` PostgreSQL view.

All endpoints are mounted under `/megadex/users` (and typically exposed by the BFF under `/api/megadex/users`).

## Search Users

Queries the `users` view with optional pagination, sorting, and field filters. This endpoint is also called internally by the BFF (`USER_SEARCH_URL`) and Foxnox to resolve an email address to a `userId` and role list during login or recovery.

```http
POST /megadex/users/search
Content-Type: application/json

{
  "pagination": true,
  "first": 0,
  "limit": 10,
  "sortField": "lastName",
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
      "id": 2,
      "gender": "M",
      "civility": "MR",
      "firstName": "John",
      "middleName": null,
      "lastName": "Doe",
      "nickname": "jdoe",
      "email": "john.doe@example.com",
      "backupEmail": null,
      "address": "10 Main St",
      "zipCode": "75001",
      "city": "Paris",
      "country": "FR",
      "nationality": "FR",
      "phone": "+33123456789",
      "birthdate": "1990-05-15",
      "portrait": null,
      "language": "en",
      "job": "Engineer",
      "company": "ALTEN",
      "website": "https://example.com",
      "gdprConsentedAt": "2026-01-10T08:00:00.000Z",
      "marketingConsentedAt": null,
      "active": true,
      "archived": false,
      "archivedAt": null,
      "createdAt": "2026-01-10T08:00:00.000Z",
      "creatorName": "system",
      "updatedAt": null,
      "updaterName": null,
      "roles": [1, 2],
      "socialsJsonAgg": {
        "GitHub": "jdoe",
        "LinkedIn": "john-doe"
      }
    }
  ],
  "total": 1
}
```

## Get Current User Profile (`/me`)

Returns the authenticated caller's essential identity and roles, resolved from the `x-consumer-user-id` header injected by the BFF. Archived users return `404`.

```http
GET /megadex/users/me
x-consumer-user-id: 2
x-consumer-name: jdoe
```

**Response (`200 OK`):**

```json
{
  "id": 2,
  "firstName": "John",
  "lastName": "Doe",
  "nickname": "jdoe",
  "email": "john.doe@example.com",
  "active": true,
  "roles": [1, 2]
}
```

## Create Users

Creates one or more users along with their `roles` and `socialsJsonAgg` handles in a single transaction via the `iud_user` `INSTEAD OF INSERT` trigger.

```http
POST /megadex/users
Content-Type: application/json
x-consumer-user-id: 2
x-consumer-name: admin

{
  "rows": [
    {
      "firstName": "Alice",
      "lastName": "Martin",
      "nickname": "amartin",
      "email": "alice.martin@example.com",
      "language": "fr",
      "active": true,
      "roles": [3],
      "socialsJsonAgg": {
        "GitHub": "alice-m"
      }
    }
  ]
}
```

### Required Fields on `POST`

| Field | Type | Constraints |
|---|---|---|
| `firstName` | `string` | `1..50` chars |
| `lastName` | `string` | `1..50` chars |
| `nickname` | `string` | `1..30` chars, case-insensitively unique (`lower(nickname)`) |
| `email` | `email` | `5..50` chars, case-insensitively unique (`lower(email)`) |

## Update Users

Updates one or more users by `id`. Sending `roles` replaces the user's `user_role` rows; sending `socialsJsonAgg` reconciles the user's `user_social` handles (setting a key to `null` or `""` removes that social handle; omitting `socialsJsonAgg` leaves existing handles unchanged).

```http
PUT /megadex/users
Content-Type: application/json
x-consumer-user-id: 2
x-consumer-name: admin

{
  "rows": [
    {
      "id": 5,
      "job": "Staff Engineer",
      "roles": [2, 3],
      "socialsJsonAgg": {
        "GitHub": "alice-martin",
        "LinkedIn": "alice-martin"
      }
    }
  ]
}
```

## Archive Users

Soft-deletes one or more users (`archived = true`, `archivedAt = NOW()`). Archived users are excluded from `/me` and purged after 2 months by the nightly cleanup job.

```http
POST /megadex/users/archive
Content-Type: application/json
x-consumer-user-id: 2
x-consumer-name: admin

{
  "rows": [
    { "id": 5 }
  ]
}
```

**Response:** `204 No Content`

## Get User History

Returns the combined change history for user `:id` across `"user"`, `user_role`, and `user_social`.

```http
GET /megadex/users/2/history
```

## Get User Schema

Returns the field descriptors for the `users` entity (with `rolesArrayAgg` mapped to `roles` for API consumers).

```http
GET /megadex/users/schema
```
