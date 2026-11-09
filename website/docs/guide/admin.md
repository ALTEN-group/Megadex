# Admin UI

Megadex ships with an Angular 22 administration application (`admin/`) built with PrimeNG and `@dwtechs/ngx-crud-builder`.

## Screens & Capabilities

The Admin UI provides three main views in the side navigation:

| Screen | Route | Resource | Capabilities |
|---|---|---|---|
| **Utilisateurs** (Users) | `/users` | `megadex/users` | Search, filter, sort, create, edit, and archive user profiles; assign Gatelin roles; edit social network handles; inspect per-user change history; save custom table views. |
| **Réseaux sociaux** (Socials) | `/socials` | `megadex/socials` | Search, create, edit, and archive social network catalog entries (`name`, `url`); inspect per-row history; save custom table views. |
| **Journal d'audit** (Audit Logs) | `/audit-logs` | `megadex/audit` | Read-only searchable timeline of all audited database changes (`INSERT`, `UPDATE`, `DELETE`, `ARCHIVE`, `RESTORE`) with field-level `{ from, to }` diffs. |

## Schema-Driven Forms & Dynamic Catalogs

When editing or creating a user:

1. **Roles multiselect** — The Admin UI calls `ADMIN_ROLES_SEARCH_URL` (default `/api/gatelin/roles/search`) with the operator's Bearer token to populate the available Gatelin roles.
2. **Social handles** — The Admin UI loads the active social catalog from `/api/megadex/socials/search` and renders a dynamic input field for each platform under `socialsJsonAgg`.
3. **Reference lookups** — Gender, civility, country, and nationality selectors are populated from `/api/megadex/genders/search`, `/api/megadex/civilities/search`, and `/api/megadex/countries/search`.

## Saved Table Views

On the **Users** and **Socials** screens, operators can:

- Reorder and resize columns
- Toggle visible columns
- Apply column filters and sorting
- Save their layout as a personal view (up to 5 per table) or switch back to locked system templates (`Default`, `Identity`, `Contact`, `Location`, `Professional`, `Consent & Status`)

Changes are persisted through `/api/megadex/preferences/:resource`.

## Runtime Configuration

Both the development container (`admin/scripts/entrypoint.sh`) and the production bundled server (`src/admin-server.js`) inject runtime configuration into `index.html` without rebuilding the Angular bundle:

```html
<base href="/megadex/">
<script id="megadex-admin-runtime">
  window.__MEGADEX_ADMIN__={"ssoTokenKey":"sso_access_token","rolesSearchUrl":"/api/gatelin/roles/search"};
</script>
```

| Environment Variable | Default | Purpose |
|---|---|---|
| `ADMIN_PORT` | unset (disabled) | Internal port for the bundled production admin server (e.g. `8080`). |
| `ADMIN_BASE_PATH` | `/megadex` | Public URL path prefix rewritten into `<base href="…">`. |
| `ADMIN_SSO_TOKEN_KEY` | `sso_access_token` | `localStorage` key shared across Gatelin, Foxnox, and Megadex admin apps for seamless SSO token reuse. |
| `ADMIN_ROLES_SEARCH_URL` | `/api/gatelin/roles/search` | Endpoint used to fetch role options in the user form. |
