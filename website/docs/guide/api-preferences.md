# Preferences

Preferences store per-user Admin UI configuration for a named resource (`users` or `socials`). The list for a resource merges **locked system templates** (`locked: true`) with the authenticated user's own rows (`locked: false`).

Paths below use Megadex's internal `/megadex/…` mount. Gatelin typically exposes the same routes publicly under `/api/megadex/…`.

## List Preferences

Returns all locked system templates plus the authenticated user's personal preferences for `:resource`, ordered with templates first. Exactly one item has `isActive: true` (the user's selected preference in `preference_selection`, or the `"Default"` template if none is selected).

```
GET /megadex/preferences/users
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "rows": [
    {
      "id": 1,
      "resourceName": "users",
      "name": "Default",
      "conf": {
        "sortOrder": 1,
        "columnOrder": ["id", "nickname", "firstName", "lastName", "email", "roles", "active"],
        "columnWidths": {},
        "columnFilters": {}
      },
      "locked": true,
      "isActive": true
    },
    {
      "id": 8,
      "resourceName": "users",
      "name": "Active Engineers",
      "conf": {
        "sortOrder": 1,
        "columnOrder": ["id", "nickname", "email", "job"],
        "columnWidths": {},
        "columnFilters": {}
      },
      "locked": false,
      "isActive": false
    }
  ]
}
```

## Create Preferences

Creates a new personal preference for the caller on `:resource`. If `isActive: true`, it also becomes the caller's active selection in `preference_selection`. Each user may create up to **5** personal preferences per resource (`check_preference_limit`), and personal preferences cannot reuse the name of a locked template (`check_preference_template_name`).

```
POST /megadex/preferences/socials
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "name": "Compact Socials",
      "isActive": true,
      "conf": {
        "sortOrder": 1,
        "columnOrder": ["name", "url"],
        "columnWidths": { "name": "200px" },
        "columnFilters": {}
      }
    }
  ]
}
```

## Update or Select Preferences

Updates personal preferences or selects a template:

- **Selecting a locked template**: Sending a template's `id` with `isActive: true` and its unchanged `name` and `conf` updates `preference_selection` for the caller without modifying the template.
- **Editing a locked template (fork-on-write)**: Sending a template's `id` with a modified `name` or `conf` leaves the locked template untouched and inserts a new personal preference row for the caller.
- **Updating a personal preference**: Updates `name`, `conf`, and/or `isActive` on the caller's own row. Attempting to update another user's row is rejected with **404**.

```
PUT /megadex/preferences/socials
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "rows": [
    {
      "id": 7,
      "name": "Default",
      "isActive": true,
      "conf": {
        "sortOrder": 1,
        "columnOrder": ["id", "name", "url", "createdAt", "creatorName", "updatedAt", "updaterName", "archived", "archivedAt"],
        "columnWidths": {},
        "columnFilters": {}
      }
    }
  ]
}
```

## Delete Preference

Deletes a single preference owned by the authenticated user. Locked system templates and preferences belonging to other users cannot be deleted (**404**).

```
DELETE /megadex/preferences/socials/:id
Authorization: Bearer <access_token>
```

**Response (204 No Content)**

## Get Entity Schema

```
GET /megadex/preferences/schema
Authorization: Bearer <access_token>
```
