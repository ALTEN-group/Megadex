// @ts-check
import { isArray, isObject, isValidInteger } from "@dwtechs/checkard";
import { archivePasswords } from "../../services/pwd.js";

/**
 * After `userEnt.archive` archives user rows in Megadex, archives their active
 * Foxnox password records. Gatelin sessions are not revoked: refresh is denied
 * for archived users, so access ends when the current access token expires.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function archivePwd(req, res, next) {
  const rows = isArray(req.body?.rows) ? req.body.rows : [];
  const ids = rows.map((row) => (isObject(row) ? row.id : row));
  if (!ids.length || ids.some((id) => !isValidInteger(id, 1, undefined, false)))
    return next({ statusCode: 400, message: "Invalid user ids for archive" });

  const userIds = [...new Set(ids.map(Number))];
  try {
    await archivePasswords(userIds, res.locals.consumer);
  } catch (err) {
    return next({
      statusCode: err?.statusCode === 504 ? 504 : 502,
      message:
        "User profile archived, but authentication cleanup failed. Retry the archive request.",
    });
  }
  next();
}
