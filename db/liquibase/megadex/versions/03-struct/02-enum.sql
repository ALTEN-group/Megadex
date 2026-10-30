CREATE TYPE gender AS ENUM ('M', 'F');
CREATE TYPE civility AS ENUM ('Mr.', 'Mrs.', 'Ms.');

-- ISO 3166-1 alpha-3 and ISO 639-1 codes are open reference sets. Domains
-- validate their storage format without requiring a type migration whenever
-- a new country or language is added.
CREATE DOMAIN country AS VARCHAR(3)
  CHECK (VALUE ~ '^[A-Z]{3}$');

CREATE DOMAIN language AS VARCHAR(2)
  CHECK (VALUE ~ '^[a-z]{2}$');