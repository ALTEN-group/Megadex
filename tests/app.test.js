/** @jest-environment node */
import { jest } from "@jest/globals";
import request from "supertest";

const execute = jest.fn();

class MockEntity {
  constructor(name, properties, schema = "public") {
    this.name = name;
    this.table = name;
    this.schema = schema;
    this.properties = properties;
    this.privateProps = properties.filter((p) => p.isPrivate).map((p) => p.key);
    this.get = (req, res, next) => {
      this.lastGetFilters = req.body?.filters ?? null;
      res.locals.rows =
        name === "users"
          ? [
              {
                id: 7,
                nickname: "meg",
                email: "m@example.test",
                active: true,
                rolesArrayAgg: [2, 4],
              },
            ]
          : [{ id: 1 }];
      res.locals.total = res.locals.rows.length;
      next();
    };
    this.addArraySubstack = this.mutate.bind(this);
    this.updateArraySubstack = this.mutate.bind(this);
    this.delete = (req, res, next) => {
      this.lastDeleteIds = (req.body?.rows ?? [{ id: req.params.id }]).map(
        (r) => r.id,
      );
      res.locals.rows = res.locals.rows ?? [{ id: Number(req.params.id) }];
      res.locals.total = res.locals.rows.length;
      next();
    };
    this.archive = (_req, res, next) => {
      res.locals.rows = [];
      res.locals.total = 0;
      next();
    };
    this.restore = this.archive;
    this.history = (options = {}) => {
      const tables = options.tables ?? [this.table];
      return (req, res, next) => {
        execute(
          "SELECT history",
          [this.schema, tables, options.field ?? "id", req.params.id],
          null,
        )
          .then((r) => {
            res.locals.rows = r.rows ?? [];
            res.locals.total = res.locals.rows.length;
            next();
          })
          .catch(next);
      };
    };
    this.getHistory = this.history();
  }

  mutate(req, res, next) {
    this.lastMutatedRows = req.body.rows.map((r) => ({ ...r }));
    res.locals.rows = req.body.rows;
    res.locals.total = res.locals.rows.length;
    next();
  }
}

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  execute,
  SQLEntity: MockEntity,
}));

const { default: app } = await import("../src/app.js");
const { default: preferenceEnt } = await import(
  "../src/entities/preference.js"
);

beforeEach(() => execute.mockReset());

describe("Megadex routes", () => {
  test("mounts user search at /megadex/users/search and exposes roles", async () => {
    const response = await request(app)
      .post("/megadex/users/search")
      .send({ filters: {} });
    expect(response.status).toBe(200);
    expect(response.body.rows[0]).toMatchObject({
      id: 7,
      nickname: "meg",
      roles: [2, 4],
    });
    expect(response.body.rows[0].rolesArrayAgg).toBeUndefined();
  });

  test("defaults archived=false on internal /megadex/users/search when consumer headers are absent", async () => {
    const { default: userEnt } = await import("../src/entities/user.js");
    await request(app).post("/megadex/users/search").send({ filters: {} });
    expect(userEnt.lastGetFilters).toEqual({
      archived: { value: false, matchMode: "equals" },
    });

    await request(app)
      .post("/megadex/users/search")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({ filters: {} });
    expect(userEnt.lastGetFilters).toEqual({});
  });

  test("requires trusted identity for /me", async () => {
    const response = await request(app).get("/megadex/users/me");
    expect(response.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  test("loads /me only for the forwarded user", async () => {
    execute.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 42, nickname: "alice", rolesArrayAgg: [3] }],
    });
    const response = await request(app)
      .get("/megadex/users/me")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 42,
      nickname: "alice",
      roles: [3],
    });
    expect(execute.mock.calls[0][1]).toEqual([42]);
  });

  test("allows self-service profile updates via PUT /me and blocks privilege escalation", async () => {
    const okRes = await request(app)
      .put("/megadex/users/me")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({ firstName: "Alicia", language: "fr" });
    expect(okRes.status).toBe(200);
    expect(okRes.body.rows[0]).toMatchObject({
      id: 42,
      firstName: "Alicia",
      language: "fr",
    });

    for (const forbidden of [
      { roles: [1] },
      { active: true },
      { email: "root@example.com" },
      { archived: false },
    ]) {
      const forbiddenRes = await request(app)
        .put("/megadex/users/me")
        .set("x-consumer-user-id", "42")
        .set("x-consumer-name", "alice")
        .send(forbidden);
      expect(forbiddenRes.status).toBe(403);
    }
  });

  test("rejects empty or non-positive roles and identical email/backupEmail", async () => {
    const emptyRoles = await request(app)
      .post("/megadex/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({ rows: [{ firstName: "A", roles: [] }] });
    expect(emptyRoles.status).toBe(400);

    const zeroRole = await request(app)
      .post("/megadex/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({ rows: [{ firstName: "A", roles: [0] }] });
    expect(zeroRole.status).toBe(400);

    const sameBackupEmail = await request(app)
      .post("/megadex/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({
        rows: [
          {
            firstName: "A",
            email: "Alice@Example.com",
            backupEmail: "alice@example.com",
          },
        ],
      });
    expect(sameBackupEmail.status).toBe(400);
  });

  test("maps API roles to the database view field on writes", async () => {
    const response = await request(app)
      .post("/megadex/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({
        rows: [
          {
            firstName: "A",
            lastName: "B",
            nickname: "ab",
            email: "a@b.co",
            roles: [4, 2, 4],
          },
        ],
      });
    expect(response.status).toBe(200);
    expect(response.body.rows[0].roles).toEqual([4, 2]);
    expect(response.body.rows[0].rolesArrayAgg).toBeUndefined();
  });

  test("blocks a non-super-admin from archiving or updating a super admin user or assigning role 1", async () => {
    // Target user 3 holds role 1; caller 42 does not
    execute.mockResolvedValue({ rows: [{ userId: 3 }] });
    const archiveRes = await request(app)
      .post("/megadex/users/archive")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "admin")
      .send({ rows: [{ id: 3 }] });
    expect(archiveRes.status).toBe(403);

    execute.mockResolvedValue({ rows: [{ userId: 3 }] });
    const updateRes = await request(app)
      .put("/megadex/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "admin")
      .send({ rows: [{ id: 3, active: false }] });
    expect(updateRes.status).toBe(403);

    execute.mockResolvedValue({ rows: [] });
    const assignRes = await request(app)
      .post("/megadex/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "admin")
      .send({
        rows: [
          {
            firstName: "A",
            lastName: "B",
            nickname: "ab",
            email: "a@b.co",
            roles: [1],
          },
        ],
      });
    expect(assignRes.status).toBe(403);
  });

  test("rejects anonymous user mutations", async () => {
    const response = await request(app)
      .post("/megadex/users")
      .send({ rows: [{ firstName: "A" }] });
    expect(response.status).toBe(401);
  });

  test("reads user history across the user, role and social tables", async () => {
    execute.mockResolvedValue({
      rowCount: 2,
      rows: [
        {
          id: 1,
          tstamp: "2026-01-01T00:00:00.000Z",
          operation: "INSERT",
          userId: 42,
          userName: "alice",
          record: { id: 7 },
        },
        {
          id: 2,
          tstamp: "2026-01-02T00:00:00.000Z",
          operation: "UPDATE",
          userId: 42,
          userName: "alice",
          record: { id: 7, rolesArrayAgg: [1, 3] },
        },
      ],
    });
    const response = await request(app)
      .get("/megadex/users/7/history")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice");
    expect(response.status).toBe(200);
    expect(response.body.rows).toHaveLength(2);
    expect(response.body.rows[1].record).toEqual({ id: 7, roles: [1, 3] });
    expect(execute.mock.calls[0][1][1]).toEqual([
      "user",
      "user_role",
      "user_social",
    ]);
  });
});

describe("preference ownership", () => {
  test("rejects anonymous preference access", async () => {
    const response = await request(app).get("/megadex/preferences/users");
    expect(response.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  test("returns templates and own rows for the forwarded user", async () => {
    execute.mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 3,
          resourceName: "users",
          name: "Default",
          conf: [],
          locked: true,
          isActive: true,
        },
      ],
    });
    const response = await request(app)
      .get("/megadex/preferences/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice");
    expect(response.status).toBe(200);
    expect(response.body.rows[0]).toMatchObject({ name: "Default" });
    expect(execute.mock.calls[0][1]).toEqual([42, "users"]);
  });

  test("ignores a supplied userId and inserts for the forwarded user", async () => {
    const response = await request(app)
      .post("/megadex/preferences/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({
        rows: [{ userId: 999, name: "grid", conf: [], isActive: true }],
      });
    expect(response.status).toBe(200);
    expect(preferenceEnt.lastMutatedRows[0]).toMatchObject({
      userId: 42,
      resourceName: "users",
      name: "grid",
    });
    expect(response.body.rows[0].userId).toBeUndefined();
  });

  test("scopes updates to the forwarded user", async () => {
    execute.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 8 }],
    });
    const response = await request(app)
      .put("/megadex/preferences/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({ rows: [{ id: 8, userId: 999, name: "mine", isActive: true }] });
    expect(response.status).toBe(200);
    const [sql, args] = execute.mock.calls[0];
    expect(sql).toContain('"userId"');
    expect(args).toEqual([[8], "users", 42]);
  });

  test("scopes deletes to the forwarded user", async () => {
    const response = await request(app)
      .delete("/megadex/preferences/users/8")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice");
    expect(response.status).toBe(200);
    expect(preferenceEnt.lastGetFilters).toEqual({
      id: { value: "8", matchMode: "=" },
      userId: { value: 42, matchMode: "=" },
      resourceName: { value: "users", matchMode: "=" },
    });
  });
});
