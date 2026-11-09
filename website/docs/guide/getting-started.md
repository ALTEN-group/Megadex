# Getting Started

Megadex is the user profile, table-view preference, and reference-data microservice for a Backend-for-Frontend (BFF) architecture. It owns everything that describes **who a user is**:

- 👤 **User profiles** — Identity, contact details, language, portrait, and GDPR/marketing consent timestamps
- 🎭 **Role assignments** — Role IDs stored in `user_role` and exposed on user payloads as `roles`
- 🔗 **Social network links** — User handles stored in `user_social` and exposed on user payloads as `socialsJsonAgg`
- 🌐 **Social networks catalog** — Supported social platforms (`social`) managed without schema migrations
- 🗂️ **Table view preferences** — Per-user saved grid configurations (`preferences`) merged with locked system templates
- 🌍 **Reference lookups** — Localized read-only catalogs for `countries`, `civilities`, and `genders`
- 📜 **History & audit logs** — Trigger-backed change history (`log.history`) and structured field diffs (`log.audit`)
- 🎛️ **Admin UI** — Bundled Angular 22 front-end for managing users, social networks, and audit logs
- 🛡️ **BFF ACL enforcement** — Enforces `x-acl-fields`, `x-acl-conditions`, and consumer identity headers forwarded by the BFF

## What Megadex Is Not

Megadex deliberately stops at user profiles, preferences, and reference catalogs:

- **No password hashes or 2FA secrets** — Credentials, TOTP enrollment, recovery tokens, and trusted devices belong to [Foxnox](https://foxnox.io).
- **No sessions or public routing** — JWT issuance, route matching, and RBAC evaluation belong to a Backend for Frontend such as [Gatelin](https://gatelin.fr).

Megadex is an **internal microservice**: browsers and public API clients never call it directly. Traffic reaches Megadex through the BFF over an internal network.

## Mount Prefix

Every route in Megadex is mounted under `/megadex/*`:

| Mount Prefix | Typical Caller | Purpose |
|---|---|---|
| `/megadex/*` | Admin UI, BFF proxy (`/api/megadex/*`), & internal lookups (`/megadex/users/search`) | Unified resource namespace matching Gatelin route definitions and service-to-service user resolution |

## Quick Start (Contributors)

Clone the repository and launch the full local development stack (PostgreSQL, Liquibase migrations, Gatelin, Foxnox, Mailpit, Megadex API, Megadex Admin UI, Swagger UI, and VitePress docs):

```bash
# 1. Clone the repository
git clone https://github.com/ALTEN-group/Megadex.git
cd Megadex

# 2. Generate the local .env file
bash scripts/setup-env.sh

# 3. Start the Docker development stack
bash scripts/start-dev.sh
```

Once the stack is up, the following endpoints are available through Traefik on port `8100`:

| Service | URL |
|---|---|
| **Megadex Admin UI** | `http://localhost:8100/megadex/` |
| **Gatelin Admin UI** | `http://localhost:8100/gatelin/` |
| **Foxnox Admin UI** | `http://localhost:8100/foxnox/` |
| **Documentation** | `http://localhost:8100/docs/` |
| **Swagger UI** | `http://localhost:8100/swagger/` |
| **Mailpit** | `http://localhost:8025/` |
| **Traefik Dashboard** | `http://localhost:8083/` |

## Next Steps

- Learn how writable views, role aggregation, and preferences work in [Core Concepts](./concepts).
- Explore the bundled [Admin UI](./admin).
- Deploy Megadex with [Docker Compose](./docker) and configure [Environment Variables](./env).
