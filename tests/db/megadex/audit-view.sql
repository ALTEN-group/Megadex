BEGIN;

DO $$
DECLARE
  social_id integer;
  r record;
BEGIN
  INSERT INTO social (name, url, "creatorId", "creatorName")
  VALUES ('dbAuditViewSocial', 'https://before.example.com', 9101, 'audit-creator')
  RETURNING id INTO social_id;

  UPDATE social
  SET url = 'https://after.example.com', "updaterId" = 9102, "updaterName" = 'audit-editor'
  WHERE id = social_id;

  -- Bookkeeping-only write: nothing meaningful changed.
  UPDATE social
  SET "updatedAt" = NOW(), "updaterId" = 9103, "updaterName" = 'audit-bot'
  WHERE id = social_id;

  UPDATE social
  SET archived = TRUE, "updaterId" = 9104, "updaterName" = 'audit-archiver'
  WHERE id = social_id;

  UPDATE social
  SET archived = FALSE, "updaterId" = 9105, "updaterName" = 'audit-restorer'
  WHERE id = social_id;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'social' AND "recordId" = social_id AND "userId" = 9101;
  IF r.action <> 'INSERT' OR r.previous IS NOT NULL OR r.kind <> 'change' THEN
    RAISE EXCEPTION 'audit view: INSERT row wrong (action %, previous %, kind %)',
      r.action, r.previous, r.kind;
  END IF;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'social' AND "recordId" = social_id AND "userId" = 9102;
  IF r.action <> 'UPDATE'
     OR r."changedKeys" <> ARRAY['url']
     OR r.previous->>'url' <> 'https://before.example.com'
     OR r.record->>'url' <> 'https://after.example.com'
     OR r.kind <> 'change' THEN
    RAISE EXCEPTION 'audit view: UPDATE row wrong (action %, keys %)', r.action, r."changedKeys";
  END IF;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'social' AND "recordId" = social_id AND "userId" = 9103;
  IF cardinality(r."changedKeys") <> 0 OR r.kind <> 'routine' THEN
    RAISE EXCEPTION 'audit view: bookkeeping-only update must be routine (keys %, kind %)',
      r."changedKeys", r.kind;
  END IF;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'social' AND "recordId" = social_id AND "userId" = 9104;
  IF r.action <> 'ARCHIVE' THEN
    RAISE EXCEPTION 'audit view: expected ARCHIVE, got %', r.action;
  END IF;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'social' AND "recordId" = social_id AND "userId" = 9105;
  IF r.action <> 'RESTORE' THEN
    RAISE EXCEPTION 'audit view: expected RESTORE, got %', r.action;
  END IF;
END;
$$;

ROLLBACK;
