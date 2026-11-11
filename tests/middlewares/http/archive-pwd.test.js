/** @jest-environment node */
import { jest } from "@jest/globals";

const archivePasswords = jest.fn();
const revokeUserSessions = jest.fn();
jest.unstable_mockModule("../../../src/services/pwd.js", () => ({
  archivePasswords,
}));
jest.unstable_mockModule("../../../src/services/session.js", () => ({
  revokeUserSessions,
}));
const { archivePwd } = await import(
  "../../../src/middlewares/http/archive-pwd.js"
);

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("archivePwd", () => {
  let consumer;
  let res;
  let next;

  beforeEach(() => {
    jest.resetAllMocks();
    archivePasswords.mockResolvedValue(undefined);
    revokeUserSessions.mockResolvedValue(undefined);
    consumer = { userId: 1, nickname: "admin" };
    res = { locals: { consumer } };
    next = jest.fn();
  });

  it.each([
    [[1, 7]],
    [[{ id: 1 }, { id: 7 }]],
    [["1", { id: "7" }, 7, { id: 1 }, "07"]],
  ])(
    "should normalize and dedupe valid rows %j for both cleanups",
    async (rows) => {
      await archivePwd({ body: { rows } }, res, next);

      expect(archivePasswords).toHaveBeenCalledTimes(1);
      expect(archivePasswords).toHaveBeenCalledWith([1, 7], consumer);
      expect(revokeUserSessions).toHaveBeenCalledTimes(1);
      expect(revokeUserSessions).toHaveBeenCalledWith([1, 7], consumer);
      expect(next.mock.calls).toEqual([[]]);
    },
  );

  it.each([
    undefined,
    null,
    {},
    { rows: null },
    { rows: [] },
    { rows: "1" },
    ...[null, undefined, {}, 0, -1, 1.5, "", "abc", true, []].map((id) => ({
      rows: [1, id],
    })),
    { rows: [{ id: 0 }] },
    { rows: [{ id: null }] },
  ])("should reject invalid body %j without starting cleanup", async (body) => {
    await archivePwd({ body }, res, next);

    expect(next.mock.calls).toEqual([
      [
        {
          statusCode: 400,
          message: "Invalid user ids for archive",
        },
      ],
    ]);
    expect(archivePasswords).not.toHaveBeenCalled();
    expect(revokeUserSessions).not.toHaveBeenCalled();
  });

  it("should start both cleanups and wait for both before continuing", async () => {
    const passwords = deferred();
    const sessions = deferred();
    archivePasswords.mockReturnValue(passwords.promise);
    revokeUserSessions.mockReturnValue(sessions.promise);

    const pending = archivePwd({ body: { rows: [7] } }, res, next);
    expect(archivePasswords).toHaveBeenCalledWith([7], consumer);
    expect(revokeUserSessions).toHaveBeenCalledWith([7], consumer);
    expect(next).not.toHaveBeenCalled();

    passwords.resolve();
    await new Promise(setImmediate);
    expect(next).not.toHaveBeenCalled();
    sessions.resolve();
    await pending;
    expect(next.mock.calls).toEqual([[]]);
  });

  it.each([
    ["passwords", { statusCode: 503 }, 502],
    ["sessions", { statusCode: 502 }, 502],
    ["passwords", { statusCode: 504 }, 504],
    ["sessions", { statusCode: 504 }, 504],
    ["passwords", new Error("network down"), 502],
  ])(
    "should wait for remaining cleanup after %s fails and forward %i",
    async (which, error, statusCode) => {
      const remaining = deferred();
      const failing =
        which === "passwords" ? archivePasswords : revokeUserSessions;
      const other =
        which === "passwords" ? revokeUserSessions : archivePasswords;
      failing.mockRejectedValue(error);
      other.mockReturnValue(remaining.promise);

      const pending = archivePwd({ body: { rows: [7] } }, res, next);
      await new Promise(setImmediate);
      expect(other).toHaveBeenCalledWith([7], consumer);
      expect(next).not.toHaveBeenCalled();
      remaining.resolve();
      await pending;

      expect(next.mock.calls).toEqual([
        [
          {
            statusCode,
            message:
              "User profile archived, but authentication cleanup failed. Retry the archive request.",
          },
        ],
      ]);
    },
  );

  it("should forward one retry error when both cleanups fail", async () => {
    archivePasswords.mockRejectedValue({ statusCode: 504 });
    revokeUserSessions.mockRejectedValue({ statusCode: 502 });

    await archivePwd({ body: { rows: [7] } }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({
      statusCode: 504,
      message:
        "User profile archived, but authentication cleanup failed. Retry the archive request.",
    });
  });
});
