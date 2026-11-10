// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { isArray, isObject, isValidInteger } from "@dwtechs/checkard";

/**
 * @type {import("express").RequestHandler}
 */
export function prepareUserRestore(req, _res, next) {
  const rows = req.body?.rows;
  if (!isArray(rows, ">", 0))
    return next({ statusCode: 400, message: "Missing rows in req.body" });

  const ids = rows.map((row) => (isObject(row) ? row.id : row));
  if (ids.some((id) => !isValidInteger(id, 1, undefined, false)))
    return next({ statusCode: 400, message: "Invalid user id for restore" });

  req.body = { rows: [...new Set(ids.map(Number))].map((id) => ({ id })) };
  next();
}

/**
 * Restores profiles through the audited view; credentials and sessions stay archived.
 *
 * @type {import("express").RequestHandler}
 */
export async function restoreUsers(req, res, next) {
  try {
    await execute(
      `UPDATE users
       SET archived = false, "updaterId" = $2, "updaterName" = $3
       WHERE id = ANY($1::int[]) AND archived = true`,
      [
        req.body.rows.map((row) => row.id),
        res.locals.consumer.userId,
        res.locals.consumer.nickname,
      ],
      res.locals.dbClient ?? null,
    );
    next();
  } catch (error) {
    next(error);
  }
}
