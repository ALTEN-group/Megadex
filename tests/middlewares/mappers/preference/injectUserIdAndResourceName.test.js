/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";
import { injectUserIdAndResourceName } from "../../../../src/middlewares/mappers/preference/injectUserIdAndResourceName.js";

describe("injectUserIdAndResourceName middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { resource: "users" },
      body: {
        rows: [
          { name: "a", conf: [] },
          { name: "b", conf: [] },
        ],
      },
    };
    res = { locals: { consumer: { userId: 42 } } };
    next = jest.fn();
  });

  it("should stamp every row with the authenticated consumer's userId and the URL resourceName", () => {
    injectUserIdAndResourceName(req, res, next);

    expect(req.body.rows).toEqual([
      { name: "a", conf: [], userId: 42, resourceName: "users" },
      { name: "b", conf: [], userId: 42, resourceName: "users" },
    ]);
    expect(next).toHaveBeenCalledWith();
  });

  it("should ignore any client-supplied userId/resourceName on the rows", () => {
    req.body.rows = [{ name: "a", userId: 1, resourceName: "socials" }];

    injectUserIdAndResourceName(req, res, next);

    expect(req.body.rows).toEqual([
      { name: "a", userId: 42, resourceName: "users" },
    ]);
    expect(next).toHaveBeenCalledWith();
  });

  it("should leave an empty rows array unchanged", () => {
    req.body.rows = [];

    injectUserIdAndResourceName(req, res, next);

    expect(req.body.rows).toEqual([]);
    expect(next).toHaveBeenCalledWith();
  });
});
