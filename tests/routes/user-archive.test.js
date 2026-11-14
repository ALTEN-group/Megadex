/** @jest-environment node */
import { jest } from "@jest/globals";
import request from "supertest";

// Mock below antity's internal execute as well as its exported execute:
// keep the real entity, SQL builder, ACL, cleanup middleware and response stack.
const execute = jest.fn();
jest.unstable_mockModule("pg-pool", () => ({
  default: class {
    query(...args) {
      return execute(...args);
    }
  },
}));

const { default: app } = await import("../../src/app.js");
const ENDPOINT = "/megadex/users/archive";
const CONSUMER = {
  "x-consumer-user-id": "42",
  "x-consumer-name": "archive-admin",
};
const PASSWORDS = "http://foxnox.test/foxnox/pwd";
const RETRY =
  "User profile archived, but authentication cleanup failed. Retry the archive request.";
const originalEnv = {
  PWD_CREATE_URL: process.env.PWD_CREATE_URL,
};
let fetchMock;

function response(rows = []) {
  return { ok: true, json: async () => ({ rows }) };
}

function archive(rows = [7, 8], headers = CONSUMER) {
  return request(app).post(ENDPOINT).set(headers).send({ rows });
}

function expectSuccess(res) {
  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toMatch(/json/);
  expect(res.body).toEqual({ rows: [], total: 0 });
}

// Installed errandler sends text errors, not a synthetic JSON envelope.
function expectError(res, status, message) {
  expect(res.status).toBe(status);
  expect(res.headers["content-type"]).toMatch(/text\/html/);
  expect(res.text).toBe(message);
}

function callsTo(url) {
  return fetchMock.mock.calls
    .filter(([target]) => target === url)
    .map(([, options]) => JSON.parse(options.body));
}

// assertSuperAdminCeiling runs one lookup (caller + unique targets) before the
// UPDATE, so the audited archive is the second DB call of each request.
function expectCeilingLookup(targetIds, index = 0) {
  const [sql, args] = execute.mock.calls[index];
  expect(sql).toMatch(/^\s*SELECT\s+"userId"\s+FROM\s+user_role\b/i);
  expect(args).toEqual([1, [42, ...targetIds]]);
}

function expectAuditedArchive(ids, index = 1) {
  const [sql, args] = execute.mock.calls[index];
  const n = ids.length;
  expect(sql).toBe(
    `UPDATE public.users SET archived = true, "updaterId" = $${n + 1}, "updaterName" = $${n + 2} WHERE id IN (${ids.map((_, i) => `$${i + 1}`).join(", ")})`,
  );
  expect(args).toEqual([...ids, 42, "archive-admin"]);
}

describe("POST /megadex/users/archive", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.PWD_CREATE_URL = `${PASSWORDS}/`;
    execute.mockResolvedValue({ rows: [], rowCount: 2 });
    fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) => {
        // The profile write must finish before the password cleanup.
        expect(execute).toHaveBeenCalled();
        if (url === `${PASSWORDS}/search`)
          return response([{ id: 101 }, { id: "102" }, { id: 101 }]);
        if (url === `${PASSWORDS}/archive`) return response();
        throw new Error(`Unexpected outbound request: ${url}`);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it.each([
    ["bare ids", [7, 8], [7, 8]],
    ["bare string ids", ["7", "8"], ["7", "8"]],
    ["object ids", [{ id: 7 }, { id: "8" }], [7, "8"]],
    ["mixed duplicate ids", [7, "8", { id: "7" }, 8], [7, "8", "7", 8]],
  ])(
    "should archive %s with audited DB and Foxnox password cleanup only",
    async (_name, rows, ids) => {
      expectSuccess(await archive(rows));
      expect(execute).toHaveBeenCalledTimes(2);
      expectCeilingLookup([7, 8]);
      expectAuditedArchive(ids);
      expect(callsTo(`${PASSWORDS}/search`)).toEqual([
        {
          filters: {
            userId: { value: [7, 8], matchMode: "in" },
            archived: { value: false, matchMode: "is" },
          },
          select: ["id"],
        },
      ]);
      expect(callsTo(`${PASSWORDS}/archive`)).toEqual([
        { rows: [{ id: 101 }, { id: 102 }] },
      ]);
      // Gatelin sessions are not revoked: no other upstream is called.
      expect(fetchMock).toHaveBeenCalledTimes(2);
      for (const [, options] of fetchMock.mock.calls) {
        expect(options).toMatchObject({
          method: "post",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            ...CONSUMER,
          },
        });
        expect(options.signal).toBeInstanceOf(AbortSignal);
      }
    },
  );

  it.each([[42], [{ id: "42" }]])(
    "should forbid self archive for row %j",
    async (row) => {
      expectError(
        await archive([7, row]),
        403,
        "You cannot archive your own user account",
      );
      expect(execute).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("should reject missing identity before DB or upstream cleanup", async () => {
    expectError(
      await archive([7], {}),
      401,
      "Missing consumer headers on a tracked write",
    );
    expect(execute).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing rows", {}],
    ["empty rows", { rows: [] }],
  ])(
    "should reject %s before profile or authentication writes",
    async (_name, body) => {
      const res = await request(app).post(ENDPOINT).set(CONSUMER).send(body);
      // The ceiling guard validates rows before the archive handler can.
      expectError(res, 400, "Missing rows in req.body");
      expect(execute).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("should stop a denied ACL before profile archive or cleanup", async () => {
    execute.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await archive([7], {
      ...CONSUMER,
      "x-acl-conditions": JSON.stringify([
        { field: "active", op: "=", value: true },
      ]),
    });
    expectError(res, 403, "One or more rows violate ACL conditions");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toMatch(/^\s*SELECT\b/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should not start cleanup if the profile archive fails", async () => {
    execute.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    execute.mockRejectedValueOnce(
      Object.assign(new Error("profile unavailable"), { statusCode: 500 }),
    );
    expectError(await archive(), 500, "Postgre error: profile unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty rows list", async () => response()],
    [
      "a 404 (antity empty result)",
      async () => ({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => null,
      }),
    ],
  ])(
    "should succeed without archive when the password search returns %s",
    async (_name, searchResponse) => {
      const normalFetch = fetchMock.getMockImplementation();
      fetchMock.mockImplementation((url, options) =>
        url === `${PASSWORDS}/search`
          ? searchResponse()
          : normalFetch(url, options),
      );
      expectSuccess(await archive());
      expect(callsTo(`${PASSWORDS}/archive`)).toEqual([]);
      expect(callsTo(`${PASSWORDS}/search`)).toHaveLength(1);
    },
  );

  it.each([
    ["http", 502],
    ["TimeoutError", 504],
    ["AbortError", 504],
  ])(
    "should report password archive %s failure after the profile write",
    async (kind, status) => {
      const normalFetch = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url, options) => {
        if (url !== `${PASSWORDS}/archive`) return normalFetch(url, options);
        if (kind === "http")
          return {
            ok: false,
            status: 503,
            statusText: "Unavailable",
            json: async () => null,
          };
        throw Object.assign(new Error("upstream timed out"), { name: kind });
      });
      expectError(await archive(), status, RETRY);
      expectAuditedArchive([7, 8]);
      expect(callsTo(`${PASSWORDS}/archive`)).toHaveLength(1);
    },
  );

  it.each([
    ["http", 502],
    ["invalid rows", 502],
    ["network", 502],
    ["timeout", 504],
  ])(
    "should report password search %s failure with retry guidance",
    async (kind, status) => {
      const normalFetch = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url, options) => {
        if (url !== `${PASSWORDS}/search`) return normalFetch(url, options);
        if (kind === "http")
          return {
            ok: false,
            status: 500,
            statusText: "Unavailable",
            json: async () => null,
          };
        if (kind === "invalid rows") return response([{ userId: 7 }]);
        throw Object.assign(new Error("upstream failed"), {
          name: kind === "timeout" ? "TimeoutError" : "TypeError",
        });
      });
      expectError(await archive(), status, RETRY);
      expectAuditedArchive([7, 8]);
      expect(callsTo(`${PASSWORDS}/archive`)).toEqual([]);
    },
  );

  it("should retry remaining password cleanup for an already archived profile", async () => {
    let passwordActive = true;
    let failOnce = true;
    fetchMock.mockImplementation(async (url) => {
      if (url === `${PASSWORDS}/search`)
        return passwordActive
          ? response([{ id: 101 }])
          : { ok: false, status: 404, json: async () => null };
      if (url !== `${PASSWORDS}/archive`)
        throw new Error(`Unexpected outbound request: ${url}`);
      if (failOnce) {
        failOnce = false;
        return { ok: false, status: 503, json: async () => null };
      }
      passwordActive = false;
      return response();
    });

    expectError(await archive([7]), 502, RETRY);
    expectAuditedArchive([7]);
    expect(passwordActive).toBe(true);
    // antity archive returns no rows even for an already archived profile.
    execute.mockResolvedValue({ rows: [], rowCount: 0 });
    expectSuccess(await archive([7]));
    expectAuditedArchive([7], 3);
    expect(passwordActive).toBe(false);
    // A third retry finds nothing left (404) and still succeeds.
    expectSuccess(await archive([7]));
    expect(callsTo(`${PASSWORDS}/archive`)).toHaveLength(2);
  });
});
