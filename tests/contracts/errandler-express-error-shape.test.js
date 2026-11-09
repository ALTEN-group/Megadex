/**
 * @jest-environment node
 *
 * Contract test — codifies which fields `@dwtechs/errandler-express`
 * actually reads off an error object passed to `next({...})`, so future
 * contributors have one authoritative place to look before writing a new
 * error-emitting middleware.
 */

import { errorHandler } from "@dwtechs/errandler-express";
import { jest } from "@jest/globals";

function captureClientErrorHandler() {
  const registered = [];
  const mockApp = { use: (fn) => registered.push(fn) };
  errorHandler(mockApp);
  if (registered.length !== 4)
    throw new Error(
      `errandler-express registered ${registered.length} middlewares; ` +
        `expected 4 — the library's wiring changed, revisit this contract test`,
    );
  return registered[2];
}

describe("@dwtechs/errandler-express error-shape contract", () => {
  let clientErrorHandler;
  let res;
  let next;

  beforeAll(() => {
    clientErrorHandler = captureClientErrorHandler();
  });

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("HTTP status source of truth", () => {
    it("reads .statusCode as the primary field (canonical shape)", () => {
      clientErrorHandler(
        { statusCode: 403, message: "forbidden" },
        {},
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("falls back to .status when .statusCode is absent", () => {
      clientErrorHandler(
        { status: 401, message: "unauthorized" },
        {},
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("prefers .statusCode over .status when both are present", () => {
      clientErrorHandler(
        { statusCode: 422, status: 500, message: "unprocessable" },
        {},
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(422);
    });

    it("defaults to 400 when neither .statusCode nor .status is present", () => {
      clientErrorHandler({ message: "malformed" }, {}, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("response body source of truth", () => {
    it("reads .message for the response body (canonical shape)", () => {
      clientErrorHandler(
        { statusCode: 400, message: "missing id" },
        {},
        res,
        next,
      );

      expect(res.send).toHaveBeenCalledWith("missing id");
    });

    it("does NOT read .msg", () => {
      clientErrorHandler({ statusCode: 400, msg: "missing id" }, {}, res, next);

      expect(res.send).toHaveBeenCalledWith(undefined);
    });

    it("sends undefined body when .message is missing entirely", () => {
      clientErrorHandler({ statusCode: 400 }, {}, res, next);

      expect(res.send).toHaveBeenCalledWith(undefined);
    });
  });

  describe("canonical shape for all future next() error calls", () => {
    it("{ statusCode, message } produces the expected status AND body", () => {
      clientErrorHandler(
        { statusCode: 422, message: "invalid payload" },
        {},
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.send).toHaveBeenCalledWith("invalid payload");
    });
  });
});
