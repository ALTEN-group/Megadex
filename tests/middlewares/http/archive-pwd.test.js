/** @jest-environment node */
import { jest } from "@jest/globals";

const archivePasswords = jest.fn();
jest.unstable_mockModule("../../../src/services/pwd.js", () => ({
  archivePasswords,
}));
const { archivePwd } = await import(
  "../../../src/middlewares/http/archive-pwd.js"
);

const RETRY =
  "User profile archived, but authentication cleanup failed. Retry the archive request.";

describe("archivePwd", () => {
  let consumer;
  let res;
  let next;

  beforeEach(() => {
    jest.resetAllMocks();
    archivePasswords.mockResolvedValue(undefined);
    consumer = { userId: 1, nickname: "admin" };
    res = { locals: { consumer } };
    next = jest.fn();
  });

  it.each([
    [[1, 7]],
    [[{ id: 1 }, { id: 7 }]],
    [["1", { id: "7" }, 7, { id: 1 }, "07"]],
  ])(
    "should normalize and dedupe valid rows %j before archiving passwords",
    async (rows) => {
      await archivePwd({ body: { rows } }, res, next);

      expect(archivePasswords).toHaveBeenCalledTimes(1);
      expect(archivePasswords).toHaveBeenCalledWith([1, 7], consumer);
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
      [{ statusCode: 400, message: "Invalid user ids for archive" }],
    ]);
    expect(archivePasswords).not.toHaveBeenCalled();
  });

  it.each([
    [{ statusCode: 503 }, 502],
    [{ statusCode: 404 }, 502],
    [{ statusCode: 504 }, 504],
    [new Error("network down"), 502],
  ])(
    "should forward retry guidance when password cleanup fails with %j",
    async (error, statusCode) => {
      archivePasswords.mockRejectedValue(error);

      await archivePwd({ body: { rows: [7] } }, res, next);

      expect(next.mock.calls).toEqual([[{ statusCode, message: RETRY }]]);
    },
  );
});
