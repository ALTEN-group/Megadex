BEGIN;

DO $$
DECLARE
  old_id integer;
  new_id integer;
  deleted_count integer;
BEGIN
  INSERT INTO "user" (
    "firstName",
    "lastName",
    nickname,
    email,
    archived,
    "archivedAt",
    "creatorId",
    "creatorName"
  )
  VALUES (
    'Old',
    'Archived',
    'dbjobarchiveold',
    'dbjobarchiveold@example.com',
    true,
    NOW() - INTERVAL '3 months',
    9001,
    'db-job-test'
  )
  RETURNING id INTO old_id;

  INSERT INTO "user" (
    "firstName",
    "lastName",
    nickname,
    email,
    archived,
    "archivedAt",
    "creatorId",
    "creatorName"
  )
  VALUES (
    'New',
    'Archived',
    'dbjobarchivenew',
    'dbjobarchivenew@example.com',
    true,
    NOW() - INTERVAL '1 day',
    9001,
    'db-job-test'
  )
  RETURNING id INTO new_id;

  SELECT delete(
    'public'::text,
    'user'::text,
    NOW() - INTERVAL '2 months'
  ) INTO deleted_count;

  IF deleted_count <> 1 THEN
    RAISE EXCEPTION 'delete() should hard-delete 1 old archived user, got %', deleted_count;
  END IF;

  IF EXISTS (SELECT 1 FROM "user" WHERE id = old_id) THEN
    RAISE EXCEPTION 'user archived more than 2 months ago should be hard-deleted';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = new_id) THEN
    RAISE EXCEPTION 'recently archived user should remain';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'user'
      AND operation = 'INSERT'
      AND (record->>'id')::integer = old_id
  ) THEN
    RAISE EXCEPTION 'hard-delete must not wipe INSERT history';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'user'
      AND operation = 'DELETE'
      AND "userId" = -1
      AND "userName" = 'system'
      AND (record->>'id')::integer = old_id
  ) THEN
    RAISE EXCEPTION 'hard-delete must append a DELETE history snapshot';
  END IF;
END;
$$;

ROLLBACK;
