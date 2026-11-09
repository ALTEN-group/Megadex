// @ts-check
import { isArray, isInteger } from "@dwtechs/checkard";
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
      return;
    }

    const data = await searchRes.json().catch(() => null);
    const consumerIds = (isArray(data?.rows) ? data.rows : [])
      .map((r) => r?.id)
      .filter((id) => isInteger(id, false))
      .map(Number);

    for (const id of consumerIds) {
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
      }
    }
  } catch (err) {
    log.error(`Gatelin session revocation failed: ${err?.message || err}`);
  }
}
