// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { isArray, isObject, isValidInteger } from "@dwtechs/checkard";

/**
 * Restore counterpart of antity-pgsql's `archive` handler, which has no restore yet.
 * Accepts bare ids or `{ id }` rows; credentials and sessions stay archived.
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

  const l = res.locals;
  try {
    await execute(
      `UPDATE users
       SET archived = false, "updaterId" = $2, "updaterName" = $3
       WHERE id = ANY($1::int[]) AND archived = true`,
      [
        [...new Set(ids.map(Number))],
        l.consumer.userId,
        l.consumer.nickname,
      ],
      l.dbClient ?? null,
    );
    next();
  } catch (error) {
    next(error);
  }
}
