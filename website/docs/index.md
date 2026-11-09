---
layout: home

hero:
  name: Megadex
  text: User profile, preferences & reference data
  tagline: Internal user-directory microservice storing user identities, aggregated role assignments, social handles, table-view preferences, and localized reference catalogs.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/ALTEN-group/Megadex

features:
  - icon: 👤
    title: User Profiles & Consents
    details: Store identity, contact details, portrait, language, GDPR/marketing consent timestamps, and active/archive lifecycle in one writable view.
  - icon: 🔗
    title: Aggregated Roles & Social Links
    details: Read and write user role assignments (roles) and social network handles (socialsJsonAgg) directly on user payloads via PostgreSQL INSTEAD OF triggers.
  - icon: 🌐
    title: Social Networks Catalog
    details: Manage supported social platforms in the social catalog without schema changes, with soft-archiving and full change history.
  - icon: 🗂️
    title: Table View Preferences
    details: Persist per-user column visibility, widths, filters, and sort order alongside locked system templates for users and socials grids.
  - icon: 🌍
    title: Localized Reference Lookups
    details: Query read-only translated catalogs for countries, nationalities, civilities, and genders in English and French.
  - icon: 📜
    title: Audit Logs & History
    details: Database triggers record every mutation into log.history and expose structured field-level diffs through the log.audit read model.
  - icon: 🎛️
    title: Angular Admin UI
    details: Bundled Angular 22 administration interface to search, create, edit, and archive users and social networks and inspect audit logs.
  - icon: 🛡️
    title: BFF ACL Enforcement
    details: Enforce field allow-lists (x-acl-fields), row partitions (x-acl-conditions), and consumer attribution headers forwarded by your BFF.
---

<AdminDemos />
