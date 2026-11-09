// @ts-check
import { isArray } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";

const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS) || 30000;

function consumerHeaders(consumer) {
  return {
    "content-type": "application/json",
    accept: "application/json",
    "x-consumer-user-id": String(consumer.userId),
    "x-consumer-name": String(consumer.nickname),
  };
}

function wrapNetworkError(label, err) {
  if (err?.statusCode) return err;
  const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
  log.error(`${label} request failed: ${err?.name}: ${err?.message || err}`);
  const upstreamErr = /** @type {Error & { statusCode?: number }} */ (
    new Error(
      timedOut
        ? "HTTP(504): Upstream timeout"
        : "HTTP(503): Service Unavailable",
    )
  );
  upstreamErr.statusCode = timedOut ? 504 : 503;
  return upstreamErr;
}

/**
 * Provisions password entries in Foxnox (`POST /foxnox/pwd`) for newly created
 * users. When `PWD_CREATE_URL` is not configured, this is a no-op so standalone
 * Megadex instances and unit tests without Foxnox continue to operate.
 *
 * @param {number[]} userIds
 * @param {{ userId: number, nickname: string }} consumer
 * @returns {Promise<void>}
 */
export async function provisionPasswords(userIds, consumer) {
  const url = process.env.PWD_CREATE_URL?.trim();
  if (!url || !isArray(userIds, "!0")) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: consumerHeaders(consumer),
      body: JSON.stringify({
        rows: userIds.map((userId) => ({ userId })),
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!res.ok) {
      log.error(`PWD_CREATE_URL returned ${res.status}: ${res.statusText}`);
      const err = /** @type {Error & { statusCode?: number }} */ (
        new Error(`HTTP(${res.status}): ${res.statusText}`)
      );
      err.statusCode = res.status;
      throw err;
    }
  } catch (err) {
    throw wrapNetworkError("PWD_CREATE_URL", err);
  }
}

/**
 * Archives password entries in Foxnox (`POST /foxnox/pwd/search` -> `POST /foxnox/pwd/archive`)
 * when users are archived in Megadex. When `PWD_CREATE_URL` is not configured,
 * this is a no-op.
 *
 * @param {number[]} userIds
 * @param {{ userId: number, nickname: string }} consumer
 * @returns {Promise<void>}
 */
export async function archivePasswords(userIds, consumer) {
  const baseUrl = process.env.PWD_CREATE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl || !isArray(userIds, "!0")) return;

  try {
    const searchRes = await fetch(`${baseUrl}/search`, {
      method: "POST",
      headers: consumerHeaders(consumer),
      body: JSON.stringify({
        first: 0,
        rows: 1000,
        filters: {
          userId: { value: userIds, matchMode: "in" },
          archived: { value: false, matchMode: "equals" },
        },
        select: ["id"],
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!searchRes.ok) {
      log.error(
        `PWD_CREATE_URL/search returned ${searchRes.status}: ${searchRes.statusText}`,
      );
      const err = /** @type {Error & { statusCode?: number }} */ (
        new Error(`HTTP(${searchRes.status}): ${searchRes.statusText}`)
      );
      err.statusCode = searchRes.status;
      throw err;
    }

    const body = await searchRes.json();
    const pwdIds = (body?.rows || [])
      .map((r) => Number(r?.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!pwdIds.length) return;

    const archiveRes = await fetch(`${baseUrl}/archive`, {
      method: "POST",
      headers: consumerHeaders(consumer),
      body: JSON.stringify({ ids: pwdIds }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!archiveRes.ok) {
      log.error(
        `PWD_CREATE_URL/archive returned ${archiveRes.status}: ${archiveRes.statusText}`,
      );
      const err = /** @type {Error & { statusCode?: number }} */ (
        new Error(`HTTP(${archiveRes.status}): ${archiveRes.statusText}`)
      );
      err.statusCode = archiveRes.status;
      throw err;
    }
  } catch (err) {
    throw wrapNetworkError("PWD_CREATE_URL", err);
  }
}
