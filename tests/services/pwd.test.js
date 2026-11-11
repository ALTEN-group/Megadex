/** @jest-environment node */
import { jest } from "@jest/globals";

jest.unstable_mockModule("@dwtechs/winstan", () => ({
  log: { error: jest.fn(), debug: jest.fn() },
}));
const { archivePasswords } = await import("../../src/services/pwd.js");

describe("archivePasswords", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const baseUrl = "http://foxnox:3000/foxnox/pwd";
  let consumer;
  let fetchMock;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.PWD_CREATE_URL = `  ${baseUrl}///  `;
    consumer = { userId: 2, nickname: "alice" };
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  function searchResult(body) {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => body });
  }

  it("should search active passwords and archive unique object IDs with consumer headers", async () => {
    searchResult({
      rows: [{ id: 1 }, { id: "101" }, { id: 101 }, { id: "1" }],
    });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await expect(archivePasswords([7, 8], consumer)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "x-consumer-user-id": "2",
      "x-consumer-name": "alice",
    };
    expect(fetchMock.mock.calls[0]).toEqual([
      `${baseUrl}/search`,
      {
        method: "post",
        headers,
        body: JSON.stringify({
          filters: {
            userId: { value: [7, 8], matchMode: "in" },
            archived: { value: false, matchMode: "equals" },
          },
          select: ["id"],
        }),
        signal: expect.any(AbortSignal),
      },
    ]);
    expect(fetchMock.mock.calls[1]).toEqual([
      `${baseUrl}/archive`,
      {
        method: "post",
        headers,
        body: JSON.stringify({ rows: [{ id: 1 }, { id: 101 }] }),
        signal: expect.any(AbortSignal),
      },
    ]);
  });

  it.each([undefined, "", "   "])(
    "should be a no-op with config %j",
    async (url) => {
      if (url === undefined) delete process.env.PWD_CREATE_URL;
      else process.env.PWD_CREATE_URL = url;
      await expect(archivePasswords([7], null)).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, [], {}, "7", 7])(
    "should be a no-op for user IDs %j",
    async (ids) => {
      await expect(archivePasswords(ids, consumer)).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("should allow an empty search result on retries without sending an archive", async () => {
    searchResult({ rows: [] });
    await expect(archivePasswords([7], consumer)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/search`);
  });

  it.each([
    undefined,
    null,
    {},
    { rows: null },
    { rows: {} },
    { rows: "bad" },
    ...[
      null,
      undefined,
      {},
      101,
      { id: null },
      { id: 0 },
      { id: -1 },
      { id: 1.5 },
      { id: "" },
      { id: "bad" },
      { id: true },
      { id: [] },
    ].map((row) => ({ rows: [{ id: 1 }, row] })),
  ])(
    "should reject malformed search response %j before archiving anything",
    async (body) => {
      searchResult(body);
      await expect(archivePasswords([7], consumer)).rejects.toMatchObject({
        statusCode: 502,
        message: "HTTP(502): Invalid password search response",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["search", "archive"])(
    "should preserve HTTP errors at the %s stage",
    async (stage) => {
      if (stage === "archive") searchResult({ rows: [{ id: 101 }] });
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => null,
        status: 422,
        statusText: "Unprocessable Entity",
      });
      await expect(archivePasswords([7], consumer)).rejects.toMatchObject({
        statusCode: 422,
        message: "HTTP(422): Unprocessable Entity",
      });
      expect(fetchMock).toHaveBeenCalledTimes(stage === "search" ? 1 : 2);
    },
  );

  it.each([
    ["search", "TypeError", 503],
    ["archive", "TypeError", 503],
    ["search", "TimeoutError", 504],
    ["archive", "TimeoutError", 504],
    ["search", "AbortError", 504],
    ["archive", "AbortError", 504],
  ])(
    "should propagate %s %s failure as %i",
    async (stage, name, statusCode) => {
      if (stage === "archive") searchResult({ rows: [{ id: 101 }] });
      fetchMock.mockRejectedValueOnce(
        Object.assign(new Error("fetch failed"), { name }),
      );
      await expect(archivePasswords([7], consumer)).rejects.toMatchObject({
        statusCode,
        message:
          statusCode === 504
            ? "HTTP(504): Upstream timeout"
            : "HTTP(503): Service Unavailable",
      });
      expect(fetchMock).toHaveBeenCalledTimes(stage === "search" ? 1 : 2);
    },
  );

  it("should reject invalid JSON rather than treating it as no passwords", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValue(new SyntaxError("invalid JSON")),
    });
    await expect(archivePasswords([7], consumer)).rejects.toMatchObject({
      statusCode: 502,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should preserve an already classified upstream rejection", async () => {
    const error = Object.assign(new Error("classified"), { statusCode: 504 });
    fetchMock.mockRejectedValueOnce(error);
    await expect(archivePasswords([7], consumer)).rejects.toBe(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
