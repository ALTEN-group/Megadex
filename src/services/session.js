// @ts-check
import { isArray, isValidInteger } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";
import http from "../utils/http.js";

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
    accept: "application/json",
    "x-consumer-user-id": String(consumer.userId),
    "x-consumer-name": String(consumer.nickname),
  };

  try {
    const { data } = await http.query(
      "post",
      `${baseUrl}/search`,
      undefined,
      {
        filters: {
          userId: { value: userIds, matchMode: "in" },
          archived: { value: false, matchMode: "equals" },
        },
      },
      headers,
    );

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
      consumerIds.map((id) =>
        http.query(
          "post",
          `${baseUrl}/archive`,
          undefined,
          { rows: [{ id }] },
          headers,
        ),
      ),
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
  } catch (err) {
    log.error(`Gatelin session revocation failed: ${err?.message || err}`);
    throw err;
  }
}
