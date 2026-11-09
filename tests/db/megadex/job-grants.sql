BEGIN;

DO $$
BEGIN
  BEGIN
    -- EXECUTE revoked from the app (and PUBLIC) hides the function, so Postgres
    -- reports undefined_function rather than insufficient_privilege.
    PERFORM delete(
      'public'::text,
      'user'::text,
      NOW() - INTERVAL '2 months'
    );
    RAISE EXCEPTION 'app role must not EXECUTE delete()';
  EXCEPTION
    WHEN insufficient_privilege OR undefined_function THEN
      NULL;
  END;

  BEGIN
    DELETE FROM log.history WHERE false;
    RAISE EXCEPTION 'app role must not DELETE FROM log.history';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  BEGIN
    DELETE FROM "user" WHERE false;
    RAISE EXCEPTION 'app role must not DELETE FROM "user"';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  BEGIN
    DELETE FROM social WHERE false;
    RAISE EXCEPTION 'app role must not DELETE FROM social';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END;
$$;

ROLLBACK;
