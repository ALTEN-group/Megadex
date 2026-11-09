CREATE TABLE IF NOT EXISTS social (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  url VARCHAR(255) NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  "archivedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "creatorId" INT,
  "creatorName" TEXT,
  "updatedAt" TIMESTAMPTZ NULL,
  "updaterId" INT,
  "updaterName" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_social_name
  ON social (lower(name));
