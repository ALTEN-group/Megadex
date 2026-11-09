// @ts-check
import express from "express";
import { enforceAcl } from "../middlewares/acl.js";
import schema from "../middlewares/schema.js";

export function lookupRouter(entity) {
  const router = express.Router();
  router.post("/search", enforceAcl(entity, "search"), entity.get);
  router.get("/schema", enforceAcl(entity, "output"), schema.get(entity));
  return router;
}
