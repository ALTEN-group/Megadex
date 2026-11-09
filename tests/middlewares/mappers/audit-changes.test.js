/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";
import { buildChanges } from "../../../src/middlewares/mappers/audit-changes.js";

function run(rows) {
  const res = { locals: { rows } };
  const next = jest.fn();
  buildChanges({}, res, next);
  expect(next).toHaveBeenCalledWith();
  return res.locals.rows;
}

describe("buildChanges", () => {
  it("renders UPDATE changes as 'old → new' and drops the raw snapshots", () => {
    const [row] = run([
      {
        id: 1,
        operation: "UPDATE",
        changedKeys: ["firstName", "city"],
        previous: { firstName: "before", city: "Paris" },
        record: { firstName: "after", city: "Lyon" },
      },
    ]);

    expect(row.changes).toBe("firstName: before → after\ncity: Paris → Lyon");
    expect(row).not.toHaveProperty("record");
    expect(row).not.toHaveProperty("previous");
    expect(row).not.toHaveProperty("changedKeys");
  });

  it.each([
    "pwdHash",
    "twoFactorSecret",
    "hash",
    "deviceTokenHash",
    "answerHash",
  ])("never leaks the value of secret field %s", (key) => {
    const [row] = run([
      {
        operation: "UPDATE",
        changedKeys: [key],
        previous: { [key]: "old-secret-value" },
        record: { [key]: "new-secret-value" },
      },
    ]);

    expect(row.changes).toBe(`${key}: [redacted]`);
    expect(JSON.stringify(row)).not.toMatch(/secret-value/);
  });

  it("lists only non-null columns except id and bookkeeping for INSERT", () => {
    const [row] = run([
      {
        operation: "INSERT",
        changedKeys: ["archivedAt", "createdAt", "creatorName", "id", "name"],
        previous: null,
        record: {
          id: 5,
          name: "GitHub",
          archivedAt: null,
          createdAt: "2026-10-09",
          creatorName: "admin",
        },
      },
    ]);

    expect(row.changes).toBe("name: GitHub");
  });

  it("only redacts private props of the row's own table (userId is private on preference only)", () => {
    const base = {
      operation: "UPDATE",
      changedKeys: ["userId"],
      previous: { userId: 1 },
      record: { userId: 2 },
    };
    const [userRole, preference] = run([
      { ...base, tableName: "user_role" },
      { ...base, tableName: "preference" },
    ]);

    expect(userRole.changes).toBe("userId: 1 → 2");
    expect(preference.changes).toBe("userId: [redacted]");
  });

  it("shows the deleted values for DELETE", () => {
    const [row] = run([
      {
        operation: "DELETE",
        changedKeys: ["id", "name"],
        previous: null,
        record: { id: 5, name: "GitHub" },
      },
    ]);

    expect(row.changes).toBe("name: GitHub");
  });

  it("truncates long values and serializes objects", () => {
    const [row] = run([
      {
        operation: "UPDATE",
        changedKeys: ["conf"],
        previous: { conf: null },
        record: { conf: { a: "x".repeat(200) } },
      },
    ]);

    expect(row.changes.length).toBeLessThan(120);
    expect(row.changes.startsWith("conf: null → {")).toBe(true);
    expect(row.changes.endsWith("…")).toBe(true);
  });

  it("returns an empty text when nothing meaningful changed", () => {
    const [row] = run([
      { operation: "UPDATE", changedKeys: [], previous: {}, record: {} },
    ]);

    expect(row.changes).toBe("");
  });
});
