import { jest } from "@jest/globals";
import request from "supertest";

const execute = jest.fn();

class MockEntity {
  constructor(name, properties) {
    this.name = name;
    this.properties = properties;
    this.privateProps = properties.filter((p) => p.isPrivate).map((p) => p.key);
    this.get = (_req, res, next) => {
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
    this.archive = (_req, res, next) => {
      res.locals.rows = [];
      res.locals.total = 0;
      next();
    };
  }

  mutate(req, res, next) {
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

beforeEach(() => execute.mockReset());

describe("Megadex routes", () => {
  test.each(["/megadex/users/search", "/users/users/search"])(
    "mounts user search at %s and exposes roles",
    async (path) => {
      const response = await request(app).post(path).send({ filters: {} });
      expect(response.status).toBe(200);
      expect(response.body.rows[0]).toMatchObject({
        id: 7,
        nickname: "meg",
        roles: [2, 4],
      });
      expect(response.body.rows[0].rolesArrayAgg).toBeUndefined();
    },
  );

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
      .get("/users/users/me")
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

  test("rejects anonymous user mutations", async () => {
    const response = await request(app)
      .post("/megadex/users")
      .send({ rows: [{ firstName: "A" }] });
    expect(response.status).toBe(401);
  });
});

describe("preference ownership", () => {
  test("rejects anonymous preference access", async () => {
    const response = await request(app).get("/megadex/preferences/users");
    expect(response.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  test("rejects a resource outside the CHECK constraint", async () => {
    const response = await request(app)
      .get("/megadex/preferences/tokens")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice");
    expect(response.status).toBe(400);
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
      .get("/users/preferences/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice");
    expect(response.status).toBe(200);
    expect(response.body.rows[0]).toMatchObject({ name: "Default" });
    expect(execute.mock.calls[0][1]).toEqual([42, "users"]);
  });

  test("ignores a supplied userId and inserts for the forwarded user", async () => {
    execute.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 8, resourceName: "users", name: "grid", conf: [] }],
    });
    const response = await request(app)
      .post("/users/preferences/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({
        rows: [{ userId: 999, name: "grid", conf: [], isActive: true }],
      });
    expect(response.status).toBe(200);
    expect(execute.mock.calls[0][1][0]).toBe(42);
    expect(execute.mock.calls[0][1]).not.toContain(999);
  });

  test("scopes updates to the forwarded user", async () => {
    execute.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 8, resourceName: "users", name: "mine", conf: [] }],
    });
    const response = await request(app)
      .put("/megadex/preferences/users")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice")
      .send({ rows: [{ id: 8, userId: 999, name: "mine" }] });
    expect(response.status).toBe(200);
    const [sql, args] = execute.mock.calls[0];
    expect(sql).toContain('"userId"');
    expect(args).toContain(42);
    expect(args).not.toContain(999);
  });

  test("scopes deletes to the forwarded user", async () => {
    execute.mockResolvedValue({ rowCount: 1, rows: [] });
    const response = await request(app)
      .delete("/megadex/preferences/users/8")
      .set("x-consumer-user-id", "42")
      .set("x-consumer-name", "alice");
    expect(response.status).toBe(200);
    expect(execute.mock.calls[0][1]).toEqual([8, "users", 42]);
  });
});
