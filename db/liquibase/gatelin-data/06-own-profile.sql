INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName")
SELECT id, '/me', 'getOwnProfile', 'Get authenticated user profile', true, false, ARRAY[2], ARRAY[1], -1, 'system'
FROM resource
WHERE name = 'megadex/users'
  AND NOT EXISTS (
    SELECT 1 FROM route WHERE name = 'getOwnProfile'
  );

INSERT INTO permissions ("roleId", "routeId", "operationId", fields, "conditionId", "creatorId", "creatorName")
SELECT rl.id, r.id, ro."operationId", NULL, NULL, -1, 'system'
FROM route r
JOIN route_operation ro ON ro."routeId" = r.id
JOIN role rl ON rl.archived = false
WHERE r.name = 'getOwnProfile'
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = rl.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );
