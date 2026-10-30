-- Reserve user id 1 for the system identity.
CREATE SEQUENCE IF NOT EXISTS user_id_seq START WITH 2 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS "user" (
  id INTEGER PRIMARY KEY DEFAULT nextval('user_id_seq'),
  gender gender NULL,
  civility civility NULL,
  "firstName" VARCHAR(50) NOT NULL,
  "middleName" VARCHAR(50) NULL,
  "lastName" VARCHAR(50) NOT NULL,
  nickname VARCHAR(30) NOT NULL,
  email VARCHAR(50) NOT NULL,
  "backupEmail" VARCHAR(50) NULL,
  address VARCHAR(100) NULL,
  "zipCode" VARCHAR(10) NULL,
  city VARCHAR(50) NULL,
  country country NULL,
  nationality country NULL,
  phone VARCHAR(20) NULL,
  birthdate DATE NULL,
  portrait VARCHAR(255) NULL,
  language language NOT NULL DEFAULT 'en',
  job VARCHAR(100) NULL,
  company VARCHAR(50) NULL,
  website VARCHAR(255) NULL,
  "gdprConsentedAt" TIMESTAMPTZ NULL,
  "marketingConsentedAt" TIMESTAMPTZ NULL,
  "pwdUpdatedAt" TIMESTAMPTZ NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  "archivedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "creatorId" INT NULL,
  "creatorName" TEXT NULL,
  "updatedAt" TIMESTAMPTZ NULL,
  "updaterId" INT NULL,
  "updaterName" TEXT NULL
);

ALTER SEQUENCE user_id_seq OWNED BY "user".id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_email_lower
  ON "user" (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_nickname_lower
  ON "user" (lower(nickname));
CREATE INDEX IF NOT EXISTS idx_user_archived_active
  ON "user" (archived, active);
