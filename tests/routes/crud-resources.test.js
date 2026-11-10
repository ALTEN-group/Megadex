// @ts-check
/**
 * Parameterized CRUD wiring for Megadex JSON resources — mirrors Foxnox and
 * Gatelin's tests/routes/crud-resources.test.js. Entities are stubbed; we
 * assert that each HTTP verb reaches the right entity method and response shape.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jest } from "@jest/globals";
import request from "supertest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Tracked writes are rejected without a consumer, so every write request carries one. */
const CONSUMER_HEADERS = {
  "x-consumer-user-id": "1",
  "x-consumer-name": "tester",
};

/** @typedef {{ name: string, mount: string, entityFile: string, historyTable: string, privateProps: string[] }} Resource */

/** @type {Resource[]} */
const RESOURCES = [
  {
    name: "users",
    mount: "/megadex/users",
    entityFile: "user.js",
    historyTable: "user",
    privateProps: ["rolesArrayAgg"],
  },
  {
    name: "socials",
    mount: "/megadex/socials",
    entityFile: "social.js",
    historyTable: "social",
    privateProps: [],
  },
];

/** @type {Record<string, import("@jest/globals").Mock>} */
const entityGets = {};
/** @type {Record<string, import("@jest/globals").Mock>} */
const entityAdds = {};
/** @type {Record<string, import("@jest/globals").Mock>} */
const entityUpdates = {};
/** @type {Record<string, import("@jest/globals").Mock>} */
const entityArchives = {};
/** @type {Record<string, import("@jest/globals").Mock>} */
const historyMiddlewares = {};

for (const resource of RESOURCES) {
  const tag = resource.name;
  const get = jest.fn((_req, res, next) => {
    res.locals.rows = [
      {
        id: 1,
        entity: tag,
        rolesArrayAgg: [1, 2],
      },
    ];
    res.locals.total = 1;
    next();
  });
  const addArraySubstack = jest.fn((req, res, next) => {
    res.locals.rows = req.body.rows ?? [{ id: 1, entity: tag }];
    res.locals.total = res.locals.rows.length;
    next();
  });
  const updateArraySubstack = jest.fn((req, res, next) => {
    res.locals.rows = req.body.rows ?? [];
    res.locals.total = res.locals.rows.length;
    next();
  });
  const archive = jest.fn((req, res, next) => {
    res.locals.rows = req.body.rows ?? [];
    res.locals.total = res.locals.rows.length;
    next();
  });

  entityGets[tag] = get;
  entityAdds[tag] = addArraySubstack;
  entityUpdates[tag] = updateArraySubstack;
  entityArchives[tag] = archive;

  const getHistory = jest.fn((_req, res, next) => {
    res.locals.rows = [
      {
        id: 1,
        operation: "UPDATE",
        record: {
          id: 1,
          table: resource.historyTable,
          rolesArrayAgg: [1, 2],
        },
      },
    ];
    res.locals.total = 1;
    next();
  });
  historyMiddlewares[resource.historyTable] = getHistory;

  jest.unstable_mockModule(
    path.join(__dirname, `../../src/entities/${resource.entityFile}`),
    () => ({
      default: {
        table: tag === "users" ? "users" : "social",
        get,
        addArraySubstack,
        updateArraySubstack,
        archive,
        getHistory,
        history: jest.fn(() => getHistory),
        privateProps: resource.privateProps,
        properties: [
          {
            key: "id",
            type: "integer",
            min: null,
            max: null,
            operations: ["SELECT"],
            requiredFor: [],
            isFilterable: true,
            isPrivate: false,
            readOnly: false,
          },
          {
            key: "secretField",
            type: "string",
            min: null,
            max: null,
            operations: ["SELECT"],
            requiredFor: [],
            isFilterable: false,
            isPrivate: true,
            readOnly: false,
          },
        ],
      },
    }),
  );
}

// archivePwd calls Foxnox/Gatelin when their URLs are set; these tests only check routing.
jest.unstable_mockModule(
  path.join(__dirname, "../../src/middlewares/http/archive-pwd.js"),
  () => ({ archivePwd: jest.fn((_req, _res, next) => next()) }),
);

const { default: app } = await import("../../src/app.js");

describe.each(RESOURCES)(
  "POST $mount/search ($name)",
  ({ name, mount, privateProps }) => {
    beforeEach(() => {
      entityGets[name].mockClear();
    });

    it("routes to its own entity and strips its private fields", async () => {
      const res = await request(app).post(`${mount}/search`).send({});
      expect(res.status).toBe(200);
      expect(res.body.rows[0].entity).toBe(name);
      expect(entityGets[name]).toHaveBeenCalledTimes(1);
      for (const key of privateProps) {
        expect(res.body.rows[0]).not.toHaveProperty(key);
      }
    });
  },
);

describe.each(RESOURCES)(
  "GET $mount/:id/history ($name)",
  ({ name, mount, historyTable, privateProps }) => {
    beforeEach(() => {
      historyMiddlewares[historyTable].mockClear();
    });

    it("routes to history for its table and strips private fields from the record snapshot", async () => {
      const res = await request(app).get(`${mount}/1/history`);
      expect(res.status).toBe(200);
      expect(res.body.rows[0].record.table).toBe(historyTable);
      expect(historyMiddlewares[historyTable]).toHaveBeenCalledTimes(1);
      expect(entityGets[name]).not.toHaveBeenCalled();
      for (const key of privateProps) {
        expect(res.body.rows[0].record).not.toHaveProperty(key);
      }
    });
  },
);

describe.each(RESOURCES)("POST $mount (add) ($name)", ({ name, mount }) => {
  beforeEach(() => {
    entityAdds[name].mockClear();
  });

  it("routes to addArraySubstack", async () => {
    const res = await request(app)
      .post(`${mount}/`)
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ id: 9, entity: name }] });
    expect(res.status).toBe(200);
    expect(res.body.rows[0].entity).toBe(name);
    expect(entityAdds[name]).toHaveBeenCalledTimes(1);
  });

  it("rejects a write with no consumer headers", async () => {
    const res = await request(app)
      .post(`${mount}/`)
      .send({ rows: [{ id: 9, entity: name }] });
    expect(res.status).toBe(401);
    expect(entityAdds[name]).not.toHaveBeenCalled();
  });
});

describe.each(RESOURCES)("PUT $mount (update) ($name)", ({ name, mount }) => {
  beforeEach(() => {
    entityUpdates[name].mockClear();
  });

  it("routes to updateArraySubstack", async () => {
    const res = await request(app)
      .put(`${mount}/`)
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ id: 1, entity: name }] });
    expect(res.status).toBe(200);
    expect(entityUpdates[name]).toHaveBeenCalledTimes(1);
  });
});

describe.each(RESOURCES)("POST $mount/archive ($name)", ({ name, mount }) => {
  beforeEach(() => {
    entityArchives[name].mockClear();
  });

  it("routes to archive", async () => {
    const res = await request(app)
      .post(`${mount}/archive`)
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ id: 2 }] });
    expect(res.status).toBe(200);
    expect(entityArchives[name]).toHaveBeenCalledTimes(1);
  });
});

describe.each(RESOURCES)("GET $mount/schema ($name)", ({ name, mount }) => {
  it("returns non-private property projections", async () => {
    const res = await request(app).get(`${mount}/schema`);
    expect(res.status).toBe(200);
    expect(res.body.rows.every((r) => r.key !== "secretField")).toBe(true);
    expect(res.body.rows.some((r) => r.key === "id")).toBe(true);
    expect(entityGets[name]).not.toHaveBeenCalled();
  });
});

describe("Gatelin ACL header wiring", () => {
  it("forces x-acl-conditions into entity search filters", async () => {
    entityGets.socials.mockClear();

    const res = await request(app)
      .post("/megadex/socials/search")
      .set(
        "x-acl-conditions",
        JSON.stringify([{ field: "id", op: ">", value: 2 }]),
      )
      .send({ operator: "OR" });

    expect(res.status).toBe(200);
    const [req] = entityGets.socials.mock.calls[0];
    expect(req.body.operator).toBe("AND");
    expect(req.body.filters.id).toEqual([
      { value: 2, matchMode: ">", operator: "AND" },
    ]);
  });

  it("filters update rows using x-acl-fields before the entity runs", async () => {
    entityUpdates.socials.mockClear();

    const res = await request(app)
      .put("/megadex/socials")
      .set(CONSUMER_HEADERS)
      .set("x-acl-fields", "")
      .send({ rows: [{ id: 1, entity: "socials" }] });

    expect(res.status).toBe(200);
    const [req] = entityUpdates.socials.mock.calls[0];
    expect(req.body.rows).toEqual([{ id: 1 }]);
  });
});

describe("POST /megadex/users Foxnox onboarding integration", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it("calls PWD_CREATE_URL with created user ids and consumer headers when set", async () => {
    process.env.PWD_CREATE_URL = "http://foxnox:3000/foxnox/pwd";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
    global.fetch = /** @type {any} */ (fetchMock);

    const res = await request(app)
      .post("/megadex/users")
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ id: 12, entity: "users", roles: [1] }] });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://foxnox:3000/foxnox/pwd");
    expect(init.headers["x-consumer-user-id"]).toBe("1");
    expect(init.headers["x-consumer-name"]).toBe("tester");
    expect(JSON.parse(init.body)).toEqual({ rows: [{ userId: 12 }] });
  });
});

describe("User management service behaviors", () => {
  it("rejects empty or non-positive roles arrays with 400", async () => {
    const emptyRes = await request(app)
      .post("/megadex/users")
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ id: 12, entity: "users", roles: [] }] });
    expect(emptyRes.status).toBe(400);

    const zeroRes = await request(app)
      .post("/megadex/users")
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ id: 12, entity: "users", roles: [0] }] });
    expect(zeroRes.status).toBe(400);
  });

  it("rejects backupEmail identical to email (case-insensitive) with 400", async () => {
    const res = await request(app)
      .post("/megadex/users")
      .set(CONSUMER_HEADERS)
      .send({
        rows: [
          {
            id: 12,
            entity: "users",
            email: "Alice@Example.com",
            backupEmail: "alice@example.com",
            roles: [1],
          },
        ],
      });
    expect(res.status).toBe(400);
  });

  it("defaults filters.archived = false on internal /megadex/users/search when consumer headers are omitted", async () => {
    entityGets.users.mockClear();
    const res = await request(app).post("/megadex/users/search").send({});
    expect(res.status).toBe(200);
    const [req] = entityGets.users.mock.calls[0];
    expect(req.body.filters.archived).toEqual({
      value: false,
      matchMode: "equals",
    });
  });

  it("allows self-service PUT /megadex/users/me for profile fields and rejects privileged fields with 403", async () => {
    entityUpdates.users.mockClear();

    const forbidden = await request(app)
      .put("/megadex/users/me")
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ nickname: "newname", roles: [1] }] });
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .put("/megadex/users/me")
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ nickname: "newname" }] });
    expect(allowed.status).toBe(200);
    const [req] = entityUpdates.users.mock.calls[0];
    expect(req.body.rows).toEqual([{ nickname: "newname", id: 1 }]);
  });

  it("rejects archiving the authenticated user, including mixed batches and bare ids", async () => {
    entityArchives.users.mockClear();

    const selfRes = await request(app)
      .post("/megadex/users/archive")
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ id: 1 }] });
    expect(selfRes.status).toBe(403);
    expect(entityArchives.users).not.toHaveBeenCalled();

    const mixedRes = await request(app)
      .post("/megadex/users/archive")
      .set(CONSUMER_HEADERS)
      .send({ rows: [{ id: 2 }, { id: "1" }] });
    expect(mixedRes.status).toBe(403);
    expect(entityArchives.users).not.toHaveBeenCalled();

    const bareIdsRes = await request(app)
      .post("/megadex/users/archive")
      .set(CONSUMER_HEADERS)
      .send({ rows: [2, 1] });
    expect(bareIdsRes.status).toBe(403);
    expect(entityArchives.users).not.toHaveBeenCalled();
  });
});
