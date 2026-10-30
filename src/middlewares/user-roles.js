// @ts-check

export function rolesToDatabase(req, _res, next) {
  for (const row of req.body?.rows ?? []) {
    if (!Object.hasOwn(row, "roles")) continue;
    if (
      !Array.isArray(row.roles) ||
      row.roles.some((role) => !Number.isInteger(role) || role < 0)
    )
      return next({
        statusCode: 400,
        message: "roles must be an array of role ids",
      });
    row.rolesArrayAgg = [...new Set(row.roles)];
    delete row.roles;
  }
  next();
}

export function rolesToApi(_req, res, next) {
  if (Array.isArray(res.locals.rows))
    res.locals.rows = res.locals.rows.map(mapUserRoles);
  next();
}

// The schema hides the private rolesArrayAgg column: expose its API name instead,
// so clients (admin ACL field enrichment) see `roles` as writable.
export function rolesToSchema(_req, res, next) {
  if (Array.isArray(res.locals.rows))
    res.locals.rows.push({
      key: "roles",
      type: "array",
      min: null,
      max: null,
      operations: ["SELECT", "INSERT", "UPDATE"],
      requiredFor: [],
      isFilterable: false,
    });
  next();
}

export function mapUserRoles(row) {
  const { rolesArrayAgg, ...user } = row;
  return {
    ...user,
    roles: Array.isArray(rolesArrayAgg)
      ? rolesArrayAgg.map(Number).filter(Number.isInteger)
      : [],
  };
}
