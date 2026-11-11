// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { isArray, isObject } from "@dwtechs/checkard";
import express from "express";
import userEnt from "../entities/user.js";
import {
  enforceAcl,
  mapConsumer,
  requireConsumer,
} from "../middlewares/acl.js";
import { archivePwd } from "../middlewares/http/archive-pwd.js";
import { createPwd } from "../middlewares/http/create-pwd.js";
import { prepareRestoreRows } from "../middlewares/mappers/restore-rows.js";
import schema from "../middlewares/schema.js";
import {
  mapUserRoles,
  rolesToApi,
  rolesToDatabase,
  rolesToSchema,
} from "../middlewares/user-roles.js";

const router = express.Router();

const FORBIDDEN_SELF_UPDATE_FIELDS = [
  "roles",
  "rolesArrayAgg",
  "active",
  "archived",
  "email",
];

/**
 * Internal callers hitting `/megadex/users/search` without a Gatelin consumer
 * header (e.g. Gatelin login, Foxnox account recovery) expect only non-archived
 * users unless they explicitly filter `archived`.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 */
function defaultUnarchivedOnInternalSearch(req, _res, next) {
  if (
    req.headers["x-consumer-user-id"] === undefined &&
    req.headers["x-consumer-name"] === undefined
  ) {
    req.body ??= {};
    req.body.filters ??= {};
    if (!Object.hasOwn(req.body.filters, "archived")) {
      req.body.filters.archived = { value: false, matchMode: "equals" };
    }
  }
  next();
}

/**
 * Prepares a self-service `PUT /me` payload by rejecting privilege-escalation
 * fields (`roles`, `active`, `archived`, `email`) and pinning `id` to the
 * authenticated consumer's `userId`.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
function scopeSelfUpdate(req, res, next) {
  const rawRow = Array.isArray(req.body?.rows) ? req.body.rows[0] : req.body;
  if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
    return next({
      statusCode: 400,
      message: "Missing profile fields in request body",
    });
  }

  for (const field of FORBIDDEN_SELF_UPDATE_FIELDS) {
    if (Object.hasOwn(rawRow, field)) {
      return next({
        statusCode: 403,
        message: `Field "${field}" cannot be modified via /me`,
      });
    }
  }

  req.body = {
    rows: [
      {
        ...rawRow,
        id: res.locals.consumer.userId,
      },
    ],
  };
  next();
}

/**
 * Prevents an authenticated consumer from archiving their own user account.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
function preventSelfArchive(req, res, next) {
  const rows = isArray(req.body?.rows) ? req.body.rows : [];
  const userId = res.locals.consumer.userId;
  // Archive accepts bare ids (ngx-crud-builder) or `{ id }` rows.
  const includesSelf = rows.some(
    (row) => Number(isObject(row) ? row.id : row) === userId,
  );

  if (includesSelf) {
    return next({
      statusCode: 403,
      message: "You cannot archive your own user account",
    });
  }
  next();
}

// Intentionally public to trusted service-network callers: Gatelin needs this
// before it has a consumer identity. Database filters still constrain lookup.
router.post(
  "/search",
  defaultUnarchivedOnInternalSearch,
  enforceAcl(userEnt, "search"),
  userEnt.get,
  rolesToApi,
);

router.get("/me", requireConsumer, mapConsumer, async (_req, res, next) => {
  try {
    const result = await execute(
      `SELECT
         id, gender, civility, "firstName", "middleName", "lastName",
         nickname, email, "backupEmail", address, "zipCode", city,
         country, nationality, phone, birthdate, portrait, language,
         job, company, website, "gdprConsentedAt", "marketingConsentedAt",
         active, "createdAt", "updatedAt", "rolesArrayAgg", "socialsJsonAgg"
       FROM users WHERE id = $1 AND archived = false`,
      [res.locals.consumer.userId],
      null,
    );
    if (!result.rowCount)
      return next({ statusCode: 404, message: "User not found" });
    res.status(200).json(mapUserRoles(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put(
  "/me",
  requireConsumer,
  mapConsumer,
  scopeSelfUpdate,
  enforceAcl(userEnt, "existing"),
  rolesToDatabase,
  userEnt.updateArraySubstack,
  rolesToApi,
);

router.post(
  "/",
  requireConsumer,
  enforceAcl(userEnt, "insert"),
  rolesToDatabase,
  userEnt.addArraySubstack,
  rolesToApi,
  createPwd,
);
router.put(
  "/",
  requireConsumer,
  enforceAcl(userEnt, "existing"),
  rolesToDatabase,
  userEnt.updateArraySubstack,
  rolesToApi,
);
router.post(
  "/archive",
  requireConsumer,
  enforceAcl(userEnt, "existing"),
  preventSelfArchive,
  userEnt.archive,
  archivePwd,
);
router.post(
  "/restore",
  requireConsumer,
  enforceAcl(userEnt, "existing"),
  prepareRestoreRows,
  userEnt.restore,
);
router.get(
  "/schema",
  enforceAcl(userEnt, "output"),
  schema.get(userEnt),
  rolesToSchema,
);
router.get(
  "/:id/history",
  enforceAcl(userEnt, "existing"),
  userEnt.history({ tables: ["user", "user_role", "user_social"] }),
  rolesToApi,
);

export default router;
