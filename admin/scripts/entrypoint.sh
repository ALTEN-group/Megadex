#!/bin/sh
set -e

if [ -n "$ADMIN_BASE_PATH" ]; then
  BASE_PATH="${ADMIN_BASE_PATH%/}/"
  node -e '
  const fs = require("fs");
  const baseHref = process.argv[1];
  const servePath = baseHref.replace(/^\/+|\/+$/g, "");
  const config = JSON.parse(fs.readFileSync("angular.json", "utf8"));
  config.projects.admin.architect.build.options.baseHref = baseHref;
  config.projects.admin.architect.serve.options.servePath = servePath;
  fs.writeFileSync("angular.json", JSON.stringify(config, null, 2) + "\n");
  ' "$BASE_PATH"
fi

# Optional runtime overrides (empty → {}). Injected into index.html so the
# browser can read them without baking Docker env into the Angular bundle.
node -e '
const fs = require("fs");
const path = "src/index.html";
const ssoTokenKey = (process.env.ADMIN_SSO_TOKEN_KEY || "").trim();
const rolesSearchUrl = (process.env.ADMIN_ROLES_SEARCH_URL || "").trim();
const payload = {
  ...(ssoTokenKey ? { ssoTokenKey } : {}),
  ...(rolesSearchUrl ? { rolesSearchUrl } : {}),
};
const script =
  "<script id=\"megadex-admin-runtime\">window.__MEGADEX_ADMIN__=" +
  JSON.stringify(payload) +
  ";</script>";
let html = fs.readFileSync(path, "utf8");
html = html.replace(
  /<script id="megadex-admin-runtime">[\s\S]*?<\/script>/,
  script,
);
fs.writeFileSync(path, html);
'

exec npm start
