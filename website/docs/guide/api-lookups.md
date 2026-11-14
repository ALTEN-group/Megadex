# Reference Lookups

Megadex provides three read-only localized reference catalogs backed by PostgreSQL domains and translation tables (`country_trans`, `civility_trans`, `gender_trans`):

- `/megadex/countries`
- `/megadex/civilities`
- `/megadex/genders`

Each lookup exposes `POST /search` and `GET /schema` and is seeded with translations in several languages (for example `en` and `fr`). Countries cover `de`, `en`, `es`, `fr`, `it`, plus a few entries in `ja`, `pt` and `zh`; civilities and genders cover `ar`, `de`, `en`, `es`, `fr`, `it`, `ja`, `nl`, `pt` and `zh`.

Paths below use Megadex's internal `/megadex/…` mount. A BFF typically exposes the same routes publicly under `/api/megadex/…`.

## Countries

Returns ISO 3166-1 alpha-3 country codes along with localized country names (`trans`) and nationalities (`nationality`).

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
      "code": "DEU",
      "lang": "fr",
      "trans": "Allemagne",
      "nationality": "Allemand"
    },
    {
      "code": "FRA",
      "lang": "fr",
      "trans": "France",
      "nationality": "Français"
    }
  ]
}
```

## Civilities

Returns localized honorifics (`Mr.`, `Mrs.`, `Ms.`) with full labels (`trans`) and abbreviations (`abbr`).

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
      "code": "Mr.",
      "lang": "en",
      "trans": "Mister",
      "abbr": "Mr."
    },
    {
      "code": "Mrs.",
      "lang": "en",
      "trans": "Misses",
      "abbr": "Mrs."
    },
    {
      "code": "Ms.",
      "lang": "en",
      "trans": "Miss",
      "abbr": "Ms."
    }
  ]
}
```

## Genders

Returns localized gender codes (`M`, `F`) with full labels (`trans`) and abbreviations (`abbr`).

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
    { "code": "F", "lang": "fr", "trans": "Féminin", "abbr": "F" },
    { "code": "M", "lang": "fr", "trans": "Masculin", "abbr": "M" }
  ]
}
```

## Get Entity Schemas

```
GET /megadex/countries/schema
GET /megadex/civilities/schema
GET /megadex/genders/schema
```
