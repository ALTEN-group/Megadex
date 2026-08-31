// @ts-check
import { SQLEntity } from "@dwtechs/antity-pgsql";
import { property as p } from "./property.js";

const country = new SQLEntity("country_trans", [
  p("code", "string", ["SELECT"]),
  p("lang", "string", ["SELECT"]),
  p("trans", "string", ["SELECT"]),
  p("nationality", "string", ["SELECT"]),
]);

const civility = new SQLEntity("civility_trans", [
  p("code", "string", ["SELECT"]),
  p("lang", "string", ["SELECT"]),
  p("trans", "string", ["SELECT"]),
  p("abbr", "string", ["SELECT"]),
]);

const gender = new SQLEntity("gender_trans", [
  p("code", "string", ["SELECT"]),
  p("lang", "string", ["SELECT"]),
  p("trans", "string", ["SELECT"]),
  p("abbr", "string", ["SELECT"]),
]);

export { civility, country, gender };
