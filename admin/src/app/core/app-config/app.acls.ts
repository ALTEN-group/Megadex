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
 *   88-91=preferences (not an admin entity)
 *   92=searchSocials    93=getSocialHistory  94=addSocials   95=updateSocials
 *   96=archiveSocials   97=getSocialSchema
 *   98-103=countries / civilities / genders lookups (search + schema)
 *   104=searchAudit     105=updateOwnProfile
 *   106=getOwnProfile   107=restoreUsers
 *   108=restoreSocials
 */
export const ENTITY_ROUTE_MAPPING: EntityRouteMapping = {
  users: {
    get: 82, // searchUsers
    getHistory: 83, // getUserHistory
    create: 84, // addUsers
    update: 85, // updateUsers
    archive: 86, // archiveUsers
    restore: 107, // restoreUsers
  },
  socials: {
    get: 92, // searchSocials
    getHistory: 93, // getSocialHistory
    create: 94, // addSocials
    update: 95, // updateSocials
    archive: 96, // archiveSocials
    restore: 108, // restoreSocials
  },
  auditLogs: {
    get: 104, // searchAudit (db/liquibase/gatelin-data/03-route.sql)
  },
};
