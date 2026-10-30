-- INSTEAD OF trigger function for the users view: writes "user" and its user_role junction.
-- History of "user" is logged by its own AFTER trigger; the junction is logged here.
CREATE OR REPLACE FUNCTION iud_user() RETURNS trigger AS $$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO "user" (
        gender, civility, "firstName", "middleName", "lastName", nickname, email,
        "backupEmail", address, "zipCode", city, country, nationality, phone,
        birthdate, portrait, language, job, company, website, facebook, instagram,
        x, "linkedIn", "youTube", "tikTok", "gitHub", pinterest, discord, reddit,
        twitch, "gdprConsentedAt", "marketingConsentedAt", active,
        "creatorId", "creatorName")
      VALUES (
        NEW.gender, NEW.civility, NEW."firstName", NEW."middleName", NEW."lastName",
        NEW.nickname, NEW.email, NEW."backupEmail", NEW.address, NEW."zipCode",
        NEW.city, NEW.country, NEW.nationality, NEW.phone, NEW.birthdate,
        NEW.portrait, COALESCE(NEW.language, 'en'), NEW.job, NEW.company,
        NEW.website, NEW.facebook, NEW.instagram, NEW.x, NEW."linkedIn",
        NEW."youTube", NEW."tikTok", NEW."gitHub", NEW.pinterest, NEW.discord,
        NEW.reddit, NEW.twitch, NEW."gdprConsentedAt", NEW."marketingConsentedAt",
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

      RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
      -- NEW holds OLD values for columns the UPDATE did not set.
      UPDATE "user" SET
        gender                 = NEW.gender,
        civility               = NEW.civility,
        "firstName"            = NEW."firstName",
        "middleName"           = NEW."middleName",
        "lastName"             = NEW."lastName",
        nickname               = NEW.nickname,
        email                  = NEW.email,
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
        facebook               = NEW.facebook,
        instagram              = NEW.instagram,
        x                      = NEW.x,
        "linkedIn"             = NEW."linkedIn",
        "youTube"              = NEW."youTube",
        "tikTok"               = NEW."tikTok",
        "gitHub"               = NEW."gitHub",
        pinterest              = NEW.pinterest,
        discord                = NEW.discord,
        reddit                 = NEW.reddit,
        twitch                 = NEW.twitch,
        "gdprConsentedAt"      = NEW."gdprConsentedAt",
        "marketingConsentedAt" = NEW."marketingConsentedAt",
        active                 = COALESCE(NEW.active, active),
        "updatedAt"            = NOW(),
        "updaterId"            = NEW."updaterId",
        "updaterName"          = NEW."updaterName"
      WHERE id = OLD.id;

      IF NEW.archived IS DISTINCT FROM OLD.archived THEN
        PERFORM set_archived('user', OLD.id, NEW.archived, OLD.archived);
      END IF;

      IF NEW."rolesArrayAgg" IS DISTINCT FROM OLD."rolesArrayAgg" THEN
        DELETE FROM user_role WHERE "userId" = OLD.id;

        IF NEW."rolesArrayAgg" IS NOT NULL THEN
          INSERT INTO user_role ("userId", "roleId")
          SELECT OLD.id, r FROM unnest(NEW."rolesArrayAgg") AS r
          ON CONFLICT DO NOTHING;
        END IF;

        PERFORM log_history(TG_TABLE_SCHEMA, 'user_role', TG_OP, json_build_object(
          'id', OLD.id,
          'rolesArrayAgg', NEW."rolesArrayAgg",
          'updaterId', NEW."updaterId",
          'updaterName', NEW."updaterName"));
      END IF;

      RETURN NEW;
    END IF;

    RETURN NULL;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
