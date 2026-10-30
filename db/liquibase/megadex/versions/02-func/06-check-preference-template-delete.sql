-- Prevents deleting a template preference ("userId" IS NULL), regardless of whether the
-- delete comes through the preferences view or directly on the preference table
CREATE OR REPLACE FUNCTION check_preference_template_delete() RETURNS trigger AS $$
  BEGIN
    IF OLD."userId" IS NULL THEN
      RAISE EXCEPTION 'A template preference (id=%) cannot be deleted.', OLD.id;
    END IF;

    RETURN OLD;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
