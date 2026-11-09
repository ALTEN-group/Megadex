// @ts-check

// JSON carries dates as ISO strings (or boolean `true` for consent timestamps),
// while antity's "date" check requires Date objects.
const toDate = (v) => {
  if (v === true) return new Date();
  if (typeof v === "string") return new Date(v);
  return v;
};

/**
 * Validates that a string is either empty or a valid HTTP(S) URL within max length.
 *
 * @param {number} [maxLen=255]
 * @returns {(v: unknown) => boolean}
 */
export function httpUrlValidator(maxLen = 255) {
  return (v) => {
    if (typeof v !== "string" || v.length > maxLen) return false;
    if (v === "") return true;
    if (!URL.canParse(v)) return false;
    const { protocol } = new URL(v);
    return protocol === "http:" || protocol === "https:";
  };
}

export function property(
  key,
  type,
  operations,
  {
    requiredFor = [],
    filterable = true,
    privateField = false,
    typeChecked = true,
    readOnly = false,
    min = null,
    max = null,
    sanitizer = null,
    normalizer = null,
    validator = null,
  } = {},
) {
  return {
    key,
    type,
    min,
    max,
    isTypeChecked: typeChecked,
    isFilterable: filterable,
    requiredFor,
    operations,
    isPrivate: privateField,
    readOnly: Boolean(readOnly),
    sanitizer,
    normalizer:
      normalizer ??
      (type === "object" || type === "json"
        ? JSON.stringify
        : type === "date"
          ? toDate
          : null),
    validator,
  };
}
