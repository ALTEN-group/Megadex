// @ts-check

const UNIQUE_CONSTRAINT_MESSAGES = {
  ux_user_email_lower: "Email already exists",
  ux_user_nickname_lower: "Nickname already exists",
  ux_social_name_lower: "Social network name already exists",
};

/**
 * Maps PostgreSQL constraint and domain errors (`23505` unique violation,
 * `23514` check violation, `22P02` enum/type cast error, `P0001` PL/pgSQL
 * RAISE EXCEPTION) to explicit HTTP 409 / 400 status codes before the generic
 * error handler runs.
 *
 * @param {any} err
 * @param {import("express").Request} _req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 */
export function mapDbError(err, _req, _res, next) {
  if (!err || err.statusCode) {
    next(err);
    return;
  }

  if (err.code === "23505") {
    err.statusCode = 409;
    err.message =
      UNIQUE_CONSTRAINT_MESSAGES[err.constraint] ?? "Resource already exists";
  } else if (
    err.code === "23514" ||
    err.code === "22P02" ||
    err.code === "P0001"
  ) {
    err.statusCode = 400;
  }

  next(err);
}
