```mermaid
---
caption: Diagramme entité-relation de ms_user
---

erDiagram
  
  user ||--o{ preference : "userId"
  user ||--o{ history : "userId"

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
    string pwdHash
    string portrait
    language language
    string job
    string company
    string website
    string facebook
    string instagram
    string x
    string linkedIn
    string youTube
    string tikTok
    string gitHub
    string pinterest
    string discord
    string reddit
    string twitch
    time emailConfirmedAt
    time passwordUpdatedAt
    boolean active
    boolean archived
    time archivedAt
  }

  preference {
    int id
    int userId
    string name
    string component
    jsonb conf
    boolean archived
    time archivedAt
  }

  country_trans {
    string code
    string lang
    string name
    string nationality
  }

  gender_trans {
    string code
    string lang
    string name
  }

  civility_trans {
    string code
    string lang
    string name
  }

  social {
    int id
    string name
    string url
    boolean archived
    time archivedAt
  }

  history {
    int id
    time tstamp
    string schemaName
    string tableName
    string operation
    string dbUser
    int consumerId
    string consumerName
    jsonb record
  }

```
