// @ts-check

export function property(
  key,
  type,
  operations,
  {
    requiredFor = [],
    filterable = true,
    privateField = false,
    min = null,
    max = null,
  } = {},
) {
  return {
    key,
    type,
    min,
    max,
    isTypeChecked: true,
    isFilterable: filterable,
    requiredFor,
    operations,
    isPrivate: privateField,
    sanitizer: null,
    normalizer: type === "object" ? JSON.stringify : null,
    validator: null,
  };
}
