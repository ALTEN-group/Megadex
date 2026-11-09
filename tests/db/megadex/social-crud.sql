BEGIN;

DO $$
DECLARE
  social_id integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM social
    WHERE name = 'GitHub'
      AND archived = FALSE
      AND "creatorId" = -1
      AND "creatorName" = 'system'
  ) THEN
    RAISE EXCEPTION 'required GitHub social seed is missing';
  END IF;

  INSERT INTO social (name, url, "creatorId", "creatorName")
  VALUES ('dbContractSocial', 'https://social.example.com', 9001, 'db-test')
  RETURNING id INTO social_id;

  IF NOT EXISTS (
    SELECT 1
    FROM social
    WHERE id = social_id
      AND name = 'dbContractSocial'
      AND archived = FALSE
      AND "createdAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'social insert was not readable from the table';
  END IF;

  BEGIN
    INSERT INTO social (name, url, "creatorId", "creatorName")
    VALUES ('DBCONTRACTSOCIAL', 'https://dup.example.com', 9001, 'db-test');
    RAISE EXCEPTION 'case-insensitive duplicate social name was accepted';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  UPDATE social
  SET archived = TRUE, "updaterId" = 9002, "updaterName" = 'db-test-archive'
  WHERE id = social_id;

  IF NOT EXISTS (
    SELECT 1
    FROM social
    WHERE id = social_id
      AND archived = TRUE
      AND "archivedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'archiving social did not set archived and archivedAt';
  END IF;

  UPDATE social
  SET archived = FALSE, "updaterId" = 9003, "updaterName" = 'db-test-restore'
  WHERE id = social_id;

  IF NOT EXISTS (
    SELECT 1
    FROM social
    WHERE id = social_id
      AND archived = FALSE
      AND "archivedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'unarchiving social did not clear archivedAt';
  END IF;
END;
$$;

ROLLBACK;
