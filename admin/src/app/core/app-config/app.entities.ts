/**
 * Exhaustive list of all administrable entities in the application.
 * Extend this array when adding a new administrable entity.
 * Used by ACL, navigation, table configuration, preferences, etc.
 */
export const ADMIN_ENTITIES = ["users", "socials", "auditLogs"] as const;

export type AdminEntity = (typeof ADMIN_ENTITIES)[number];
