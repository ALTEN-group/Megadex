// @ts-check
import { isArray, isObject, isValidInteger } from "@dwtechs/checkard";

/**
 * Validates the whole restore batch before antity can write any chunk.
 * Maps bare ids or `{ id }` rows to unique numeric ids.
 *
 * @type {import("express").RequestHandler}
 */
export function prepareRestoreRows(req, _res, next) {
  const rows = req.body?.rows;
  if (!isArray(rows, ">", 0))
    return next({ statusCode: 400, message: "Missing rows in req.body" });

  const ids = rows.map((row) => (isObject(row) ? row.id : row));
  if (ids.some((id) => !isValidInteger(id, 1, undefined, false)))
    return next({ statusCode: 400, message: "Invalid row id for restore" });
  req.body.rows = [...new Set(ids.map(Number))];
  next();
}
