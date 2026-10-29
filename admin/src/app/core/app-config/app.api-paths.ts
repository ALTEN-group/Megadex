import { AdminEntity } from "@core/app-config/app.entities";

/**
 * Gatelin `resources.name` values for Megadex (see db/liquibase/gatelin-data).
 * Paths are relative to the configured `/api/megadex/` API base (which ends with a slash).
 *
 * Keep {@link AdminEntity} as the UI/ACL key; use these only for HTTP.
 */
export const ENTITY_API_PATHS: Record<AdminEntity, string> = {
  users: "users",
  socials: "socials",
};
