// @ts-check
import { jest } from "@jest/globals";
import { mapDbError } from "../../../src/middlewares/res/db-error.js";

describe("mapDbError middleware", () => {
  it("maps PostgreSQL 23505 unique constraint violations to 409 with field-specific messages", () => {
    const emailErr = {
      code: "23505",
      constraint: "ux_user_email_lower",
      message: "duplicate key",
    };
    const next1 = jest.fn();
    mapDbError(
      emailErr,
      /** @type {any} */ ({}),
      /** @type {any} */ ({}),
      next1,
    );
    expect(next1).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: "Email already exists",
      }),
    );

    const nickErr = {
      code: "23505",
      constraint: "ux_user_nickname_lower",
      message: "duplicate key",
    };
    const next2 = jest.fn();
    mapDbError(
      nickErr,
      /** @type {any} */ ({}),
      /** @type {any} */ ({}),
      next2,
    );
    expect(next2).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: "Nickname already exists",
      }),
    );

    const socialErr = {
      code: "23505",
      constraint: "ux_social_name_lower",
      message: "duplicate key",
    };
    const next3 = jest.fn();
    mapDbError(
      socialErr,
      /** @type {any} */ ({}),
      /** @type {any} */ ({}),
      next3,
    );
    expect(next3).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: "Social network name already exists",
      }),
    );
  });

  it("maps PostgreSQL 23514 / 22P02 / P0001 errors to 400 Bad Request", () => {
    for (const code of ["23514", "22P02", "P0001"]) {
      const err = { code, message: "constraint failed" };
      const next = jest.fn();
      mapDbError(err, /** @type {any} */ ({}), /** @type {any} */ ({}), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 }),
      );
    }
  });

  it("leaves errors that already carry a statusCode untouched", () => {
    const err = { code: "23505", statusCode: 422, message: "Custom" };
    const next = jest.fn();
    mapDbError(err, /** @type {any} */ ({}), /** @type {any} */ ({}), next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422, message: "Custom" }),
    );
  });
});
