// @ts-check

/**
 * Environment variables Megadex cannot work without for cron hard-deletes.
 */
const REQUIRED = [
  ["DB_JOB_USER", "PostgreSQL role used by archive/history cron jobs"],
  ["DB_JOB_PWD", "Password for the cron PostgreSQL role"],
];

/**
 * @return {string[]} Human-readable problems; empty when the environment is valid
 */
export function collectEnvErrors() {
  const errors = [];
  for (const [name, usage] of REQUIRED) {
    const value = process.env[name]?.trim() ?? "";
    if (!value) errors.push(`${name} is missing — ${usage}`);
  }
  return errors;
}

/**
 * @throws {Error} Listing every problem at once
 */
export function validateEnv() {
  const errors = collectEnvErrors();
  if (errors.length)
    throw new Error(
      `Invalid environment configuration:\n  - ${errors.join("\n  - ")}`,
    );
}
