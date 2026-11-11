// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { isArray, isObject, isValidInteger } from "@dwtechs/checkard";

/**
 * Seeded first in Gatelin's `06-data/11-role.sql` as "Gatelin super admin".
 * Mirrors `SUPER_ADMIN_ROLE_ID` in Gatelin's `assertGrantSubset.js`.
 */
const SUPER_ADMIN_ROLE_ID = 1;

const FORBIDDEN_ASSIGN = {
  statusCode: 403,
  message: "Cannot assign super admin role",
};

const FORBIDDEN_TARGET = {
  statusCode: 403,
  message: "Cannot modify or archive a super admin user",
};

/**
 * Fail-closed role-hierarchy guard for user mutations (`POST /`, `PUT /`,
 * `POST /archive`, `POST /restore`).
 *
 * Enforces the Super Admin ceiling (Option A):
 *   - Only a caller who holds `SUPER_ADMIN_ROLE_ID` (1) may assign `roleId = 1`
 *     when creating or updating a user.
 *   - Only a caller who holds `SUPER_ADMIN_ROLE_ID` (1) may update, archive, or
 *     restore an existing user who currently holds `roleId = 1`.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export async function assertSuperAdminCeiling(req, res, next) {
  const rawCallerId = res.locals.consumer?.userId;
  if (!isValidInteger(rawCallerId, 1, undefined, true))
    return next({ statusCode: 401, message: "Unauthorized" });
  const callerId = Number(rawCallerId);

  const rows = req.body?.rows;
  if (!isArray(rows, ">", 0))
    return next({ statusCode: 400, message: "Missing rows in req.body" });

  const assignsSuperAdmin = rows.some((row) => {
    if (!isObject(row)) return false;
    const roles = isArray(row.roles)
      ? row.roles
      : isArray(row.rolesArrayAgg)
        ? row.rolesArrayAgg
        : [];
    return roles.some((roleId) => Number(roleId) === SUPER_ADMIN_ROLE_ID);
  });

  const isCreate =
    req.method === "POST" && (req.path === "/" || req.path === "");

  if (isCreate && !assignsSuperAdmin) return next();

  /** @type {number[]} */
  let targetIds = [];
  if (!isCreate) {
    for (const row of rows) {
      const rawId = isObject(row) ? row.id : row;
      if (!isValidInteger(rawId, 1, undefined, false))
        return next({
          statusCode: 400,
          message: "Every row must carry a valid integer id",
        });
      targetIds.push(Number(rawId));
    }
    targetIds = [...new Set(targetIds)];
  }

  const lookupIds = [...new Set([callerId, ...targetIds])];

  try {
    const r = await execute(
      `SELECT "userId"
       FROM user_role
       WHERE "roleId" = $1
         AND "userId" = ANY($2::int[])`,
      [SUPER_ADMIN_ROLE_ID, lookupIds],
      res.locals.dbClient ?? null,
    );
    const superAdminUserIds = new Set(
      (r?.rows ?? []).map((row) => Number(row.userId)),
    );

    if (superAdminUserIds.has(callerId)) return next();

    if (assignsSuperAdmin) return next(FORBIDDEN_ASSIGN);

    if (targetIds.some((id) => superAdminUserIds.has(id)))
      return next(FORBIDDEN_TARGET);

    next();
  } catch (err) {
    next(err);
  }
}
