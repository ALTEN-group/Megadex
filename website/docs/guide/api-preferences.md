# Preferences API

The `preferences` resource stores per-user Admin UI table configurations (`conf`) alongside locked system templates (`userId IS NULL`). Supported `:resource` values are `users` and `socials`.

All endpoints require a valid consumer identity (`x-consumer-user-id`, `x-consumer-name`) except `GET /megadex/preferences/schema`.

## Get Preferences for a Resource

Returns all locked system templates (`locked: true`) plus the authenticated user's personal preferences (`locked: false`) for `:resource`, ordered with templates first. Exactly one item has `isActive: true` (the user's selected preference in `preference_selection`, or the `"Default"` template if none is selected).

```http
GET /megadex/preferences/users
x-consumer-user-id: 2
x-consumer-name: jdoe
```

**Response (`200 OK`):**

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

## Create a Personal Preference

Creates a new personal preference for the caller on `:resource`. If `isActive: true`, it also becomes the caller's active selection in `preference_selection`. Each user may create up to **5** personal preferences per resource (`check_preference_limit`), and personal preferences cannot reuse the name of a locked template (`check_preference_template_name`).

```http
POST /megadex/preferences/socials
Content-Type: application/json
x-consumer-user-id: 2
x-consumer-name: jdoe

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

Updates personal preferences or selects a template.

- **Selecting a locked template**: Sending a template's `id` with `isActive: true` and its unchanged `name` and `conf` updates `preference_selection` for the caller without modifying the template.
- **Editing a locked template (fork-on-write)**: Sending a template's `id` with a modified `name` or `conf` leaves the locked template untouched and inserts a new personal preference row for the caller.
- **Updating a personal preference**: Updates `name`, `conf`, and/or `isActive` on the caller's own row. Attempting to update another user's row is rejected with `404`.

```http
PUT /megadex/preferences/socials
Content-Type: application/json
x-consumer-user-id: 2
x-consumer-name: jdoe

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

## Delete a Personal Preference

Deletes a user-owned preference by `id`. Locked system templates and preferences belonging to other users cannot be deleted (`404`).

```http
DELETE /megadex/preferences/socials/8
x-consumer-user-id: 2
x-consumer-name: jdoe
```

## Get Preference Schema

```http
GET /megadex/preferences/schema
```
