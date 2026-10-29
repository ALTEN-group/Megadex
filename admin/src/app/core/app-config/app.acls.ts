import { EntityRouteMapping } from "@core/acl/acls.model";

/**
 * Maps each admin CRUD operation to its Gatelin route id.
 *
 * IDs assume Gatelin 0.1.0-alpha.11 core seed (81 routes, last = resumeSignIn).
 * Megadex routes are inserted next by db/liquibase/gatelin-data/03-route.sql —
 * keep these comments in sync when adding/reordering that seed.
 *
 * Route IDs (Megadex block):
 *   82=searchUsers      83=getUserHistory    84=addUsers     85=updateUsers
 *   86=archiveUsers     87=getUserSchema
 *   88-93=preferences (not an admin entity)
 *   94=searchSocials    95=getSocialHistory  96=addSocials   97=updateSocials
 *   98=archiveSocials   99=getSocialSchema
 *   100-105=countries / civilities / genders lookups (search + schema)
 */
export const ENTITY_ROUTE_MAPPING: EntityRouteMapping = {
  users: {
    get: 82, // searchUsers
    getHistory: 83, // getUserHistory
    create: 84, // addUsers
    update: 85, // updateUsers
    archive: 86, // archiveUsers
  },
  socials: {
    get: 94, // searchSocials
    getHistory: 95, // getSocialHistory
    create: 96, // addSocials
    update: 97, // updateSocials
    archive: 98, // archiveSocials
  },
};
