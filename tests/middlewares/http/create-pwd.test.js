// @ts-check
import { jest } from "@jest/globals";

const executeMock = jest.fn();

jest.unstable_mockModule("@dwtechs/antity-pgsql", () => ({
  execute: executeMock,
}));

const { createPwd } = await import(
  "../../../src/middlewares/http/create-pwd.js"
);

describe("createPwd middleware (Foxnox credential provisioning)", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    executeMock.mockReset();
    executeMock.mockResolvedValue({ rowCount: 1, rows: [] });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it("is a no-op when PWD_CREATE_URL is unset", async () => {
    delete process.env.PWD_CREATE_URL;
    const fetchMock = jest.fn();
    global.fetch = /** @type {any} */ (fetchMock);

    const next = jest.fn();
    const res = /** @type {any} */ ({
      locals: {
        consumer: { userId: 1, nickname: "admin" },
        rows: [{ id: 10 }],
      },
    });

    await createPwd(/** @type {any} */ ({}), res, next);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("provisions passwords in Foxnox for each created user with consumer headers", async () => {
    process.env.PWD_CREATE_URL = "http://foxnox:3000/foxnox/pwd";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
    global.fetch = /** @type {any} */ (fetchMock);

    const next = jest.fn();
    const res = /** @type {any} */ ({
      locals: {
        consumer: { userId: 2, nickname: "alice" },
        rows: [{ id: 42 }, { id: 43 }],
      },
    });

    await createPwd(/** @type {any} */ ({}), res, next);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://foxnox:3000/foxnox/pwd");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "content-type": "application/json",
      accept: "application/json",
      "x-consumer-user-id": "2",
      "x-consumer-name": "alice",
    });
    expect(JSON.parse(init.body)).toEqual({
      rows: [{ userId: 42 }, { userId: 43 }],
    });
    expect(executeMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("soft-archives newly created users and forwards HTTP error when Foxnox returns non-2xx", async () => {
    process.env.PWD_CREATE_URL = "http://foxnox:3000/foxnox/pwd";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
    });
    global.fetch = /** @type {any} */ (fetchMock);

    const next = jest.fn();
    const res = /** @type {any} */ ({
      locals: {
        consumer: { userId: 2, nickname: "alice" },
        rows: [{ id: 55 }],
      },
    });

    await createPwd(/** @type {any} */ ({}), res, next);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock.mock.calls[0][1]).toEqual([[55], 2, "alice"]);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        message: "HTTP(422): Unprocessable Entity",
      }),
    );
  });

  it("soft-archives newly created users and returns 503 when Foxnox is unreachable", async () => {
    process.env.PWD_CREATE_URL = "http://foxnox:3000/foxnox/pwd";
    const fetchMock = jest
      .fn()
      .mockRejectedValue(new TypeError("fetch failed"));
    global.fetch = /** @type {any} */ (fetchMock);

    const next = jest.fn();
    const res = /** @type {any} */ ({
      locals: {
        consumer: { userId: 2, nickname: "alice" },
        rows: [{ id: 77 }],
      },
    });

    await createPwd(/** @type {any} */ ({}), res, next);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock.mock.calls[0][1]).toEqual([[77], 2, "alice"]);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        message: "HTTP(503): Service Unavailable",
      }),
    );
  });
});
