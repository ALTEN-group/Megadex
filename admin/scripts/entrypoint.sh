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

# Optional runtime overrides (empty → {}). Injected into a generated
# src/index.dev.html (gitignored, used by the "serve" build config in
# angular.json) so the tracked src/index.html template stays untouched and the
# browser can read them without baking Docker env into the Angular bundle.
node -e '
const fs = require("fs");
const template = "src/index.html";
const output = "src/index.dev.html";
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
let html = fs.readFileSync(template, "utf8");
html = html.replace(
  /<script id="megadex-admin-runtime">[\s\S]*?<\/script>/,
  script,
);
fs.writeFileSync(output, html);
'

exec npm start
