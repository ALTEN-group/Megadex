---
layout: home

hero:
  name: 
  text: User Profile & Reference Data Service
  tagline: Store user identities, role assignments, social handles, table-view preferences and localized reference catalogs behind one service.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/overview
    - theme: alt
      text: Enterprise Support
      link: https://www.alten.com/

features:
  - icon: 👤
    title: User Profiles & Consents
    details: Identity, contact details, portrait, language, GDPR/marketing consent timestamps and active/archive lifecycle in one writable view.
  - icon: 🎭
    title: Roles & Social Links
    details: Read and write user role assignments and social network handles directly on user payloads via PostgreSQL INSTEAD OF triggers.
  - icon: 🌐
    title: Social Networks Catalog
    details: Manage supported social platforms without schema migrations, with soft-archiving and full change history.
  - icon: 🗂️
    title: Table View Preferences
    details: Persist per-user column visibility, widths, filters and sort order alongside locked system templates.
  - icon: 🌍
    title: Reference Lookups
    details: Query read-only translated catalogs for countries, nationalities, civilities and genders in English and French.
  - icon: 📜
    title: Audit Logs & History
    details: Database triggers record every mutation into log.history and expose structured field-level diffs through the log.audit view.
  - icon: 🛡️
    title: BFF ACL Enforcement
    details: Enforce field allow-lists (x-acl-fields), row partitions (x-acl-conditions) and consumer attribution headers forwarded by your BFF.
  - icon: 🎛️
    title: Admin Panel
    details: Manage users, roles, social network catalogs and audit logs through an Angular web interface.
---
