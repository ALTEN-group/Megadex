-- Ids start at 2: id 1 is reserved.
CREATE SEQUENCE user_id_seq START WITH 2 INCREMENT BY 1;

CREATE TABLE "user" (
  id                     INTEGER      PRIMARY KEY DEFAULT nextval('user_id_seq'),
  gender                 gender       NULL,
  civility               civility     NULL,
  "firstName"            VARCHAR(50)  NOT NULL,
  "middleName"           VARCHAR(50)  NULL,
  "lastName"             VARCHAR(50)  NOT NULL,
  nickname               VARCHAR(30)  NOT NULL UNIQUE,
  email                  VARCHAR(50)  NOT NULL UNIQUE,
  "backupEmail"          VARCHAR(50)  NULL,
  address                VARCHAR(100) NULL,
  "zipCode"              VARCHAR(10)  NULL,
  city                   VARCHAR(50)  NULL,
  country                country      NULL,
  nationality            country      NULL,
  phone                  VARCHAR(20)  NULL,
  birthdate              DATE         NULL,
  portrait               VARCHAR(255) NULL,
  language               language     NOT NULL DEFAULT 'en',
  job                    VARCHAR(100) NULL,
  company                VARCHAR(50)  NULL,
  website                VARCHAR(255) NULL,
  facebook               VARCHAR(255) NULL,
  instagram              VARCHAR(255) NULL,
  x                      VARCHAR(255) NULL,
  "linkedIn"             VARCHAR(255) NULL,
  "youTube"              VARCHAR(255) NULL,
  "tikTok"               VARCHAR(255) NULL,
  "gitHub"               VARCHAR(255) NULL,
  pinterest              VARCHAR(255) NULL,
  discord                VARCHAR(255) NULL,
  reddit                 VARCHAR(255) NULL,
  twitch                 VARCHAR(255) NULL,
  "gdprConsentedAt"      TIMESTAMPTZ  NULL,
  "marketingConsentedAt" TIMESTAMPTZ  NULL,
  active                 BOOLEAN      NOT NULL DEFAULT FALSE,
  archived               BOOLEAN      NOT NULL DEFAULT FALSE,
  "archivedAt"           TIMESTAMPTZ  NULL,
  "createdAt"            TIMESTAMPTZ  DEFAULT NOW(),
  "creatorId"            INT,
  "creatorName"          TEXT,
  "updatedAt"            TIMESTAMPTZ  NULL,
  "updaterId"            INT,
  "updaterName"          TEXT
);

-- Roles are owned by Gatelin (another database): "roleId" carries no foreign key.
CREATE TABLE user_role (
  "userId" INT NOT NULL,
  "roleId" INT NOT NULL CHECK ("roleId" >= 0),
  PRIMARY KEY ("userId", "roleId"),
  CONSTRAINT fk_user_role_user
    FOREIGN KEY ("userId") REFERENCES "user" (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
