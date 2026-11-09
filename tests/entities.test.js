import { jest } from "@jest/globals";
import { property } from "../src/entities/property.js";
import { rolesToSchema } from "../src/middlewares/user-roles.js";

describe("property", () => {
  it("normalizes ISO date strings to Date objects", () => {
    const { normalizer } = property("birthdate", "date", ["SELECT"]);
    expect(normalizer("1990-05-03")).toEqual(new Date("1990-05-03"));
    expect(normalizer(null)).toBeNull();
  });

  it("serializes object and json properties", () => {
    const { normalizer: objNorm } = property("conf", "object", ["SELECT"]);
    expect(objNorm({ a: 1 })).toBe('{"a":1}');
    const { normalizer: jsonNorm } = property("conf", "json", ["SELECT"]);
    expect(jsonNorm([1, 2])).toBe("[1,2]");
  });
});

describe("rolesToSchema", () => {
  it("exposes the writable roles property", () => {
    const res = { locals: { rows: [{ key: "email" }] } };
    const next = jest.fn();
    rolesToSchema({}, res, next);
    expect(res.locals.rows.map((r) => r.key)).toEqual(["email", "roles"]);
    expect(res.locals.rows[1].operations).toEqual([
      "SELECT",
      "INSERT",
      "UPDATE",
    ]);
    expect(res.locals.rows[1].readOnly).toBe(false);
    expect(next).toHaveBeenCalled();
  });
});
