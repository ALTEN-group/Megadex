// @ts-check
import { SQLEntity } from "@dwtechs/antity-pgsql";
import { httpUrlValidator, property as p } from "./property.js";

const rw = ["SELECT", "INSERT", "UPDATE"];

export default new SQLEntity("social", [
  p("id", "integer", ["SELECT"]),
  p("name", "string", rw, { requiredFor: ["POST"], min: 1, max: 50 }),
  p("url", "string", rw, { max: 255, validator: httpUrlValidator(255) }),
  p("archived", "boolean", ["SELECT"]),
  p("archivedAt", "date", ["SELECT"], { readOnly: true }),
  p("createdAt", "date", ["SELECT"], { readOnly: true }),
  p("creatorName", "string", ["SELECT"], {
    min: 1,
    max: 100,
    typeChecked: false,
    filterable: false,
  }),
  p("updatedAt", "date", ["SELECT"], { readOnly: true }),
  p("updaterName", "string", ["SELECT"], {
    min: 1,
    max: 100,
    typeChecked: false,
    filterable: false,
  }),
]);
