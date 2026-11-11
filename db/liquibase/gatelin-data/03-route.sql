--
-- Megadex route default inserts.
-- operationIds: 2=list 5=bulk update 7=bulk create 9=bulk archive 10=delete (from Gatelin's core operation seed)
-- methodIds:    1=GET  2=POST        3=PUT          5=DELETE                  (from Gatelin's core method seed)
--
-- Assigned route IDs (Gatelin 0.1.0-alpha.11 core seed ends at 81):
--   82=searchUsers      83=getUserHistory    84=addUsers     85=updateUsers
--   86=archiveUsers     87=getUserSchema
--   88=getMegadexPreferences 89=addMegadexPreferences 90=updateMegadexPreferences 91=deleteMegadexPreference
--   92=searchSocials    93=getSocialHistory  94=addSocials   95=updateSocials
--   96=archiveSocials   97=getSocialSchema
--   98=searchCountries  99=getCountrySchema  100=searchCivilities 101=getCivilitySchema
--   102=searchGenders   103=getGenderSchema  104=searchAudit  105=updateOwnProfile
--   106=getOwnProfile   107=restoreUsers
--   108=restoreSocials
-- Keep admin/src/app/core/app-config/app.acls.ts in sync with this order.
--

INSERT INTO routes ("resourceId", pattern, name, description, protected, core, "operationId", "methodIds", "creatorId", "creatorName") VALUES
  -- users (/megadex/users)
  ((SELECT id FROM resource WHERE name = 'megadex/users'), '/search', 'searchUsers', 'Search users', true, false, ARRAY[2], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/users'), '/(?<id>\d+)/history', 'getUserHistory', 'Get user history', true, false, ARRAY[2], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/users'), '', 'addUsers', 'Add users', true, false, ARRAY[7], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/users'), '', 'updateUsers', 'Update users', true, false, ARRAY[5], ARRAY[3], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/users'), '/archive', 'archiveUsers', 'Archive users', true, false, ARRAY[9], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/users'), '/schema', 'getUserSchema', 'Get user entity schema', true, false, ARRAY[2], ARRAY[1], -1, 'system'),

  -- table-view preferences (/megadex/preferences, served by Megadex's own routes/preference.js)
  -- :resource is the admin entity id (users, socials, auditLogs)
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '/(?<resource>[A-Za-z]+)', 'getMegadexPreferences', 'Get table view preferences', true, false, ARRAY[2], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '/(?<resource>[A-Za-z]+)', 'addMegadexPreferences', 'Create table view preferences', true, false, ARRAY[7], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '/(?<resource>[A-Za-z]+)', 'updateMegadexPreferences', 'Update table view preferences', true, false, ARRAY[5], ARRAY[3], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '/(?<resource>[A-Za-z]+)/(?<id>\d+)', 'deleteMegadexPreference', 'Delete a table view preference', true, false, ARRAY[10], ARRAY[5], -1, 'system'),

  -- socials (/megadex/socials)
  ((SELECT id FROM resource WHERE name = 'megadex/socials'), '/search', 'searchSocials', 'Search social networks', true, false, ARRAY[2], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/socials'), '/(?<id>\d+)/history', 'getSocialHistory', 'Get social network history', true, false, ARRAY[2], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/socials'), '', 'addSocials', 'Add social networks', true, false, ARRAY[7], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/socials'), '', 'updateSocials', 'Update social networks', true, false, ARRAY[5], ARRAY[3], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/socials'), '/archive', 'archiveSocials', 'Archive social networks', true, false, ARRAY[9], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/socials'), '/schema', 'getSocialSchema', 'Get social network entity schema', true, false, ARRAY[2], ARRAY[1], -1, 'system'),

  -- countries (/megadex/countries)
  ((SELECT id FROM resource WHERE name = 'megadex/countries'), '/search', 'searchCountries', 'Search countries', true, false, ARRAY[2], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/countries'), '/schema', 'getCountrySchema', 'Get country entity schema', true, false, ARRAY[2], ARRAY[1], -1, 'system'),

  -- civilities (/megadex/civilities)
  ((SELECT id FROM resource WHERE name = 'megadex/civilities'), '/search', 'searchCivilities', 'Search civilities', true, false, ARRAY[2], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/civilities'), '/schema', 'getCivilitySchema', 'Get civility entity schema', true, false, ARRAY[2], ARRAY[1], -1, 'system'),

  -- genders (/megadex/genders)
  ((SELECT id FROM resource WHERE name = 'megadex/genders'), '/search', 'searchGenders', 'Search genders', true, false, ARRAY[2], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/genders'), '/schema', 'getGenderSchema', 'Get gender entity schema', true, false, ARRAY[2], ARRAY[1], -1, 'system'),

  -- audit log (/megadex/audit, served by Megadex's own routes/audit.js; granted to Super admin and Admin by 04-permission.sql)
  ((SELECT id FROM resource WHERE name = 'megadex/audit'), '/search', 'searchAudit', 'Search the audit log', true, false, ARRAY[2], ARRAY[2], -1, 'system'),

  -- self-service profile update (/megadex/users/me; appended at the end so existing route IDs stay stable)
  ((SELECT id FROM resource WHERE name = 'megadex/users'), '/me', 'updateOwnProfile', 'Update authenticated user profile', true, false, ARRAY[5], ARRAY[3], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/users'), '/me', 'getOwnProfile', 'Get authenticated user profile', true, false, ARRAY[2], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/users'), '/restore', 'restoreUsers', 'Restore archived user profiles', true, false, ARRAY[5], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/socials'), '/restore', 'restoreSocials', 'Restore archived social networks', true, false, ARRAY[5], ARRAY[2], -1, 'system')
ON CONFLICT DO NOTHING;
