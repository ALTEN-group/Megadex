-- Catalog of social networks
CREATE TABLE social (
  id            SERIAL       PRIMARY KEY,
  name          VARCHAR(50)  NOT NULL UNIQUE,
  url           VARCHAR(255) NULL,
  archived      BOOLEAN      NOT NULL DEFAULT FALSE,
  "archivedAt"  TIMESTAMPTZ  NULL,
  "createdAt"   TIMESTAMPTZ  DEFAULT NOW(),
  "creatorId"   INT,
  "creatorName" TEXT,
  "updatedAt"   TIMESTAMPTZ  NULL,
  "updaterId"   INT,
  "updaterName" TEXT
);
