# Users

The `users` resource manages user profiles, aggregated role assignments (`roles`), and social network handles (`socialsJsonAgg`) through the writable `users` PostgreSQL view.

Paths below use Megadex's internal `/megadex/…` mount. Gatelin typically exposes the same routes publicly under `/api/megadex/…`; a custom BFF may use another public prefix.

## Search Users

Queries the `users` view with optional pagination, sorting, and field filters. This endpoint is also called internally by the BFF (`USER_SEARCH_URL`) and Foxnox to resolve an email address to a `userId` and role list during login or account recovery. When called without `x-consumer-*` headers, Megadex automatically defaults `filters.archived` to `false`.

```
POST /megadex/users/search
Content-Type: application/json
Authorization: Bearer <access_token>

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

**Response (200 OK):**

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

## Get Current User (`/me`)

Returns the authenticated caller's profile, roles, and social handles, resolved from the `x-consumer-user-id` header injected by the BFF. Archived users return **404**.

```
GET /megadex/users/me
Authorization: Bearer <access_token>
```

**Response (200 OK):** the single user object (including `roles` and `socialsJsonAgg`).

## Update Current User (`/me`)

Updates the authenticated caller's own profile fields and social handles. Megadex pins `id` to the caller's `userId` and rejects privilege-escalation or identity-anchor fields (`roles`, `rolesArrayAgg`, `active`, `archived`, `email`) with **403 Forbidden**.

```
PUT /megadex/users/me
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+33123456789",
  "socialsJsonAgg": {
    "GitHub": "jdoe"
  }
}
```

**Response (200 OK):** `{ "rows": [updatedUser] }`.

## Create Users

Creates one or more users along with their `roles` and `socialsJsonAgg` handles in a single transaction via the `iud_user` `INSTEAD OF INSERT` trigger.

When `PWD_CREATE_URL` is configured, Megadex also provisions a password row in Foxnox for each created user (and soft-archives the new user row if provisioning fails). Assigning role `1` (**Super admin**) requires the caller to hold role `1` (`assertSuperAdminCeiling`).

```
POST /megadex/users
Content-Type: application/json
Authorization: Bearer <access_token>

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

### Required fields on `POST`

| Field | Type | Constraints |
|---|---|---|
| `firstName` | `string` | `1..50` chars |
| `lastName` | `string` | `1..50` chars |
| `nickname` | `string` | `1..30` chars, case-insensitively unique (`lower(nickname)`) |
| `email` | `email` | `5..50` chars, case-insensitively unique (`lower(email)`) |

## Update Users

Updates one or more users by `id`. Sending `roles` replaces the user's `user_role` rows; sending `socialsJsonAgg` reconciles the user's `user_social` handles (setting a key to `null` or `""` removes that social handle; omitting `socialsJsonAgg` leaves existing handles unchanged).

Modifying a user who holds role `1` or assigning role `1` requires the caller to hold role `1`. Megadex does not revoke Gatelin sessions after role changes or deactivation; archived and inactive users cannot refresh their sessions, which remain usable until the current access token expires.

```
PUT /megadex/users
Content-Type: application/json
Authorization: Bearer <access_token>

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

**Response (200 OK):** the updated rows.

## Get User History

```
GET /megadex/users/:id/history
Authorization: Bearer <access_token>
```

Returns the combined audit trail for user `:id` across `"user"`, `user_role`, and `user_social`, built from database triggers that record every change into `log.history`. History older than six months is purged nightly.

## Archive Users

```
POST /megadex/users/archive
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    { "id": 5 }
  ]
}
```

**Response (204 No Content):** rows are soft-deleted — flagged `archived` with an `archivedAt` timestamp rather than removed. When `PWD_CREATE_URL` is set, Megadex also archives their Foxnox password rows. Gatelin sessions are not revoked; an existing session remains usable until its access token expires. The nightly cleanup job deletes archived rows for good after two months.

A consumer cannot archive their own account: a batch containing the caller's id is rejected with `403` and nothing is archived.

Rows accept bare ids or `{ "id": n }` objects. When `PWD_CREATE_URL` is
configured, archiving also archives active Foxnox passwords. Megadex does not
revoke Gatelin sessions: Gatelin refuses to refresh tokens for archived or
inactive users, so an open session ends when its access token expires
(`ACCESS_TOKEN_DURATION` in Gatelin). The same applies to deactivation and role
changes on `PUT /megadex/users`. Foxnox invalidates outstanding recovery
links, login challenges, and login-resume tickets before archiving passwords
(requires the corresponding Foxnox archive update).

Cross-service cleanup is not a distributed transaction: the profile is already
archived when cleanup starts. An upstream failure returns `502` (`504` for a
timeout), with a message asking the caller to retry the archive request.
Repeating the same request retries remaining cleanup without restoring the
profile. A missing `PWD_CREATE_URL` retains standalone behavior and skips the
integration.

## Restore Users

Restores archived user profiles (`archived = false`, `archivedAt = NULL`), preserving their `active` state. Rows accept bare ids or `{ "id": n }` objects; rows that are not archived are left unchanged. Gatelin grants this route to Super admin and Admin; the admin UI exposes it from the Users CRUD dialog or a table selection.

```http
POST /megadex/users/restore
Content-Type: application/json
x-consumer-user-id: 2
x-consumer-name: admin

{
  "rows": [5, 6]
}
```

| Status | Meaning |
| --- | --- |
| `200` | Restored (also returned when no row was archived) |
| `400` | Missing `rows` or invalid user id |
| `401` | Missing consumer headers |
| `403` | Rows outside the caller's ACL conditions |

Foxnox passwords stay archived until the user completes a separate password reset;
previous Gatelin sessions are not revoked, so a refresh token that has not yet
expired (Gatelin `REFRESH_TOKEN_DURATION`) works again once the profile is
restored. Restoration does not send an email automatically:
the user selects **Forgot password** on the login page to request a recovery link.
Completing recovery for an active restored profile replaces the newest archived
password's hash before unarchiving that credential, preserves its 2FA enrollment,
and leaves older passwords archived (requires the corresponding Foxnox recovery
update). Inactive profiles remain unable to recover or sign in until reactivated.
If password records have already been permanently purged, administrator
provisioning is required. The user must sign in again after choosing the new password.

## Get User Schema

```
GET /megadex/users/schema
Authorization: Bearer <access_token>
```

Returns the field definitions — types, minimums and maximums, which operations each field participates in, and which are required (with `rolesArrayAgg` mapped to `roles`). The admin UI uses this to build its forms, so it never drifts out of sync with the backend.
