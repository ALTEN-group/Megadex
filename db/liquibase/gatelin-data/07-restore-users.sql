-- Reserve a stable route ID for the admin ACL mapping, independently of sequence gaps.
-- The routes view ignores explicit IDs on insert, so seed the base row before wiring its joins through the view.
INSERT INTO route (id, "resourceId", pattern, name, description, protected, core, "creatorId", "creatorName")
SELECT 108, id, '/restore', 'restoreUsers', 'Restore archived user profiles', true, false, -1, 'system'
FROM resource
WHERE name = 'megadex/users'
  AND NOT EXISTS (
    SELECT 1 FROM route WHERE name = 'restoreUsers'
  );

SELECT setval(pg_get_serial_sequence('route', 'id'), GREATEST(
  (SELECT MAX(id) FROM route),
  (SELECT last_value FROM route_id_seq)
));

UPDATE routes
SET "operationId" = ARRAY[5], "methodIds" = ARRAY[2],
    "updaterId" = -1, "updaterName" = 'system'
WHERE name = 'restoreUsers';

INSERT INTO permissions ("roleId", "routeId", "operationId", fields, "conditionId", "creatorId", "creatorName")
SELECT roles.id, r.id, ro."operationId", NULL, NULL, -1, 'system'
FROM route r
JOIN route_operation ro ON ro."routeId" = r.id
CROSS JOIN (VALUES (1), (2)) AS roles(id)
WHERE r.name = 'restoreUsers'
  AND NOT EXISTS (
    SELECT 1
    FROM permission p
    WHERE p."roleId" = roles.id
      AND p."routeId" = r.id
      AND p."operationId" = ro."operationId"
  );
