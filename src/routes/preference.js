// @ts-check
import express from "express";
import pEnt from "../entities/preference.js";
import history from "../middlewares/history.js";
import { requireIdentity } from "../middlewares/identity.js";
import schema from "../middlewares/schema.js";
import * as preferences from "../services/preference.js";

const router = express.Router();
router.use(requireIdentity);

const run = (operation) => async (req, res, next) => {
  try {
    const rows = await operation(
      res.locals.consumer.userId,
      req.body?.rows ?? req.body,
    );
    res.locals.rows = rows;
    res.locals.total = rows.length;
    next();
  } catch (error) {
    next(error);
  }
};

router.post("/search", async (req, res, next) => {
  try {
    const rows = await preferences.search(res.locals.consumer.userId, req.body);
    res.locals.rows = rows;
    res.locals.total = rows.length;
    next();
  } catch (error) {
    next(error);
  }
});
router.post("/", run(preferences.create));
router.put("/", run(preferences.update));
router.post("/archive", run(preferences.archive));
router.get("/schema", schema.get(pEnt));
router.get(
  "/:id/history",
  async (req, res, next) => {
    try {
      await preferences.assertOwner(
        res.locals.consumer.userId,
        Number(req.params.id),
      );
      next();
    } catch (error) {
      next(error);
    }
  },
  history.get("preference"),
);

export default router;
