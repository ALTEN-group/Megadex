import { EntityRouteMapping } from "@core/acl/acls.model";

/**
 * Maps each admin CRUD operation to its Gatelin route id.
 *
 * IDs assume Gatelin 0.1.0 core seed (90 routes, last = resumeSignIn).
 * Megadex routes are inserted next by db/liquibase/gatelin-data/03-route.sql —
 * The SQL file's ID comments describe the older alpha.11 seed; keep this
 * mapping in sync with the route insertion order when changing that seed.
 *
 * Route IDs (Megadex block):
 *   91=searchUsers      92=getUserHistory    93=addUsers     94=updateUsers
 *   95=archiveUsers     96=getUserSchema
 *   97-100=preferences (not an admin entity)
 *   101=searchSocials   102=getSocialHistory 103=addSocials  104=updateSocials
 *   105=archiveSocials  106=getSocialSchema
 *   107-112=countries / civilities / genders lookups (search + schema)
 *   113=searchAudit     114=updateOwnProfile
 *   115=getOwnProfile   116=restoreUsers
 *   117=restoreSocials
 */
export const ENTITY_ROUTE_MAPPING: EntityRouteMapping = {
  users: {
    get: 91, // searchUsers
    getHistory: 92, // getUserHistory
    create: 93, // addUsers
    update: 94, // updateUsers
    archive: 95, // archiveUsers
    restore: 116, // restoreUsers
  },
  socials: {
    get: 101, // searchSocials
    getHistory: 102, // getSocialHistory
    create: 103, // addSocials
    update: 104, // updateSocials
    archive: 105, // archiveSocials
    restore: 117, // restoreSocials
  },
  auditLogs: {
    get: 113, // searchAudit (db/liquibase/gatelin-data/03-route.sql)
  },
};
