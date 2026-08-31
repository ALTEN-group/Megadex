// @ts-check
import express from "express";
import schema from "../middlewares/schema.js";

export function lookupRouter(entity) {
  const router = express.Router();
  router.post("/search", entity.get);
  router.get("/schema", schema.get(entity));
  return router;
}
