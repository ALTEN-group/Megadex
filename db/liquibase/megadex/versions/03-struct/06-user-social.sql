-- One row per user per network, keyed on the social catalog. Supporting a new
-- network is an INSERT into social, not a schema change.
CREATE TABLE IF NOT EXISTS user_social (
  "userId" INT NOT NULL,
  "socialId" INT NOT NULL,
  handle VARCHAR(255) NOT NULL,
  PRIMARY KEY ("userId", "socialId"),
  CONSTRAINT fk_user_social_user
    FOREIGN KEY ("userId") REFERENCES "user" (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_user_social_social
    FOREIGN KEY ("socialId") REFERENCES social (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT ck_user_social_handle
    CHECK (btrim(handle) <> '')
);

CREATE INDEX IF NOT EXISTS idx_user_social_social
  ON user_social ("socialId");
