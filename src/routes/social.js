// @ts-check
import express from "express";
import socialEnt from "../entities/social.js";
import { enforceAcl, requireConsumer } from "../middlewares/acl.js";
import schema from "../middlewares/schema.js";

const router = express.Router();

router.post("/search", enforceAcl(socialEnt, "search"), socialEnt.get);
router.post(
  "/",
  requireConsumer,
  enforceAcl(socialEnt, "insert"),
  socialEnt.addArraySubstack,
);
router.put(
  "/",
  requireConsumer,
  enforceAcl(socialEnt, "existing"),
  socialEnt.updateArraySubstack,
);
router.post(
  "/archive",
  requireConsumer,
  enforceAcl(socialEnt, "existing"),
  socialEnt.archive,
);
router.get("/schema", enforceAcl(socialEnt, "output"), schema.get(socialEnt));
router.get(
  "/:id/history",
  enforceAcl(socialEnt, "existing"),
  socialEnt.getHistory,
);

export default router;
