--
-- Grant Megadex route access to Super admin (1) and Admin (2).
-- Operations come from each route's declared route_operation rows
-- (see 03-route.sql), so this stays in sync when routes are added.
--

INSERT INTO permissions ("roleId", "routeId", "operationId", fields, "conditionId", "creatorId", "creatorName")
SELECT
  roles.id,
  r.id,
  ro."operationId",
  NULL,
  NULL,
  -1,
  'system'
FROM route r
JOIN resource res ON res.id = r."resourceId"
JOIN service s ON s.id = res."serviceId"
JOIN route_operation ro ON ro."routeId" = r.id
CROSS JOIN (VALUES (1), (2)) AS roles(id)
WHERE s.name = 'megadex'
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = roles.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );

-- Self-service profile update (/megadex/users/me) is available to every non-archived role.
INSERT INTO permissions ("roleId", "routeId", "operationId", fields, "conditionId", "creatorId", "creatorName")
SELECT
  rl.id,
  r.id,
  ro."operationId",
  NULL,
  NULL,
  -1,
  'system'
FROM route r
JOIN route_operation ro ON ro."routeId" = r.id
JOIN role rl ON rl.archived = false
WHERE r.name = 'updateOwnProfile'
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = rl.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );
