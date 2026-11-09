// @ts-check
import { SQLEntity } from "@dwtechs/antity-pgsql";
import { property as p } from "./property.js";

const rw = ["SELECT", "INSERT", "UPDATE"];

export default new SQLEntity("preferences", [
  p("id", "integer", ["SELECT"]),
  p("userId", "integer", ["SELECT", "INSERT"], {
    requiredFor: ["POST"],
    privateField: true,
  }),
  p("resourceName", "string", ["SELECT", "INSERT"], {
    requiredFor: ["POST"],
    min: 1,
    max: 20,
  }),
  p("name", "string", rw, { requiredFor: ["POST", "PUT"], min: 1, max: 60 }),
  p("conf", "json", rw, { requiredFor: ["POST"], filterable: false }),
  p("locked", "boolean", ["SELECT"], { typeChecked: false, filterable: true }),
  p("isActive", "boolean", ["INSERT", "UPDATE"], {
    requiredFor: ["POST", "PUT"],
    typeChecked: false,
    filterable: false,
  }),
]);
