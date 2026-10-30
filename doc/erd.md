```mermaid
---
caption: Diagramme entité-relation de megadex
---

erDiagram

  user ||--o{ user_role : "userId"
  user ||--o{ user_social : "userId"
  social ||--o{ user_social : "socialId"
  preference ||--o{ preference_selection : "preferenceId"

  user {
    int id
    gender gender
    civility civility
    string firstName
    string middleName
    string lastName
    string nickname
    string email
    string backupEmail
    string address
    string zipCode
    string city
    country country
    country nationality
    string phone
    date birthdate
    string portrait
    language language
    string job
    string company
    string website
    timestamptz gdprConsentedAt
    timestamptz marketingConsentedAt
    boolean active
    boolean archived
    timestamptz archivedAt
    timestamptz createdAt
    int creatorId
    string creatorName
    timestamptz updatedAt
    int updaterId
    string updaterName
  }

  user_role {
    int userId
    int roleId "Gatelin role id, no FK"
  }

  user_social {
    int userId
    int socialId
    string handle
  }

  social {
    int id
    string name
    string url
    boolean archived
    timestamptz archivedAt
    timestamptz createdAt
    int creatorId
    string creatorName
    timestamptz updatedAt
    int updaterId
    string updaterName
  }

  preference {
    int id
    int userId "NULL = locked template"
    string resourceName
    string name
    jsonb conf
    timestamptz createdAt
    int creatorId
    string creatorName
    timestamptz updatedAt
    int updaterId
    string updaterName
  }

  preference_selection {
    int userId
    string resourceName
    int preferenceId
  }

  country_trans {
    country code
    language lang
    string trans
    string nationality
  }

  civility_trans {
    civility code
    language lang
    string trans
    string abbr
  }

  gender_trans {
    gender code
    language lang
    string trans
    string abbr
  }

  history {
    int id
    timestamp tstamp
    string schemaName
    string tableName
    string operation
    string dbUser
    int userId
    string userName
    jsonb record
  }

```
