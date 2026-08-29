
-- Create trigger function to insert, update, delete a user
CREATE OR REPLACE FUNCTION iud_user() RETURNS trigger AS '
  DECLARE
    m   int;
  BEGIN
    IF TG_OP = ''INSERT'' THEN
      insert into "user" (
        gender, civility, "firstName", "middleName", 
        "lastName", nickname, email, address, "zipCode", 
        city, country, phone, portrait, active, language)
      VALUES (
        NEW.gender,
        NEW.civility,
        NEW."firstName",
        NEW."middleName",
        NEW."lastName",
        NEW.nickname,
        NEW.email,
        NEW.address,
        NEW."zipCode",
        NEW.city,
        NEW."country",
        NEW.phone,
        NEW.portrait,
        NEW.active,
        NEW.language)
      RETURNING id INTO NEW.id;

      IF NEW."rolesArrayAgg" IS NOT NULL THEN
        FOREACH m IN ARRAY NEW."rolesArrayAgg" LOOP
          insert into user_role ("userId", "roleId") 
          values (NEW.id, m);
        END LOOP;  
      END IF;
      PERFORM log_history(TG_TABLE_SCHEMA, TG_RELNAME, TG_OP, row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = ''UPDATE'' THEN
      update "user" 
      set 
        civility = COALESCE(NEW.civility, civility),
        gender = COALESCE(NEW.gender, gender),
        "firstName" = COALESCE(NEW."firstName", "firstName"),
        "middleName" = COALESCE(NEW."middleName", "middleName"),
        "lastName" = COALESCE(NEW."lastName", "lastName"),
        nickname = COALESCE(NEW.nickname, nickname),
        email = COALESCE(NEW.email, email),
        address = COALESCE(NEW.address, address),
        "zipCode" = COALESCE(NEW."zipCode", "zipCode"),
        city = COALESCE(NEW.city, city),
        country = COALESCE(NEW."country", country),
        phone = COALESCE(NEW.phone, phone),
        portrait = NEW.portrait,
        active = COALESCE(NEW."active", active),
        language = COALESCE(NEW.language, language)
      where id = NEW.id;

      PERFORM soft_delete(''user'', NEW.id, NEW.archived, OLD.archived);

      delete from user_role 
      where "userId" = NEW.id;

      IF NEW."rolesArrayAgg" IS NOT NULL THEN
        FOREACH m IN ARRAY NEW."rolesArrayAgg" LOOP
          insert into user_role ("userId", "roleId") 
          values (NEW.id, m);
        END LOOP;
      END IF;
      PERFORM log_history(TG_TABLE_SCHEMA, TG_RELNAME, TG_OP, row_to_json(NEW));
      RETURN NEW;
    END IF;
  END;
' LANGUAGE plpgsql SECURITY DEFINER;
