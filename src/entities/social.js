// @ts-check
import { SQLEntity } from "@dwtechs/antity-pgsql";
import { property as p } from "./property.js";

const rw = ["SELECT", "INSERT", "UPDATE"];

export default new SQLEntity("social", [
  p("id", "integer", ["SELECT"]),
  p("name", "string", rw, { requiredFor: ["POST"], min: 1, max: 50 }),
  p("url", "string", rw, { max: 255 }),
  p("archived", "boolean", ["SELECT"]),
  p("archivedAt", "date", ["SELECT"]),
]);
