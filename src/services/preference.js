// @ts-check
import { execute } from "@dwtechs/antity-pgsql";

const WRITABLE = new Set(["name", "component", "conf", "isActive"]);

export async function search(userId, body = {}) {
  const clauses = ['"userId" = $1'];
  const args = [userId];
  for (const key of ["name", "component", "isActive", "archived"]) {
    const filter = body.filters?.[key];
    const value = Array.isArray(filter) ? filter[0]?.value : filter?.value;
    if (value === undefined) continue;
    args.push(value);
    clauses.push(`"${key}" = $${args.length}`);
  }
  const result = await execute(
    `SELECT id, name, component, conf, "isActive", archived, "archivedAt"
     FROM preference WHERE ${clauses.join(" AND ")} ORDER BY id`,
    args,
    null,
  );
  return result.rows;
}

export async function create(userId, rows) {
  const created = [];
  for (const row of requireRows(rows)) {
    const result = await execute(
      `INSERT INTO preference ("userId", name, component, conf, "isActive")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, component, conf, "isActive", archived, "archivedAt"`,
      [userId, row.name, row.component, row.conf, row.isActive ?? false],
      null,
    );
    created.push(...result.rows);
  }
  return created;
}

export async function update(userId, rows) {
  const updated = [];
  for (const row of requireRows(rows)) {
    if (!Number.isInteger(row.id))
      throw badRequest("Preference id is required");
    const entries = Object.entries(row).filter(([key]) => WRITABLE.has(key));
    if (!entries.length) throw badRequest("No preference fields to update");
    const args = entries.map(([, value]) => value);
    const sets = entries.map(([key], index) => `"${key}" = $${index + 1}`);
    args.push(row.id, userId);
    const result = await execute(
      `UPDATE preference SET ${sets.join(", ")}
       WHERE id = $${args.length - 1} AND "userId" = $${args.length}
       RETURNING id, name, component, conf, "isActive", archived, "archivedAt"`,
      args,
      null,
    );
    if (!result.rowCount) throw notFound();
    updated.push(...result.rows);
  }
  return updated;
}

export async function archive(userId, rows) {
  const ids = requireRows(rows).map((row) => Number(row.id));
  if (ids.some((id) => !Number.isInteger(id) || id < 1))
    throw badRequest("Valid preference ids are required");
  const owned = await execute(
    'SELECT id FROM preference WHERE "userId" = $1 AND id = ANY($2::int[])',
    [userId, ids],
    null,
  );
  if (owned.rowCount !== ids.length) throw notFound();
  const result = await execute(
    `UPDATE preference SET archived = true, "archivedAt" = now()
     WHERE "userId" = $1 AND id = ANY($2::int[]) RETURNING id`,
    [userId, ids],
    null,
  );
  if (result.rowCount !== ids.length) throw notFound();
  return result.rows;
}

export async function assertOwner(userId, id) {
  const result = await execute(
    'SELECT id FROM preference WHERE id = $1 AND "userId" = $2',
    [id, userId],
    null,
  );
  if (!result.rowCount) throw notFound();
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
