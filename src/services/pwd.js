// @ts-check
import { isArray, isValidInteger } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";
import http from "../utils/http.js";

function consumerHeaders(consumer) {
  return {
    accept: "application/json",
    "x-consumer-user-id": String(consumer.userId),
    "x-consumer-name": String(consumer.nickname),
  };
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

  await http.query(
    "post",
    url,
    undefined,
    { rows: userIds.map((userId) => ({ userId })) },
    consumerHeaders(consumer),
  );
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

  const headers = consumerHeaders(consumer);
  let data;
  try {
    ({ data } = await http.query(
      "post",
      `${baseUrl}/search`,
      undefined,
      {
        filters: {
          userId: { value: userIds, matchMode: "in" },
          archived: { value: false, matchMode: "is" },
        },
        select: ["id"],
      },
      headers,
    ));
  } catch (err) {
    // antity answers an empty search with 404: no active password to archive.
    if (err?.statusCode === 404) return;
    throw err;
  }

  if (
    !isArray(data?.rows) ||
    data.rows.some((row) => !isValidInteger(row?.id, 1, undefined, false))
  ) {
    log.error("PWD_CREATE_URL/search returned invalid password rows");
    throw Object.assign(
      new Error("HTTP(502): Invalid password search response"),
      {
        statusCode: 502,
      },
    );
  }
  const pwdIds = [...new Set(data.rows.map((row) => Number(row.id)))];

  if (!pwdIds.length) return;

  await http.query(
    "post",
    `${baseUrl}/archive`,
    undefined,
    {
      rows: pwdIds.map((id) => ({ id })),
    },
    headers,
  );
}
