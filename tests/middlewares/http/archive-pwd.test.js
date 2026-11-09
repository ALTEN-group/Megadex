// @ts-check
import { jest } from "@jest/globals";
import { archivePwd } from "../../../src/middlewares/http/archive-pwd.js";
import { syncUserLifecycle } from "../../../src/middlewares/http/sync-user-lifecycle.js";

describe("user lifecycle propagation (Foxnox pwd archive & Gatelin session revocation)", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it("archivePwd searches and archives active Foxnox passwords and Gatelin sessions", async () => {
    process.env.PWD_CREATE_URL = "http://foxnox:3000/foxnox/pwd";
    process.env.CONSUMER_URL = "http://gatelin:3000/gatelin/consumers";

    const fetchMock = jest.fn(async (url) => {
      if (url === "http://foxnox:3000/foxnox/pwd/search") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ rows: [{ id: 101 }] }),
        };
      }
      if (url === "http://gatelin:3000/gatelin/consumers/search") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ rows: [{ id: 201 }, { id: 202 }] }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    global.fetch = /** @type {any} */ (fetchMock);

    const req = /** @type {any} */ ({
      body: { rows: [{ id: 7 }] },
    });
    const res = /** @type {any} */ ({
      locals: { consumer: { userId: 1, nickname: "admin" } },
    });
    const next = jest.fn();

    await archivePwd(req, res, next);

    expect(next).toHaveBeenCalledWith();
    const calledUrls = fetchMock.mock.calls.map(([u]) => u);
    expect(calledUrls).toEqual(
      expect.arrayContaining([
        "http://foxnox:3000/foxnox/pwd/search",
        "http://foxnox:3000/foxnox/pwd/archive",
        "http://gatelin:3000/gatelin/consumers/search",
        "http://gatelin:3000/gatelin/consumers/archive",
      ]),
    );
  });

  it("syncUserLifecycle revokes Gatelin sessions when a user is deactivated or roles change", async () => {
    process.env.CONSUMER_URL = "http://gatelin:3000/gatelin/consumers";

    const fetchMock = jest.fn(async (url) => {
      if (url === "http://gatelin:3000/gatelin/consumers/search") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ rows: [{ id: 301 }] }),
        };
      }
      return { ok: true, status: 204, json: async () => null };
    });
    global.fetch = /** @type {any} */ (fetchMock);

    const req = /** @type {any} */ ({
      body: {
        rows: [
          { id: 9, active: false },
          { id: 10, firstName: "UnchangedSession" },
        ],
      },
    });
    const res = /** @type {any} */ ({
      locals: { consumer: { userId: 1, nickname: "admin" } },
    });
    const next = jest.fn();

    await syncUserLifecycle(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const searchBody = JSON.parse(
      /** @type {any} */ (fetchMock.mock.calls[0])[1].body,
    );
    expect(searchBody.filters.userId).toEqual({
      value: [9],
      matchMode: "in",
    });
  });
});
