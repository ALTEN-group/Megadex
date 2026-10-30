export type E2eCredentials = {
  email: string;
  password: string;
};

/**
 * Resolves login credentials for e2e from E2E_EMAIL / E2E_PASSWORD.
 * Authenticated specs are skipped when E2E_PASSWORD is not set.
 */
export const hasAdminCredentials = (): boolean => !!process.env.E2E_PASSWORD;

export function getAdminCredentials(
  email = process.env.E2E_EMAIL ?? "admin@example.com",
): E2eCredentials {
  if (!process.env.E2E_PASSWORD) {
    throw new Error(`No password found for ${email}. Set E2E_PASSWORD.`);
  }
  return { email, password: process.env.E2E_PASSWORD };
}
