-- Write support for the users view.
CREATE OR REPLACE FUNCTION iud_user() RETURNS trigger AS $$
DECLARE
  role_id INT;
  actor_id INT;
  actor_name TEXT;
BEGIN
  actor_id := COALESCE(NEW."consumerId", NEW."updaterId", NEW."creatorId");
  actor_name := COALESCE(NEW."consumerName", NEW."updaterName", NEW."creatorName");

  -- log_history() is shared verbatim across services and reads the acting
  -- identity from creatorId/updaterId on the record, so map the forwarded
  -- consumer onto those fields here rather than changing the shared function.
  IF TG_OP = 'INSERT' THEN
    NEW."creatorId" := actor_id;
    NEW."creatorName" := actor_name;
  ELSE
    NEW."updaterId" := actor_id;
    NEW."updaterName" := actor_name;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO "user" (
      gender, civility, "firstName", "middleName", "lastName", nickname,
      email, "backupEmail", address, "zipCode", city, country, nationality,
      phone, birthdate, portrait, language, job, company, website,
      "gdprConsentedAt", "marketingConsentedAt",
      "pwdUpdatedAt", active, "creatorId", "creatorName"
    ) VALUES (
      NEW.gender, NEW.civility, NEW."firstName", NEW."middleName",
      NEW."lastName", NEW.nickname, NEW.email, NEW."backupEmail", NEW.address,
      NEW."zipCode", NEW.city, NEW.country, NEW.nationality, NEW.phone,
      NEW.birthdate, NEW.portrait, COALESCE(NEW.language, 'en'), NEW.job,
      NEW.company, NEW.website,
      NEW."gdprConsentedAt", NEW."marketingConsentedAt", NEW."pwdUpdatedAt",
      COALESCE(NEW.active, FALSE), actor_id, actor_name
    )
    RETURNING id INTO NEW.id;

    FOREACH role_id IN ARRAY COALESCE(NEW."rolesArrayAgg", ARRAY[]::INT[]) LOOP
      INSERT INTO user_role ("userId", "roleId") VALUES (NEW.id, role_id);
    END LOOP;

    IF NEW."socialsJsonAgg" IS NOT NULL THEN
      PERFORM set_user_socials(NEW.id, NEW."socialsJsonAgg");
    END IF;

    PERFORM log_history(TG_TABLE_SCHEMA, TG_RELNAME, TG_OP, row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE "user"
    SET
      gender = COALESCE(NEW.gender, gender),
      civility = COALESCE(NEW.civility, civility),
      "firstName" = COALESCE(NEW."firstName", "firstName"),
      "middleName" = COALESCE(NEW."middleName", "middleName"),
      "lastName" = COALESCE(NEW."lastName", "lastName"),
      nickname = COALESCE(NEW.nickname, nickname),
      email = COALESCE(NEW.email, email),
      "backupEmail" = COALESCE(NEW."backupEmail", "backupEmail"),
      address = COALESCE(NEW.address, address),
      "zipCode" = COALESCE(NEW."zipCode", "zipCode"),
      city = COALESCE(NEW.city, city),
      country = COALESCE(NEW.country, country),
      nationality = COALESCE(NEW.nationality, nationality),
      phone = COALESCE(NEW.phone, phone),
      birthdate = COALESCE(NEW.birthdate, birthdate),
      portrait = NEW.portrait,
      language = COALESCE(NEW.language, language),
      job = COALESCE(NEW.job, job),
      company = COALESCE(NEW.company, company),
      website = COALESCE(NEW.website, website),
      "gdprConsentedAt" = COALESCE(NEW."gdprConsentedAt", "gdprConsentedAt"),
      "marketingConsentedAt" = COALESCE(NEW."marketingConsentedAt", "marketingConsentedAt"),
      "pwdUpdatedAt" = COALESCE(NEW."pwdUpdatedAt", "pwdUpdatedAt"),
      active = COALESCE(NEW.active, active),
      archived = COALESCE(NEW.archived, archived),
      "updatedAt" = NOW(),
      "updaterId" = actor_id,
      "updaterName" = actor_name
    WHERE id = OLD.id;

    IF NEW."rolesArrayAgg" IS NOT NULL THEN
      DELETE FROM user_role WHERE "userId" = OLD.id;
      FOREACH role_id IN ARRAY NEW."rolesArrayAgg" LOOP
        INSERT INTO user_role ("userId", "roleId") VALUES (OLD.id, role_id);
      END LOOP;
    END IF;

    IF NEW."socialsJsonAgg" IS NOT NULL THEN
      PERFORM set_user_socials(OLD.id, NEW."socialsJsonAgg");
    END IF;

    PERFORM log_history(TG_TABLE_SCHEMA, TG_RELNAME, TG_OP, row_to_json(NEW));
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
