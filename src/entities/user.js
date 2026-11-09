// @ts-check
import { SQLEntity } from "@dwtechs/antity-pgsql";
import { httpUrlValidator, property as p } from "./property.js";

const rw = ["SELECT", "INSERT", "UPDATE"];
const ro = ["SELECT"];

const VALID_GENDERS = new Set(["M", "F"]);
const VALID_CIVILITIES = new Set(["Mr.", "Mrs.", "Ms."]);
const ISO3_RE = /^[A-Z]{3}$/;
const ISO2_RE = /^[a-z]{2}$/;

const toLowerCase = (v) => (typeof v === "string" ? v.toLowerCase() : v);

/**
 * Validates `socialsJsonAgg` after `JSON.stringify` normalization: must be a
 * JSON object mapping network names to string handles (max 255 chars) or null.
 *
 * @param {unknown} v
 * @returns {boolean}
 */
function validateSocialsJson(v) {
  if (typeof v !== "string") return false;
  try {
    const parsed = JSON.parse(v);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return false;
    }
    for (const [name, handle] of Object.entries(parsed)) {
      if (!name || name.length > 50) return false;
      if (
        handle !== null &&
        (typeof handle !== "string" || handle.length > 255)
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export default new SQLEntity("users", [
  p("id", "integer", ro),
  p("gender", "string", rw, {
    min: 1,
    max: 1,
    validator: (v) => typeof v === "string" && VALID_GENDERS.has(v),
  }),
  p("civility", "string", rw, {
    min: 3,
    max: 4,
    validator: (v) => typeof v === "string" && VALID_CIVILITIES.has(v),
  }),
  p("firstName", "string", rw, { requiredFor: ["POST"], min: 1, max: 50 }),
  p("middleName", "string", rw, { max: 50 }),
  p("lastName", "string", rw, { requiredFor: ["POST"], min: 1, max: 50 }),
  p("nickname", "string", rw, { requiredFor: ["POST"], min: 1, max: 30 }),
  p("email", "email", rw, {
    requiredFor: ["POST"],
    min: 5,
    max: 50,
    normalizer: toLowerCase,
  }),
  p("backupEmail", "email", rw, {
    max: 50,
    normalizer: toLowerCase,
  }),
  p("address", "string", rw, { max: 100 }),
  p("zipCode", "string", rw, { max: 10 }),
  p("city", "string", rw, { max: 50 }),
  p("country", "string", rw, {
    min: 3,
    max: 3,
    validator: (v) => typeof v === "string" && ISO3_RE.test(v),
  }),
  p("nationality", "string", rw, {
    min: 3,
    max: 3,
    validator: (v) => typeof v === "string" && ISO3_RE.test(v),
  }),
  p("phone", "string", rw, { max: 20 }),
  p("birthdate", "date", rw),
  p("portrait", "string", rw, { max: 255 }),
  p("language", "string", rw, {
    min: 2,
    max: 2,
    validator: (v) => typeof v === "string" && ISO2_RE.test(v),
  }),
  p("job", "string", rw, { max: 100 }),
  p("company", "string", rw, { max: 50 }),
  p("website", "string", rw, {
    max: 255,
    validator: httpUrlValidator(255),
  }),
  p("gdprConsentedAt", "date", rw),
  p("marketingConsentedAt", "date", rw),
  p("active", "boolean", rw),
  p("archived", "boolean", ro),
  p("archivedAt", "date", ro, { readOnly: true }),
  p("createdAt", "date", ro, { readOnly: true }),
  p("creatorName", "string", ro, {
    min: 1,
    max: 100,
    typeChecked: false,
    filterable: false,
  }),
  p("updatedAt", "date", ro, { readOnly: true }),
  p("updaterName", "string", ro, {
    min: 1,
    max: 100,
    typeChecked: false,
    filterable: false,
  }),
  p("rolesArrayAgg", "array", rw, {
    privateField: true,
    min: 1,
    requiredFor: ["POST"],
  }),
  // Keys are social catalog names, values are the user's handle on that network.
  p("socialsJsonAgg", "json", rw, {
    filterable: false,
    validator: validateSocialsJson,
  }),
]);
