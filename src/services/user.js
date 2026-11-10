// @ts-check
import { execute } from "@dwtechs/antity-pgsql";

/**
 * Restores archived user profiles through the audited `users` view.
 * Credentials and sessions stay archived.
 *
 * @param {number[]} ids
 * @param {{ userId: number, nickname: string }} consumer
 * @param {import("@dwtechs/antity-pgsql").PGClient | null} client
 */
export async function restore(ids, consumer, client) {
  await execute(
    `UPDATE users
     SET archived = false, "updaterId" = $2, "updaterName" = $3
     WHERE id = ANY($1::int[]) AND archived = true`,
    [ids, consumer.userId, consumer.nickname],
    client,
  );
}
