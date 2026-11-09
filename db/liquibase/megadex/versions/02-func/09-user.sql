-- INSTEAD OF trigger function for the users view: writes "user" plus its user_role
-- and user_social junctions.
-- History of "user" is logged by its own AFTER trigger; the junctions are logged here.
CREATE OR REPLACE FUNCTION iud_user() RETURNS trigger AS $$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO "user" (
        gender, civility, "firstName", "middleName", "lastName", nickname, email,
        "backupEmail", address, "zipCode", city, country, nationality, phone,
        birthdate, portrait, language, job, company, website,
        "gdprConsentedAt", "marketingConsentedAt", active,
        "creatorId", "creatorName")
      VALUES (
        NEW.gender, NEW.civility, NEW."firstName", NEW."middleName", NEW."lastName",
        NEW.nickname, NEW.email, NEW."backupEmail", NEW.address, NEW."zipCode",
        NEW.city, NEW.country, NEW.nationality, NEW.phone, NEW.birthdate,
        NEW.portrait, COALESCE(NEW.language, 'en'), NEW.job, NEW.company,
        NEW.website, NEW."gdprConsentedAt", NEW."marketingConsentedAt",
        COALESCE(NEW.active, FALSE), NEW."creatorId", NEW."creatorName")
      RETURNING id INTO NEW.id;

      IF NEW."rolesArrayAgg" IS NOT NULL THEN
        INSERT INTO user_role ("userId", "roleId")
        SELECT NEW.id, r FROM unnest(NEW."rolesArrayAgg") AS r
        ON CONFLICT DO NOTHING;

        PERFORM log_history(TG_TABLE_SCHEMA, 'user_role', TG_OP, json_build_object(
          'id', NEW.id,
          'rolesArrayAgg', NEW."rolesArrayAgg",
          'creatorId', NEW."creatorId",
          'creatorName', NEW."creatorName"));
      END IF;

      IF NEW."socialsJsonAgg" IS NOT NULL THEN
        PERFORM set_user_socials(NEW.id, NEW."socialsJsonAgg");

        PERFORM log_history(TG_TABLE_SCHEMA, 'user_social', TG_OP, json_build_object(
          'id', NEW.id,
          'socialsJsonAgg', NEW."socialsJsonAgg",
          'creatorId', NEW."creatorId",
          'creatorName', NEW."creatorName"));
      END IF;

      RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
      -- NEW holds OLD values for columns the UPDATE did not set, so nullable
      -- columns are assigned as-is: an explicit NULL clears them.
      UPDATE "user" SET
        gender                 = NEW.gender,
        civility               = NEW.civility,
        "firstName"            = COALESCE(NEW."firstName", "firstName"),
        "middleName"           = NEW."middleName",
        "lastName"             = COALESCE(NEW."lastName", "lastName"),
        nickname               = COALESCE(NEW.nickname, nickname),
        email                  = COALESCE(NEW.email, email),
        "backupEmail"          = NEW."backupEmail",
        address                = NEW.address,
        "zipCode"              = NEW."zipCode",
        city                   = NEW.city,
        country                = NEW.country,
        nationality            = NEW.nationality,
        phone                  = NEW.phone,
        birthdate              = NEW.birthdate,
        portrait               = NEW.portrait,
        language               = COALESCE(NEW.language, language),
        job                    = NEW.job,
        company                = NEW.company,
        website                = NEW.website,
        "gdprConsentedAt"      = NEW."gdprConsentedAt",
        "marketingConsentedAt" = NEW."marketingConsentedAt",
        active                 = COALESCE(NEW.active, active),
        archived               = COALESCE(NEW.archived, archived),
        "updatedAt"            = NOW(),
        "updaterId"            = NEW."updaterId",
        "updaterName"          = NEW."updaterName"
      WHERE id = OLD.id;

      IF NEW."rolesArrayAgg" IS NOT NULL
         AND NEW."rolesArrayAgg" IS DISTINCT FROM OLD."rolesArrayAgg" THEN
        DELETE FROM user_role WHERE "userId" = OLD.id;

        INSERT INTO user_role ("userId", "roleId")
        SELECT OLD.id, r FROM unnest(NEW."rolesArrayAgg") AS r
        ON CONFLICT DO NOTHING;

        PERFORM log_history(TG_TABLE_SCHEMA, 'user_role', TG_OP, json_build_object(
          'id', OLD.id,
          'rolesArrayAgg', NEW."rolesArrayAgg",
          'updaterId', NEW."updaterId",
          'updaterName', NEW."updaterName"));
      END IF;

      IF NEW."socialsJsonAgg" IS NOT NULL
         AND NEW."socialsJsonAgg" IS DISTINCT FROM OLD."socialsJsonAgg" THEN
        PERFORM set_user_socials(OLD.id, NEW."socialsJsonAgg");

        PERFORM log_history(TG_TABLE_SCHEMA, 'user_social', TG_OP, json_build_object(
          'id', OLD.id,
          'socialsJsonAgg', NEW."socialsJsonAgg",
          'updaterId', NEW."updaterId",
          'updaterName', NEW."updaterName"));
      END IF;

      RETURN NEW;
    END IF;

    RETURN NULL;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
