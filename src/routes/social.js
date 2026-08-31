// @ts-check
import express from "express";
import socialEnt from "../entities/social.js";
import history from "../middlewares/history.js";
import { requireIdentity } from "../middlewares/identity.js";
import schema from "../middlewares/schema.js";

const router = express.Router();

router.post("/search", socialEnt.get);
router.post("/", requireIdentity, socialEnt.addArraySubstack);
router.put("/", requireIdentity, socialEnt.updateArraySubstack);
router.post("/archive", requireIdentity, socialEnt.archive);
router.get("/schema", requireIdentity, schema.get(socialEnt));
router.get("/:id/history", requireIdentity, history.get("social"));

export default router;
