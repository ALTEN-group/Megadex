// @ts-check
import { isArray, isObject, isValidInteger } from "@dwtechs/checkard";
import { restore } from "../../services/user.js";

/**
 * Restore counterpart of antity-pgsql's `archive` handler, which has no restore yet.
 * Maps bare ids or `{ id }` rows to unique user ids before restoring them.
 *
 * @type {import("express").RequestHandler}
 */
export async function restoreUsers(req, res, next) {
  const rows = req.body?.rows;
  if (!isArray(rows, ">", 0))
    return next({ statusCode: 400, message: "Missing rows in req.body" });

  const ids = rows.map((row) => (isObject(row) ? row.id : row));
  if (ids.some((id) => !isValidInteger(id, 1, undefined, false)))
    return next({ statusCode: 400, message: "Invalid user id for restore" });

  try {
    await restore(
      [...new Set(ids.map(Number))],
      res.locals.consumer,
      res.locals.dbClient ?? null,
    );
    next();
  } catch (error) {
    next(error);
  }
}
