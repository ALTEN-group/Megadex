/** @jest-environment node */
import { jest } from "@jest/globals";

jest.unstable_mockModule("@dwtechs/winstan", () => ({
  log: { error: jest.fn(), debug: jest.fn() },
}));
const { revokeUserSessions } = await import("../../src/services/session.js");

describe("revokeUserSessions", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const baseUrl = "http://gatelin:3000/gatelin/consumers";
  let consumer;
  let fetchMock;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.CONSUMER_URL = `  ${baseUrl}///  `;
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

  it("should search active sessions and archive every unique numeric consumer ID", async () => {
    searchResult({
      rows: [{ id: 1 }, { id: "201" }, { id: 201 }, { id: "1" }],
    });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    await expect(revokeUserSessions([7, 8], consumer)).resolves.toBeUndefined();

    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "x-consumer-user-id": "2",
      "x-consumer-name": "alice",
    };
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
        }),
        signal: expect.any(AbortSignal),
      },
    ]);
    for (const [index, id] of [1, 201].entries()) {
      expect(fetchMock.mock.calls[index + 1]).toEqual([
        `${baseUrl}/archive`,
        {
          method: "post",
          headers,
          body: JSON.stringify({ rows: [{ id }] }),
          signal: expect.any(AbortSignal),
        },
      ]);
    }
  });

  it.each([undefined, "", "   "])(
    "should be a no-op with config %j",
    async (url) => {
      if (url === undefined) delete process.env.CONSUMER_URL;
      else process.env.CONSUMER_URL = url;
      await expect(revokeUserSessions([7], null)).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, [], {}, "7", 7])(
    "should be a no-op for user IDs %j",
    async (ids) => {
      await expect(revokeUserSessions(ids, consumer)).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("should resolve an empty search result without archiving", async () => {
    searchResult({ rows: [] });
    await expect(revokeUserSessions([7], consumer)).resolves.toBeUndefined();
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
      201,
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
    "should reject malformed consumer rows %j without partial revocation",
    async (body) => {
      searchResult(body);
      await expect(revokeUserSessions([7], consumer)).rejects.toMatchObject({
        statusCode: 502,
        message: "HTTP(502): Invalid consumer search response",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["search", "archive"])(
    "should propagate a %s HTTP failure with the upstream status",
    async (stage) => {
      if (stage === "archive") searchResult({ rows: [{ id: 201 }] });
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => null,
        status: 500,
        statusText: "Internal Server Error",
      });
      await expect(revokeUserSessions([7], consumer)).rejects.toMatchObject({
        statusCode: 500,
        message: "HTTP(500): Internal Server Error",
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
      if (stage === "archive") searchResult({ rows: [{ id: 201 }] });
      fetchMock.mockRejectedValueOnce(
        Object.assign(new Error("fetch failed"), { name }),
      );
      await expect(revokeUserSessions([7], consumer)).rejects.toMatchObject({
        statusCode,
        message:
          statusCode === 504
            ? "HTTP(504): Upstream timeout"
            : "HTTP(503): Service Unavailable",
      });
      expect(fetchMock).toHaveBeenCalledTimes(stage === "search" ? 1 : 2);
    },
  );

  it("should propagate JSON decoding failure instead of silently resolving", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValue(new SyntaxError("invalid JSON")),
    });
    await expect(revokeUserSessions([7], consumer)).rejects.toMatchObject({
      statusCode: 502,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should preserve an already classified rejection", async () => {
    const error = Object.assign(new Error("classified"), { statusCode: 504 });
    fetchMock.mockRejectedValueOnce(error);
    await expect(revokeUserSessions([7], consumer)).rejects.toBe(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["http", "network", "timeout"])(
    "should attempt all consumers and wait for the last after a %s failure",
    async (failure) => {
      searchResult({ rows: [{ id: 201 }, { id: 202 }, { id: 203 }] });
      if (failure === "http")
        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => null,
        });
      else
        fetchMock.mockRejectedValueOnce(
          Object.assign(new Error("fetch failed"), {
            name: failure === "timeout" ? "TimeoutError" : "TypeError",
          }),
        );
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      let resolveLast;
      fetchMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveLast = resolve;
        }),
      );
      const settled = jest.fn();
      const pending = revokeUserSessions([7], consumer).then(
        () => settled("success"),
        (error) => {
          settled("failure");
          return error;
        },
      );

      await new Promise(setImmediate);
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(
        fetchMock.mock.calls
          .slice(1)
          .map(([url, init]) => [url, JSON.parse(init.body)]),
      ).toEqual(
        [201, 202, 203].map((id) => [`${baseUrl}/archive`, { rows: [{ id }] }]),
      );
      expect(settled).not.toHaveBeenCalled();

      resolveLast({ ok: true, json: async () => ({}) });
      const error = await pending;
      expect(error).toMatchObject({
        statusCode:
          failure === "http" ? 500 : failure === "timeout" ? 504 : 503,
      });
      expect(settled.mock.calls).toEqual([["failure"]]);
    },
  );
});
