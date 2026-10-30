-- Role definitions belong to Gatelin. Megadex stores the forwarded role ids
-- without a cross-database foreign key.
CREATE TABLE IF NOT EXISTS user_role (
  "userId" INT NOT NULL,
  "roleId" INT NOT NULL,
  PRIMARY KEY ("userId", "roleId"),
  CHECK ("userId" >= 1),
  CHECK ("roleId" >= 1),
  CONSTRAINT fk_user_role_user
    FOREIGN KEY ("userId") REFERENCES "user" (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_role_role
  ON user_role ("roleId");
