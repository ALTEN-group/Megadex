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
    "rolesArrayAgg",
    "socialsJsonAgg",
    "creatorId",
    "creatorName"
  )
  VALUES (
    'History',
    'User',
    'dbhistoryuser',
    'dbhistoryuser@example.com',
    ARRAY[1],
    '{"GitHub": "dbhistgh"}'::jsonb,
    9001,
    'db-test'
  )
  RETURNING id INTO user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'user'
      AND operation = 'INSERT'
      AND "userId" = 9001
      AND "userName" = 'db-test'
      AND (record->>'id')::integer = user_id
  ) THEN
    RAISE EXCEPTION 'user insert did not create the expected user history record';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'user_role'
      AND operation = 'INSERT'
      AND "userId" = 9001
      AND "userName" = 'db-test'
      AND (record->>'id')::integer = user_id
  ) THEN
    RAISE EXCEPTION 'user insert did not create the expected user_role history record';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'user_social'
      AND operation = 'INSERT'
      AND "userId" = 9001
      AND "userName" = 'db-test'
      AND (record->>'id')::integer = user_id
  ) THEN
    RAISE EXCEPTION 'user insert did not create the expected user_social history record';
  END IF;

  UPDATE users
  SET "firstName" = 'HistoryUpdated',
      "rolesArrayAgg" = ARRAY[1, 2],
      "socialsJsonAgg" = '{"GitHub": "dbhistgh2"}'::jsonb,
      "updaterId" = 9002,
      "updaterName" = 'db-test-update'
  WHERE id = user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'user'
      AND operation = 'UPDATE'
      AND "userId" = 9002
      AND "userName" = 'db-test-update'
      AND (record->>'id')::integer = user_id
  ) THEN
    RAISE EXCEPTION 'user update did not create the expected user history record';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'user_role'
      AND operation = 'UPDATE'
      AND "userId" = 9002
      AND "userName" = 'db-test-update'
      AND (record->>'id')::integer = user_id
  ) THEN
    RAISE EXCEPTION 'user update did not create the expected user_role history record';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'user_social'
      AND operation = 'UPDATE'
      AND "userId" = 9002
      AND "userName" = 'db-test-update'
      AND (record->>'id')::integer = user_id
  ) THEN
    RAISE EXCEPTION 'user update did not create the expected user_social history record';
  END IF;
END;
$$;

ROLLBACK;
