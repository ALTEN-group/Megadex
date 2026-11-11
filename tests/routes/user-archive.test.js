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
const SESSIONS = "http://gatelin.test/gatelin/consumers";
const RETRY =
  "User profile archived, but authentication cleanup failed. Retry the archive request.";
const originalEnv = {
  PWD_CREATE_URL: process.env.PWD_CREATE_URL,
  CONSUMER_URL: process.env.CONSUMER_URL,
};
let fetchMock;

function response(rows = []) {
  return { ok: true, json: async () => ({ rows }) };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
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

function expectAuditedArchive(ids, index = 0) {
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
    process.env.CONSUMER_URL = `${SESSIONS}/`;
    execute.mockResolvedValue({ rows: [], rowCount: 2 });
    fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) => {
        // The profile write must finish before either authentication boundary.
        expect(execute).toHaveBeenCalled();
        if (url === `${PASSWORDS}/search`)
          return response([{ id: 101 }, { id: "102" }, { id: 101 }]);
        if (url === `${SESSIONS}/search`)
          return response([{ id: 201 }, { id: "202" }, { id: 201 }]);
        if (url === `${PASSWORDS}/archive` || url === `${SESSIONS}/archive`)
          return response();
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
    "should archive %s with audited DB and real upstream contracts",
    async (_name, rows, ids) => {
      expectSuccess(await archive(rows));
      expect(execute).toHaveBeenCalledTimes(1);
      expectAuditedArchive(ids);
      const filters = {
        userId: { value: [7, 8], matchMode: "in" },
        archived: { value: false, matchMode: "equals" },
      };
      expect(callsTo(`${PASSWORDS}/search`)).toEqual([
        { filters, select: ["id"] },
      ]);
      expect(callsTo(`${SESSIONS}/search`)).toEqual([{ filters }]);
      expect(callsTo(`${PASSWORDS}/archive`)).toEqual([
        { rows: [{ id: 101 }, { id: 102 }] },
      ]);
      expect(callsTo(`${SESSIONS}/archive`)).toEqual([
        { rows: [{ id: 201 }] },
        { rows: [{ id: 202 }] },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(5);
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
      expectError(res, 400, "Missing rows in req.body for archive operation");
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
    execute.mockRejectedValueOnce(
      Object.assign(new Error("profile unavailable"), { statusCode: 500 }),
    );
    expectError(await archive(), 500, "Postgre error: profile unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([PASSWORDS, SESSIONS])(
    "should skip archive when %s search has no active rows",
    async (base) => {
      const normalFetch = fetchMock.getMockImplementation();
      fetchMock.mockImplementation((url, options) =>
        url === `${base}/search`
          ? Promise.resolve(response())
          : normalFetch(url, options),
      );
      expectSuccess(await archive());
      expect(callsTo(`${base}/archive`)).toEqual([]);
      expect(callsTo(`${base}/search`)).toHaveLength(1);
    },
  );

  it.each([
    [PASSWORDS, "http", 502],
    [SESSIONS, "http", 502],
    [PASSWORDS, "TimeoutError", 504],
    [SESSIONS, "AbortError", 504],
  ])(
    "should report %s archive %s failure after the profile write",
    async (base, kind, status) => {
      const normalFetch = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url, options) => {
        if (url !== `${base}/archive`) return normalFetch(url, options);
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
      expect(callsTo(`${base}/archive`).length).toBeGreaterThan(0);
      const other = base === PASSWORDS ? SESSIONS : PASSWORDS;
      expect(callsTo(`${other}/archive`).length).toBeGreaterThan(0);
    },
  );

  it.each([
    [PASSWORDS, "http", 502],
    [SESSIONS, "http", 502],
    [PASSWORDS, "invalid rows", 502],
    [SESSIONS, "invalid rows", 502],
    [PASSWORDS, "network", 502],
    [SESSIONS, "network", 502],
    [PASSWORDS, "timeout", 504],
    [SESSIONS, "timeout", 504],
  ])(
    "should report %s search %s failure with retry guidance",
    async (base, kind, status) => {
      const normalFetch = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url, options) => {
        if (url !== `${base}/search`) return normalFetch(url, options);
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
      expect(callsTo(`${base}/archive`)).toEqual([]);
      const other = base === PASSWORDS ? SESSIONS : PASSWORDS;
      expect(callsTo(`${other}/archive`).length).toBeGreaterThan(0);
    },
  );

  it.each([PASSWORDS, SESSIONS])(
    "should await pending %s cleanup even when the other service fails",
    async (slowBase) => {
      const started = deferred();
      const gate = deferred();
      const normalFetch = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url, options) => {
        if (url === `${slowBase}/archive`) {
          started.resolve();
          return gate.promise;
        }
        if (url.endsWith("/archive"))
          return { ok: false, status: 500, json: async () => null };
        return normalFetch(url, options);
      });
      let finished = false;
      const pending = archive().then((res) => {
        finished = true;
        return res;
      });
      try {
        await started.promise;
        await new Promise((resolve) => setImmediate(resolve));
        expect(finished).toBe(false);
      } finally {
        gate.resolve(response());
      }
      expectError(await pending, 502, RETRY);
    },
  );

  it.each(["passwords", "sessions"])(
    "should report partial %s failure and retry remaining cleanup for an already archived profile",
    async (failure) => {
      let passwordActive = true;
      const activeSessions = new Set([201, 202]);
      let failOnce = true;
      fetchMock.mockImplementation(async (url, options) => {
        if (url === `${PASSWORDS}/search`)
          return response(passwordActive ? [{ id: 101 }] : []);
        if (url === `${SESSIONS}/search`)
          return response([...activeSessions].map((id) => ({ id })));
        const { rows } = JSON.parse(options.body);
        const isFailure =
          failure === "passwords"
            ? url === `${PASSWORDS}/archive`
            : url === `${SESSIONS}/archive` && rows[0].id === 202;
        if (failOnce && isFailure) {
          failOnce = false;
          return { ok: false, status: 503, json: async () => null };
        }
        if (url === `${PASSWORDS}/archive`) passwordActive = false;
        else if (url === `${SESSIONS}/archive`)
          activeSessions.delete(rows[0].id);
        else throw new Error(`Unexpected outbound request: ${url}`);
        return response();
      });

      expectError(await archive([7]), 502, RETRY);
      expectAuditedArchive([7]);
      expect(passwordActive).toBe(failure === "passwords");
      expect([...activeSessions]).toEqual(failure === "sessions" ? [202] : []);
      const firstCallCount = fetchMock.mock.calls.length;
      // antity archive returns no rows even for an already archived profile.
      execute.mockResolvedValue({ rows: [], rowCount: 0 });
      expectSuccess(await archive([7]));
      expectAuditedArchive([7], 1);
      expect(passwordActive).toBe(false);
      expect([...activeSessions]).toEqual([]);
      const retryArchives = fetchMock.mock.calls
        .slice(firstCallCount)
        .filter(([url]) => url.endsWith("/archive"));
      expect(
        retryArchives.map(([url, options]) => [url, JSON.parse(options.body)]),
      ).toEqual(
        failure === "passwords"
          ? [[`${PASSWORDS}/archive`, { rows: [{ id: 101 }] }]]
          : [[`${SESSIONS}/archive`, { rows: [{ id: 202 }] }]],
      );
    },
  );

  it("should await every per-consumer archive after one session archive fails", async () => {
    const started = deferred();
    const gate = deferred();
    const normalFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (url, options) => {
      if (url === `${SESSIONS}/archive`) {
        if (JSON.parse(options.body).rows[0].id === 201)
          return { ok: false, status: 500, json: async () => null };
        started.resolve();
        return gate.promise;
      }
      return normalFetch(url, options);
    });
    let finished = false;
    const pending = archive().then((res) => {
      finished = true;
      return res;
    });
    try {
      await started.promise;
      await new Promise((resolve) => setImmediate(resolve));
      expect(finished).toBe(false);
    } finally {
      gate.resolve(response());
    }
    expectError(await pending, 502, RETRY);
    expect(callsTo(`${SESSIONS}/archive`)).toHaveLength(2);
  });
});
