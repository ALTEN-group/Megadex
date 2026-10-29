/**
 * Exhaustive list of all administrable entities in the application.
 * Extend this array when adding a new administrable entity.
 * Used by ACL, navigation, table configuration, preferences, etc.
 */
export const ADMIN_ENTITIES = [] as const;

type EntityName = (typeof ADMIN_ENTITIES)[number];

// Falls back to `string` while ADMIN_ENTITIES is empty (an empty tuple yields `never`).
export type AdminEntity = [EntityName] extends [never] ? string : EntityName;
