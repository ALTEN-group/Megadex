// @ts-check
/**
 * Audit routes: wiring, read-only surface, and that secrets in raw
 * snapshots never reach the HTTP response.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jest } from "@jest/globals";
import request from "supertest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const get = jest.fn((_req, res, next) => {
  res.locals.rows = [
    {
      id: 10,
      tstamp: "2026-10-09T09:00:00.000Z",
      tableName: "preference",
      operation: "UPDATE",
      action: "UPDATE",
      userId: 3,
      userName: "admin",
      recordId: 7,
      kind: "change",
      changedKeys: ["userId", "name"],
      previous: { userId: 1, name: "Old" },
      record: { userId: 2, name: "New" },
    },
  ];
  res.locals.total = 1;
  next();
});

jest.unstable_mockModule(
  path.join(__dirname, "../../src/entities/audit.js"),
  () => ({
    default: {
      get,
      privateProps: ["changedKeys", "record", "previous"],
      properties: [
        {
          key: "id",
          type: "integer",
          operations: ["SELECT"],
          isFilterable: true,
          isPrivate: false,
        },
      ],
    },
  }),
);

const express = (await import("express")).default;
const { errorHandler } = await import("@dwtechs/errandler-express");
const { send } = await import("../../src/middlewares/res/send.js");
const audit = (await import("../../src/routes/audit.js")).default;
const aEnt = (await import("../../src/entities/audit.js")).default;

const app = express();
app.use(express.json());
app.use("/megadex/audit", audit, send(aEnt));
errorHandler(app);

describe("audit routes", () => {
  it("POST /search returns redacted changes without raw snapshots", async () => {
    const res = await request(app)
      .post("/megadex/audit/search")
      .send({ first: 0, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    const [row] = res.body.rows;
    expect(row.changes).toBe("userId: [redacted]\nname: Old → New");
    expect(row).not.toHaveProperty("record");
    expect(row).not.toHaveProperty("previous");
    expect(row).not.toHaveProperty("changedKeys");
  });

  it.each([
    ["GET", "/megadex/audit/schema"],
    ["GET", "/megadex/audit/1/history"],
    ["PUT", "/megadex/audit"],
    ["POST", "/megadex/audit"],
    ["POST", "/megadex/audit/archive"],
    ["DELETE", "/megadex/audit"],
  ])("%s %s is not a route", async (method, url) => {
    const res = await request(app)
      [method.toLowerCase()](url)
      .send({ rows: [] });

    expect(res.status).toBe(404);
  });
});
