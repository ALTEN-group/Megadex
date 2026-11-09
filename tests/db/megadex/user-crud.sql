BEGIN;

DO $$
DECLARE
  user_id integer;
BEGIN
  INSERT INTO users (
    gender,
    civility,
    "firstName",
    "lastName",
    nickname,
    email,
    language,
    active,
    "rolesArrayAgg",
    "socialsJsonAgg",
    "creatorId",
    "creatorName"
  )
  VALUES (
    'M',
    'Mr.',
    'Contract',
    'Tester',
    'dbcontractuser',
    'dbcontractuser@example.com',
    'en',
    true,
    ARRAY[1, 2],
    '{"GitHub": "dbcontractgh", "X": "dbcontractx"}'::jsonb,
    9001,
    'db-test'
  )
  RETURNING id INTO user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = user_id
      AND nickname = 'dbcontractuser'
      AND email = 'dbcontractuser@example.com'
      AND "rolesArrayAgg" = ARRAY[1, 2]
      AND "socialsJsonAgg"->>'GitHub' = 'dbcontractgh'
      AND "socialsJsonAgg"->>'X' = 'dbcontractx'
      AND "creatorId" = 9001
  ) THEN
    RAISE EXCEPTION 'user inserted through the users view was not readable with its roles and socials';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "user"
    WHERE id = user_id
      AND nickname = 'dbcontractuser'
  ) THEN
    RAISE EXCEPTION 'users view insert did not write the base user table';
  END IF;

  UPDATE users
  SET "firstName" = 'Updated',
      "rolesArrayAgg" = ARRAY[3],
      "socialsJsonAgg" = '{"GitHub": "dbcontractgh2", "X": ""}'::jsonb,
      "updaterId" = 9002,
      "updaterName" = 'db-test-update'
  WHERE id = user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = user_id
      AND "firstName" = 'Updated'
      AND "rolesArrayAgg" = ARRAY[3]
      AND "socialsJsonAgg"->>'GitHub' = 'dbcontractgh2'
      AND ("socialsJsonAgg" ? 'X') IS FALSE
      AND "updaterId" = 9002
      AND "updatedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'users view update did not update base row, rolesArrayAgg, or socialsJsonAgg';
  END IF;

  BEGIN
    UPDATE users
    SET "socialsJsonAgg" = '{"NonExistentNetwork": "handle"}'::jsonb,
        "updaterId" = 9003,
        "updaterName" = 'db-test-invalid-social'
    WHERE id = user_id;
    RAISE EXCEPTION 'unknown social network was accepted by set_user_socials';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'unknown social network%' THEN
        RAISE;
      END IF;
  END;
END;
$$;

ROLLBACK;
