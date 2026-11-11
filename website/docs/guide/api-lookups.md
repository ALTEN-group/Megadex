# Reference Lookups

Megadex provides three read-only localized reference catalogs backed by PostgreSQL domains and translation tables (`country_trans`, `civility_trans`, `gender_trans`):

- `/megadex/countries`
- `/megadex/civilities`
- `/megadex/genders`

Each lookup exposes `POST /search` and `GET /schema` and is seeded in English (`en`) and French (`fr`).

Paths below use Megadex's internal `/megadex/…` mount. Gatelin typically exposes the same routes publicly under `/api/megadex/…`.

## Countries

Returns ISO country codes along with localized country names (`trans`) and nationalities (`nationality`).

```
POST /megadex/countries/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "filters": {
    "lang": { "value": "fr", "matchMode": "=" }
  },
  "sortField": "trans",
  "sortOrder": "ASC"
}
```

**Response (200 OK):**

```json
{
  "rows": [
    {
      "code": "DE",
      "lang": "fr",
      "trans": "Allemagne",
      "nationality": "Allemande"
    },
    {
      "code": "FR",
      "lang": "fr",
      "trans": "France",
      "nationality": "Française"
    }
  ]
}
```

## Civilities

Returns localized honorifics (`MR`, `MRS`) with full labels (`trans`) and abbreviations (`abbr`).

```
POST /megadex/civilities/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "filters": {
    "lang": { "value": "en", "matchMode": "=" }
  }
}
```

**Response (200 OK):**

```json
{
  "rows": [
    {
      "code": "MR",
      "lang": "en",
      "trans": "Mister",
      "abbr": "Mr."
    },
    {
      "code": "MRS",
      "lang": "en",
      "trans": "Misses",
      "abbr": "Mrs."
    }
  ]
}
```

## Genders

Returns localized gender codes (`M`, `F`, `N`) with full labels (`trans`) and abbreviations (`abbr`).

```
POST /megadex/genders/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "filters": {
    "lang": { "value": "fr", "matchMode": "=" }
  }
}
```

**Response (200 OK):**

```json
{
  "rows": [
    { "code": "F", "lang": "fr", "trans": "Femme", "abbr": "F" },
    { "code": "M", "lang": "fr", "trans": "Homme", "abbr": "H" },
    { "code": "N", "lang": "fr", "trans": "Non binaire", "abbr": "NB" }
  ]
}
```

## Get Entity Schemas

```
GET /megadex/countries/schema
GET /megadex/civilities/schema
GET /megadex/genders/schema
```
