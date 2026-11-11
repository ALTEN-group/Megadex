// @ts-check
import { isArray, isValidInteger } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";

const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS) || 30000;

/**
 * Revokes active consumer sessions in Gatelin (`POST /gatelin/consumers/search` ->
 * `POST /gatelin/consumers/archive`) when users are archived, deactivated, or
 * have their roles modified in Megadex.
 *
 * When `CONSUMER_URL` is not configured, this is a no-op.
 *
 * @param {number[]} userIds
 * @param {{ userId: number, nickname: string }} consumer
 * @returns {Promise<void>}
 */
export async function revokeUserSessions(userIds, consumer) {
  const url = process.env.CONSUMER_URL?.trim();
  if (!url || !isArray(userIds, "!0")) return;

  const baseUrl = url.replace(/\/+$/, "");
  const headers = {
    "content-type": "application/json",
    accept: "application/json",
    "x-consumer-user-id": String(consumer.userId),
    "x-consumer-name": String(consumer.nickname),
  };

  try {
    const searchRes = await fetch(`${baseUrl}/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filters: {
          userId: { value: userIds, matchMode: "in" },
          archived: { value: false, matchMode: "equals" },
        },
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!searchRes.ok) {
      log.error(
        `Gatelin consumer search returned ${searchRes.status}: ${searchRes.statusText}`,
      );
      throw Object.assign(
        new Error("HTTP(502): Gatelin consumer search failed"),
        {
          statusCode: 502,
        },
      );
    }

    const data = await searchRes.json();
    if (
      !isArray(data?.rows) ||
      data.rows.some((row) => !isValidInteger(row?.id, 1, undefined, false))
    )
      throw Object.assign(
        new Error("HTTP(502): Invalid consumer search response"),
        {
          statusCode: 502,
        },
      );
    const consumerIds = [...new Set(data.rows.map((row) => Number(row.id)))];

    const results = await Promise.allSettled(
      consumerIds.map(async (id) => {
        const archiveRes = await fetch(`${baseUrl}/archive`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            rows: [{ id }],
          }),
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });

        if (!archiveRes.ok) {
          log.error(
            `Gatelin consumer archive returned ${archiveRes.status} for id=${id}`,
          );
          throw Object.assign(
            new Error("HTTP(502): Gatelin consumer archive failed"),
            {
              statusCode: 502,
            },
          );
        }
      }),
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
  } catch (err) {
    log.error(`Gatelin session revocation failed: ${err?.message || err}`);
    if (err?.statusCode) throw err;
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    throw Object.assign(
      new Error(
        timedOut
          ? "HTTP(504): Upstream timeout"
          : "HTTP(503): Service Unavailable",
      ),
      { statusCode: timedOut ? 504 : 503 },
    );
  }
}
