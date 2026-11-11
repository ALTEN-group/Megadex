/** @jest-environment node */
import { jest } from "@jest/globals";

const revokeUserSessions = jest.fn();
jest.unstable_mockModule("../../../src/services/session.js", () => ({
  revokeUserSessions,
}));
const { syncUserLifecycle } = await import(
  "../../../src/middlewares/http/sync-user-lifecycle.js"
);

describe("syncUserLifecycle", () => {
  let consumer;
  let res;
  let next;

  beforeEach(() => {
    jest.resetAllMocks();
    revokeUserSessions.mockResolvedValue(undefined);
    consumer = { userId: 1, nickname: "admin" };
    res = { locals: { consumer } };
    next = jest.fn();
  });

  it("should revoke only valid deactivated or role-modified users", async () => {
    const rows = [
      { id: 9, active: false },
      { id: "10", roles: [] },
      { id: 11, rolesArrayAgg: null },
      { id: 12, active: true },
      { id: 13, firstName: "UnchangedSession" },
      { id: "invalid", roles: [1] },
      { roles: [1] },
      null,
    ];
    await syncUserLifecycle({ body: { rows } }, res, next);
    expect(revokeUserSessions).toHaveBeenCalledTimes(1);
    expect(revokeUserSessions).toHaveBeenCalledWith([9, 10, 11], consumer);
    expect(next.mock.calls).toEqual([[]]);
  });

  it.each([
    undefined,
    null,
    {},
    { rows: [] },
    { rows: {} },
    { rows: [null, { id: 9, active: true }, { id: 10, name: "same" }] },
  ])(
    "should continue without revocation for unaffected body %j",
    async (body) => {
      await syncUserLifecycle({ body }, res, next);
      expect(revokeUserSessions).not.toHaveBeenCalled();
      expect(next.mock.calls).toEqual([[]]);
    },
  );

  it.each([502, 503, 504])(
    "should forward rejection %i rather than silently continuing",
    async (statusCode) => {
      const error = Object.assign(new Error("revocation failed"), {
        statusCode,
      });
      revokeUserSessions.mockRejectedValue(error);

      await syncUserLifecycle(
        { body: { rows: [{ id: 9, active: false }] } },
        res,
        next,
      );

      expect(revokeUserSessions).toHaveBeenCalledWith([9], consumer);
      expect(next.mock.calls).toEqual([[error]]);
      expect(next.mock.calls[0][0]).toBe(error);
    },
  );

  it("should not continue until session revocation settles", async () => {
    let resolve;
    revokeUserSessions.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = syncUserLifecycle(
      { body: { rows: [{ id: 9, roles: [] }] } },
      res,
      next,
    );
    expect(revokeUserSessions).toHaveBeenCalledWith([9], consumer);
    expect(next).not.toHaveBeenCalled();
    resolve();
    await pending;
    expect(next.mock.calls).toEqual([[]]);
  });
});
