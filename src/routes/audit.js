// @ts-check
import express from "express";
import aEnt from "../entities/audit.js";
import { enforceAcl } from "../middlewares/acl.js";
import { buildChanges } from "../middlewares/mappers/audit-changes.js";

const router = express.Router();

// Search the audit log (read-only: no history, add, update, archive or schema)
router.post("/search", enforceAcl(aEnt, "search"), aEnt.get, buildChanges);

export default router;
