// @ts-check
import { execute } from "@dwtechs/antity-pgsql";

/** Resources exposed by the Megadex admin, mirroring the preference CHECK constraint. */
const RESOURCES = new Set(["users", "socials"]);

export function assertResource(resource) {
  if (!RESOURCES.has(resource))
    throw badRequest(`Unknown resource "${resource}"`);
  return resource;
}

/**
 * Fetches the merged list of preferences available for a resource from the
 * `preferences` view (templates, "userId" IS NULL / locked=true, and this
 * user's own preference rows, locked=false). "isActive" reflects this user's
 * own preference_selection row.
 *
 * @param {number} userId
 * @param {string} resource - resource name (matched against "resourceName")
 * @returns {Promise<Array<object>>}
 */
export async function getMany(userId, resource) {
  const { rows } = await execute(
    `SELECT v.id, v."resourceName", v.name, v.conf, v.locked,
            COALESCE(v.id = ps."preferenceId", false) AS "isActive"
     FROM preferences v
     LEFT JOIN preference_selection ps ON ps."resourceName" = v."resourceName" AND ps."userId" = $1
     WHERE v."resourceName" = $2 AND (v.locked OR v."userId" = $1)
     ORDER BY v.name`,
    [userId, resource],
    null,
  );
  return rows;
}

export async function create(consumer, resource, rows) {
  const created = [];
  for (const row of requireRows(rows)) {
    if (!row.name) throw badRequest("Preference name is required");
    const result = await execute(
      `INSERT INTO preferences
         ("userId", "resourceName", name, conf, "isActive", "creatorId", "creatorName")
       VALUES ($1, $2, $3, $4, $5, $1, $6)
       RETURNING id, "resourceName", name, conf, "isActive"`,
      [
        consumer.userId,
        resource,
        row.name,
        JSON.stringify(row.conf ?? []),
        row.isActive ?? false,
        consumer.nickname,
      ],
      null,
    );
    created.push(...result.rows);
  }
  return created;
}

/**
 * Updates through the `preferences` view so iud_preference() applies the
 * template/personal rules: editing a locked template forks a personal copy,
 * and a personal row is only writable by its owner.
 */
export async function update(consumer, resource, rows) {
  const updated = [];
  for (const row of requireRows(rows)) {
    if (!Number.isInteger(row.id))
      throw badRequest("Preference id is required");
    const result = await execute(
      `UPDATE preferences SET
         name = $1, conf = $2, "isActive" = $3,
         "updaterId" = $4, "updaterName" = $5
       WHERE id = $6 AND "resourceName" = $7 AND (locked OR "userId" = $4)
       RETURNING id, "resourceName", name, conf, "isActive"`,
      [
        row.name ?? null,
        row.conf === undefined ? null : JSON.stringify(row.conf),
        row.isActive ?? false,
        consumer.userId,
        consumer.nickname,
        row.id,
        resource,
      ],
      null,
    );
    if (!result.rowCount) throw notFound();
    updated.push(...result.rows);
  }
  return updated;
}

/** Templates are protected by check_preference_template_delete(). */
export async function remove(userId, resource, id) {
  if (!Number.isInteger(id) || id < 1)
    throw badRequest("Valid preference id is required");
  const result = await execute(
    'DELETE FROM preferences WHERE id = $1 AND "resourceName" = $2 AND "userId" = $3',
    [id, resource, userId],
    null,
  );
  if (!result.rowCount) throw notFound();
  return [{ id }];
}

function requireRows(rows) {
  if (!Array.isArray(rows) || !rows.length)
    throw badRequest("rows must be a non-empty array");
  return rows;
}

function badRequest(message) {
  return { statusCode: 400, message };
}

function notFound() {
  return { statusCode: 404, message: "Preference not found" };
}
