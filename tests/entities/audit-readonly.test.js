/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";
import auditEnt from "../../src/entities/audit.js";
import socialEnt from "../../src/entities/social.js";
import userEnt from "../../src/entities/user.js";

const AUDIT_DATES = ["archivedAt", "createdAt", "updatedAt"];

describe("audit entity", () => {
  it("marks every property as readOnly", () => {
    for (const p of auditEnt.properties) {
      expect(p.readOnly).toBe(true);
    }
  });
});

describe.each([
  ["user", userEnt],
  ["social", socialEnt],
])("%s audit dates", (_name, ent) => {
  it.each(AUDIT_DATES)("%s is a readOnly date", (key) => {
    const p = ent.properties.find((prop) => prop.key === key);
    expect(p.type).toBe("date");
    expect(p.readOnly).toBe(true);
  });

  it("PUT round-trip with ISO-string audit dates is stripped, not rejected", () => {
    const iso = "2026-10-08T19:45:09.117Z";
    const row = { id: 3, archivedAt: iso, createdAt: iso, updatedAt: iso };
    const req = { method: "PUT", body: { rows: [row] } };
    const next = jest.fn();

    ent.normalizeArray(req, {}, jest.fn());
    ent.validateArray(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err?.message ?? "").not.toMatch(/archivedAt|createdAt|updatedAt/);
    for (const key of AUDIT_DATES) expect(row).not.toHaveProperty(key);
  });
});
