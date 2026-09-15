// @ts-check
import { getConsumer } from "@dwtechs/gatelin-express";

export function optionalIdentity(req, res, next) {
  const hasId = req.headers["x-consumer-user-id"] !== undefined;
  const hasName = req.headers["x-consumer-name"] !== undefined;
  if (!hasId && !hasName) return next();
  getConsumer(req, res, (error) => next(error ? normalize(error) : undefined));
}

export function requireIdentity(req, res, next) {
  optionalIdentity(req, res, (error) => {
    if (error) return next(error);
    if (!res.locals.consumer?.userId)
      return next({ statusCode: 401, message: "Authenticated user required" });
    next();
  });
}

function normalize(error) {
  return {
    statusCode: error?.statusCode ?? error?.status ?? 400,
    message: error?.message ?? error?.msg ?? "Invalid consumer identity",
  };
}
