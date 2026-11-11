# Frontend Integration

Your frontend never calls Megadex directly — every request goes through your BFF (typically at `/api/megadex/…` with a Bearer access token). Because the BFF injects `x-consumer-user-id` and `x-consumer-name` from the validated JWT session, your frontend does not need to send `x-consumer-*` headers itself.

## 1. Reading the Current User Profile

After signing in through the BFF, fetch the signed-in user's profile, role IDs, and social handles with `GET /api/megadex/users/me`:

```typescript
const response = await fetch('/api/megadex/users/me', {
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

if (!response.ok) {
  throw new Error('Failed to load profile');
}

const profile = await response.json();
// { id, firstName, lastName, nickname, email, language, roles, socialsJsonAgg, ... }
```

## 2. Updating the Current User Profile

Users can update their own profile fields and social handles via `PUT /api/megadex/users/me`. Megadex pins `id` to the authenticated session's `userId` automatically:

```typescript
const response = await fetch('/api/megadex/users/me', {
  method: 'PUT',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    firstName: 'Alice',
    lastName: 'Martin',
    phone: '+33123456789',
    language: 'fr',
    socialsJsonAgg: {
      GitHub: 'alice-martin',
      LinkedIn: 'alice-martin'
    }
  })
});
```

> Do not include `roles`, `active`, `archived`, or `email` in a `PUT /api/megadex/users/me` payload. Megadex rejects those fields on `/me` with **403 Forbidden** to prevent self-escalation.

## 3. Loading Localized Reference Lookups

Populate country, nationality, civility, and gender selectors from Megadex's reference lookup endpoints filtered by the active UI language (`en` or `fr`):

```typescript
const response = await fetch('/api/megadex/countries/search', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    filters: {
      lang: { value: 'fr', matchMode: '=' }
    },
    sortField: 'trans',
    sortOrder: 'ASC'
  })
});

const { rows: countries } = await response.json();
// [{ code: "DE", lang: "fr", trans: "Allemagne", nationality: "Allemande" }, ...]
```

The same pattern applies to `/api/megadex/civilities/search` and `/api/megadex/genders/search`. See [Reference Lookups](./api-lookups).

## Calling the Admin API

The administrative CRUD endpoints (`/api/megadex/users`, `/api/megadex/socials`, `/api/megadex/audit/search`) are authenticated JSON calls through the BFF:

```typescript
const response = await fetch('/api/megadex/users/search', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    pagination: true,
    first: 0,
    limit: 10,
    sortField: 'lastName',
    sortOrder: 'ASC',
    filters: {
      archived: { value: false, matchMode: '=' }
    }
  })
});
```

In the default Gatelin seed (`db/liquibase/gatelin-data/04-permission.sql`), administrative CRUD routes are restricted to the **Super admin** (role 1) and **Admin** (role 2) roles, while `GET` and `PUT /api/megadex/users/me` are granted to every non-archived role.

If you are building custom admin screens, `GET /api/megadex/users/schema` and `GET /api/megadex/socials/schema` return the field definitions — types, limits, and which operations each field participates in — so forms stay in sync with the backend instead of duplicating validation rules.

## Bundled Admin UI

Megadex already ships with a complete Angular 22 administration panel (served under `ADMIN_BASE_PATH`, default `/megadex`) covering:

- **Users (`/megadex/users`)** — Search, filter, create, edit, archive, and restore user profiles; assign Gatelin roles via `ADMIN_ROLES_SEARCH_URL`; edit social network handles dynamically loaded from `/api/megadex/socials/search`; inspect per-user change history.
- **Social networks (`/megadex/socials`)** — Manage the catalog of supported social platforms and inspect per-row history.
- **Audit log (`/megadex/audit-logs`)** — Filter and inspect field-level `{ from, to }` change diffs across `"user"`, `user_role`, `user_social`, and `social`.
- **Saved table views** — Persist per-operator column layouts, widths, filters, and sort orders via `/api/megadex/preferences/:resource`.
