-- Per-user UI preference (one conf per component, e.g. a table layout)
CREATE TABLE preference (
  id            SERIAL      PRIMARY KEY,
  "userId"      INT         NOT NULL,
  name          VARCHAR(50) NOT NULL,
  component     VARCHAR(50) NOT NULL,
  conf          JSONB       NOT NULL,
  "isActive"    BOOLEAN     NOT NULL DEFAULT FALSE,
  archived      BOOLEAN     NOT NULL DEFAULT FALSE,
  "archivedAt"  TIMESTAMPTZ NULL,
  "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
  "creatorId"   INT,
  "creatorName" TEXT,
  "updatedAt"   TIMESTAMPTZ NULL,
  "updaterId"   INT,
  "updaterName" TEXT,
  CONSTRAINT fk_preference_user
    FOREIGN KEY ("userId") REFERENCES "user" (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_preference_user ON preference ("userId");
