--
-- Megadex service. Empty pattern because Megadex mounts its routers under /megadex/* (see 02/03).
-- Gatelin proxies to `${APP_NAME}-megadex-${ENV_NAME}`.
--

INSERT INTO service (name, pattern, "forwardedCookies", core, "creatorId", "creatorName") VALUES
  ('megadex', '', '{}', false, -1, 'system')
ON CONFLICT DO NOTHING;
