/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";

const execute = jest.fn();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({ execute }));

const { assertSuperAdminCeiling } = await import(
  "../../../../src/middlewares/mappers/user/assertSuperAdminCeiling.js"
);

/**
 * @param {object} opts
 * @param {string} [opts.method]
 * @param {string} [opts.path]
 * @param {any} [opts.rows]
 * @param {any} [opts.userId]
 */
const run = async (opts = {}) => {
  const {
    method = "POST",
    path = "/",
    rows = [{ id: 2 }],
    userId = "userId" in opts ? opts.userId : 10,
  } = opts;
  const req = { method, path, body: { rows } };
  const res = {
    locals: userId === undefined ? {} : { consumer: { userId } },
  };
  const next = jest.fn();
  await assertSuperAdminCeiling(
    /** @type {any} */ (req),
    /** @type {any} */ (res),
    next,
  );
  return next;
};

describe("assertSuperAdminCeiling", () => {
  beforeEach(() => execute.mockReset());

  it("rejects when consumer userId is missing with 401", async () => {
    const next = await run({ userId: undefined });
    expect(next).toHaveBeenCalledWith({
      statusCode: 401,
      message: "Unauthorized",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects when rows is missing or empty with 400", async () => {
    const next = await run({ rows: [] });
    expect(next).toHaveBeenCalledWith({
      statusCode: 400,
      message: "Missing rows in req.body",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("allows POST / without a DB query when no row assigns the super admin role", async () => {
    const next = await run({
      method: "POST",
      path: "/",
      rows: [{ email: "user@example.com", rolesArrayAgg: [2, 3] }],
      userId: 10,
    });
    expect(next).toHaveBeenCalledWith();
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects POST / with 403 when a non-super-admin assigns the super admin role", async () => {
    execute.mockResolvedValue({ rows: [] });
    const next = await run({
      method: "POST",
      path: "/",
      rows: [{ email: "root@example.com", rolesArrayAgg: [1, 2] }],
      userId: 10,
    });
    expect(next).toHaveBeenCalledWith({
      statusCode: 403,
      message: "Cannot assign super admin role",
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("FROM user_role"),
      [1, [10]],
      null,
    );
  });

  it("allows POST / when a super admin assigns the super admin role", async () => {
    execute.mockResolvedValue({ rows: [{ userId: 1 }] });
    const next = await run({
      method: "POST",
      path: "/",
      rows: [{ email: "root@example.com", rolesArrayAgg: [1] }],
      userId: 1,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects PUT / or POST /archive with 400 when a row has no valid integer id", async () => {
    const next = await run({
      method: "PUT",
      path: "/",
      rows: [{ id: "bad" }],
      userId: 10,
    });
    expect(next).toHaveBeenCalledWith({
      statusCode: 400,
      message: "Every row must carry a valid integer id",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects POST /archive with 403 when an admin tries to archive a super admin user", async () => {
    // Target user 3 holds role 1; caller 10 does not
    execute.mockResolvedValue({ rows: [{ userId: 3 }] });
    const next = await run({
      method: "POST",
      path: "/archive",
      rows: [{ id: 3 }],
      userId: 10,
    });
    expect(next).toHaveBeenCalledWith({
      statusCode: 403,
      message: "Cannot modify or archive a super admin user",
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("FROM user_role"),
      [1, [10, 3]],
      null,
    );
  });

  it("allows POST /archive when an admin archives a non-super-admin user", async () => {
    execute.mockResolvedValue({ rows: [] });
    const next = await run({
      method: "POST",
      path: "/archive",
      rows: [{ id: 5 }],
      userId: 10,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("allows POST /archive when a super admin archives another super admin user", async () => {
    execute.mockResolvedValue({ rows: [{ userId: 1 }, { userId: 3 }] });
    const next = await run({
      method: "POST",
      path: "/archive",
      rows: [3],
      userId: 1,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects PUT / with 403 when an admin tries to update a super admin user", async () => {
    execute.mockResolvedValue({ rows: [{ userId: 3 }] });
    const next = await run({
      method: "PUT",
      path: "/",
      rows: [{ id: 3, active: false }],
      userId: 10,
    });
    expect(next).toHaveBeenCalledWith({
      statusCode: 403,
      message: "Cannot modify or archive a super admin user",
    });
  });

  it("rejects PUT / with 403 when an admin tries to promote a user to super admin", async () => {
    execute.mockResolvedValue({ rows: [] });
    const next = await run({
      method: "PUT",
      path: "/",
      rows: [{ id: 5, rolesArrayAgg: [1, 2] }],
      userId: 10,
    });
    expect(next).toHaveBeenCalledWith({
      statusCode: 403,
      message: "Cannot assign super admin role",
    });
  });

  it("forwards database errors to next", async () => {
    const dbErr = new Error("connection lost");
    execute.mockRejectedValue(dbErr);
    const next = await run({
      method: "POST",
      path: "/archive",
      rows: [{ id: 5 }],
      userId: 10,
    });
    expect(next).toHaveBeenCalledWith(dbErr);
  });
});
