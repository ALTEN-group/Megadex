// @ts-check
import { SQLEntity } from "@dwtechs/antity-pgsql";
import { property as p } from "./property.js";

const rw = ["SELECT", "INSERT", "UPDATE"];
const ro = ["SELECT"];

export default new SQLEntity("users", [
  p("id", "integer", ro),
  p("gender", "string", rw),
  p("civility", "string", rw),
  p("firstName", "string", rw, { requiredFor: ["POST"], min: 1, max: 50 }),
  p("middleName", "string", rw, { max: 50 }),
  p("lastName", "string", rw, { requiredFor: ["POST"], min: 1, max: 50 }),
  p("nickname", "string", rw, { requiredFor: ["POST"], min: 1, max: 30 }),
  p("email", "email", rw, { requiredFor: ["POST"], min: 5, max: 50 }),
  p("backupEmail", "email", rw, { max: 50 }),
  p("address", "string", rw, { max: 100 }),
  p("zipCode", "string", rw, { max: 10 }),
  p("city", "string", rw, { max: 50 }),
  p("country", "string", rw),
  p("nationality", "string", rw),
  p("phone", "string", rw, { max: 20 }),
  p("birthdate", "date", rw),
  p("portrait", "string", rw, { max: 255 }),
  p("language", "string", rw),
  p("job", "string", rw, { max: 100 }),
  p("company", "string", rw, { max: 50 }),
  p("website", "string", rw, { max: 255 }),
  ...[
    "facebook",
    "instagram",
    "x",
    "linkedIn",
    "youTube",
    "tikTok",
    "gitHub",
    "pinterest",
    "discord",
    "reddit",
    "twitch",
  ].map((key) => p(key, "string", rw, { max: 255 })),
  p("gdprConsentedAt", "date", rw),
  p("marketingConsentedAt", "date", rw),
  p("active", "boolean", rw),
  p("archived", "boolean", ro),
  p("archivedAt", "date", ro),
  p("createdAt", "date", ro),
  p("creatorName", "string", ro),
  p("updatedAt", "date", ro),
  p("updaterName", "string", ro),
  p("rolesArrayAgg", "array", rw, { privateField: true }),
]);
