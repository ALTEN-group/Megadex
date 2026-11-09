// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { isArray, isInteger } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";
import { provisionPasswords } from "../../services/pwd.js";

/**
 * Provisions a Foxnox password record for each user created by
 * `userEnt.addArraySubstack`. If Foxnox rejects or is unreachable, soft-archives
 * the newly inserted user row(s) so unprovisioned users are not left active.
 *
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function createPwd(_req, res, next) {
  const url = process.env.PWD_CREATE_URL?.trim();
  if (!url) {
    next();
    return;
  }

  const rows = isArray(res.locals.rows) ? res.locals.rows : [];
  const userIds = rows
    .map((r) => r?.id)
    .filter((id) => isInteger(id, false))
    .map(Number);

  if (!userIds.length) {
    next();
    return;
  }

  try {
    await provisionPasswords(userIds, res.locals.consumer);
    next();
  } catch (err) {
    try {
      await execute(
        `UPDATE users
         SET active = false, archived = true, "updaterId" = $2, "updaterName" = $3
         WHERE id = ANY($1::int[])`,
        [
          userIds,
          res.locals.consumer?.userId ?? null,
          res.locals.consumer?.nickname ?? null,
        ],
        null,
      );
    } catch (cleanupErr) {
      log.error(
        `Failed to archive unprovisioned user(s) [${userIds.join(", ")}]: ${cleanupErr?.message || cleanupErr}`,
      );
    }
    next(err);
  }
}
