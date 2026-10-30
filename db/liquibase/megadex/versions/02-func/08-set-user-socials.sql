-- Replaces a user's social handles. Keys are social catalog names matched
-- case-insensitively, values are handles; blank values drop the entry.
CREATE OR REPLACE FUNCTION set_user_socials(p_user_id INT, p_socials JSONB)
RETURNS VOID AS $$
DECLARE
  social_name TEXT;
  social_handle TEXT;
  social_id INT;
BEGIN
  IF jsonb_typeof(p_socials) <> 'object' THEN
    RAISE EXCEPTION 'socialsJsonAgg must be a JSON object, got %',
      COALESCE(jsonb_typeof(p_socials), 'null');
  END IF;

  DELETE FROM user_social WHERE "userId" = p_user_id;

  FOR social_name, social_handle IN
    SELECT key, value FROM jsonb_each_text(p_socials)
  LOOP
    CONTINUE WHEN social_handle IS NULL OR btrim(social_handle) = '';

    SELECT id INTO social_id
    FROM social
    WHERE lower(name) = lower(social_name)
      AND archived = FALSE;

    IF social_id IS NULL THEN
      RAISE EXCEPTION 'unknown social network "%"', social_name;
    END IF;

    -- Catalog names are matched case-insensitively, so distinct JSON keys can
    -- resolve to the same network. Reject that instead of picking a winner.
    IF EXISTS (
      SELECT 1 FROM user_social
      WHERE "userId" = p_user_id AND "socialId" = social_id
    ) THEN
      RAISE EXCEPTION 'social network "%" is listed more than once', social_name;
    END IF;

    INSERT INTO user_social ("userId", "socialId", handle)
    VALUES (p_user_id, social_id, btrim(social_handle));
  END LOOP;
END;
$$ LANGUAGE plpgsql;
