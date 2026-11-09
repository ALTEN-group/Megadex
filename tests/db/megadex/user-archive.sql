BEGIN;

DO $$
DECLARE
  user_id integer;
BEGIN
  INSERT INTO users (
    "firstName",
    "lastName",
    nickname,
    email,
    "creatorId",
    "creatorName"
  )
  VALUES (
    'Archive',
    'User',
    'dbarchiveuser',
    'dbarchiveuser@example.com',
    9001,
    'db-test'
  )
  RETURNING id INTO user_id;

  UPDATE users
  SET archived = true,
      "updaterId" = 9002,
      "updaterName" = 'db-test-archive'
  WHERE id = user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM "user"
    WHERE id = user_id
      AND archived = true
      AND "archivedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'archiving through the users view did not set archived and archivedAt';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'user'
      AND operation = 'UPDATE'
      AND (record->>'id')::integer = user_id
  ) <> 1 THEN
    RAISE EXCEPTION 'archiving through the users view must log exactly one UPDATE history row';
  END IF;

  UPDATE users
  SET archived = false,
      "updaterId" = 9003,
      "updaterName" = 'db-test-restore'
  WHERE id = user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM "user"
    WHERE id = user_id
      AND archived = false
      AND "archivedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'unarchiving through the users view did not clear archived and archivedAt';
  END IF;

  BEGIN
    DELETE FROM "user" WHERE id = user_id;
    RAISE EXCEPTION 'app role must not DELETE FROM "user"';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END;
$$;

ROLLBACK;
