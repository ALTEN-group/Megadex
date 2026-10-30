CREATE OR REPLACE VIEW users AS
SELECT
  u.id,
  u.gender,
  u.civility,
  u."firstName",
  u."middleName",
  u."lastName",
  u.nickname,
  u.email,
  u."backupEmail",
  u.address,
  u."zipCode",
  u.city,
  u.country,
  u.nationality,
  u.phone,
  u.birthdate,
  u.portrait,
  u.language,
  u.job,
  u.company,
  u.website,
  u."gdprConsentedAt",
  u."marketingConsentedAt",
  u."pwdUpdatedAt",
  u.active,
  u.archived,
  u."archivedAt",
  u."createdAt",
  u."creatorId",
  u."creatorName",
  u."updatedAt",
  u."updaterId",
  u."updaterName",
  NULL::INT AS "consumerId",
  NULL::TEXT AS "consumerName",
  (
    SELECT COALESCE(
      array_agg(ur."roleId" ORDER BY ur."roleId"),
      ARRAY[]::INT[]
    )
    FROM user_role AS ur
    WHERE ur."userId" = u.id
  ) AS "rolesArrayAgg",
  (
    SELECT COALESCE(
      jsonb_object_agg(s.name, us.handle),
      '{}'::JSONB
    )
    FROM user_social AS us
    JOIN social AS s ON s.id = us."socialId"
    WHERE us."userId" = u.id
      AND s.archived = FALSE
  ) AS "socialsJsonAgg"
FROM "user" AS u;

CREATE TRIGGER users_iud_trigger
INSTEAD OF INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION iud_user();
