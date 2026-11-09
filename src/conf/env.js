// @ts-check
import { isString } from "@dwtechs/checkard";

/**
 * Environment variables Megadex cannot work without for cron hard-deletes.
 */
const REQUIRED = [
  ["DB_JOB_USER", "PostgreSQL role used by archive/history cron jobs"],
  ["DB_JOB_PWD", "Password for the cron PostgreSQL role"],
];

/**
 * Optional downstream HTTP endpoints validated when present.
 */
const OPTIONAL_URLS = ["PWD_CREATE_URL", "CONSUMER_URL"];

/**
 * @param {string} value
 * @returns {boolean}
 */
function isValidHttpUrl(value) {
  if (!URL.canParse(value)) return false;
  const { protocol } = new URL(value);
  return protocol === "http:" || protocol === "https:";
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @return {string[]} Human-readable problems; empty when the environment is valid
 */
export function collectEnvErrors(env = process.env) {
  const errors = [];
  for (const [name, usage] of REQUIRED) {
    const value = env[name]?.trim();
    if (!isString(value, "!0")) errors.push(`${name} is missing — ${usage}`);
  }

  // Unset leaves the bundled admin server off (see startAdminServer), so only a
  // supplied value has to be a usable port.
  const rawAdminPort = env.ADMIN_PORT?.trim() ?? "";
  if (rawAdminPort) {
    const adminPort = Number(rawAdminPort);
    if (!Number.isInteger(adminPort) || adminPort < 1024 || adminPort > 65535) {
      errors.push("ADMIN_PORT must be an integer between 1024 and 65535");
    }
  }

  const adminBasePath = env.ADMIN_BASE_PATH?.trim() || "/megadex";
  if (
    !/^\/[A-Za-z0-9._~/-]*$/.test(adminBasePath) ||
    adminBasePath.includes("//")
  ) {
    errors.push("ADMIN_BASE_PATH must be a valid absolute URL path");
  }

  for (const name of OPTIONAL_URLS) {
    const urlValue = env[name]?.trim() ?? "";
    if (urlValue && !isValidHttpUrl(urlValue)) {
      errors.push(`${name} is not a valid http(s) URL: "${urlValue}"`);
    }
  }

  return errors;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @throws {Error} Listing every problem at once
 */
export function validateEnv(env = process.env) {
  const errors = collectEnvErrors(env);
  if (errors.length)
    throw new Error(
      `Invalid environment configuration:\n  - ${errors.join("\n  - ")}`,
    );
}
