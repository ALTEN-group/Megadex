// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import express from "express";
import userEnt from "../entities/user.js";
import history from "../middlewares/history.js";
import { requireIdentity } from "../middlewares/identity.js";
import schema from "../middlewares/schema.js";
import {
  mapUserRoles,
  rolesToApi,
  rolesToDatabase,
  rolesToSchema,
} from "../middlewares/user-roles.js";

const router = express.Router();

// Intentionally public to trusted service-network callers: Gatelin needs this
// before it has a consumer identity. Database filters still constrain lookup.
router.post("/search", userEnt.get, rolesToApi);

router.get("/me", requireIdentity, async (_req, res, next) => {
  try {
    const result = await execute(
      `SELECT id, "firstName", "lastName", nickname, email, active, "rolesArrayAgg"
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

router.post(
  "/",
  requireIdentity,
  rolesToDatabase,
  userEnt.addArraySubstack,
  rolesToApi,
);
router.put(
  "/",
  requireIdentity,
  rolesToDatabase,
  userEnt.updateArraySubstack,
  rolesToApi,
);
router.post("/archive", requireIdentity, userEnt.archive);
router.get("/schema", requireIdentity, schema.get(userEnt), rolesToSchema);
router.get(
  "/:id/history",
  requireIdentity,
  history.get(["user", "user_role"]),
);

export default router;
