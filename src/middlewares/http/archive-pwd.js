// @ts-check
import { isArray, isInteger } from "@dwtechs/checkard";
import { archivePasswords } from "../../services/pwd.js";
import { revokeUserSessions } from "../../services/session.js";

/**
 * After `userEnt.archive` archives user rows in Megadex, archives their active
 * Foxnox password records and revokes their active Gatelin consumer sessions.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function archivePwd(req, res, next) {
  const rows = isArray(req.body?.rows) ? req.body.rows : [];
  const userIds = rows
    .map((r) => r?.id)
    .filter((id) => isInteger(id, false))
    .map(Number);

  if (!userIds.length) {
    next();
    return;
  }

  await Promise.all([
    archivePasswords(userIds, res.locals.consumer),
    revokeUserSessions(userIds, res.locals.consumer),
  ]);
  next();
}
