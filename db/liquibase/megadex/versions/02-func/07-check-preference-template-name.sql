-- Prevents a user's own preference from reusing a template's name for the same resource
CREATE OR REPLACE FUNCTION check_preference_template_name() RETURNS trigger AS $$
  BEGIN
    IF NEW."userId" IS NOT NULL AND EXISTS (
      SELECT 1 FROM preference
      WHERE "userId" IS NULL AND "resourceName" = NEW."resourceName" AND name = NEW.name
    ) THEN
      RAISE EXCEPTION 'A preference cannot use the same name (%) as a template for resource %.', NEW.name, NEW."resourceName";
    END IF;

    RETURN NEW;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
