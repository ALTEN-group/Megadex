// @ts-check
import express from "express";
import pEnt from "../entities/preference.js";
import { requireIdentity } from "../middlewares/identity.js";
import schema from "../middlewares/schema.js";
import * as preferences from "../services/preference.js";

const router = express.Router();
router.use(requireIdentity);

const run = (operation) => async (req, res, next) => {
  try {
    const resource = preferences.assertResource(req.params.resource);
    const rows = await operation(req, res, resource);
    res.locals.rows = rows;
    res.locals.total = rows.length;
    next();
  } catch (error) {
    next(error);
  }
};

// Registered before "/:resource" so the literal path is not swallowed by it.
router.get("/schema", schema.get(pEnt));

// The merged view list: locked templates plus this user's own preferences.
router.get(
  "/:resource",
  run((_req, res, resource) =>
    preferences.getMany(res.locals.consumer.userId, resource),
  ),
);

router.post(
  "/:resource",
  run((req, res, resource) =>
    preferences.create(res.locals.consumer, resource, req.body?.rows),
  ),
);

router.put(
  "/:resource",
  run((req, res, resource) =>
    preferences.update(res.locals.consumer, resource, req.body?.rows),
  ),
);

router.delete(
  "/:resource/:id",
  run((req, res, resource) =>
    preferences.remove(
      res.locals.consumer.userId,
      resource,
      Number(req.params.id),
    ),
  ),
);

export default router;
