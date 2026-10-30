// @ts-check

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
    normalizer: type === "object" ? JSON.stringify : null,
    validator: null,
  };
}
