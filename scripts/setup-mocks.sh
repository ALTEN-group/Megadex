#!/bin/bash
set -euo pipefail

# Seeds passwords for the Megadex dev users (db/liquibase/data) by calling Foxnox's own
# POST /foxnox/ endpoint (which uses @dwtechs/passken-express `create` to generate +
# hash server-side), then stores the first user's credentials as E2E_EMAIL / E2E_PASSWORD
# in docker/conf/.env.dev (gitignored) for the admin e2e suite.
#
# Because seeding happens via the running service, the stack must be up first:
#     scripts/setup-env.sh  →  scripts/start-dev.sh  →  scripts/setup-mocks.sh
#
# Idempotent: re-runs delete the previous mock pwd rows, generate fresh plaintexts,
# and rewrite the e2e credentials. Run this any time you want to rotate them.
#
# Usage: setup-mocks.sh [--if-missing]
#   --if-missing : exit without touching anything when mock pwd rows already exist.
#                  start-dev.sh uses this so a fresh postgres volume gets seeded
#                  automatically while an ordinary restart keeps its passwords.

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENV_FILE="docker/conf/.env.dev"
# Named dev users from db/liquibase/data/01-users.sql (ids start at 2).
MOCK_USER_IDS=(2 3)

IF_MISSING=false
if [[ "${1:-}" == "--if-missing" ]]; then
  IF_MISSING=true
fi

# Cross-platform in-place sed (GNU/Linux vs macOS BSD)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sedi() { sed -i '' "$@"; }
else
  sedi() { sed -i "$@"; }
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Error:${NC} $ENV_FILE not found. Run scripts/setup-env.sh first." >&2
  exit 1
fi

# Load container names + postgres credentials from .env.dev.
# source <(...) process substitution failed to export vars here, so use a real temp file instead.
ENV_TMP=$(mktemp)
grep -v '^#' "$ENV_FILE" | grep -v '^UID=' > "$ENV_TMP"
set -a
# shellcheck disable=SC1090
source "$ENV_TMP"
set +a
rm -f "$ENV_TMP"

: "${FOXNOX_HOST:?FOXNOX_HOST missing from $ENV_FILE}"
: "${POSTGRES_HOST:?POSTGRES_HOST missing from $ENV_FILE}"
: "${POSTGRES_ROOT_USER:?POSTGRES_ROOT_USER missing from $ENV_FILE}"
: "${POSTGRES_ROOT_PWD:?POSTGRES_ROOT_PWD missing from $ENV_FILE}"
: "${FOXNOX_DB_NAME:?FOXNOX_DB_NAME missing from $ENV_FILE}"
: "${MEGADEX_DB_NAME:?MEGADEX_DB_NAME missing from $ENV_FILE}"
: "${DEFAULT_PORT:?DEFAULT_PORT missing from $ENV_FILE}"

# 1. Wait until the foxnox container is healthy (up to ~60s).
echo -e "${YELLOW}⏳ Waiting for ${FOXNOX_HOST} to be healthy...${NC}"
for i in {1..30}; do
  status=$(docker inspect -f '{{.State.Health.Status}}' "$FOXNOX_HOST" 2>/dev/null || echo "missing")
  if [[ "$status" == "healthy" ]]; then
    echo -e "${GREEN}✓${NC} ${FOXNOX_HOST} is healthy"
    break
  fi
  if [[ "$status" == "missing" ]]; then
    echo -e "${RED}Error:${NC} container ${FOXNOX_HOST} not found. Run scripts/start-dev.sh first." >&2
    exit 1
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    echo -e "${RED}Error:${NC} timed out waiting for ${FOXNOX_HOST} to become healthy (last status: $status)." >&2
    exit 1
  fi
done

IDS_CSV=$(IFS=,; echo "${MOCK_USER_IDS[*]}")

# 2. Under --if-missing, keep existing credentials. foxnox is healthy by now and it
#    depends on foxnox_migration completing, so the pwd table is guaranteed to exist.
#    An unreadable count falls through to seeding rather than aborting the caller.
if [[ "$IF_MISSING" == true ]]; then
  EXISTING=$(docker exec -e PGPASSWORD="$POSTGRES_ROOT_PWD" "$POSTGRES_HOST" \
    psql -U "$POSTGRES_ROOT_USER" -d "$FOXNOX_DB_NAME" -tAc \
    "SELECT COUNT(*) FROM pwd WHERE \"userId\" IN (${IDS_CSV})" 2>/dev/null || echo "")
  if [[ -n "${EXISTING//[[:space:]]/}" && "${EXISTING//[[:space:]]/}" != "0" ]]; then
    echo -e "${GREEN}✓${NC} Mock passwords already seeded — leaving them untouched."
    echo -e "  Run ${YELLOW}scripts/setup-mocks.sh${NC} (no flag) to rotate them."
    exit 0
  fi
  echo -e "${YELLOW}🌱 No mock passwords found — seeding them now...${NC}"
fi

# 3. Clear any previous mock pwd rows so re-runs don't accumulate duplicates
#    (compare() picks the first row it finds, so stale rows would shadow the new ones).
echo -e "${YELLOW}🧹 Removing previous mock pwd rows (userId IN (${IDS_CSV}))...${NC}"
docker exec -e PGPASSWORD="$POSTGRES_ROOT_PWD" "$POSTGRES_HOST" \
  psql -U "$POSTGRES_ROOT_USER" -d "$FOXNOX_DB_NAME" -v ON_ERROR_STOP=1 -c \
  "DELETE FROM pwd WHERE \"userId\" IN (${IDS_CSV})" >/dev/null

# 4. Ask foxnox to generate a password for each mock user.
#    Runs the HTTP call from inside the foxnox container so we don't have to expose
#    /foxnox/ externally (it lives on the internal network behind the BFF).
BODY_JSON="{\"rows\":[$(printf '{"userId":%s},' "${MOCK_USER_IDS[@]}" | sed 's/,$//')]}"
echo -e "${YELLOW}🔐 Generating passwords via POST /foxnox/ ...${NC}"
RESPONSE=$(docker exec -i "$FOXNOX_HOST" node -e '
  let body = "";
  process.stdin.on("data", (c) => body += c);
  process.stdin.on("end", () => {
    const http = require("http");
    const req = http.request({
      host: "localhost",
      port: process.env.PORT || 3000,
      path: "/foxnox/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        // Tracked writes are rejected without a consumer, since that is what
        // stamps the audit columns the history trigger requires.
        "x-consumer-user-id": "1",
        "x-consumer-name": "seed-script",
      },
    }, (res) => {
      let out = "";
      res.on("data", (c) => out += c);
      res.on("end", () => {
        if (res.statusCode >= 400) {
          process.stderr.write(`POST /foxnox/ failed (${res.statusCode}): ${out}\n`);
          process.exit(1);
        }
        process.stdout.write(out);
      });
    });
    req.on("error", (err) => { process.stderr.write(err.message + "\n"); process.exit(1); });
    req.write(body); req.end();
  });
' <<< "$BODY_JSON")

# 5. Extract `userId → pwd` pairs from the response using the same in-container node.
# Uses tab-delimited stdout since bash's `read` handles it without shell escaping woes.
PAIRS=$(docker exec -i "$FOXNOX_HOST" node -e '
  let d = "";
  process.stdin.on("data", (c) => d += c);
  process.stdin.on("end", () => {
    for (const r of JSON.parse(d).rows) console.log(`${r.userId}\t${r.pwd}`);
  });
' <<< "$RESPONSE")

echo ""
echo "Dev user plaintext passwords (printed once):"
E2E_SET=false
while IFS=$'\t' read -r uid pwd; do
  [[ -z "$uid" ]] && continue
  email=$(docker exec -e PGPASSWORD="$POSTGRES_ROOT_PWD" "$POSTGRES_HOST" \
    psql -U "$POSTGRES_ROOT_USER" -d "$MEGADEX_DB_NAME" -tAc "SELECT email FROM \"user\" WHERE id = ${uid}")
  printf "  userId %-3s %-28s = %s\n" "$uid" "$email" "$pwd"
  # 6. The first user becomes the e2e login (docker/conf/.env.dev is gitignored).
  if [[ "$E2E_SET" == false ]]; then
    sedi -e "s|^E2E_EMAIL=.*|E2E_EMAIL=${email}|" -e "s|^E2E_PASSWORD=.*|E2E_PASSWORD=${pwd}|" "$ENV_FILE"
    E2E_SET=true
  fi
done <<< "$PAIRS"

echo ""
echo -e "${GREEN}✅ Done. Log in at ${SERVER_SCHEME:-http://}${SERVER_URL:-localhost}:${TRAEFIK_PORT:-8100}/megadex/ (credentials above; first one saved as E2E_EMAIL / E2E_PASSWORD in ${ENV_FILE}).${NC}"
