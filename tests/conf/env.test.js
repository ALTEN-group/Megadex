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
});
