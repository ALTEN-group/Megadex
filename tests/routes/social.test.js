/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";
import request from "supertest";

// Keep the real social entity and Antity restore implementation. Route both
// Antity's internal pool calls and ACL's exported execute through this stub.
const execute = jest.fn();
jest.unstable_mockModule("pg-pool", () => ({
  default: class {
    query(...args) {
      return execute(...args);
    }
  },
}));
const antity = await import("@dwtechs/antity-pgsql");
jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  ...antity,
  execute,
}));

const { default: app } = await import("../../src/app.js");

const ENDPOINT = "/megadex/socials/restore";
const CONSUMER = {
  "x-consumer-user-id": "42",
  "x-consumer-name": "restore-admin",
};
const CONDITIONS = JSON.stringify([
  { field: "archived", op: "=", value: false },
]);

function expectSuccess(res) {
  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toMatch(/json/);
  expect(res.body).toEqual({ rows: [], total: 0 });
}

// The assembled app's installed errandler sends text errors.
function expectError(res, status, message) {
  expect(res.status).toBe(status);
  expect(res.headers["content-type"]).toMatch(/text\/html/);
  expect(res.text).toBe(message);
}

function expectRestoreCall(index, ids) {
  const [query, args] = execute.mock.calls[index];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const auditIdParam = ids.length + 1;
  const auditNameParam = ids.length + 2;
  expect(query.replace(/\s+/g, " ").trim()).toBe(
    `UPDATE public.social SET archived = false, "updaterId" = $${auditIdParam}, "updaterName" = $${auditNameParam} WHERE id IN (${placeholders})`,
  );
  expect(query).not.toMatch(/\bname\b|\burl\b/i);
  expect(args).toEqual([...ids, 42, "restore-admin"]);
}

function expectAclSearch(ids) {
  const [query, args, client] = execute.mock.calls[0];
  expect(query).toMatch(/^\s*SELECT\b/i);
  expect(query).toMatch(/\bFROM\s+public\.social\b/i);
  expect(query).toMatch(/"?archived"?\s*=\s*\$\d+/);
  expect(query).toMatch(/"?id"?\s+IN\s*\(/i);
  expect(args).toEqual([false, ...ids]);
  expect(client).toBeNull();
}

describe("POST /megadex/socials/restore", () => {
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
    ["numeric ids", [7, 8]],
    ["string ids", ["7", "8"]],
    ["object ids", [{ id: 7 }, { id: "8" }]],
  ])(
    "should restore %s with flattened audited SQL parameters",
    async (_name, rows) => {
      const res = await request(app)
        .post(ENDPOINT)
        .set(CONSUMER)
        .send({ rows });

      expectSuccess(res);
      expect(execute).toHaveBeenCalledTimes(1);
      expectRestoreCall(0, [7, 8]);
    },
  );

  it("should normalize and deduplicate ids before restoring", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .send({ rows: [8, "7", { id: "8" }, { id: 7 }, 8] });

    expectSuccess(res);
    expect(execute).toHaveBeenCalledTimes(1);
    expectRestoreCall(0, [8, 7]);
  });

  it.each([
    ["missing rows", {}],
    ["empty rows", { rows: [] }],
    ["null rows", { rows: null }],
    ["object rows", { rows: { id: 7 } }],
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
    ["SQL-like string", "7); UPDATE social SET archived=false; --"],
    ["empty string", ""],
    ["null", null],
    ["boolean", true],
    ["array", [7]],
    ["object without id", {}],
    ["null object id", { id: null }],
    ["invalid object id", { id: "invalid" }],
  ])("should reject %s atomically across the batch", async (_name, invalid) => {
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .send({ rows: [7, invalid, { id: 8 }] });

    expectError(res, 400, "Invalid row id for restore");
    expect(execute).not.toHaveBeenCalled();
  });

  it("should reject missing consumer headers before validation or writes", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .send({ rows: [7] });

    expectError(res, 401, "Missing consumer headers on a tracked write");
    expect(execute).not.toHaveBeenCalled();
  });

  it("should deny rows outside ACL conditions before any UPDATE", async () => {
    execute.mockResolvedValueOnce({ rows: [{ id: 7 }], rowCount: 1 });
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .set("x-acl-conditions", CONDITIONS)
      .send({ rows: [7, 8] });

    expectError(res, 403, "One or more rows violate ACL conditions");
    expect(execute).toHaveBeenCalledTimes(1);
    expectAclSearch([7, 8]);
    expect(execute.mock.calls.some(([sql]) => /^\s*UPDATE\b/i.test(sql))).toBe(
      false,
    );
  });

  it("should restore only after each deduplicated id passes the real ACL search", async () => {
    execute.mockResolvedValueOnce({
      rows: [{ id: "8" }, { id: 7 }],
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

  it("should ignore forbidden extra fields and update only archive state and audit columns", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .send({
        filters: { id: { value: 99, matchMode: "equals" } },
        rows: [
          {
            id: 7,
            name: "forged",
            url: "https://attacker.example",
            archived: true,
            updaterId: 99,
            updaterName: "forged",
          },
        ],
      });

    expectSuccess(res);
    expect(execute).toHaveBeenCalledTimes(1);
    expectRestoreCall(0, [7]);
  });

  it("should return 500 for ACL query errors", async () => {
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

  it("should return 500 with the Postgre prefix for native restore errors", async () => {
    execute.mockRejectedValueOnce(
      Object.assign(new Error("Restore database unavailable"), {
        statusCode: 500,
      }),
    );
    const res = await request(app)
      .post(ENDPOINT)
      .set(CONSUMER)
      .send({ rows: [7] });

    expectError(res, 500, "Postgre error: Restore database unavailable");
    expect(execute).toHaveBeenCalledTimes(1);
    expectRestoreCall(0, [7]);
  });
});
