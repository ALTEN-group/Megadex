# Megadex

[![Coverage](https://raw.githubusercontent.com/ALTEN-group/Megadex/badges/badges/coverage.svg)](https://github.com/ALTEN-group/Megadex/actions/workflows/test.yml)
[![admin coverage](https://raw.githubusercontent.com/ALTEN-group/Megadex/badges/badges/admin-coverage.svg)](https://github.com/ALTEN-group/Megadex/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/github/v/release/ALTEN-group/Megadex)](https://github.com/ALTEN-group/Megadex/releases/latest)
[![Last release](https://img.shields.io/github/release-date/ALTEN-group/Megadex)](https://github.com/ALTEN-group/Megadex/releases/latest)

User profile, preferences, and reference-data service: user accounts with aggregated roles and social network links, per-user table view preferences, and localized reference lookups. Megadex is an internal user store: put a Backend for Frontend in front of it as the public API layer. [Gatelin](https://gatelin.fr) is one such BFF, not a requirement.

## Images

| Image | Registry |
|---|---|
| API (includes Admin UI under `/megadex`) | `ghcr.io/alten-group/megadex` |
| Migration | `ghcr.io/alten-group/megadex-migration` |

## Features

- **User profiles** — Manage user identities, contact information, consents, and active/archive lifecycle
- **Roles & social links** — Aggregate user role assignments (`roles`) and social network handles (`socialsJsonAgg`) directly onto user records
- **Social networks catalog** — Manage supported social platforms (`socials`) with history tracking and soft archiving
- **Table view preferences** — Per-user saved grid configurations (`preferences`) merged with locked system templates
- **Reference lookups** — Localized read-only catalogs for countries (`countries`), civilities (`civilities`), and genders (`genders`)
- **History & audit logs** — Database-level change tracking (`user`, `user_role`, `user_social`, `social`) and unified `log.audit` view
- **Admin UI** — Angular front-end to manage users, social network catalogs, and audit logs

Archived users can be restored from the Users CRUD dialog or a table selection.
Restoration clears the profile's archive state and timestamp, preserving its active/inactive state.
Foxnox passwords remain archived and require a separate password reset; previous sessions stay revoked.
`POST /megadex/users/restore` accepts `{ "rows": [1, 2] }` and requires authenticated
consumer headers. Gatelin grants the restore route to Super admin and Admin.

## Documentation

Full documentation is available at **[https://alten-group.github.io/Megadex](https://alten-group.github.io/Megadex)**.

## Quick Start for off the shelf usage

Integrate Megadex into your application using published Docker images :
- [Integration Guide](https://alten-group.github.io/Megadex/guide/integration)
- [Frontend Integration Guide](https://alten-group.github.io/Megadex/guide/frontend)

## Quick Start for contributors

```bash
# 1. Clone the repository
git clone https://github.com/ALTEN-group/Megadex.git
cd Megadex

# 2. Generate the development environment file
bash scripts/setup-env.sh

# 3. Start the stack (Gatelin + Foxnox + Megadex). Dev user passwords are seeded
#    and printed on first start; rotate them with `bash scripts/setup-mocks.sh`.
bash scripts/start-dev.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow, testing, and production build instructions.

## License

MIT — see [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). Published and maintained by ALTEN.
