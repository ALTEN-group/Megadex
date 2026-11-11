// @ts-check
import { isArray, isInteger } from "@dwtechs/checkard";
import { revokeUserSessions } from "../../services/session.js";

/**
 * When `PUT /megadex/users` deactivates a user (`active === false`) or changes
 * their `roles` / `rolesArrayAgg`, revokes their cached Gatelin sessions so the
 * new status or role assignment takes effect immediately without waiting for
 * access-token expiry.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function syncUserLifecycle(req, res, next) {
  const rows = isArray(req.body?.rows) ? req.body.rows : [];
  const affectedUserIds = rows
    .filter(
      (r) =>
        r?.active === false ||
        Object.hasOwn(r ?? {}, "roles") ||
        Object.hasOwn(r ?? {}, "rolesArrayAgg"),
    )
    .map((r) => r?.id)
    .filter((id) => isInteger(id, false))
    .map(Number);

  try {
    if (affectedUserIds.length) {
      await revokeUserSessions(affectedUserIds, res.locals.consumer);
    }
    next();
  } catch (err) {
    next(err);
  }
}
