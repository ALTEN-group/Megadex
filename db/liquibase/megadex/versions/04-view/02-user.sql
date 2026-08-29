create or replace view users AS
  WITH history AS (
    SELECT * FROM get_history('public', 'users')
  )
  SELECT u.id,
    u.gender,
    u.civility,
    u."firstName", 
    u."middleName",
    u."lastName",
    u.nickname,
    u.email,
    tv."emailVerifiedAt",
    u.backupEmail,
    tv."backupEmailVerifiedAt",
    u.address,
    u."zipCode",
    u.city,
    u.country,
    u.phone,
    u.birthdate,
    u.portrait,
    u.language,
    u.job,
    u.company,
    u.website,
    u.facebook,
    u.instagram,
    u.x,
    u.linkedIn,
    u.youTube,
    u.tikTok,
    u.gitHub,
    u.pinterest,
    u.discord,
    u.reddit,
    u.twitch,
    u.active,
    u.archived,
    u."archivedAt",
    NULL AS "consumerId",
    NULL AS "consumerName",
    h.tstamp AS "updatedAt",
    h."consumerId" AS "updaterId",
    h."consumerName" AS "updaterName",
    h2.tstamp AS "createdAt",
    h2."consumerId" AS "creatorId",
    h2."consumerName" AS "creatorName",
    array_agg(ur."roleId" ORDER BY ur."roleId" ASC) FILTER (WHERE (ur."roleId" IS NOT NULL)) AS "rolesArrayAgg"
  FROM "user" AS u
  LEFT JOIN user_role ur ON ur."userId" = u.id
  LEFT JOIN (
    SELECT 
      "userId",
      MAX(CASE WHEN "typeId" = 1 THEN "verifiedAt" END) AS "emailVerifiedAt",
      MAX(CASE WHEN "typeId" = 2 THEN "verifiedAt" END) AS "backupEmailVerifiedAt"
    FROM token 
    WHERE "typeId" IN (1, 2) AND "verifiedAt" IS NOT NULL
    GROUP BY "userId"
  ) tv ON tv."userId" = u.id
  LEFT JOIN history h ON (h.id, h.operation) = (u.id, 'UPDATE')
  LEFT JOIN history h2 ON (h2.id, h2.operation) = (u.id, 'INSERT')
  GROUP BY u.id, tv."emailVerifiedAt", tv."backupEmailVerifiedAt", 
  h.tstamp, h."consumerId", h."consumerName", 
  h2.tstamp, h2."consumerId", h2."consumerName"
  ORDER BY "rolesArrayAgg" ASC
;

--
-- Apply insert, update, delete user and user_role trigger  
--
CREATE TRIGGER a 
INSTEAD OF INSERT OR UPDATE ON "users"
FOR EACH ROW EXECUTE PROCEDURE iud_user();
