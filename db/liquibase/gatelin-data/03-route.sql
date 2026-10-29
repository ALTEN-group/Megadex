--
-- Megadex route default inserts.
-- operationIds: 2=list 5=bulk update 7=bulk create 9=bulk archive (from Gatelin's core operation seed)
-- methodIds:    1=GET  2=POST        3=PUT                       (from Gatelin's core method seed)
--
-- Assigned route IDs (Gatelin 0.1.0-alpha.11 core seed ends at 81):
--   82=searchUsers      83=getUserHistory    84=addUsers     85=updateUsers
--   86=archiveUsers     87=getUserSchema
--   88=searchMegadexPreferences 89=getMegadexPreferenceHistory 90=addMegadexPreferences
--   91=updateMegadexPreferences 92=archiveMegadexPreferences  93=getMegadexPreferenceSchema
--   94=searchSocials    95=getSocialHistory  96=addSocials   97=updateSocials
--   98=archiveSocials   99=getSocialSchema
--   100=searchCountries 101=getCountrySchema 102=searchCivilities 103=getCivilitySchema
--   104=searchGenders   105=getGenderSchema
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

  -- preferences (/megadex/preferences)
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '/search', 'searchMegadexPreferences', 'Search preferences', true, false, ARRAY[2], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '/(?<id>\d+)/history', 'getMegadexPreferenceHistory', 'Get preference history', true, false, ARRAY[2], ARRAY[1], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '', 'addMegadexPreferences', 'Add preferences', true, false, ARRAY[7], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '', 'updateMegadexPreferences', 'Update preferences', true, false, ARRAY[5], ARRAY[3], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '/archive', 'archiveMegadexPreferences', 'Archive preferences', true, false, ARRAY[9], ARRAY[2], -1, 'system'),
  ((SELECT id FROM resource WHERE name = 'megadex/preferences'), '/schema', 'getMegadexPreferenceSchema', 'Get preference entity schema', true, false, ARRAY[2], ARRAY[1], -1, 'system'),

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
  ((SELECT id FROM resource WHERE name = 'megadex/genders'), '/schema', 'getGenderSchema', 'Get gender entity schema', true, false, ARRAY[2], ARRAY[1], -1, 'system')
ON CONFLICT DO NOTHING;
