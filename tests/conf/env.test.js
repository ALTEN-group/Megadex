/**
 * @jest-environment node
 */

import { collectEnvErrors, validateEnv } from "../../src/conf/env.js";

describe("env", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("reports missing job credentials", () => {
    delete process.env.DB_JOB_USER;
    delete process.env.DB_JOB_PWD;
    expect(collectEnvErrors()).toEqual(
      expect.arrayContaining([
        expect.stringContaining("DB_JOB_USER"),
        expect.stringContaining("DB_JOB_PWD"),
      ]),
    );
  });

  it("accepts present job credentials", () => {
    process.env.DB_JOB_USER = "megadex_job";
    process.env.DB_JOB_PWD = "secret";
    expect(collectEnvErrors()).toEqual([]);
    expect(() => validateEnv()).not.toThrow();
  });

  it("rejects out-of-range or non-integer ADMIN_PORT", () => {
    expect(
      collectEnvErrors({
        DB_JOB_USER: "megadex_job",
        DB_JOB_PWD: "secret",
        ADMIN_PORT: "80",
      }),
    ).toContain("ADMIN_PORT must be an integer between 1024 and 65535");
  });

  it("rejects invalid ADMIN_BASE_PATH", () => {
    expect(
      collectEnvErrors({
        DB_JOB_USER: "megadex_job",
        DB_JOB_PWD: "secret",
        ADMIN_BASE_PATH: "//megadex",
      }),
    ).toContain("ADMIN_BASE_PATH must be a valid absolute URL path");
  });

  it("accepts valid http(s) PWD_CREATE_URL and rejects malformed values", () => {
    expect(
      collectEnvErrors({
        DB_JOB_USER: "megadex_job",
        DB_JOB_PWD: "secret",
        PWD_CREATE_URL: "http://megadex-foxnox-local:3000/foxnox/pwd",
        CONSUMER_URL: "http://megadex-gatelin-local:3000/gatelin/consumers",
      }),
    ).toEqual([]);

    expect(
      collectEnvErrors({
        DB_JOB_USER: "megadex_job",
        DB_JOB_PWD: "secret",
        PWD_CREATE_URL: "not-a-url",
      }),
    ).toContain('PWD_CREATE_URL is not a valid http(s) URL: "not-a-url"');

    expect(
      collectEnvErrors({
        DB_JOB_USER: "megadex_job",
        DB_JOB_PWD: "secret",
        CONSUMER_URL: "ftp://megadex-gatelin-local/gatelin/consumers",
      }),
    ).toContain(
      'CONSUMER_URL is not a valid http(s) URL: "ftp://megadex-gatelin-local/gatelin/consumers"',
    );
  });
});
