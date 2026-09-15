// @ts-check
import { deleteProps } from "@dwtechs/sparray";

/** Send the standard rows/total envelope without private entity properties. */
function send(entity) {
  return (_req, res) => {
    const raw = Array.isArray(res.locals.rows) ? res.locals.rows : [];
    const rows = entity ? deleteProps(raw, entity.privateProps) : raw;
    res.status(200).json({ rows, total: res.locals.total ?? rows.length });
  };
}

export { send };
