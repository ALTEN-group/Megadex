// @ts-check
import { SQLEntity } from "@dwtechs/antity-pgsql";
import { property as p } from "./property.js";

const rw = ["SELECT", "INSERT", "UPDATE"];

export default new SQLEntity("preference", [
  p("id", "integer", ["SELECT"]),
  p("userId", "integer", ["SELECT", "INSERT"], {
    requiredFor: ["POST"],
    privateField: true,
  }),
  p("name", "string", rw, { requiredFor: ["POST"], min: 1, max: 50 }),
  p("component", "string", rw, { requiredFor: ["POST"], min: 1, max: 50 }),
  p("conf", "object", rw, { requiredFor: ["POST"], filterable: false }),
  p("isActive", "boolean", rw),
  p("archived", "boolean", ["SELECT"]),
  p("archivedAt", "date", ["SELECT"]),
]);
