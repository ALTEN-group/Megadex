// @ts-check

// JSON carries dates as ISO strings, while antity's "date" check requires Date objects.
const toDate = (v) => (typeof v === "string" ? new Date(v) : v);

export function property(
  key,
  type,
  operations,
  {
    requiredFor = [],
    filterable = true,
    privateField = false,
    typeChecked = true,
    min = null,
    max = null,
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
    sanitizer: null,
    normalizer:
      type === "object" ? JSON.stringify : type === "date" ? toDate : null,
    validator: null,
  };
}
