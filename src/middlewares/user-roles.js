// @ts-check

function normalizeRoleIds(rolesArrayAgg) {
  return Array.isArray(rolesArrayAgg)
    ? rolesArrayAgg.map(Number).filter(Number.isInteger)
    : [];
}

export function rolesToDatabase(req, _res, next) {
  for (const row of req.body?.rows ?? []) {
    if (
      typeof row.email === "string" &&
      typeof row.backupEmail === "string" &&
      row.backupEmail.trim().length > 0 &&
      row.email.trim().toLowerCase() === row.backupEmail.trim().toLowerCase()
    ) {
      return next({
        statusCode: 400,
        message: "backupEmail must be different from email",
      });
    }

    if (!Object.hasOwn(row, "roles")) continue;
    if (
      !Array.isArray(row.roles) ||
      row.roles.length === 0 ||
      row.roles.some((role) => !Number.isInteger(role) || role <= 0)
    )
      return next({
        statusCode: 400,
        message: "roles must be a non-empty array of positive role ids",
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
      min: 1,
      max: null,
      operations: ["SELECT", "INSERT", "UPDATE"],
      requiredFor: ["POST"],
      isFilterable: false,
      readOnly: false,
    });
  next();
}

export function mapUserRoles(row) {
  if (!row || typeof row !== "object") return row;
  if (
    row.record &&
    typeof row.record === "object" &&
    Object.hasOwn(row.record, "rolesArrayAgg")
  ) {
    const { rolesArrayAgg, ...record } = row.record;
    return {
      ...row,
      record: {
        ...record,
        roles: normalizeRoleIds(rolesArrayAgg),
      },
    };
  }
  if (!Object.hasOwn(row, "rolesArrayAgg")) return row;
  const { rolesArrayAgg, ...user } = row;
  return {
    ...user,
    roles: normalizeRoleIds(rolesArrayAgg),
  };
}
