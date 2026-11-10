/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";
import request from "supertest";

// Keep the real SQLEntity schemas/query builder; replace only the DB boundary.
const antity = await import("@dwtechs/antity-pgsql");
const execute = jest.fn();
jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  ...antity,
  execute,
}));

const { default: app } = await import("../../src/app.js");

const ENDPOINT = "/megadex/users/restore";
const CONSUMER = {
  "x-consumer-user-id": "42",
  "x-consumer-name": "restore-admin",
};
const CONDITIONS = JSON.stringify([{ field: "active", op: "=", value: true }]);
const RESTORE_SQL =
  'UPDATE users SET archived = false, "updaterId" = $2, "updaterName" = $3 WHERE id = ANY($1::int[]) AND archived = true';

function expectSuccess(res) {
  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toMatch(/json/);
  expect(res.body).toEqual({ rows: [], total: 0 });
}

// The assembled app's installed errandler sends text, not an { error } envelope.
function expectError(res, status, message) {
  expect(res.status).toBe(status);
  expect(res.headers["content-type"]).toMatch(/text\/html/);
  expect(res.text).toBe(message);
}

function expectRestoreCall(index, ids) {
  const [query, args, client] = execute.mock.calls[index];
  // Exact assignments prevent payload/ACL fields from becoming extra updates.
  expect(query.replace(/\s+/g, " ").trim()).toBe(RESTORE_SQL);
  expect(query).not.toMatch(/\bactive\b/);
  expect(args).toEqual([ids, 42, "restore-admin"]);
  expect(client).toBeNull();
}

function expectAclSearch(ids) {
  const [query, args, client] = execute.mock.calls[0];
  expect(query).toMatch(/^\s*SELECT\b/i);
  expect(query).toMatch(/\bFROM\s+public\.users\b/i);
  expect(query).toMatch(/\bWHERE\b/i);
  expect(query).toMatch(/"?active"?\s*=\s*\$\d+/);
  expect(query).toMatch(/"?id"?\s+IN\s*\(/i);
  expect(query).toMatch(/\bAND\b/);
  expect(args).toEqual([true, ...ids]);
  expect(client).toBeNull();
}

describe("POST /megadex/users/restore", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    execute.mockResolvedValue({ rows: [], rowCount: 0 });
    jest.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("Unexpected outbound HTTP request during restore");
    });
  });

  afterEach(() => {
    expect(globalThis.fetch).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it.each([
    ["bare numeric ids from ngx-crud-builder", [7, 8]],
    ["bare string ids", ["7", "8"]],
    ["object ids", [{ id: 7 }, { id: "8" }]],
    ["mixed representations", [7, { id: "8" }]],
  ])("should restore %s with audited parameters", async (_name, rows) => {
    execute.mockResolvedValueOnce({ rows: [], rowCount: 2 });
    const res = await request(app).post(ENDPOINT).set(CONSUMER).send({ rows });

    expectSuccess(res);
    expect(execute).toHaveBeenCalledTimes(1);
    expectRestoreCall(0, [7, 8]);
  });

  it("should normalize and deduplicate ids before the UPDATE", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .send({ rows: [8, "7", { id: "8" }, { id: 7 }, 8] });

    expectSuccess(res);
    expect(execute).toHaveBeenCalledTimes(1);
    expectRestoreCall(0, [8, 7]);
  });

  it("should return an empty success for an idempotent restore with no matching archived rows", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .send({ rows: [7] });

    expectSuccess(res);
    expect(execute).toHaveBeenCalledTimes(1);
    expectRestoreCall(0, [7]);
  });

  it.each([
    ["missing rows", {}],
    ["empty rows", { rows: [] }],
    ["null rows", { rows: null }],
    ["object rows", { rows: { id: 7 } }],
    ["string rows", { rows: "7" }],
    ["numeric rows", { rows: 7 }],
    ["top-level array", [7]],
  ])("should reject %s without accessing the database", async (_name, body) => {
    const res = await request(app).post(ENDPOINT).set(CONSUMER).send(body);

    expectError(res, 400, "Missing rows in req.body");
    expect(execute).not.toHaveBeenCalled();
  });

  it("should reject a missing request body without accessing the database", async () => {
    const res = await request(app).post(ENDPOINT).set(CONSUMER);

    expectError(res, 400, "Missing rows in req.body");
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    ["zero", 0],
    ["negative id", -1],
    ["fractional id", 7.5],
    ["fractional string", "7.5"],
    ["non-numeric string", "invalid"],
    ["SQL-like string", "7); UPDATE users SET active=true; --"],
    ["empty string", ""],
    ["null", null],
    ["boolean", true],
    ["array", [7]],
    ["object without id", {}],
    ["null object id", { id: null }],
    ["invalid object id", { id: "invalid" }],
  ])("should reject %s in a batch atomically", async (_name, invalid) => {
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .send({ rows: [7, invalid, { id: 8 }] });

    expectError(res, 400, "Invalid user id for restore");
    expect(execute).not.toHaveBeenCalled();
  });

  it("should reject missing consumer headers before validation or writes", async () => {
    const res = await request(app).post(ENDPOINT).send({ rows: [] });

    expectError(res, 401, "Missing consumer headers on a tracked write");
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    [
      "missing user id",
      { "x-consumer-name": "restore-admin" },
      "Missing consumer Id",
    ],
    [
      "missing nickname",
      { "x-consumer-user-id": "42" },
      "Missing consumer nickname",
    ],
    [
      "invalid user id",
      { ...CONSUMER, "x-consumer-user-id": "oops" },
      "Missing consumer Id",
    ],
    [
      "non-positive user id",
      { ...CONSUMER, "x-consumer-user-id": "0" },
      "Missing consumer Id",
    ],
    [
      "short nickname",
      { ...CONSUMER, "x-consumer-name": "ab" },
      "Invalid consumer nickname",
    ],
  ])(
    "should deny a consumer with %s without writes",
    async (_name, headers, message) => {
      const res = await request(app)
        .post(ENDPOINT)
        .set(headers)
        .send({ rows: [7] });

      expectError(res, 400, message);
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["no permitted users", []],
    ["only some permitted users", [{ id: 7 }]],
    ["unrelated permitted users", [{ id: 99 }]],
  ])("should deny %s before any UPDATE", async (_name, rows) => {
    execute.mockResolvedValueOnce({ rows, rowCount: rows.length });
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .set("x-acl-conditions", CONDITIONS)
      .send({ rows: [7, { id: "8" }] });

    expectError(res, 403, "One or more rows violate ACL conditions");
    expect(execute).toHaveBeenCalledTimes(1);
    expectAclSearch([7, 8]);
    expect(execute.mock.calls.some(([sql]) => /^\s*UPDATE\b/i.test(sql))).toBe(
      false,
    );
  });

  it("should restore only after every deduplicated id passes the real ACL search", async () => {
    execute.mockResolvedValueOnce({
      rows: [
        { id: "8", active: true },
        { id: 7, active: true },
      ],
      rowCount: 2,
    });
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .set("x-acl-conditions", CONDITIONS)
      .send({ rows: [7, "7", { id: 8 }] });

    expectSuccess(res);
    expect(execute).toHaveBeenCalledTimes(2);
    expectAclSearch([7, 8]);
    expectRestoreCall(1, [7, 8]);
  });

  it.each([undefined, "active,email,nickname,roles", "nickname"])(
    "should never let extra payload fields modify restore state with ACL fields %s",
    async (fields) => {
      let req = request(app).post(ENDPOINT).set(CONSUMER);
      if (fields !== undefined) req = req.set("x-acl-fields", fields);
      const res = await req.send({
        filters: { id: { value: 99, matchMode: "equals" } },
        rows: [
          {
            id: 7,
            active: true,
            archived: true,
            email: "injected@example.test",
            nickname: "injected",
            roles: [1],
            updaterId: 99,
            updaterName: "forged",
          },
        ],
      });

      expectSuccess(res);
      expect(execute).toHaveBeenCalledTimes(1);
      expectRestoreCall(0, [7]);
    },
  );

  it("should forward ACL search database errors as 500 without attempting an UPDATE", async () => {
    execute.mockRejectedValueOnce(new Error("ACL database unavailable"));
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .set("x-acl-conditions", CONDITIONS)
      .send({ rows: [7] });

    expectError(res, 500, "ACL database unavailable");
    expect(execute).toHaveBeenCalledTimes(1);
    expectAclSearch([7]);
  });

  it("should preserve a boundary error's explicit 500 status", async () => {
    execute.mockRejectedValueOnce(
      Object.assign(new Error("Restore database unavailable"), {
        statusCode: 500,
      }),
    );
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .send({ rows: [7] });

    expectError(res, 500, "Restore database unavailable");
    expect(execute).toHaveBeenCalledTimes(1);
    expectRestoreCall(0, [7]);
  });

  it("should forward an untagged restore database error using errandler's default 400", async () => {
    execute.mockRejectedValueOnce(new Error("Restore database unavailable"));
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .send({ rows: [7] });

    expect(execute).toHaveBeenCalledTimes(1);
    expectRestoreCall(0, [7]);
    // Repository contract: next(error) preserves the message; no status defaults to 400.
    expectError(res, 400, "Restore database unavailable");
  });
});
