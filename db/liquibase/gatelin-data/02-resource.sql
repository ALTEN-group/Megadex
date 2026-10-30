--
-- Megadex resource default inserts.
-- Resource names carry their real /megadex/* mount paths (src/app.js) because service.pattern
-- is empty. Gatelin's `resource.name` is varchar(20): keep every name <= 20 characters.
--

INSERT INTO resources ("serviceId", name, core, "creatorId", "creatorName") VALUES
  ((SELECT id FROM service WHERE name = 'megadex'), 'megadex/users',       false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'megadex'), 'megadex/preferences', false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'megadex'), 'megadex/socials',     false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'megadex'), 'megadex/countries',   false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'megadex'), 'megadex/civilities',  false, -1, 'system'),
  ((SELECT id FROM service WHERE name = 'megadex'), 'megadex/genders',     false, -1, 'system')
ON CONFLICT DO NOTHING;
